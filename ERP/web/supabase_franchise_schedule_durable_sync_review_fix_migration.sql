-- SQL 등록 필요: apply after supabase_franchise_schedule_durable_sync_migration.sql and supabase_franchise_schedule_visibility_migration.sql.

begin;

do $$
begin
  if to_regclass('public.franchise_schedule_sync_jobs') is null then
    raise exception 'FRANCHISE_SCHEDULE_SYNC_JOBS_TABLE_REQUIRED';
  end if;
end $$;

alter table public.franchise_schedule_sync_jobs
  add column if not exists lease_token uuid default uuid_generate_v4() not null;

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
  if sync_job_token is null or sync_job_updated_at is null then
    raise exception 'FRANCHISE_SCHEDULE_SYNC_LEASE_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    schedule_company::text || ':' || schedule_source_type || ':' || schedule_source_id,
    0
  ));

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

  if schedule_status not in ('완료', '취소') then
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
  end if;

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

create or replace function public.is_assignable_franchise_schedule_profile(
  target_company_id uuid,
  target_profile_id uuid,
  manager_only boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and p.company_id = target_company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
      and (not manager_only or p.role in ('admin', 'manager'))
      and (
        auth.role() = 'service_role'
        or exists (
          select 1
          from public.profiles requester
          where requester.id = auth.uid()
            and requester.company_id = target_company_id
            and requester.status = 'active'
            and requester.role <> 'partner_vendor'
        )
      )
  );
$$;

revoke all on function public.normalize_franchise_schedule_status(text, timestamp with time zone, text) from public, anon, authenticated;
grant execute on function public.normalize_franchise_schedule_status(text, timestamp with time zone, text) to service_role;

revoke all on function public.is_active_franchise_schedule_member(uuid) from public, anon;
revoke all on function public.can_manage_franchise_schedules(uuid) from public, anon;
revoke all on function public.is_assignable_franchise_schedule_profile(uuid, uuid, boolean) from public, anon;
grant execute on function public.is_active_franchise_schedule_member(uuid) to authenticated, service_role;
grant execute on function public.can_manage_franchise_schedules(uuid) to authenticated, service_role;
grant execute on function public.is_assignable_franchise_schedule_profile(uuid, uuid, boolean) to authenticated, service_role;

revoke all on function public.claim_franchise_schedule_sync_jobs(integer) from public, anon, authenticated;
revoke all on function public.sync_franchise_operational_schedule_from_payload(jsonb) from public, anon, authenticated;
grant execute on function public.claim_franchise_schedule_sync_jobs(integer) to service_role;
grant execute on function public.sync_franchise_operational_schedule_from_payload(jsonb) to service_role;

commit;
