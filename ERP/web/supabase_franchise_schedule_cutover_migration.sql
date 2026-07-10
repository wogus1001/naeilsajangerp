-- Franchise independent schedule CUTOVER migration
-- SQL 등록 필요: run after compatible code is deployed and prepare SQL has completed.
-- Order: prepare SQL -> code deploy -> cutover SQL -> authenticated QA.

begin;

select pg_advisory_xact_lock(hashtext('franchise_schedule_migration'));

do $$
declare
  current_phase text;
  partial_source_count integer;
  mismatch_count integer;
begin
  select phase into current_phase from public.franchise_schedule_migration_state where id = true;
  if current_phase = 'cutover' then
    return;
  end if;
  if current_phase is distinct from 'prepared' then
    raise exception 'FRANCHISE_SCHEDULE_PREPARE_REQUIRED';
  end if;

  select count(*) into partial_source_count
  from public.schedules s
  where (s.source_type is null) <> (s.source_id is null);
  if partial_source_count > 0 then
    raise exception 'FRANCHISE_SCHEDULE_PARTIAL_SOURCE_ABORT: %', partial_source_count;
  end if;

  select count(*) into mismatch_count
  from public.franchise_store_visits v
  join public.schedules s on s.id = v.schedule_id
  where s.company_id <> v.company_id
     or (s.source_type is not null and (s.source_type <> 'supervision-visit' or s.source_id <> v.id::text));
  if mismatch_count > 0 then
    raise exception 'FRANCHISE_SCHEDULE_VISIT_COMPANY_OR_SOURCE_MISMATCH: %', mismatch_count;
  end if;
end $$;

insert into public.franchise_schedule_migration_audit (phase, action, legacy_schedule_id, source_type, source_id, detail)
select 'cutover', 'excluded_source', s.id, s.source_type, s.source_id, jsonb_build_object('reason', 'not_exact_franchise_candidate')
from public.schedules s
where s.source_type is not null
  and not (
    s.source_type in ('approval-document', 'supervision-visit')
    or (
      s.source_type = 'manual-workflow'
      and s.source_id = 'franchise-manual:' || s.id
      and s.metadata->>'franchise_manual_origin' = 'true'
    )
  );

with candidates as (
  select
    s.*,
    coalesce(s.source_type, 'supervision-visit') as repaired_source_type,
    coalesce(s.source_id, v.id::text) as repaired_source_id,
    case when s.source_type = 'approval-document' then '진행중' else '예정' end as default_status
  from public.schedules s
  left join public.franchise_store_visits v on v.schedule_id = s.id
  where s.source_type in ('approval-document', 'supervision-visit')
    or (s.source_type is null and s.source_id is null and v.id is not null)
    or (
      s.source_type = 'manual-workflow'
      and s.source_id = 'franchise-manual:' || s.id
      and s.metadata->>'franchise_manual_origin' = 'true'
    )
),
upserted as (
  insert into public.franchise_schedules (
    id, company_id, creator_profile_id, assignee_profile_id, manager_profile_id, title, date, status, type, color,
    details, source_type, source_id, due_at, remind_at, completed_at, metadata, created_at, updated_at
  )
  select
    id,
    company_id,
    user_id::uuid,
    assignee_profile_id,
    manager_profile_id,
    coalesce(nullif(title, ''), '프랜차이즈 일정'),
    coalesce(date::date, due_at::date, created_at::date),
    public.normalize_franchise_schedule_status(status, completed_at, default_status),
    coalesce(type, 'workflow'),
    coalesce(color, '#3182f6'),
    coalesce(details, ''),
    repaired_source_type,
    repaired_source_id,
    due_at,
    remind_at,
    completed_at,
    coalesce(metadata, '{}'::jsonb),
    created_at,
    coalesce(updated_at, created_at)
  from candidates
  on conflict (id) do update set
    title = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.title else excluded.title end,
    date = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.date else excluded.date end,
    status = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.status else excluded.status end,
    type = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.type else excluded.type end,
    color = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.color else excluded.color end,
    details = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.details else excluded.details end,
    source_type = excluded.source_type,
    source_id = excluded.source_id,
    due_at = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.due_at else excluded.due_at end,
    remind_at = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.remind_at else excluded.remind_at end,
    completed_at = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.completed_at else excluded.completed_at end,
    metadata = case when public.franchise_schedules.updated_at > excluded.updated_at then public.franchise_schedules.metadata else excluded.metadata end,
    updated_at = greatest(public.franchise_schedules.updated_at, excluded.updated_at)
  returning id, company_id, source_type, source_id
)
insert into public.franchise_schedule_migration_audit (phase, action, franchise_schedule_id, source_type, source_id, detail)
select 'cutover', 'copied', id, source_type, source_id, jsonb_build_object('company_id', company_id)
from upserted;

do $$
declare
  missing_backup_count integer;
  company_mismatch_count integer;
begin
  select count(*) into missing_backup_count
  from public.schedules s
  where (
    s.source_type in ('approval-document', 'supervision-visit')
    or exists (select 1 from public.franchise_store_visits v where v.schedule_id = s.id)
    or (
      s.source_type = 'manual-workflow'
      and s.source_id = 'franchise-manual:' || s.id
      and s.metadata->>'franchise_manual_origin' = 'true'
    )
  )
  and not exists (select 1 from public.franchise_schedule_migration_backup b where b.legacy_schedule_id = s.id)
  and not exists (select 1 from public.franchise_schedules fs where fs.id = s.id);
  if missing_backup_count > 0 then
    raise exception 'FRANCHISE_SCHEDULE_BACKUP_OR_COPY_MISSING: %', missing_backup_count;
  end if;

  select count(*) into company_mismatch_count
  from public.franchise_store_visits v
  join public.franchise_schedules fs on fs.source_type = 'supervision-visit' and fs.source_id = v.id::text
  where fs.company_id <> v.company_id;
  if company_mismatch_count > 0 then
    raise exception 'FRANCHISE_SCHEDULE_VISIT_COMPANY_MISMATCH: %', company_mismatch_count;
  end if;
end $$;

alter table public.franchise_store_visits
  drop constraint if exists franchise_store_visits_schedule_id_fkey;

alter table public.franchise_store_visits
  add constraint franchise_store_visits_schedule_id_fkey
  foreign key (schedule_id) references public.franchise_schedules(id) on delete set null
  not valid;

update public.franchise_store_visits v
set schedule_id = fs.id
from public.franchise_schedules fs
where fs.company_id = v.company_id
  and fs.source_type = 'supervision-visit'
  and fs.source_id = v.id::text;

alter table public.franchise_store_visits validate constraint franchise_store_visits_schedule_id_fkey;

update public.franchise_notifications
set action_url = replace(action_url, '/schedule?approvalDocumentId=', '/dashboard/franchise-operations/schedule?approvalDocumentId=')
where action_url like '/schedule?approvalDocumentId=%';

delete from public.schedules s
using public.franchise_schedule_migration_backup b
where b.legacy_schedule_id = s.id
  and exists (select 1 from public.franchise_schedules fs where fs.id = s.id);

update public.franchise_schedule_migration_state
set phase = 'cutover',
    cutover_at = coalesce(cutover_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
where id = true;

commit;
