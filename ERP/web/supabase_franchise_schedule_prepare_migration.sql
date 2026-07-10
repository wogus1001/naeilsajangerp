-- Franchise independent schedule PREPARE migration
-- SQL 등록 필요: run this file before deploying code that writes public.franchise_schedules.
-- Order: prepare SQL -> code deploy -> cutover SQL -> authenticated QA.
-- This script is idempotent and never deletes or rewrites public.schedules rows.

begin;

select pg_advisory_xact_lock(hashtext('franchise_schedule_migration'));

create extension if not exists "uuid-ossp";

create table if not exists public.franchise_schedule_migration_state (
  id boolean primary key default true,
  phase text not null check (phase in ('prepared', 'cutover')),
  prepared_at timestamp with time zone,
  cutover_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint franchise_schedule_migration_state_singleton check (id = true)
);

create table if not exists public.franchise_schedule_migration_backup (
  legacy_schedule_id text primary key,
  schedule_row jsonb not null,
  candidate_reason text not null,
  backed_up_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_schedule_migration_audit (
  id uuid default uuid_generate_v4() primary key,
  phase text not null,
  action text not null,
  legacy_schedule_id text,
  franchise_schedule_id text,
  source_type text,
  source_id text,
  detail jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_schedules (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  creator_profile_id uuid references public.profiles(id) on delete set null,
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  manager_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  date date not null,
  status text default '예정' not null,
  type text default 'manual' not null,
  color text default '#3182f6' not null,
  details text default '' not null,
  source_type text,
  source_id text,
  due_at timestamp with time zone,
  remind_at timestamp with time zone,
  completed_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint franchise_schedules_status_check check (status in ('예정', '진행중', '완료', '지연', '취소')),
  constraint franchise_schedules_source_pair_check check (
    (source_type is null and source_id is null) or (source_type is not null and source_id is not null)
  )
);

create unique index if not exists idx_franchise_schedules_source_unique
  on public.franchise_schedules (company_id, source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists idx_franchise_schedules_company_due
  on public.franchise_schedules (company_id, due_at);

create index if not exists idx_franchise_schedules_assignee_due
  on public.franchise_schedules (assignee_profile_id, due_at);

create index if not exists idx_franchise_schedules_manager_due
  on public.franchise_schedules (manager_profile_id, due_at);

create index if not exists idx_franchise_schedules_company_status_due
  on public.franchise_schedules (company_id, status, due_at);

create or replace function public.assert_franchise_schedule_manager_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manager_profile_id is not null and not exists (
    select 1
    from public.profiles p
    where p.id = new.manager_profile_id
      and p.company_id = new.company_id
      and p.role in ('admin', 'manager')
      and coalesce(p.status, 'active') = 'active'
  ) then
    raise exception 'FRANCHISE_SCHEDULE_MANAGER_ROLE_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_franchise_schedules_manager_role on public.franchise_schedules;
create trigger trg_franchise_schedules_manager_role
before insert or update on public.franchise_schedules
for each row execute function public.assert_franchise_schedule_manager_role();

alter table public.franchise_schedules enable row level security;

drop policy if exists "Company members can view franchise schedules" on public.franchise_schedules;
create policy "Company members can view franchise schedules" on public.franchise_schedules
  for select using (company_id = public.get_my_company_id());

drop policy if exists "Company members can insert manual franchise schedules" on public.franchise_schedules;
create policy "Company members can insert manual franchise schedules" on public.franchise_schedules
  for insert with check (company_id = public.get_my_company_id() and source_type is null and source_id is null);

drop policy if exists "Company members can update manual franchise schedules" on public.franchise_schedules;
create policy "Company members can update manual franchise schedules" on public.franchise_schedules
  for update using (company_id = public.get_my_company_id() and source_type is null and source_id is null)
  with check (company_id = public.get_my_company_id() and source_type is null and source_id is null);

drop policy if exists "Company members can delete manual franchise schedules" on public.franchise_schedules;
create policy "Company members can delete manual franchise schedules" on public.franchise_schedules
  for delete using (company_id = public.get_my_company_id() and source_type is null and source_id is null);

create or replace function public.normalize_franchise_schedule_status(
  raw_status text,
  raw_completed_at timestamp with time zone,
  default_status text
) returns text
language plpgsql
immutable
as $$
declare
  normalized text := lower(nullif(trim(coalesce(raw_status, '')), ''));
begin
  if raw_completed_at is not null or normalized in ('completed', 'done', '완료') then return '완료'; end if;
  if normalized in ('scheduled', 'pending', '예정') then return '예정'; end if;
  if normalized in ('progress', 'in_progress', 'ongoing', '진행중', '승인대기', '보고서대기') then return '진행중'; end if;
  if normalized in ('delayed', 'overdue', '지연') then return '지연'; end if;
  if normalized in ('cancelled', 'canceled', '취소') then return '취소'; end if;
  if normalized is null then return default_status; end if;
  raise exception 'UNSUPPORTED_FRANCHISE_SCHEDULE_STATUS: %', raw_status;
end;
$$;

create or replace function public.upsert_franchise_schedule_from_payload(schedule_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule_id text := coalesce(schedule_payload->>'id', uuid_generate_v4()::text);
  schedule_company uuid := (schedule_payload->>'company_id')::uuid;
  schedule_source_type text := nullif(schedule_payload->>'source_type', '');
  schedule_source_id text := nullif(schedule_payload->>'source_id', '');
begin
  if schedule_company is null then raise exception 'FRANCHISE_SCHEDULE_COMPANY_REQUIRED'; end if;
  if (schedule_source_type is null) <> (schedule_source_id is null) then raise exception 'FRANCHISE_SCHEDULE_PARTIAL_SOURCE'; end if;

  insert into public.franchise_schedules (
    id, company_id, creator_profile_id, assignee_profile_id, manager_profile_id, title, date, status, type, color,
    details, source_type, source_id, due_at, remind_at, completed_at, metadata, created_at, updated_at
  ) values (
    schedule_id,
    schedule_company,
    nullif(schedule_payload->>'creator_profile_id', '')::uuid,
    nullif(schedule_payload->>'assignee_profile_id', '')::uuid,
    nullif(schedule_payload->>'manager_profile_id', '')::uuid,
    schedule_payload->>'title',
    coalesce(nullif(schedule_payload->>'date', '')::date, (schedule_payload->>'due_at')::date),
    public.normalize_franchise_schedule_status(schedule_payload->>'status', nullif(schedule_payload->>'completed_at', '')::timestamp with time zone, '예정'),
    coalesce(nullif(schedule_payload->>'type', ''), 'workflow'),
    coalesce(nullif(schedule_payload->>'color', ''), '#3182f6'),
    coalesce(schedule_payload->>'details', ''),
    schedule_source_type,
    schedule_source_id,
    nullif(schedule_payload->>'due_at', '')::timestamp with time zone,
    nullif(schedule_payload->>'remind_at', '')::timestamp with time zone,
    nullif(schedule_payload->>'completed_at', '')::timestamp with time zone,
    coalesce(schedule_payload->'metadata', '{}'::jsonb),
    coalesce(nullif(schedule_payload->>'created_at', '')::timestamp with time zone, timezone('utc'::text, now())),
    timezone('utc'::text, now())
  )
  on conflict (id) do update set
    title = excluded.title,
    date = excluded.date,
    status = excluded.status,
    type = excluded.type,
    color = excluded.color,
    details = excluded.details,
    assignee_profile_id = excluded.assignee_profile_id,
    manager_profile_id = excluded.manager_profile_id,
    due_at = excluded.due_at,
    remind_at = excluded.remind_at,
    completed_at = excluded.completed_at,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at
  where public.franchise_schedules.company_id = excluded.company_id
    and (
      public.franchise_schedules.source_type is null
      or (public.franchise_schedules.source_type = excluded.source_type and public.franchise_schedules.source_id = excluded.source_id)
    );

  return schedule_id;
end;
$$;

do $$
declare
  partial_source_count integer;
  unsupported_status_count integer;
begin
  select count(*) into partial_source_count
  from public.schedules s
  where (s.source_type is null) <> (s.source_id is null);
  if partial_source_count > 0 then
    raise exception 'FRANCHISE_SCHEDULE_PARTIAL_SOURCE_ABORT: %', partial_source_count;
  end if;

  select count(*) into unsupported_status_count
  from public.schedules s
  where (
    s.source_type in ('approval-document', 'supervision-visit')
    or (
      s.source_type = 'manual-workflow'
      and s.source_id = 'franchise-manual:' || s.id
      and s.metadata->>'franchise_manual_origin' = 'true'
    )
    or exists (
      select 1 from public.franchise_store_visits v
      where v.schedule_id = s.id and s.source_type is null and s.source_id is null
    )
  )
  and s.status is not null
  and lower(trim(s.status)) not in (
    'scheduled', 'pending', '예정', 'progress', 'in_progress', 'ongoing', '진행중', '승인대기', '보고서대기',
    'completed', 'done', '완료', 'delayed', 'overdue', '지연', 'cancelled', 'canceled', '취소'
  );
  if unsupported_status_count > 0 then
    raise exception 'UNSUPPORTED_FRANCHISE_SCHEDULE_STATUS_ABORT: %', unsupported_status_count;
  end if;
end $$;

with candidates as (
  select
    s.*,
    case
      when s.source_type = 'approval-document' and s.source_id is not null then 'approval-document'
      when s.source_type = 'supervision-visit' and s.source_id is not null then 'supervision-visit'
      when s.source_type = 'manual-workflow'
        and s.source_id = 'franchise-manual:' || s.id
        and s.metadata->>'franchise_manual_origin' = 'true' then 'rollback-marker'
      when s.source_type is null and s.source_id is null and v.id is not null then 'visit-fk-repair'
      else null
    end as candidate_reason,
    coalesce(s.source_type, 'supervision-visit') as repaired_source_type,
    coalesce(s.source_id, v.id::text) as repaired_source_id,
    case when s.source_type = 'approval-document' then '진행중' else '예정' end as default_status
  from public.schedules s
  left join public.franchise_store_visits v on v.schedule_id = s.id
)
insert into public.franchise_schedule_migration_backup (legacy_schedule_id, schedule_row, candidate_reason)
select id, to_jsonb(candidates), candidate_reason
from candidates
where candidate_reason is not null
on conflict (legacy_schedule_id) do nothing;

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
)
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
  title = excluded.title,
  date = excluded.date,
  status = excluded.status,
  type = excluded.type,
  color = excluded.color,
  details = excluded.details,
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  due_at = excluded.due_at,
  remind_at = excluded.remind_at,
  completed_at = excluded.completed_at,
  metadata = excluded.metadata,
  updated_at = excluded.updated_at;

insert into public.franchise_schedule_migration_audit (phase, action, legacy_schedule_id, source_type, source_id, detail)
select 'prepare', 'excluded_source', s.id, s.source_type, s.source_id, jsonb_build_object('reason', 'not_exact_franchise_candidate')
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

create or replace function public.create_franchise_visit_with_schedule(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_payload jsonb := payload->'visit';
  schedule_payload jsonb := payload->'schedule';
  visit_id uuid := coalesce(nullif(visit_payload->>'id', '')::uuid, uuid_generate_v4());
  schedule_id text := coalesce(schedule_payload->>'id', uuid_generate_v4()::text);
  schedule_fk text := null;
  phase text;
begin
  select s.phase into phase from public.franchise_schedule_migration_state s where s.id = true;
  if (visit_payload->>'company_id') <> (schedule_payload->>'company_id') then raise exception 'FRANCHISE_SCHEDULE_COMPANY_MISMATCH'; end if;
  schedule_payload := jsonb_set(schedule_payload, '{id}', to_jsonb(schedule_id), true);
  schedule_payload := jsonb_set(schedule_payload, '{source_type}', to_jsonb('supervision-visit'::text), true);
  schedule_payload := jsonb_set(schedule_payload, '{source_id}', to_jsonb(visit_id::text), true);
  perform public.upsert_franchise_schedule_from_payload(schedule_payload);
  if phase = 'cutover' then schedule_fk := schedule_id; end if;

  insert into public.franchise_store_visits (
    id, company_id, location_id, supervisor_profile_id, assignment_id, schedule_id, visit_date, purpose, status,
    memo, data, created_by, updated_by
  ) values (
    visit_id,
    (visit_payload->>'company_id')::uuid,
    (visit_payload->>'location_id')::uuid,
    (visit_payload->>'supervisor_profile_id')::uuid,
    nullif(visit_payload->>'assignment_id', '')::uuid,
    schedule_fk,
    (visit_payload->>'visit_date')::date,
    coalesce(visit_payload->>'purpose', '정기점검'),
    coalesce(visit_payload->>'status', '예정'),
    visit_payload->>'memo',
    coalesce(visit_payload->'data', '{}'::jsonb),
    nullif(visit_payload->>'created_by', '')::uuid,
    nullif(visit_payload->>'updated_by', '')::uuid
  )
  on conflict (id) do update set
    schedule_id = excluded.schedule_id,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = timezone('utc'::text, now());

  return jsonb_build_object('visitId', visit_id, 'scheduleId', schedule_id, 'phase', phase);
end;
$$;

create or replace function public.persist_franchise_approval_with_schedule(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  document_payload jsonb := payload->'document';
  event_payload jsonb := payload->'event';
  schedule_payload jsonb := payload->'schedule';
  operation text := coalesce(payload->>'scheduleOperation', 'none');
  document_id uuid := coalesce(nullif(document_payload->>'id', '')::uuid, uuid_generate_v4());
  schedule_id text := null;
begin
  if operation <> 'none' and (document_payload->>'company_id') <> (schedule_payload->>'company_id') then
    raise exception 'FRANCHISE_SCHEDULE_COMPANY_MISMATCH';
  end if;

  insert into public.approval_documents (id, company_id, template_id, source_type, source_id, title, status, author_profile_id, approver_profile_id, reviewer_profile_id, values, reject_reason, data, created_by, updated_by)
  values (
    document_id, (document_payload->>'company_id')::uuid, nullif(document_payload->>'template_id', '')::uuid,
    document_payload->>'source_type', document_payload->>'source_id', document_payload->>'title',
    document_payload->>'status', nullif(document_payload->>'author_profile_id', '')::uuid,
    nullif(document_payload->>'approver_profile_id', '')::uuid, nullif(document_payload->>'reviewer_profile_id', '')::uuid,
    coalesce(document_payload->'values', '{}'::jsonb), document_payload->>'reject_reason',
    coalesce(document_payload->'data', '{}'::jsonb), nullif(document_payload->>'created_by', '')::uuid,
    nullif(document_payload->>'updated_by', '')::uuid
  )
  on conflict (id) do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = timezone('utc'::text, now());

  insert into public.approval_document_events (id, company_id, document_id, event_type, actor_profile_id, from_status, to_status, memo, data)
  values (
    coalesce(nullif(event_payload->>'id', '')::uuid, uuid_generate_v4()),
    (event_payload->>'company_id')::uuid,
    document_id,
    event_payload->>'event_type',
    nullif(event_payload->>'actor_profile_id', '')::uuid,
    event_payload->>'from_status',
    event_payload->>'to_status',
    coalesce(event_payload->>'memo', ''),
    coalesce(event_payload->'data', '{}'::jsonb)
  );

  if operation = 'upsert' then
    schedule_payload := jsonb_set(schedule_payload, '{source_type}', to_jsonb('approval-document'::text), true);
    schedule_payload := jsonb_set(schedule_payload, '{source_id}', to_jsonb(document_id::text), true);
    schedule_id := public.upsert_franchise_schedule_from_payload(schedule_payload);
  elsif operation = 'complete' then
    update public.franchise_schedules
    set status = '완료', completed_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
    where company_id = (document_payload->>'company_id')::uuid
      and source_type = 'approval-document'
      and source_id = document_id::text
    returning id into schedule_id;
  elsif operation <> 'none' then
    raise exception 'FRANCHISE_SCHEDULE_OPERATION_UNSUPPORTED';
  end if;

  return jsonb_build_object('documentId', document_id, 'scheduleId', schedule_id, 'status', document_payload->>'status');
end;
$$;

create or replace function public.persist_franchise_report_with_schedule(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_payload jsonb := payload->'report';
  report_event jsonb := payload->'reportEvent';
  visit_update jsonb := payload->'visitUpdate';
  schedule_payload jsonb := payload->'schedule';
  operation text := coalesce(payload->>'scheduleOperation', 'none');
  report_id uuid := coalesce(nullif(report_payload->>'id', '')::uuid, uuid_generate_v4());
  schedule_id text := null;
begin
  if operation <> 'none' and (report_payload->>'company_id') <> (schedule_payload->>'company_id') then
    raise exception 'FRANCHISE_SCHEDULE_COMPANY_MISMATCH';
  end if;

  insert into public.franchise_inspection_reports (id, company_id, location_id, supervisor_profile_id, visit_id, status, inspection_items, photo_attachments, special_note, data, created_by, updated_by)
  values (
    report_id, (report_payload->>'company_id')::uuid, (report_payload->>'location_id')::uuid,
    (report_payload->>'supervisor_profile_id')::uuid, nullif(report_payload->>'visit_id', '')::uuid,
    report_payload->>'status', coalesce(report_payload->'inspection_items', '[]'::jsonb),
    coalesce(report_payload->'photo_attachments', '[]'::jsonb), report_payload->>'special_note',
    coalesce(report_payload->'data', '{}'::jsonb), nullif(report_payload->>'created_by', '')::uuid,
    nullif(report_payload->>'updated_by', '')::uuid
  )
  on conflict (id) do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = timezone('utc'::text, now());

  update public.franchise_store_visits
  set status = coalesce(visit_update->>'status', status), updated_at = timezone('utc'::text, now())
  where id = nullif(visit_update->>'id', '')::uuid
    and company_id = (report_payload->>'company_id')::uuid;

  insert into public.franchise_schedule_migration_audit (phase, action, franchise_schedule_id, detail)
  values ('prepare', 'report_event', report_id::text, coalesce(report_event, '{}'::jsonb));

  if operation = 'upsert' then
    schedule_payload := jsonb_set(schedule_payload, '{source_type}', to_jsonb('inspection-report'::text), true);
    schedule_payload := jsonb_set(schedule_payload, '{source_id}', to_jsonb(report_id::text), true);
    schedule_id := public.upsert_franchise_schedule_from_payload(schedule_payload);
  elsif operation = 'complete' then
    update public.franchise_schedules
    set status = '완료', completed_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
    where company_id = (report_payload->>'company_id')::uuid
      and source_type in ('inspection-report', 'supervision-visit')
      and source_id in (report_id::text, report_payload->>'visit_id')
    returning id into schedule_id;
  elsif operation <> 'none' then
    raise exception 'FRANCHISE_SCHEDULE_OPERATION_UNSUPPORTED';
  end if;

  return jsonb_build_object('reportId', report_id, 'scheduleId', schedule_id, 'status', report_payload->>'status');
end;
$$;

create or replace function public.persist_franchise_corrective_action(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  operation text := payload->>'operation';
  action_payload jsonb := payload->'action';
  action_id uuid := coalesce(nullif(action_payload->>'id', '')::uuid, uuid_generate_v4());
begin
  if operation not in ('insert', 'update') then raise exception 'FRANCHISE_CORRECTIVE_ACTION_OPERATION_UNSUPPORTED'; end if;
  insert into public.franchise_corrective_actions (id, company_id, report_id, inspection_item_id, location_id, assignee_profile_id, status, title, memo, due_date, data, created_by, updated_by)
  values (
    action_id, (action_payload->>'company_id')::uuid, nullif(action_payload->>'report_id', '')::uuid,
    action_payload->>'inspection_item_id', (action_payload->>'location_id')::uuid,
    nullif(action_payload->>'assignee_profile_id', '')::uuid, coalesce(action_payload->>'status', '요청'),
    action_payload->>'title', action_payload->>'memo', nullif(action_payload->>'due_date', '')::date,
    coalesce(action_payload->'data', '{}'::jsonb), nullif(action_payload->>'created_by', '')::uuid,
    nullif(action_payload->>'updated_by', '')::uuid
  )
  on conflict (id) do update set
    status = excluded.status,
    memo = excluded.memo,
    due_date = excluded.due_date,
    updated_by = excluded.updated_by,
    updated_at = timezone('utc'::text, now());

  insert into public.franchise_schedule_migration_audit (phase, action, franchise_schedule_id, detail)
  values ('prepare', 'corrective_action_event', action_id::text, coalesce(payload->'event', '{}'::jsonb));
  return jsonb_build_object('actionId', action_id, 'status', action_payload->>'status');
end;
$$;

revoke execute on function public.create_franchise_visit_with_schedule(jsonb) from public, anon, authenticated;
revoke execute on function public.persist_franchise_approval_with_schedule(jsonb) from public, anon, authenticated;
revoke execute on function public.persist_franchise_report_with_schedule(jsonb) from public, anon, authenticated;
revoke execute on function public.persist_franchise_corrective_action(jsonb) from public, anon, authenticated;
grant execute on function public.create_franchise_visit_with_schedule(jsonb) to service_role;
grant execute on function public.persist_franchise_approval_with_schedule(jsonb) to service_role;
grant execute on function public.persist_franchise_report_with_schedule(jsonb) to service_role;
grant execute on function public.persist_franchise_corrective_action(jsonb) to service_role;

insert into public.franchise_schedule_migration_state (id, phase, prepared_at, updated_at)
values (true, 'prepared', timezone('utc'::text, now()), timezone('utc'::text, now()))
on conflict (id) do update set
  phase = case when public.franchise_schedule_migration_state.phase = 'cutover' then 'cutover' else 'prepared' end,
  prepared_at = coalesce(public.franchise_schedule_migration_state.prepared_at, excluded.prepared_at),
  updated_at = timezone('utc'::text, now());

commit;
