-- SQL 등록 필요: 운영 안정성 4단계 감사 이력 및 관리자 재처리 기반.
-- Apply after the durable schedule sync and franchise owner phase 3 migrations.

begin;

create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  resource_type text not null,
  resource_id text,
  action text not null,
  outcome text not null default 'success',
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc'::text, now()),
  check (outcome in ('success', 'failed', 'denied'))
);

create index if not exists platform_audit_events_occurred_at_idx
  on public.platform_audit_events(occurred_at desc);

create index if not exists platform_audit_events_company_resource_idx
  on public.platform_audit_events(company_id, resource_type, resource_id, occurred_at desc);

create index if not exists platform_audit_events_request_id_idx
  on public.platform_audit_events(request_id);

alter table public.platform_audit_events enable row level security;

drop policy if exists platform_audit_events_admin_select on public.platform_audit_events;
create policy platform_audit_events_admin_select
  on public.platform_audit_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'admin'
    )
  );

create or replace function public.retry_platform_operation_job(
  p_job_type text,
  p_job_id uuid,
  p_actor_profile_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean := false;
  before_row jsonb := '{}'::jsonb;
  after_row jsonb := '{}'::jsonb;
  target_company_id uuid;
begin
  select exists (
    select 1
    from public.profiles profile
    where profile.id = p_actor_profile_id
      and profile.role = 'admin'
  ) into actor_is_admin;

  if not actor_is_admin then
    raise exception 'PLATFORM_OPERATIONS_ADMIN_REQUIRED';
  end if;

  if p_job_type = 'schedule_sync' then
    select to_jsonb(job), job.company_id
      into before_row, target_company_id
    from public.franchise_schedule_sync_jobs job
    where job.id = p_job_id
    for update;

    if before_row is null then
      raise exception 'PLATFORM_OPERATION_JOB_NOT_FOUND';
    end if;

    update public.franchise_schedule_sync_jobs as job
    set status = 'pending',
        available_at = timezone('utc'::text, now()),
        last_error = null,
        lease_token = gen_random_uuid(),
        updated_at = timezone('utc'::text, now())
    where id = p_job_id
    returning to_jsonb(job) into after_row;
  elsif p_job_type = 'file_cleanup' then
    select to_jsonb(job), job.company_id
      into before_row, target_company_id
    from public.franchise_owner_file_deletion_outbox job
    where job.id = p_job_id
    for update;

    if before_row is null then
      raise exception 'PLATFORM_OPERATION_JOB_NOT_FOUND';
    end if;

    update public.franchise_owner_file_deletion_outbox as job
    set state = 'pending',
        last_error = null,
        requested_at = timezone('utc'::text, now()),
        completed_at = null
    where id = p_job_id
    returning to_jsonb(job) into after_row;
  else
    raise exception 'PLATFORM_OPERATION_JOB_TYPE_INVALID';
  end if;

  insert into public.platform_audit_events (
    request_id, company_id, actor_profile_id, event_type,
    resource_type, resource_id, action, outcome, before_data, after_data
  ) values (
    coalesce(p_request_id, gen_random_uuid()),
    target_company_id,
    p_actor_profile_id,
    'operation_retry',
    p_job_type,
    p_job_id::text,
    'retry',
    'success',
    coalesce(before_row, '{}'::jsonb),
    coalesce(after_row, '{}'::jsonb)
  );

  return jsonb_build_object(
    'jobType', p_job_type,
    'jobId', p_job_id,
    'requestId', p_request_id,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.retry_platform_operation_job(text, uuid, uuid, uuid) from public;
revoke all on function public.retry_platform_operation_job(text, uuid, uuid, uuid) from anon;
revoke all on function public.retry_platform_operation_job(text, uuid, uuid, uuid) from authenticated;
grant execute on function public.retry_platform_operation_job(text, uuid, uuid, uuid) to service_role;

commit;
