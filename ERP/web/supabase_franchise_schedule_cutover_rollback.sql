-- Franchise independent schedule CUTOVER rollback
-- SQL 등록 필요: emergency rollback only after cutover SQL has completed.
-- Restores public.schedules from backup and preserves new manual franchise rows with rollback markers.

begin;

select pg_advisory_xact_lock(hashtext('franchise_schedule_migration'));

do $$
declare
  current_phase text;
begin
  select phase into current_phase from public.franchise_schedule_migration_state where id = true;
  if current_phase = 'prepared' then
    return;
  end if;
  if current_phase is distinct from 'cutover' then
    raise exception 'FRANCHISE_SCHEDULE_CUTOVER_REQUIRED';
  end if;
end $$;

insert into public.schedules (
  id, company_id, user_id, title, date, scope, status, type, color, details,
  source_type, source_id, assignee_profile_id, manager_profile_id, due_at, remind_at,
  completed_at, metadata, created_at, updated_at
)
select
  legacy_schedule_id,
  (schedule_row->>'company_id')::uuid,
  nullif(schedule_row->>'user_id', '')::uuid,
  schedule_row->>'title',
  schedule_row->>'date',
  coalesce(schedule_row->>'scope', 'company'),
  schedule_row->>'status',
  schedule_row->>'type',
  schedule_row->>'color',
  schedule_row->>'details',
  nullif(schedule_row->>'source_type', ''),
  nullif(schedule_row->>'source_id', ''),
  nullif(schedule_row->>'assignee_profile_id', '')::uuid,
  nullif(schedule_row->>'manager_profile_id', '')::uuid,
  nullif(schedule_row->>'due_at', '')::timestamp with time zone,
  nullif(schedule_row->>'remind_at', '')::timestamp with time zone,
  nullif(schedule_row->>'completed_at', '')::timestamp with time zone,
  coalesce(schedule_row->'metadata', '{}'::jsonb),
  coalesce(nullif(schedule_row->>'created_at', '')::timestamp with time zone, timezone('utc'::text, now())),
  timezone('utc'::text, now())
from public.franchise_schedule_migration_backup
on conflict (id) do update set
  company_id = excluded.company_id,
  user_id = excluded.user_id,
  title = excluded.title,
  date = excluded.date,
  scope = excluded.scope,
  status = excluded.status,
  type = excluded.type,
  color = excluded.color,
  details = excluded.details,
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  assignee_profile_id = excluded.assignee_profile_id,
  manager_profile_id = excluded.manager_profile_id,
  due_at = excluded.due_at,
  remind_at = excluded.remind_at,
  completed_at = excluded.completed_at,
  metadata = excluded.metadata,
  updated_at = excluded.updated_at;

insert into public.schedules (
  id, company_id, user_id, title, date, scope, status, type, color, details,
  source_type, source_id, assignee_profile_id, manager_profile_id, due_at, remind_at,
  completed_at, metadata, created_at, updated_at
)
select
  fs.id,
  fs.company_id,
  fs.creator_profile_id,
  fs.title,
  fs.date,
  'company',
  fs.status,
  fs.type,
  fs.color,
  fs.details,
  'manual-workflow',
  'franchise-manual:' || fs.id,
  fs.assignee_profile_id,
  fs.manager_profile_id,
  fs.due_at,
  fs.remind_at,
  fs.completed_at,
  fs.metadata || jsonb_build_object('franchise_manual_origin', 'true'),
  fs.created_at,
  timezone('utc'::text, now())
from public.franchise_schedules fs
where fs.source_type is null
  and fs.source_id is null
on conflict (id) do update set
  source_type = 'manual-workflow',
  source_id = 'franchise-manual:' || excluded.id,
  metadata = excluded.metadata,
  updated_at = excluded.updated_at;

alter table public.franchise_store_visits
  drop constraint if exists franchise_store_visits_schedule_id_fkey;

alter table public.franchise_store_visits
  add constraint franchise_store_visits_schedule_id_fkey
  foreign key (schedule_id) references public.schedules(id) on delete set null
  not valid;

update public.franchise_store_visits v
set schedule_id = s.id
from public.schedules s
where s.company_id = v.company_id
  and (
    (s.source_type = 'supervision-visit' and s.source_id = v.id::text)
    or s.id = v.schedule_id
  );

alter table public.franchise_store_visits validate constraint franchise_store_visits_schedule_id_fkey;

update public.franchise_notifications
set action_url = replace(action_url, '/dashboard/franchise-operations/schedule?approvalDocumentId=', '/schedule?approvalDocumentId=')
where action_url like '/dashboard/franchise-operations/schedule?approvalDocumentId=%';

insert into public.franchise_schedule_migration_audit (phase, action, detail)
values ('rollback', 'restored_legacy_schedules', jsonb_build_object('preserved_manual_markers', true));

update public.franchise_schedule_migration_state
set phase = 'prepared',
    updated_at = timezone('utc'::text, now())
where id = true;

commit;
