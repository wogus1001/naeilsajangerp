-- SQL 등록 필요: apply after supabase_franchise_source_schedule_profile_security_migration.sql.

begin;

create table if not exists public.franchise_schedule_sync_jobs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  source_type text not null,
  source_id text not null,
  schedule_payload jsonb not null,
  status text default 'pending' not null check (status in ('pending', 'processing', 'failed')),
  attempt_count integer default 0 not null,
  available_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_error text,
  lease_token uuid default uuid_generate_v4() not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id, source_type, source_id)
);

create index if not exists idx_franchise_schedule_sync_jobs_ready
  on public.franchise_schedule_sync_jobs (status, available_at, updated_at);

alter table public.franchise_schedule_sync_jobs enable row level security;

create or replace function public.sync_franchise_operational_schedule_from_payload(schedule_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  persisted_id text;
  schedule_company uuid := nullif(schedule_payload->>'company_id', '')::uuid;
  schedule_source_type text := nullif(trim(schedule_payload->>'source_type'), '');
  schedule_source_id text := nullif(trim(schedule_payload->>'source_id'), '');
  schedule_status text := public.normalize_franchise_schedule_status(
    schedule_payload->>'status',
    nullif(schedule_payload->>'completed_at', '')::timestamp with time zone,
    '예정'
  );
  notification_source_id text;
  recipient_id uuid;
  sync_job_id uuid := nullif(schedule_payload->>'_sync_job_id', '')::uuid;
  sync_job_token uuid := nullif(schedule_payload->>'_sync_job_token', '')::uuid;
  sync_job_updated_at timestamp with time zone := nullif(schedule_payload->>'_sync_job_updated_at', '')::timestamp with time zone;
  sync_lease_exists boolean := false;
  now_utc timestamp with time zone := timezone('utc'::text, now());
begin
  if schedule_company is null or schedule_source_type is null or schedule_source_id is null then
    raise exception 'FRANCHISE_SCHEDULE_SOURCE_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    schedule_company::text || ':' || schedule_source_type || ':' || schedule_source_id,
    0
  ));

  if sync_job_token is null or sync_job_updated_at is null then
    raise exception 'FRANCHISE_SCHEDULE_SYNC_LEASE_REQUIRED';
  end if;

  select exists (
    select 1
    from public.franchise_schedule_sync_jobs job
    where job.company_id = schedule_company
      and job.source_type = schedule_source_type
      and job.source_id = schedule_source_id
      and job.updated_at = sync_job_updated_at
      and job.lease_token = sync_job_token
      and job.status in ('pending', 'processing')
      and (sync_job_id is null or job.id = sync_job_id)
  ) into sync_lease_exists;

  if not sync_lease_exists then
    select id into persisted_id
    from public.franchise_schedules
    where company_id = schedule_company
      and source_type = schedule_source_type
      and source_id = schedule_source_id;
    return persisted_id;
  end if;

  persisted_id := public.upsert_franchise_schedule_from_payload(
    schedule_payload - '_sync_job_id' - '_sync_job_token' - '_sync_job_updated_at'
  );
  notification_source_id := schedule_source_type || ':' || schedule_source_id || ':active';

  update public.franchise_notifications
  set dismissed_at = now_utc,
      updated_at = now_utc
  where company_id = schedule_company
    and source_type = 'workflow-schedule'
    and source_id = notification_source_id;

  if schedule_status in ('완료', '취소') then
    delete from public.franchise_schedule_sync_jobs
    where company_id = schedule_company
      and source_type = schedule_source_type
      and source_id = schedule_source_id
      and updated_at = sync_job_updated_at
      and lease_token = sync_job_token
      and (sync_job_id is null or id = sync_job_id);
    return persisted_id;
  end if;

  for recipient_id in
    select distinct candidate_id
    from unnest(array[
      nullif(schedule_payload->>'assignee_profile_id', '')::uuid,
      nullif(schedule_payload->>'manager_profile_id', '')::uuid,
      nullif(schedule_payload->>'creator_profile_id', '')::uuid
    ]) as candidate(candidate_id)
    where candidate_id is not null
  loop
    insert into public.franchise_notifications (
      company_id, recipient_profile_id, source_type, source_id, severity,
      title, body, action_url, due_at, delivery_channel, kakao_template_key,
      data, read_at, dismissed_at, created_at, updated_at
    ) values (
      schedule_company,
      recipient_id,
      'workflow-schedule',
      notification_source_id,
      case when schedule_status = '지연' then 'danger' else 'info' end,
      case
        when schedule_status = '지연' then '지연 일정: ' || trim(schedule_payload->>'title')
        else trim(schedule_payload->>'title')
      end,
      coalesce(nullif(schedule_payload->>'details', ''), trim(schedule_payload->>'title') || ' 일정을 확인해주세요.'),
      coalesce(nullif(schedule_payload->'metadata'->>'actionUrl', ''), '/dashboard/franchise-operations/schedule'),
      nullif(schedule_payload->>'due_at', '')::timestamp with time zone,
      'in_app',
      '',
      jsonb_build_object('sourceId', schedule_source_id, 'sourceType', schedule_source_type),
      null,
      null,
      now_utc,
      now_utc
    )
    on conflict (company_id, recipient_profile_id, source_type, source_id)
    do update set
      severity = excluded.severity,
      title = excluded.title,
      body = excluded.body,
      action_url = excluded.action_url,
      due_at = excluded.due_at,
      data = excluded.data,
      read_at = null,
      dismissed_at = null,
      updated_at = excluded.updated_at;
  end loop;

  delete from public.franchise_schedule_sync_jobs
  where company_id = schedule_company
    and source_type = schedule_source_type
    and source_id = schedule_source_id
    and updated_at = sync_job_updated_at
    and lease_token = sync_job_token
    and (sync_job_id is null or id = sync_job_id);

  return persisted_id;
