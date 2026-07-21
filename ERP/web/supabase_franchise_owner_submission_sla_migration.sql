begin;

create extension if not exists pg_cron;

alter table public.franchise_owner_submissions
  add column if not exists submitted_at timestamp with time zone;

update public.franchise_owner_submissions
set submitted_at = case
  when status = 'submitted'
    and updated_at > created_at
    then updated_at
  else created_at
end
where submitted_at is null;

alter table public.franchise_owner_submissions
  alter column submitted_at set default now(),
  alter column submitted_at set not null;

do $$
declare
  source_record record;
begin
  for source_record in
    select
      submission.company_id,
      case submission.submission_type
        when 'general_request' then 'owner-general-request'
        when 'facility_request' then 'owner-facility-request'
      end as source_type,
      submission.id::text as source_id
    from public.franchise_owner_submissions as submission
    where submission.submission_type in ('general_request', 'facility_request')
    order by submission.company_id, source_type, source_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      source_record.company_id::text || ':' || source_record.source_type || ':' || source_record.source_id,
      0
    ));
  end loop;
end $$;

update public.franchise_schedules as schedule
set due_at = submission.submitted_at + interval '24 hours',
    status = case
      when submission.status = 'submitted'
        and submission.submitted_at + interval '24 hours' <= now()
        then '지연'
      when submission.status = 'submitted' then '진행중'
      when submission.status = 'rejected' then '취소'
      when submission.status in ('approved', 'resolved') then '완료'
      else schedule.status
    end,
    updated_at = now()
from public.franchise_owner_submissions as submission
where schedule.company_id = submission.company_id
  and schedule.source_id = submission.id::text
  and (
    (schedule.source_type = 'owner-general-request' and submission.submission_type = 'general_request')
    or (schedule.source_type = 'owner-facility-request' and submission.submission_type = 'facility_request')
  );

update public.franchise_notifications as notification
set severity = case
      when schedule.status = '지연' then 'danger'
      when schedule.status in ('진행중', '완료', '취소') then 'info'
      else notification.severity
    end,
    title = case
      when schedule.status = '지연'
        and notification.title not like '지연 일정:%'
        then '지연 일정: ' || notification.title
      when schedule.status in ('진행중', '완료', '취소')
        then regexp_replace(notification.title, '^지연 일정:[[:space:]]*', '')
      else notification.title
    end,
    due_at = schedule.due_at,
    dismissed_at = case
      when schedule.status in ('완료', '취소') then now()
      else notification.dismissed_at
    end,
    updated_at = now()
from public.franchise_schedules as schedule
where schedule.source_type in ('owner-general-request', 'owner-facility-request')
  and notification.company_id = schedule.company_id
  and notification.source_type = 'workflow-schedule'
  and notification.source_id = schedule.source_type || ':' || schedule.source_id || ':active';

update public.franchise_schedule_sync_jobs as job
set schedule_payload = jsonb_set(
      jsonb_set(
        job.schedule_payload,
        '{due_at}',
        to_jsonb(submission.submitted_at + interval '24 hours'),
        true
      ),
      '{status}',
      to_jsonb(case
        when submission.status = 'submitted'
          and submission.submitted_at + interval '24 hours' <= now()
          then '지연'
        when submission.status = 'submitted' then '진행중'
        when submission.status = 'rejected' then '취소'
        when submission.status in ('approved', 'resolved') then '완료'
        else coalesce(nullif(job.schedule_payload->>'status', ''), '진행중')
      end),
      true
    ),
    status = 'pending',
    attempt_count = 0,
    available_at = now(),
    last_error = null,
    lease_token = uuid_generate_v4(),
    updated_at = now()
from public.franchise_owner_submissions as submission
where job.company_id = submission.company_id
  and job.source_id = submission.id::text
  and (
    (job.source_type = 'owner-general-request' and submission.submission_type = 'general_request')
    or (job.source_type = 'owner-facility-request' and submission.submission_type = 'facility_request')
  )
  and job.status in ('pending', 'processing', 'failed');

create index if not exists idx_franchise_schedules_active_due_at
  on public.franchise_schedules (due_at)
  where status in ('예정', '진행중') and due_at is not null;

create index if not exists idx_franchise_owner_submissions_company_submitted
  on public.franchise_owner_submissions (company_id, submitted_at desc, id desc);

create or replace function public.get_franchise_owner_submission_activity_summary(target_company_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pendingCount', count(*) filter (where status = 'submitted'),
    'overdueCount', count(*) filter (
      where status = 'submitted'
        and submitted_at + interval '24 hours' <= now()
    ),
    'completedLast7Days', count(*) filter (
      where status in ('approved', 'rejected', 'resolved')
        and reviewed_at >= now() - interval '7 days'
        and reviewed_at <= now()
    ),
    'averageResolutionHours', round(avg(
      greatest(0, extract(epoch from (reviewed_at - submitted_at)) / 3600)
    ) filter (
      where status in ('approved', 'rejected', 'resolved')
        and reviewed_at is not null
    ), 1)
  )
  from public.franchise_owner_submissions
  where company_id = target_company_id
    and submission_type in ('general_request', 'facility_request');
$$;

revoke all on function public.get_franchise_owner_submission_activity_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_franchise_owner_submission_activity_summary(uuid) to service_role;

create or replace function public.reconcile_franchise_schedule_lateness()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
  late_schedule_ids text[] := array[]::text[];
  today_kst date := (timezone('Asia/Seoul', now()))::date;
  now_utc timestamp with time zone := now();
begin
  with newly_late as (
    update public.franchise_schedules as schedule
    set status = '지연',
        updated_at = now_utc
    where schedule.status in ('예정', '진행중')
      and (
        (schedule.due_at is not null and schedule.due_at <= now_utc)
        or (schedule.due_at is null and schedule.date < today_kst)
      )
    returning schedule.id::text
  )
  select coalesce(array_agg(id), array[]::text[])
  into late_schedule_ids
  from newly_late;

  affected_count := cardinality(late_schedule_ids);

  update public.franchise_notifications as notification
  set severity = 'danger',
      title = case
        when notification.title like '지연 일정:%' then notification.title
        else '지연 일정: ' || notification.title
      end,
      read_at = null,
      dismissed_at = null,
      updated_at = now_utc
  where affected_count > 0
    and notification.source_type = 'workflow-schedule'
    and exists (
      select 1
      from public.franchise_schedules as schedule
      where schedule.id::text = any (late_schedule_ids)
        and schedule.company_id = notification.company_id
        and notification.source_id = schedule.source_type || ':' || schedule.source_id || ':active'
    );

  return affected_count;
end;
$$;

revoke all on function public.reconcile_franchise_schedule_lateness() from public, anon, authenticated;
grant execute on function public.reconcile_franchise_schedule_lateness() to service_role;

select cron.schedule(
  'franchise-schedule-hourly-lateness',
  '5 * * * *',
  'select public.reconcile_franchise_schedule_lateness()'
);

commit;