end;
$$;

create or replace function public.reconcile_franchise_schedule_lateness()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
  today_kst date := (timezone('Asia/Seoul', now()))::date;
  now_utc timestamp with time zone := timezone('utc'::text, now());
begin
  update public.franchise_schedules
  set status = '지연',
      updated_at = now_utc
  where status in ('예정', '진행중')
    and coalesce((timezone('Asia/Seoul', due_at))::date, date) < today_kst;

  get diagnostics affected_count = row_count;

  update public.franchise_notifications as notification
  set severity = 'danger',
      title = case
        when notification.title like '지연 일정:%' then notification.title
        else '지연 일정: ' || notification.title
      end,
      read_at = null,
      dismissed_at = null,
      updated_at = now_utc
  where notification.source_type = 'workflow-schedule'
    and exists (
      select 1
      from public.franchise_schedules as schedule
      where schedule.company_id = notification.company_id
        and schedule.status = '지연'
        and notification.source_id = schedule.source_type || ':' || schedule.source_id || ':active'
    );

  return affected_count;
end;
$$;

create or replace function public.claim_franchise_schedule_sync_jobs(job_limit integer default 50)
returns setof public.franchise_schedule_sync_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.franchise_schedule_sync_jobs as job
  set status = 'processing',
      lease_token = uuid_generate_v4(),
      updated_at = timezone('utc'::text, now())
  where job.id in (
    select candidate.id
    from public.franchise_schedule_sync_jobs as candidate
    where (
        candidate.status in ('pending', 'failed')
        and candidate.available_at <= timezone('utc'::text, now())
      ) or (
        candidate.status = 'processing'
        and candidate.updated_at <= timezone('utc'::text, now()) - interval '15 minutes'
      )
    order by candidate.available_at, candidate.created_at
    for update skip locked
    limit greatest(1, least(coalesce(job_limit, 50), 200))
  )
  returning job.*;
end;
$$;

revoke all on function public.sync_franchise_operational_schedule_from_payload(jsonb) from public, anon, authenticated;
revoke all on function public.reconcile_franchise_schedule_lateness() from public, anon, authenticated;
revoke all on function public.claim_franchise_schedule_sync_jobs(integer) from public, anon, authenticated;
grant execute on function public.sync_franchise_operational_schedule_from_payload(jsonb) to service_role;
grant execute on function public.reconcile_franchise_schedule_lateness() to service_role;
grant execute on function public.claim_franchise_schedule_sync_jobs(integer) to service_role;

commit;
