begin;

create extension if not exists "uuid-ossp";

insert into storage.buckets (id, name, public)
values ('approval-documents', 'approval-documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('franchise-supervision-private', 'franchise-supervision-private', false)
on conflict (id) do update set public = false;

create table if not exists public.approval_templates (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  description text default '' not null,
  document_type text default 'general' not null,
  fields jsonb default '[]'::jsonb not null,
  approver_profile_ids jsonb default '[]'::jsonb not null,
  completion_rule jsonb default '{}'::jsonb not null,
  active boolean default true not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.approval_documents (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  template_id uuid references public.approval_templates(id) on delete set null,
  source_type text,
  source_id text,
  title text not null,
  status text default '임시저장' not null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  approver_profile_id uuid references public.profiles(id) on delete set null,
  reviewer_profile_id uuid references public.profiles(id) on delete set null,
  values jsonb default '{}'::jsonb not null,
  reject_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  completed_at timestamptz,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.approval_document_events (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  document_id uuid references public.approval_documents(id) on delete cascade not null,
  event_type text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text,
  memo text default '' not null,
  data jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.approval_templates
  add column if not exists template_key text,
  add column if not exists category text default 'general' not null,
  add column if not exists security_level text default 'company' not null,
  add column if not exists retention_years integer default 5 not null,
  add column if not exists current_version_id uuid,
  add column if not exists deleted_at timestamptz;

update public.approval_templates
set template_key = 'legacy_' || replace(id::text, '-', '')
where template_key is null or btrim(template_key) = '';

alter table public.approval_templates
  alter column template_key set not null,
  alter column template_key set default 'custom_' || replace(uuid_generate_v4()::text, '-', '');

alter table public.approval_templates drop constraint if exists approval_templates_security_level_check;
alter table public.approval_templates add constraint approval_templates_security_level_check
  check (security_level in ('company', 'restricted', 'confidential'));
alter table public.approval_templates drop constraint if exists approval_templates_retention_years_check;
alter table public.approval_templates add constraint approval_templates_retention_years_check
  check (retention_years between 1 and 30);
alter table public.approval_templates drop constraint if exists approval_templates_fields_array_check;
alter table public.approval_templates add constraint approval_templates_fields_array_check
  check (jsonb_typeof(fields) = 'array');

alter table public.approval_documents
  add column if not exists category text default 'general' not null,
  add column if not exists security_level text default 'company' not null,
  add column if not exists retention_until date,
  add column if not exists current_version_id uuid,
  add column if not exists current_step_order integer,
  add column if not exists due_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_by uuid references public.profiles(id) on delete set null,
  add column if not exists withdrawal_reason text,
  add column if not exists canceled_at timestamptz,
  add column if not exists canceled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancel_reason text;

alter table public.approval_documents drop constraint if exists approval_documents_status_check;
alter table public.approval_documents add constraint approval_documents_status_check
  check (status in ('임시저장', '제출', '승인', '반려', '완료처리', '회수', '취소'));
alter table public.approval_documents drop constraint if exists approval_documents_security_level_check;
alter table public.approval_documents add constraint approval_documents_security_level_check
  check (security_level in ('company', 'restricted', 'confidential'));
alter table public.approval_documents drop constraint if exists approval_documents_current_step_check;
alter table public.approval_documents add constraint approval_documents_current_step_check
  check (current_step_order is null or current_step_order > 0);

alter table public.approval_document_events
  add column if not exists document_version_id uuid,
  add column if not exists document_step_id uuid,
  add column if not exists action_key text,
  add column if not exists actor_snapshot jsonb default '{}'::jsonb not null,
  add column if not exists payload jsonb default '{}'::jsonb not null;

alter table public.approval_document_events drop constraint if exists approval_document_events_type_check;
alter table public.approval_document_events add constraint approval_document_events_type_check
  check (event_type in (
    '임시저장', '제출', '승인', '반려', '재제출', '완료처리',
    '합의', '비합의', '회수', '확인', '취소'
  ));

create unique index if not exists approval_templates_company_id_id_key
  on public.approval_templates(company_id, id);
create unique index if not exists approval_templates_company_template_key_key
  on public.approval_templates(company_id, template_key);
create unique index if not exists approval_documents_company_id_id_key
  on public.approval_documents(company_id, id);

create table if not exists public.organization_units (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid,
  code text,
  name text not null,
  description text default '' not null,
  manager_profile_id uuid references public.profiles(id) on delete set null,
  sort_order integer default 0 not null,
  active boolean default true not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique (company_id, id),
  unique (company_id, parent_id, name),
  foreign key (company_id, parent_id)
    references public.organization_units(company_id, id) on delete restrict,
  check (parent_id is null or parent_id <> id),
  check (btrim(name) <> '')
);

create unique index if not exists organization_units_company_code_key
  on public.organization_units(company_id, code)
  where code is not null;

create table if not exists public.organization_memberships (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  unit_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_title text default '' not null,
  position_rank integer default 0 not null,
  is_primary boolean default false not null,
  active boolean default true not null,
  starts_on date,
  ends_on date,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique (company_id, unit_id, profile_id),
  foreign key (company_id, unit_id)
    references public.organization_units(company_id, id) on delete cascade,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create unique index if not exists organization_memberships_primary_profile_key
  on public.organization_memberships(company_id, profile_id)
  where is_primary and active;

create table if not exists public.approval_role_assignments (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  role_key text not null,
  role_name text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  unit_id uuid,
  active_from timestamptz,
  active_until timestamptz,
  active boolean default true not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  foreign key (company_id, unit_id)
    references public.organization_units(company_id, id) on delete cascade,
  check (btrim(role_key) <> ''),
  check (active_until is null or active_from is null or active_until >= active_from)
);

create unique index if not exists approval_role_assignments_scope_key
  on public.approval_role_assignments(company_id, role_key, profile_id, coalesce(unit_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.approval_delegations (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  delegator_profile_id uuid not null references public.profiles(id) on delete cascade,
  delegate_profile_id uuid not null references public.profiles(id) on delete cascade,
  action_scope text[] default array['approval', 'agreement', 'acknowledgement']::text[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text default '' not null,
  active boolean default true not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  check (delegator_profile_id <> delegate_profile_id),
  check (ends_at > starts_at),
  check (action_scope <@ array['approval', 'agreement', 'acknowledgement']::text[]),
  unique (company_id, delegator_profile_id, delegate_profile_id, starts_at)
);

create table if not exists public.approval_template_versions (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null,
  version_number integer not null,
  status text default 'draft' not null,
  name text not null,
  description text default '' not null,
  category text default 'general' not null,
  security_level text default 'company' not null,
  retention_years integer default 5 not null,
  fields jsonb default '[]'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (company_id, id),
  unique (template_id, version_number),
  foreign key (company_id, template_id)
    references public.approval_templates(company_id, id) on delete cascade,
  check (version_number > 0),
  check (status in ('draft', 'published', 'retired')),
  check (security_level in ('company', 'restricted', 'confidential')),
  check (retention_years between 1 and 30),
  check (jsonb_typeof(fields) = 'array')
);

create table if not exists public.approval_template_steps (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  template_version_id uuid not null,
  step_order integer not null,
  step_key text not null,
  name text not null,
  action_kind text default 'approval' not null,
  completion_mode text default 'sequential' not null,
  target_type text not null,
  target_config jsonb default '{}'::jsonb not null,
  due_hours integer,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (template_version_id, step_order),
  unique (template_version_id, step_key),
  foreign key (company_id, template_version_id)
    references public.approval_template_versions(company_id, id) on delete cascade,
  check (step_order > 0),
  check (btrim(step_key) <> ''),
  check (action_kind in ('approval', 'agreement', 'acknowledgement')),
  check (completion_mode in ('sequential', 'parallel_all', 'parallel_any')),
  check (target_type in ('profiles', 'role', 'unit_manager', 'unit_members', 'author_manager')),
  check (due_hours is null or due_hours > 0),
  check (jsonb_typeof(target_config) = 'object')
);

create table if not exists public.approval_document_versions (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null,
  version_number integer not null,
  template_version_id uuid,
  title text not null,
  values jsonb default '{}'::jsonb not null,
  body jsonb default '{}'::jsonb not null,
  organization_snapshot jsonb default '{}'::jsonb not null,
  steps_snapshot jsonb default '[]'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (company_id, id),
  unique (document_id, version_number),
  foreign key (company_id, document_id)
    references public.approval_documents(company_id, id) on delete cascade,
  foreign key (company_id, template_version_id)
    references public.approval_template_versions(company_id, id) on delete restrict,
  check (version_number > 0),
  check (jsonb_typeof(values) = 'object'),
  check (jsonb_typeof(body) = 'object'),
  check (jsonb_typeof(organization_snapshot) = 'object'),
  check (jsonb_typeof(steps_snapshot) = 'array')
);

create table if not exists public.approval_document_steps (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null,
  document_version_id uuid not null,
  template_step_id uuid references public.approval_template_steps(id) on delete set null,
  step_order integer not null,
  step_key text not null,
  name text not null,
  action_kind text not null,
  completion_mode text not null,
  status text default 'pending' not null,
  targets jsonb default '[]'::jsonb not null,
  responses jsonb default '[]'::jsonb not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique (document_version_id, step_order),
  foreign key (company_id, document_id)
    references public.approval_documents(company_id, id) on delete cascade,
  foreign key (company_id, document_version_id)
    references public.approval_document_versions(company_id, id) on delete cascade,
  check (step_order > 0),
  check (action_kind in ('approval', 'agreement', 'acknowledgement')),
  check (completion_mode in ('sequential', 'parallel_all', 'parallel_any')),
  check (status in ('pending', 'active', 'approved', 'rejected', 'agreed', 'disagreed', 'acknowledged', 'skipped')),
  check (jsonb_typeof(targets) = 'array'),
  check (jsonb_typeof(responses) = 'array')
);

create table if not exists public.approval_document_readers (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  can_download boolean default false not null,
  first_read_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (document_id, profile_id),
  foreign key (company_id, document_id)
    references public.approval_documents(company_id, id) on delete cascade
);

create table if not exists public.approval_attachments (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null,
  document_version_id uuid,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text default 'application/octet-stream' not null,
  size_bytes bigint not null,
  sha256 text,
  security_level text default 'company' not null,
  retention_until date,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (company_id, storage_bucket, storage_path),
  foreign key (company_id, document_id)
    references public.approval_documents(company_id, id) on delete cascade,
  foreign key (company_id, document_version_id)
    references public.approval_document_versions(company_id, id) on delete restrict,
  check (btrim(file_name) <> ''),
  check (btrim(storage_bucket) <> ''),
  check (btrim(storage_path) <> ''),
  check (size_bytes > 0),
  check (security_level in ('company', 'restricted', 'confidential'))
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'approval_templates_current_version_fk') then
    alter table public.approval_templates add constraint approval_templates_current_version_fk
      foreign key (company_id, current_version_id)
      references public.approval_template_versions(company_id, id) on delete set null (current_version_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'approval_documents_current_version_fk') then
    alter table public.approval_documents add constraint approval_documents_current_version_fk
      foreign key (company_id, current_version_id)
      references public.approval_document_versions(company_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'approval_document_events_version_fk') then
    alter table public.approval_document_events add constraint approval_document_events_version_fk
      foreign key (document_version_id) references public.approval_document_versions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'approval_document_events_step_fk') then
    alter table public.approval_document_events add constraint approval_document_events_step_fk
      foreign key (document_step_id) references public.approval_document_steps(id) on delete set null;
  end if;
end $$;

create index if not exists idx_organization_units_company_parent
  on public.organization_units(company_id, parent_id, active, sort_order);
create index if not exists idx_organization_memberships_profile
  on public.organization_memberships(company_id, profile_id, active);
create index if not exists idx_approval_role_assignments_lookup
  on public.approval_role_assignments(company_id, role_key, unit_id, active);
create index if not exists idx_approval_delegations_delegate_period
  on public.approval_delegations(company_id, delegate_profile_id, starts_at, ends_at) where active;
create index if not exists idx_approval_template_versions_template
  on public.approval_template_versions(company_id, template_id, version_number desc);
create index if not exists idx_approval_template_steps_version_order
  on public.approval_template_steps(company_id, template_version_id, step_order);
create index if not exists idx_approval_document_versions_document
  on public.approval_document_versions(company_id, document_id, version_number desc);
create index if not exists idx_approval_document_steps_active
  on public.approval_document_steps(company_id, document_id, status, step_order);
create index if not exists idx_approval_document_readers_profile
  on public.approval_document_readers(company_id, profile_id, created_at desc);
create index if not exists idx_approval_attachments_document
  on public.approval_attachments(company_id, document_id, created_at desc);
create index if not exists idx_approval_documents_company_due
  on public.approval_documents(company_id, status, due_at) where due_at is not null;
create unique index if not exists idx_approval_documents_source_unique
  on public.approval_documents(company_id, source_type, source_id)
  where source_type is not null and source_id is not null;
create index if not exists idx_approval_documents_retention
  on public.approval_documents(company_id, retention_until) where retention_until is not null;

do $$
declare
  legacy_document public.approval_documents%rowtype;
  legacy_version_id uuid;
  legacy_step_status text;
  legacy_action text;
  legacy_responses jsonb;
  legacy_approver_id uuid;
begin
  for legacy_document in
    select d.*
    from public.approval_documents d
    where d.current_version_id is null
      and d.status in ('제출', '승인', '반려', '완료처리')
  loop
    legacy_approver_id := legacy_document.approver_profile_id;
    if legacy_approver_id is null then
      select p.id into legacy_approver_id
      from public.profiles p
      where p.company_id = legacy_document.company_id
        and p.role in ('admin', 'manager')
        and p.status = 'active'
        and p.id <> legacy_document.author_profile_id
      order by case when p.role = 'manager' then 0 else 1 end, p.created_at
      limit 1;
    end if;
    if legacy_approver_id is null then continue; end if;
    insert into public.approval_document_versions (
      company_id, document_id, version_number, template_version_id,
      title, values, body, organization_snapshot, steps_snapshot,
      submitted_at, created_by, created_at
    ) values (
      legacy_document.company_id, legacy_document.id, 1, null,
      legacy_document.title, legacy_document.values, legacy_document.data,
      jsonb_build_object('captured_at', coalesce(legacy_document.submitted_at, legacy_document.updated_at), 'legacy', true),
      '[]'::jsonb,
      coalesce(legacy_document.submitted_at, legacy_document.updated_at),
      coalesce(legacy_document.created_by, legacy_document.author_profile_id),
      legacy_document.created_at
    ) returning id into legacy_version_id;

    legacy_step_status := case legacy_document.status
      when '제출' then 'active'
      when '반려' then 'rejected'
      else 'approved'
    end;
    legacy_action := case when legacy_document.status = '반려' then 'reject' else 'approve' end;
    legacy_responses := case when legacy_document.status = '제출' then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
      'actor_profile_id', coalesce(legacy_document.reviewer_profile_id, legacy_approver_id),
      'target_profile_id', legacy_approver_id,
      'action', legacy_action,
      'memo', coalesce(legacy_document.reject_reason, ''),
      'occurred_at', coalesce(legacy_document.reviewed_at, legacy_document.updated_at)
    )) end;

    insert into public.approval_document_steps (
      company_id, document_id, document_version_id, step_order, step_key,
      name, action_kind, completion_mode, status, targets, responses,
      started_at, completed_at, created_at, updated_at
    ) values (
      legacy_document.company_id, legacy_document.id, legacy_version_id, 1, 'legacy_approval',
      '기존 결재', 'approval', 'sequential', legacy_step_status,
      jsonb_build_array(jsonb_build_object(
        'profile_id', legacy_approver_id,
        'profile_name', coalesce((select p.name from public.profiles p where p.id = legacy_approver_id), ''),
        'unit_id', null, 'unit_name', '', 'role_key', 'legacy_approver',
        'delegate_profile_ids', '[]'::jsonb
      )),
      legacy_responses,
      coalesce(legacy_document.submitted_at, legacy_document.updated_at),
      case when legacy_document.status = '제출' then null else coalesce(legacy_document.reviewed_at, legacy_document.updated_at) end,
      legacy_document.created_at, legacy_document.updated_at
    );

    update public.approval_documents
    set current_version_id = legacy_version_id,
        current_step_order = case when legacy_document.status = '제출' then 1 else null end,
        approver_profile_id = legacy_approver_id
    where id = legacy_document.id;
  end loop;
end $$;

create or replace function public.is_approval_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = target_company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
  );
$$;

create or replace function public.can_manage_company_approvals(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = target_company_id
      and p.status = 'active'
      and (
        p.role = 'admin'
        or exists (
          select 1
          from public.approval_role_assignments a
          where a.company_id = target_company_id
            and a.profile_id = p.id
            and a.role_key = 'approval_admin'
            and a.unit_id is null
            and a.active
            and (a.active_from is null or a.active_from <= timezone('utc'::text, now()))
            and (a.active_until is null or a.active_until >= timezone('utc'::text, now()))
        )
      )
  );
$$;

create or replace function public.can_read_approval_document(target_document_id uuid, target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approval_company_member(target_company_id)
    and exists (
      select 1
      from public.approval_documents d
      join public.profiles p on p.id = auth.uid()
      where d.id = target_document_id
        and d.company_id = target_company_id
        and (
          public.can_manage_company_approvals(target_company_id)
          or d.author_profile_id = auth.uid()
          or d.approver_profile_id = auth.uid()
          or exists (
            select 1
            from public.approval_document_readers r
            where r.document_id = d.id
              and r.company_id = d.company_id
              and r.profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.approval_document_steps s
            cross join lateral jsonb_array_elements(s.targets) target
            where s.document_id = d.id
              and s.company_id = d.company_id
              and (
                target ->> 'profile_id' = auth.uid()::text
                or coalesce(target -> 'delegate_profile_ids', '[]'::jsonb) ? auth.uid()::text
              )
          )
        )
    );
$$;

drop policy if exists approval_documents_storage_select on storage.objects;
drop policy if exists approval_documents_storage_insert on storage.objects;
drop policy if exists approval_documents_storage_delete on storage.objects;

create or replace function public.ensure_approval_profiles_match_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  profile_column text;
  profile_value text;
begin
  foreach profile_column in array tg_argv loop
    profile_value := to_jsonb(new) ->> profile_column;
    if profile_value is not null and not exists (
      select 1
      from public.profiles p
      where p.id = profile_value::uuid
        and p.company_id = new.company_id
    ) then
      raise exception using errcode = '23514', message = profile_column || ' must belong to the approval company';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists organization_units_company_profiles on public.organization_units;
create trigger organization_units_company_profiles before insert or update on public.organization_units
  for each row execute function public.ensure_approval_profiles_match_company('manager_profile_id', 'created_by', 'updated_by');
drop trigger if exists organization_memberships_company_profiles on public.organization_memberships;
create trigger organization_memberships_company_profiles before insert or update on public.organization_memberships
  for each row execute function public.ensure_approval_profiles_match_company('profile_id');
drop trigger if exists approval_role_assignments_company_profiles on public.approval_role_assignments;
create trigger approval_role_assignments_company_profiles before insert or update on public.approval_role_assignments
  for each row execute function public.ensure_approval_profiles_match_company('profile_id', 'created_by');
drop trigger if exists approval_delegations_company_profiles on public.approval_delegations;
create trigger approval_delegations_company_profiles before insert or update on public.approval_delegations
  for each row execute function public.ensure_approval_profiles_match_company('delegator_profile_id', 'delegate_profile_id', 'created_by');
drop trigger if exists approval_document_readers_company_profiles on public.approval_document_readers;
create trigger approval_document_readers_company_profiles before insert or update on public.approval_document_readers
  for each row execute function public.ensure_approval_profiles_match_company('profile_id', 'granted_by');
drop trigger if exists approval_attachments_company_profiles on public.approval_attachments;
create trigger approval_attachments_company_profiles before insert or update on public.approval_attachments
  for each row execute function public.ensure_approval_profiles_match_company('uploaded_by');
drop trigger if exists approval_templates_company_profiles on public.approval_templates;
create trigger approval_templates_company_profiles before insert or update on public.approval_templates
  for each row execute function public.ensure_approval_profiles_match_company('created_by', 'updated_by');
drop trigger if exists approval_template_versions_company_profiles on public.approval_template_versions;
create trigger approval_template_versions_company_profiles before insert or update on public.approval_template_versions
  for each row execute function public.ensure_approval_profiles_match_company('created_by');
drop trigger if exists approval_documents_company_profiles on public.approval_documents;
create trigger approval_documents_company_profiles before insert or update on public.approval_documents
  for each row execute function public.ensure_approval_profiles_match_company(
    'author_profile_id', 'approver_profile_id', 'reviewer_profile_id', 'created_by', 'updated_by',
    'withdrawn_by', 'canceled_by'
  );
drop trigger if exists approval_document_versions_company_profiles on public.approval_document_versions;
create trigger approval_document_versions_company_profiles before insert or update on public.approval_document_versions
  for each row execute function public.ensure_approval_profiles_match_company('created_by');
drop trigger if exists approval_document_events_company_profiles on public.approval_document_events;
create trigger approval_document_events_company_profiles before insert or update on public.approval_document_events
  for each row execute function public.ensure_approval_profiles_match_company('actor_profile_id');

create or replace function public.protect_submitted_approval_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.submitted_at is not null then
    raise exception using errcode = '55000', message = 'submitted approval document versions are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists approval_document_versions_immutable on public.approval_document_versions;
create trigger approval_document_versions_immutable
  before update or delete on public.approval_document_versions
  for each row execute function public.protect_submitted_approval_version();

create or replace function public.protect_published_approval_template_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'published' then
    raise exception using errcode = '55000', message = 'published approval template versions are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists approval_template_versions_immutable on public.approval_template_versions;
create trigger approval_template_versions_immutable
  before update or delete on public.approval_template_versions
  for each row execute function public.protect_published_approval_template_version();

create or replace function public.resolve_approval_step_targets(
  target_company_id uuid,
  author_profile_id uuid,
  target_type text,
  target_config jsonb,
  action_kind text,
  effective_at timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target_profiles as (
    select parsed.profile_id, ''::text as role_key
    from (
      select case
        when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then value::uuid
        else null
      end as profile_id
      from jsonb_array_elements_text(coalesce(target_config -> 'profile_ids', '[]'::jsonb)) value
    ) parsed
    where target_type = 'profiles' and parsed.profile_id is not null
    union all
    select a.profile_id, a.role_key
    from public.approval_role_assignments a
    where target_type = 'role'
      and a.company_id = target_company_id
      and a.role_key = target_config ->> 'role_key'
      and a.active
      and (a.active_from is null or a.active_from <= effective_at)
      and (a.active_until is null or a.active_until >= effective_at)
      and (
        nullif(target_config ->> 'unit_id', '') is null
        or a.unit_id = (target_config ->> 'unit_id')::uuid
      )
    union all
    select u.manager_profile_id, 'unit_manager'
    from public.organization_units u
    where target_type = 'unit_manager'
      and u.company_id = target_company_id
      and u.id = (target_config ->> 'unit_id')::uuid
      and u.active
      and u.manager_profile_id is not null
    union all
    select m.profile_id, 'unit_member'
    from public.organization_memberships m
    where target_type = 'unit_members'
      and m.company_id = target_company_id
      and m.unit_id = (target_config ->> 'unit_id')::uuid
      and m.active
    union all
    select u.manager_profile_id, 'author_manager'
    from public.organization_memberships m
    join public.organization_units u
      on u.company_id = m.company_id and u.id = m.unit_id
    where target_type = 'author_manager'
      and m.company_id = target_company_id
      and m.profile_id = author_profile_id
      and m.active and m.is_primary and u.active
      and u.manager_profile_id is not null
  ), distinct_targets as (
    select distinct on (profile_id) profile_id, role_key
    from target_profiles
    where profile_id is not null
    order by profile_id, role_key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'profile_id', t.profile_id,
    'profile_name', coalesce(p.name, p.email, ''),
    'unit_id', m.unit_id,
    'unit_name', coalesce(u.name, ''),
    'role_key', t.role_key,
    'delegate_profile_ids', coalesce((
      select jsonb_agg(d.delegate_profile_id::text order by d.delegate_profile_id::text)
      from public.approval_delegations d
      where d.company_id = target_company_id
        and d.delegator_profile_id = t.profile_id
        and d.active
        and action_kind = any(d.action_scope)
        and d.starts_at <= effective_at
        and d.ends_at >= effective_at
    ), '[]'::jsonb)
  ) order by t.profile_id::text), '[]'::jsonb)
  from distinct_targets t
  join public.profiles p on p.id = t.profile_id and p.company_id = target_company_id
    and p.status = 'active'
    and p.role <> 'partner_vendor'
    and (action_kind <> 'approval' or p.id <> author_profile_id)
  left join lateral (
    select membership.unit_id
    from public.organization_memberships membership
    where membership.company_id = target_company_id
      and membership.profile_id = t.profile_id
      and membership.active
    order by membership.is_primary desc, membership.position_rank desc
    limit 1
  ) m on true
  left join public.organization_units u
    on u.company_id = target_company_id and u.id = m.unit_id;
$$;

create or replace function public.protect_published_approval_template_steps()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  version_id uuid;
begin
  if tg_op = 'DELETE' then
    version_id := old.template_version_id;
  else
    version_id := new.template_version_id;
  end if;
  if exists (
    select 1 from public.approval_template_versions v
    where v.id = version_id and v.status = 'published'
  ) then
    raise exception using errcode = '55000', message = 'published approval template steps are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists approval_template_steps_immutable on public.approval_template_steps;
create trigger approval_template_steps_immutable
  before insert or update or delete on public.approval_template_steps
  for each row execute function public.protect_published_approval_template_steps();

alter table public.organization_units enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.approval_role_assignments enable row level security;
alter table public.approval_delegations enable row level security;
alter table public.approval_templates enable row level security;
alter table public.approval_template_versions enable row level security;
alter table public.approval_template_steps enable row level security;
alter table public.approval_documents enable row level security;
alter table public.approval_document_versions enable row level security;
alter table public.approval_document_steps enable row level security;
alter table public.approval_document_readers enable row level security;
alter table public.approval_attachments enable row level security;
alter table public.approval_document_events enable row level security;

drop policy if exists "Company members can view franchise_inspection_reports" on public.franchise_inspection_reports;
create policy "Company members can view franchise_inspection_reports" on public.franchise_inspection_reports
  for select using (
    public.is_approval_company_member(company_id)
    and (
      supervisor_profile_id = auth.uid()
      or created_by = auth.uid()
      or exists (
        select 1
        from public.profiles requester
        where requester.id = auth.uid()
          and requester.company_id = franchise_inspection_reports.company_id
          and requester.status = 'active'
          and requester.role in ('admin', 'manager')
      )
    )
  );

drop policy if exists "Company members can write franchise_inspection_reports" on public.franchise_inspection_reports;

drop policy if exists "Company members can view franchise_supervision_report_events" on public.franchise_supervision_report_events;
create policy "Company members can view franchise_supervision_report_events" on public.franchise_supervision_report_events
  for select using (
    public.is_approval_company_member(company_id)
    and exists (
      select 1
      from public.franchise_inspection_reports report
      where report.id = franchise_supervision_report_events.report_id
        and report.company_id = franchise_supervision_report_events.company_id
    )
  );

drop policy if exists "Company members can insert franchise_supervision_report_events" on public.franchise_supervision_report_events;

drop policy if exists "Company members can view schedules" on public.schedules;
create policy "Company members can view schedules" on public.schedules
  for select using (
    public.is_approval_company_member(company_id)
    and (
      source_type is distinct from 'approval-document'
      or user_id = auth.uid()
      or assignee_profile_id = auth.uid()
      or coalesce(metadata -> 'targetProfileIds', '[]'::jsonb) ? auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.company_id = public.schedules.company_id
          and p.status = 'active' and p.role = 'admin'
      )
    )
  );

drop policy if exists "Company members can insert schedules" on public.schedules;
create policy "Company members can insert schedules" on public.schedules
  for insert with check (
    public.is_approval_company_member(company_id)
    and source_type is null
    and exists (
      select 1 from public.profiles owner
      where owner.id = user_id
        and owner.company_id = schedules.company_id
        and owner.status = 'active'
        and owner.role <> 'partner_vendor'
    )
    and (
      scope is distinct from 'personal'
      or user_id = auth.uid()
      or exists (
        select 1 from public.profiles actor
        where actor.id = auth.uid()
          and actor.company_id = schedules.company_id
          and actor.status = 'active'
          and actor.role = 'admin'
      )
    )
  );

drop policy if exists "Company members can update schedules" on public.schedules;
create policy "Company members can update schedules" on public.schedules
  for update using (
    public.is_approval_company_member(company_id)
    and source_type is null
    and (
      scope is distinct from 'personal'
      or user_id = auth.uid()
      or exists (
        select 1 from public.profiles actor
        where actor.id = auth.uid()
          and actor.company_id = schedules.company_id
          and actor.status = 'active'
          and actor.role = 'admin'
      )
    )
  )
  with check (
    public.is_approval_company_member(company_id)
    and source_type is null
    and exists (
      select 1 from public.profiles owner
      where owner.id = user_id
        and owner.company_id = schedules.company_id
        and owner.status = 'active'
        and owner.role <> 'partner_vendor'
    )
    and (
      scope is distinct from 'personal'
      or user_id = auth.uid()
      or exists (
        select 1 from public.profiles actor
        where actor.id = auth.uid()
          and actor.company_id = schedules.company_id
          and actor.status = 'active'
          and actor.role = 'admin'
      )
    )
  );

drop policy if exists "Company members can delete schedules" on public.schedules;
create policy "Company members can delete schedules" on public.schedules
  for delete using (
    public.is_approval_company_member(company_id)
    and source_type is null
    and (
      scope is distinct from 'personal'
      or user_id = auth.uid()
      or exists (
        select 1 from public.profiles actor
        where actor.id = auth.uid()
          and actor.company_id = schedules.company_id
          and actor.status = 'active'
          and actor.role = 'admin'
      )
    )
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_units', 'organization_memberships', 'approval_role_assignments',
    'approval_templates', 'approval_template_versions', 'approval_template_steps'
  ] loop
    execute format('drop policy if exists approvals_company_select on public.%I', table_name);
    execute format('drop policy if exists approvals_company_manage on public.%I', table_name);
    execute format(
      'create policy approvals_company_select on public.%I for select using (public.is_approval_company_member(company_id))',
      table_name
    );
    execute format(
      'create policy approvals_company_manage on public.%I for all using (public.can_manage_company_approvals(company_id)) with check (public.can_manage_company_approvals(company_id))',
      table_name
    );
  end loop;
end $$;

drop policy if exists approvals_delegations_select on public.approval_delegations;
drop policy if exists approvals_delegations_manage on public.approval_delegations;
create policy approvals_delegations_select on public.approval_delegations
  for select using (
    public.can_manage_company_approvals(company_id)
    or (public.is_approval_company_member(company_id)
      and auth.uid() in (delegator_profile_id, delegate_profile_id))
  );
create policy approvals_delegations_manage on public.approval_delegations
  for all using (public.can_manage_company_approvals(company_id))
  with check (public.can_manage_company_approvals(company_id));

drop policy if exists "Company members can view approval templates" on public.approval_templates;
drop policy if exists "Company members can insert approval templates" on public.approval_templates;
drop policy if exists "Company members can update approval templates" on public.approval_templates;
drop policy if exists "Company members can view approval documents" on public.approval_documents;
drop policy if exists "Company members can insert approval documents" on public.approval_documents;
drop policy if exists "Company members can update approval documents" on public.approval_documents;
drop policy if exists "Company members can view approval document events" on public.approval_document_events;
drop policy if exists "Company members can insert approval document events" on public.approval_document_events;

drop policy if exists approvals_documents_select on public.approval_documents;
drop policy if exists approvals_documents_rpc_only on public.approval_documents;
create policy approvals_documents_select on public.approval_documents
  for select using (public.can_read_approval_document(id, company_id));
create policy approvals_documents_rpc_only on public.approval_documents
  for all using (false) with check (false);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'approval_document_versions', 'approval_document_steps', 'approval_document_readers',
    'approval_attachments', 'approval_document_events'
  ] loop
    execute format('drop policy if exists approvals_document_select on public.%I', table_name);
    execute format('drop policy if exists approvals_document_rpc_only on public.%I', table_name);
    execute format(
      'create policy approvals_document_select on public.%I for select using (public.can_read_approval_document(document_id, company_id))',
      table_name
    );
    execute format(
      'create policy approvals_document_rpc_only on public.%I for all using (false) with check (false)',
      table_name
    );
  end loop;
end $$;

create or replace function public.seed_company_approval_templates(
  target_company_id uuid,
  creator_profile_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  seed record;
  seed_template_id uuid;
  seed_version_id uuid;
  seed_version_status text;
begin
  if not exists (select 1 from public.companies c where c.id = target_company_id) then
    raise exception using errcode = '23503', message = 'approval template company does not exist';
  end if;
  if creator_profile_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = creator_profile_id and p.company_id = target_company_id
  ) then
    raise exception using errcode = '23514', message = 'approval template creator must belong to the company';
  end if;

  for seed in
    select * from (values
      ('proposal', '품의서', '업무 추진 전 목적, 비용, 기대효과를 품의합니다.', 'proposal', 5, jsonb_build_array(
        jsonb_build_object('key', 'purpose', 'label', '품의 목적', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'background', 'label', '추진 배경', 'type', 'textarea', 'required', true),
        jsonb_build_object('key', 'details', 'label', '주요 내용', 'type', 'textarea', 'required', true),
        jsonb_build_object('key', 'amount', 'label', '예상 비용', 'type', 'money', 'required', false),
        jsonb_build_object('key', 'desired_date', 'label', '희망 시행일', 'type', 'date', 'required', false),
        jsonb_build_object('key', 'expected_effect', 'label', '기대 효과', 'type', 'textarea', 'required', true)
      )),
      ('expense_resolution', '지출결의서', '집행한 비용과 증빙 내역을 결의합니다.', 'expense', 5, jsonb_build_array(
        jsonb_build_object('key', 'expense_date', 'label', '지출일', 'type', 'date', 'required', true),
        jsonb_build_object('key', 'vendor', 'label', '지급처', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'amount', 'label', '지출 금액', 'type', 'money', 'required', true),
        jsonb_build_object('key', 'account', 'label', '비용 계정', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'payment_method', 'label', '결제 수단', 'type', 'select', 'required', true, 'options', jsonb_build_array('법인카드', '계좌이체', '현금', '기타')),
        jsonb_build_object('key', 'evidence_attached', 'label', '증빙 첨부', 'type', 'checkbox', 'required', true),
        jsonb_build_object('key', 'note', 'label', '비고', 'type', 'textarea', 'required', false)
      )),
      ('contract_report', '계약보고서', '계약 조건과 주요 위험을 보고합니다.', 'contract', 10, jsonb_build_array(
        jsonb_build_object('key', 'counterparty', 'label', '계약 상대방', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'contract_name', 'label', '계약명', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'starts_on', 'label', '계약 시작일', 'type', 'date', 'required', true),
        jsonb_build_object('key', 'ends_on', 'label', '계약 종료일', 'type', 'date', 'required', true),
        jsonb_build_object('key', 'amount', 'label', '계약 금액', 'type', 'money', 'required', false),
        jsonb_build_object('key', 'key_terms', 'label', '주요 조건', 'type', 'textarea', 'required', true),
        jsonb_build_object('key', 'risk_notes', 'label', '위험 및 검토사항', 'type', 'textarea', 'required', true)
      )),
      ('general_report', '일반 업무보고', '업무 진행 내용과 후속 계획을 보고합니다.', 'report', 5, jsonb_build_array(
        jsonb_build_object('key', 'report_date', 'label', '보고일', 'type', 'date', 'required', true),
        jsonb_build_object('key', 'subject', 'label', '보고 제목', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'summary', 'label', '요약', 'type', 'textarea', 'required', true),
        jsonb_build_object('key', 'details', 'label', '진행 내용', 'type', 'textarea', 'required', true),
        jsonb_build_object('key', 'issues', 'label', '이슈 및 요청사항', 'type', 'textarea', 'required', false),
        jsonb_build_object('key', 'next_plan', 'label', '후속 계획', 'type', 'textarea', 'required', true)
      ))
    ) as defaults(template_key, name, description, category, retention_years, fields)
  loop
    seed_template_id := null;
    seed_version_id := null;
    insert into public.approval_templates (
      company_id, template_key, name, description, document_type, category,
      security_level, retention_years, fields, active, created_by, updated_by
    ) values (
      target_company_id, seed.template_key, seed.name, seed.description, seed.category, seed.category,
      'company', seed.retention_years, seed.fields, true, creator_profile_id, creator_profile_id
    )
    on conflict (company_id, template_key) do nothing
    returning id into seed_template_id;
    if seed_template_id is null then
      select t.id into seed_template_id
      from public.approval_templates t
      where t.company_id = target_company_id and t.template_key = seed.template_key;
    end if;

    insert into public.approval_template_versions (
      company_id, template_id, version_number, status, name, description,
      category, security_level, retention_years, fields, created_by
    ) values (
      target_company_id, seed_template_id, 1, 'draft', seed.name, seed.description,
      seed.category, 'company', seed.retention_years, seed.fields, creator_profile_id
    )
    on conflict (template_id, version_number) do nothing
    returning id into seed_version_id;
    if seed_version_id is null then
      select v.id, v.status into seed_version_id, seed_version_status
      from public.approval_template_versions v
      where v.template_id = seed_template_id and v.version_number = 1;
    else
      seed_version_status := 'draft';
    end if;

    if seed_version_status = 'draft' then
      insert into public.approval_template_steps (
        company_id, template_version_id, step_order, step_key, name,
        action_kind, completion_mode, target_type, target_config
      ) values (
        target_company_id, seed_version_id, 1, 'manager_approval', '담당 관리자 결재',
        'approval', 'sequential', 'author_manager', '{}'::jsonb
      ) on conflict (template_version_id, step_order) do nothing;
      update public.approval_template_versions
      set status = 'published', published_at = coalesce(published_at, timezone('utc'::text, now()))
      where id = seed_version_id and status = 'draft';
    end if;
    update public.approval_templates
    set current_version_id = seed_version_id
    where id = seed_template_id and current_version_id is null;
  end loop;
end;
$$;

create or replace function public.seed_company_approval_templates_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_company_approval_templates(new.id, null);
  return new;
end;
$$;

drop trigger if exists companies_seed_approval_templates on public.companies;
create trigger companies_seed_approval_templates
  after insert on public.companies
  for each row execute function public.seed_company_approval_templates_after_insert();

select public.seed_company_approval_templates(c.id, null)
from public.companies c;

revoke all on function public.resolve_approval_step_targets(uuid, uuid, text, jsonb, text, timestamptz) from public;
revoke all on function public.seed_company_approval_templates(uuid, uuid) from public;
grant execute on function public.seed_company_approval_templates(uuid, uuid) to service_role;

create or replace function public.sync_approval_document_workflow(
  target_company_id uuid,
  target_document_id uuid,
  action_key text,
  action_memo text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  document_row public.approval_documents%rowtype;
  active_step record;
  target jsonb;
  recipient_id uuid;
  event_source_id text;
  action_time timestamptz := clock_timestamp();
begin
  select d.* into document_row
  from public.approval_documents d
  where d.id = target_document_id and d.company_id = target_company_id;
  if not found then return; end if;

  if document_row.status = '제출' and document_row.current_version_id is not null then
    select s.step_order, s.targets, s.responses into active_step
    from public.approval_document_steps s
    where s.document_version_id = document_row.current_version_id
      and s.step_order = document_row.current_step_order
      and s.status = 'active';
    event_source_id := document_row.id::text || ':step-' || coalesce(active_step.step_order, document_row.current_step_order)::text;
    update public.franchise_notifications
    set dismissed_at = action_time, updated_at = action_time
    where company_id = target_company_id
      and source_type = 'workflow-approval'
      and source_id like document_row.id::text || ':step-%'
      and source_id <> event_source_id
      and dismissed_at is null;
    for target in select value from jsonb_array_elements(coalesce(active_step.targets, '[]'::jsonb))
    loop
      if not exists (
        select 1 from jsonb_array_elements(coalesce(active_step.responses, '[]'::jsonb)) response
        where response ->> 'target_profile_id' = target ->> 'profile_id'
      ) then
        for recipient_id in
          select nullif(target ->> 'profile_id', '')::uuid
          union
          select nullif(value, '')::uuid
          from jsonb_array_elements_text(coalesce(target -> 'delegate_profile_ids', '[]'::jsonb))
        loop
          if recipient_id is not null and recipient_id <> document_row.author_profile_id then
          insert into public.franchise_notifications (
          company_id, recipient_profile_id, source_type, source_id, severity,
          title, body, action_url, due_at, delivery_channel, data, updated_at
        ) values (
          target_company_id, recipient_id, 'workflow-approval', event_source_id, 'info',
          '결재 요청', document_row.title || ' 문서의 결재 순서가 도착했습니다.',
          '/approvals/documents/' || document_row.id::text, document_row.due_at,
          'in_app', jsonb_build_object('documentId', document_row.id, 'stepOrder', active_step.step_order), action_time
        ) on conflict (company_id, recipient_profile_id, source_type, source_id)
          do update set title = excluded.title, body = excluded.body, action_url = excluded.action_url,
            due_at = excluded.due_at, dismissed_at = null, updated_at = excluded.updated_at;
          end if;
        end loop;
      end if;
    end loop;

    insert into public.schedules (
      id, company_id, user_id, title, date, scope, status, type, color, details,
      source_type, source_id, assignee_profile_id, due_at, metadata, updated_at
    ) values (
      'approval-' || document_row.id::text, target_company_id,
      case when jsonb_array_length(coalesce(active_step.targets, '[]'::jsonb)) = 1
        then nullif(active_step.targets -> 0 ->> 'profile_id', '')::uuid else null end,
      '결재 검토: ' || document_row.title,
      to_char(coalesce(document_row.due_at, action_time) at time zone 'Asia/Seoul', 'YYYY-MM-DD'),
      'company', '진행중', '결재', '#3182f6', '현재 결재 단계 문서 검토',
      'approval-document', document_row.id::text,
      case when jsonb_array_length(coalesce(active_step.targets, '[]'::jsonb)) = 1
        then nullif(active_step.targets -> 0 ->> 'profile_id', '')::uuid else null end,
      document_row.due_at,
      jsonb_build_object(
        'documentId', document_row.id,
        'stepOrder', active_step.step_order,
        'targetProfileIds', coalesce((
          select jsonb_agg(value ->> 'profile_id')
          from jsonb_array_elements(coalesce(active_step.targets, '[]'::jsonb))
        ), '[]'::jsonb)
      ), action_time
    ) on conflict (company_id, source_type, source_id)
      where source_type is not null and source_id is not null
      do update set user_id = excluded.user_id, title = excluded.title, date = excluded.date,
        status = excluded.status, assignee_profile_id = excluded.assignee_profile_id,
        due_at = excluded.due_at, completed_at = null, metadata = excluded.metadata,
        updated_at = excluded.updated_at;

    if action_key = 'submit' and document_row.security_level <> 'confidential' then
      for recipient_id in
        select r.profile_id
        from public.approval_document_readers r
        where r.company_id = target_company_id and r.document_id = document_row.id
        union
        select value::uuid
        from jsonb_array_elements_text(coalesce(document_row.data -> 'receiver_profile_ids', '[]'::jsonb))
        union
        select m.profile_id
        from public.organization_memberships m
        where m.company_id = target_company_id and m.active
          and m.unit_id in (
            select value::uuid
            from jsonb_array_elements_text(coalesce(document_row.data -> 'receiver_unit_ids', '[]'::jsonb))
          )
      loop
        if recipient_id <> document_row.author_profile_id then
          insert into public.franchise_notifications (
            company_id, recipient_profile_id, source_type, source_id, severity,
            title, body, action_url, delivery_channel, data, updated_at
          ) values (
            target_company_id, recipient_id, 'workflow-approval', document_row.id::text || ':shared', 'info',
            '결재 문서 공유', document_row.title || ' 문서가 참조 또는 수신 문서로 공유되었습니다.',
            '/approvals/documents/' || document_row.id::text, 'in_app',
            jsonb_build_object('documentId', document_row.id), action_time
          ) on conflict (company_id, recipient_profile_id, source_type, source_id)
            do update set body = excluded.body, action_url = excluded.action_url,
              dismissed_at = null, updated_at = excluded.updated_at;
        end if;
      end loop;
    end if;
    return;
  end if;

  update public.schedules
  set status = '완료', completed_at = action_time, updated_at = action_time
  where company_id = target_company_id
    and source_type = 'approval-document'
    and source_id = document_row.id::text;

  update public.franchise_notifications
  set dismissed_at = action_time, updated_at = action_time
  where company_id = target_company_id
    and source_type = 'workflow-approval'
    and source_id like document_row.id::text || ':step-%'
    and dismissed_at is null;

  if document_row.author_profile_id is not null and document_row.status in ('승인', '반려') then
    event_source_id := document_row.id::text || ':' || action_key;
    insert into public.franchise_notifications (
      company_id, recipient_profile_id, source_type, source_id, severity,
      title, body, action_url, delivery_channel, data, updated_at
    ) values (
      target_company_id, document_row.author_profile_id, 'workflow-approval', event_source_id,
      case when document_row.status = '반려' then 'warning' else 'success' end,
      case when document_row.status = '반려' then '결재 반려' else '결재 승인 완료' end,
      case when document_row.status = '반려' and btrim(coalesce(action_memo, '')) <> ''
        then document_row.title || ' 문서가 반려되었습니다. 사유: ' || action_memo
        else document_row.title || ' 문서가 ' || document_row.status || '되었습니다.' end,
      '/approvals/documents/' || document_row.id::text, 'in_app',
      jsonb_build_object('documentId', document_row.id), action_time
    ) on conflict (company_id, recipient_profile_id, source_type, source_id)
      do update set title = excluded.title, body = excluded.body, action_url = excluded.action_url,
        dismissed_at = null, updated_at = excluded.updated_at;
  end if;
end;
$$;

revoke all on function public.sync_approval_document_workflow(uuid, uuid, text, text) from public;

create or replace function public.create_company_approval_template_version(
  p_company_id uuid,
  p_template_id uuid,
  p_actor_profile_id uuid,
  p_status text,
  p_name text,
  p_description text,
  p_category text,
  p_security_level text,
  p_retention_years integer,
  p_fields jsonb,
  p_steps jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  template_row public.approval_templates%rowtype;
  version_id uuid;
  version_number integer;
  step jsonb;
begin
  if p_status not in ('draft', 'published', 'retired') then
    raise exception using errcode = '22023', message = 'unsupported approval template version status';
  end if;
  if jsonb_typeof(p_fields) <> 'array' or jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception using errcode = '23514', message = 'approval template fields and steps must be arrays with at least one step';
  end if;
  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() <> p_actor_profile_id) then
    raise exception using errcode = '42501', message = 'approval actor does not match the authenticated user';
  end if;
  select t.* into template_row
  from public.approval_templates t
  where t.id = p_template_id and t.company_id = p_company_id and t.deleted_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'approval template was not found in the company';
  end if;
  select coalesce(max(v.version_number), 0) + 1 into version_number
  from public.approval_template_versions v
  where v.template_id = p_template_id;
  insert into public.approval_template_versions (
    company_id, template_id, version_number, status, name, description,
    category, security_level, retention_years, fields, created_by, published_at
  ) values (
    p_company_id, p_template_id, version_number, 'draft', p_name, p_description,
    p_category, p_security_level, p_retention_years, p_fields, p_actor_profile_id, null
  ) returning id into version_id;
  for step in select value from jsonb_array_elements(p_steps)
  loop
    insert into public.approval_template_steps (
      company_id, template_version_id, step_order, step_key, name,
      action_kind, completion_mode, target_type, target_config, due_hours
    ) values (
      p_company_id, version_id, (step ->> 'step_order')::integer,
      step ->> 'step_key', step ->> 'name', step ->> 'action_kind',
      step ->> 'completion_mode', step ->> 'target_type',
      coalesce(step -> 'target_config', '{}'::jsonb),
      nullif(step ->> 'due_hours', '')::integer
    );
  end loop;
  if p_status <> 'draft' then
    update public.approval_template_versions
    set status = p_status,
        published_at = case when p_status = 'published' then timezone('utc'::text, now()) else null end
    where id = version_id;
  end if;
  if p_status = 'published' then
    update public.approval_templates
    set current_version_id = version_id, name = p_name, description = p_description,
        category = p_category, security_level = p_security_level,
        retention_years = p_retention_years, fields = p_fields,
        updated_by = p_actor_profile_id, updated_at = timezone('utc'::text, now())
    where id = p_template_id and company_id = p_company_id;
  end if;
  return version_id;
end;
$$;

revoke all on function public.create_company_approval_template_version(uuid, uuid, uuid, text, text, text, text, text, integer, jsonb, jsonb) from public;
grant execute on function public.create_company_approval_template_version(uuid, uuid, uuid, text, text, text, text, text, integer, jsonb, jsonb) to service_role;

create or replace function public.create_company_approval_template_with_version(
  p_company_id uuid,
  p_actor_profile_id uuid,
  p_status text,
  p_name text,
  p_description text,
  p_category text,
  p_security_level text,
  p_retention_years integer,
  p_fields jsonb,
  p_steps jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  template_id uuid;
begin
  insert into public.approval_templates (
    company_id, name, description, document_type, category, security_level,
    retention_years, fields, active, created_by, updated_by
  ) values (
    p_company_id, p_name, p_description, 'general', p_category, p_security_level,
    p_retention_years, p_fields, true, p_actor_profile_id, p_actor_profile_id
  ) returning id into template_id;
  perform public.create_company_approval_template_version(
    p_company_id, template_id, p_actor_profile_id, p_status, p_name,
    p_description, p_category, p_security_level, p_retention_years, p_fields, p_steps
  );
  return template_id;
end;
$$;

revoke all on function public.create_company_approval_template_with_version(uuid, uuid, text, text, text, text, text, integer, jsonb, jsonb) from public;
grant execute on function public.create_company_approval_template_with_version(uuid, uuid, text, text, text, text, text, integer, jsonb, jsonb) to service_role;

create or replace function public.replace_approval_document_readers(
  p_company_id uuid,
  p_document_id uuid,
  p_actor_profile_id uuid,
  p_reader_profile_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  document_row public.approval_documents%rowtype;
begin
  select d.* into document_row
  from public.approval_documents d
  where d.id = p_document_id and d.company_id = p_company_id
  for update;
  if not found or document_row.author_profile_id <> p_actor_profile_id then
    raise exception using errcode = '42501', message = 'only the document author can replace readers';
  end if;
  if document_row.status not in ('임시저장', '반려', '회수') then
    raise exception using errcode = '55000', message = 'submitted approval document readers are immutable';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_reader_profile_ids, '{}'::uuid[])) reader_id
    where not exists (
      select 1 from public.profiles p
    where p.id = reader_id and p.company_id = p_company_id and p.status = 'active'
    )
  ) then
    raise exception using errcode = '23514', message = 'approval readers must be active company members';
  end if;
  delete from public.approval_document_readers
  where company_id = p_company_id and document_id = p_document_id;
  insert into public.approval_document_readers (
    company_id, document_id, profile_id, granted_by
  )
  select p_company_id, p_document_id, reader_id, p_actor_profile_id
  from unnest(coalesce(p_reader_profile_ids, '{}'::uuid[])) reader_id
  where reader_id <> p_actor_profile_id;
end;
$$;

revoke all on function public.replace_approval_document_readers(uuid, uuid, uuid, uuid[]) from public;
grant execute on function public.replace_approval_document_readers(uuid, uuid, uuid, uuid[]) to service_role;

create or replace function public.create_approval_attachment(
  p_company_id uuid,
  p_document_id uuid,
  p_actor_profile_id uuid,
  p_file_name text,
  p_storage_bucket text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  attachment_id uuid;
  document_row public.approval_documents%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() <> p_actor_profile_id) then
    raise exception using errcode = '42501', message = 'approval actor does not match the authenticated user';
  end if;
  select d.* into document_row
  from public.approval_documents d
  where d.id = p_document_id and d.company_id = p_company_id
  for update;
  if not found or document_row.author_profile_id <> p_actor_profile_id then
    raise exception using errcode = '42501', message = 'only the document author can upload attachments';
  end if;
  if document_row.status not in ('임시저장', '반려', '회수') then
    raise exception using errcode = '55000', message = 'submitted approval document attachments are immutable';
  end if;
  if (select count(*) from public.approval_attachments a
      where a.company_id = p_company_id and a.document_id = p_document_id) >= 5 then
    raise exception using errcode = '23514', message = 'approval documents support up to five attachments';
  end if;
  insert into public.approval_attachments (
    company_id, document_id, file_name, storage_bucket, storage_path,
    mime_type, size_bytes, security_level, uploaded_by
  ) values (
    p_company_id, p_document_id, p_file_name, p_storage_bucket, p_storage_path,
    p_mime_type, p_size_bytes, document_row.security_level, p_actor_profile_id
  ) returning id into attachment_id;
  return attachment_id;
end;
$$;

revoke all on function public.create_approval_attachment(uuid, uuid, uuid, text, text, text, text, bigint) from public;
grant execute on function public.create_approval_attachment(uuid, uuid, uuid, text, text, text, text, bigint) to service_role;

create or replace function public.sync_supervision_report_source(
  p_company_id uuid,
  p_source_id text,
  p_status text,
  p_actor_profile_id uuid,
  p_memo text,
  p_action_time timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.franchise_inspection_reports%rowtype;
  visit_status text;
begin
  if p_status not in ('임시저장', '제출', '승인', '반려') then
    raise exception using errcode = '22023', message = 'unsupported supervision report source status';
  end if;
  update public.franchise_inspection_reports report
  set status = p_status,
      submitted_at = case
        when p_status = '제출' then coalesce(report.submitted_at, p_action_time)
        else report.submitted_at
      end,
      reviewed_by = case when p_status in ('승인', '반려') then p_actor_profile_id else null end,
      reviewed_at = case when p_status in ('승인', '반려') then p_action_time else null end,
      reject_reason = case when p_status = '반려' then nullif(btrim(coalesce(p_memo, '')), '') else null end,
      updated_by = p_actor_profile_id,
      updated_at = p_action_time
  where report.id = p_source_id::uuid
    and report.company_id = p_company_id
  returning * into report_row;
  if not found then
    raise exception using errcode = 'P0002', message = 'linked supervision report was not found';
  end if;

  insert into public.franchise_supervision_report_events (
    company_id, report_id, event_type, actor_profile_id, memo
  ) values (
    p_company_id, report_row.id, p_status, p_actor_profile_id,
    nullif(btrim(coalesce(p_memo, '')), '')
  );

  visit_status := case p_status
    when '제출' then '승인대기'
    when '승인' then '완료'
    when '반려' then '보고서대기'
    when '임시저장' then '보고서대기'
  end;
  if report_row.visit_id is not null then
    update public.franchise_store_visits
    set status = visit_status,
        updated_by = p_actor_profile_id,
        updated_at = p_action_time
    where id = report_row.visit_id
      and company_id = p_company_id;
  end if;
end;
$$;

revoke all on function public.sync_supervision_report_source(uuid, text, text, uuid, text, timestamptz) from public;

create or replace function public.perform_approval_document_action(
  p_document_id uuid,
  p_company_id uuid,
  p_action text,
  p_actor_profile_id uuid default auth.uid(),
  p_memo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  document_row public.approval_documents%rowtype;
  version_row public.approval_document_versions%rowtype;
  step_row public.approval_document_steps%rowtype;
  template_step record;
  actor_snapshot jsonb;
  captured_organization_snapshot jsonb;
  resolved_targets jsonb;
  updated_responses jsonb;
  selected_template_version_id uuid;
  acting_for_profile_id uuid;
  version_id uuid;
  step_id uuid;
  first_step_order integer;
  next_step_order integer;
  version_number integer;
  retention_years integer;
  retention_permanent boolean;
  target_count integer;
  positive_count integer;
  negative_count integer;
  resulting_status text;
  event_type text;
  action_time timestamptz := clock_timestamp();
  positive_complete boolean;
  negative_complete boolean;
  required_field record;
begin
  if p_action not in ('submit', 'approve', 'reject', 'agree', 'disagree', 'withdraw', 'acknowledge', 'complete') then
    raise exception using errcode = '22023', message = 'unsupported approval document action';
  end if;
  if p_actor_profile_id is null then
    raise exception using errcode = '28000', message = 'approval action requires an authenticated actor';
  end if;
  if p_action in ('reject', 'disagree') and btrim(coalesce(p_memo, '')) = '' then
    raise exception using errcode = '22023', message = 'rejection or disagreement reason is required';
  end if;
  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() <> p_actor_profile_id) then
    raise exception using errcode = '42501', message = 'approval actor does not match the authenticated user';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_profile_id
      and p.company_id = p_company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
  ) then
    raise exception using errcode = '42501', message = 'approval actor is not an active company member';
  end if;

  select d.* into document_row
  from public.approval_documents d
  where d.id = p_document_id and d.company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'approval document was not found in the company';
  end if;

  select jsonb_build_object(
    'profile_id', p.id,
    'profile_name', coalesce(p.name, p.email, ''),
    'role', p.role,
    'company_id', p.company_id
  ) into actor_snapshot
  from public.profiles p
  where p.id = p_actor_profile_id;

  if p_action = 'submit' then
    if document_row.author_profile_id <> p_actor_profile_id then
      raise exception using errcode = '42501', message = 'only the document author can submit';
    end if;
    if document_row.status not in ('임시저장', '반려', '회수') then
      raise exception using errcode = '55000', message = 'document is not in a submittable status';
    end if;

    selected_template_version_id := null;
    if document_row.current_version_id is not null and document_row.status in ('반려', '회수') then
      select v.template_version_id into selected_template_version_id
      from public.approval_document_versions v
      where v.id = document_row.current_version_id
        and v.document_id = document_row.id
        and v.company_id = p_company_id;
    elsif document_row.template_id is not null then
      select t.current_version_id into selected_template_version_id
      from public.approval_templates t
      where t.id = document_row.template_id and t.company_id = p_company_id and t.active;
    end if;

    if selected_template_version_id is not null then
      for required_field in
        select field ->> 'key' as field_key, coalesce(field ->> 'label', field ->> 'key') as field_label
        from public.approval_template_versions template_version
        cross join lateral jsonb_array_elements(template_version.fields) field
        where template_version.id = selected_template_version_id
          and coalesce((field ->> 'required')::boolean, false)
          and coalesce(field ->> 'type', '') <> 'description'
          and coalesce(field ->> 'editableBy', 'author') not in ('approver', 'agreement')
      loop
        if not (document_row.values ? required_field.field_key)
          or document_row.values -> required_field.field_key = 'null'::jsonb
          or (jsonb_typeof(document_row.values -> required_field.field_key) = 'string'
            and btrim(document_row.values ->> required_field.field_key) = '')
          or (jsonb_typeof(document_row.values -> required_field.field_key) = 'array'
            and jsonb_array_length(document_row.values -> required_field.field_key) = 0)
          or (jsonb_typeof(document_row.values -> required_field.field_key) = 'object'
            and not exists (
              select 1
              from jsonb_each(document_row.values -> required_field.field_key) entry
              where entry.value <> 'null'::jsonb
                and (jsonb_typeof(entry.value) <> 'string' or btrim(entry.value #>> '{}') <> '')
            )) then
          raise exception using errcode = '23514', message = required_field.field_label || ' 항목을 입력해 주세요.';
        end if;
      end loop;
    end if;

    select jsonb_build_object(
      'captured_at', action_time,
      'units', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', u.id, 'parent_id', u.parent_id, 'name', u.name,
          'manager_profile_id', u.manager_profile_id, 'active', u.active
        ) order by u.sort_order, u.name)
        from public.organization_units u
        where u.company_id = p_company_id and u.active
      ), '[]'::jsonb),
      'memberships', coalesce((
        select jsonb_agg(jsonb_build_object(
          'profile_id', m.profile_id, 'profile_name', coalesce(p.name, p.email, ''),
          'unit_id', m.unit_id, 'job_title', m.job_title,
          'is_primary', m.is_primary, 'active', m.active
        ) order by m.profile_id::text, m.is_primary desc)
        from public.organization_memberships m
        join public.profiles p on p.id = m.profile_id
        where m.company_id = p_company_id and m.active
      ), '[]'::jsonb),
      'role_assignments', coalesce((
        select jsonb_agg(jsonb_build_object(
          'role_key', a.role_key, 'profile_id', a.profile_id, 'unit_id', a.unit_id,
          'active_from', a.active_from, 'active_until', a.active_until
        ) order by a.role_key, a.profile_id::text)
        from public.approval_role_assignments a
        where a.company_id = p_company_id and a.active
          and (a.active_from is null or a.active_from <= action_time)
          and (a.active_until is null or a.active_until >= action_time)
      ), '[]'::jsonb),
      'delegations', coalesce((
        select jsonb_agg(jsonb_build_object(
          'delegator_profile_id', d.delegator_profile_id,
          'delegate_profile_id', d.delegate_profile_id,
          'action_scope', d.action_scope,
          'starts_at', d.starts_at,
          'ends_at', d.ends_at
        ) order by d.delegator_profile_id::text, d.delegate_profile_id::text)
        from public.approval_delegations d
        where d.company_id = p_company_id and d.active
          and d.starts_at <= action_time and d.ends_at >= action_time
      ), '[]'::jsonb)
    ) into captured_organization_snapshot;

    version_id := null;
    if document_row.current_version_id is not null then
      select v.* into version_row
      from public.approval_document_versions v
      where v.id = document_row.current_version_id
        and v.document_id = document_row.id
        and v.company_id = p_company_id;
      if found and version_row.submitted_at is null then
        version_id := version_row.id;
      end if;
    end if;

    if version_id is null then
      select coalesce(max(v.version_number), 0) + 1 into version_number
      from public.approval_document_versions v
      where v.document_id = document_row.id;
      insert into public.approval_document_versions (
        company_id, document_id, version_number, template_version_id,
        title, values, body, organization_snapshot, created_by
      ) values (
        p_company_id, document_row.id, version_number, selected_template_version_id,
        document_row.title, document_row.values, document_row.data,
        captured_organization_snapshot, p_actor_profile_id
      ) returning id into version_id;
    else
      update public.approval_document_versions
      set template_version_id = selected_template_version_id,
          title = document_row.title,
          values = document_row.values,
          body = document_row.data,
          organization_snapshot = captured_organization_snapshot
      where id = version_id;
    end if;

    delete from public.approval_document_steps s
    where s.document_version_id = version_id;

    if selected_template_version_id is not null then
      for template_step in
        select s.*
        from public.approval_template_steps s
        where s.template_version_id = selected_template_version_id and s.company_id = p_company_id
        order by s.step_order
      loop
        resolved_targets := public.resolve_approval_step_targets(
          p_company_id,
          document_row.author_profile_id,
          template_step.target_type,
          template_step.target_config,
          template_step.action_kind,
          action_time
        );
        if jsonb_array_length(resolved_targets) = 0
          and template_step.step_order = 1
          and document_row.approver_profile_id is not null then
          select jsonb_build_array(jsonb_build_object(
            'profile_id', p.id,
            'profile_name', coalesce(p.name, p.email, ''),
            'unit_id', null,
            'unit_name', '',
            'role_key', 'legacy_approver',
            'delegate_profile_ids', '[]'::jsonb
          )) into resolved_targets
          from public.profiles p
          where p.id = document_row.approver_profile_id and p.company_id = p_company_id
            and p.status = 'active'
            and p.role <> 'partner_vendor'
            and p.id <> document_row.author_profile_id;
        end if;
        if coalesce(jsonb_array_length(resolved_targets), 0) = 0 then
          raise exception using errcode = '23514', message = 'approval step has no resolvable company target';
        end if;
        insert into public.approval_document_steps (
          company_id, document_id, document_version_id, template_step_id,
          step_order, step_key, name, action_kind, completion_mode, targets
        ) values (
          p_company_id, document_row.id, version_id, template_step.id,
          template_step.step_order, template_step.step_key, template_step.name,
          template_step.action_kind, template_step.completion_mode, resolved_targets
        );
      end loop;
    end if;

    if not exists (
      select 1 from public.approval_document_steps s where s.document_version_id = version_id
    ) then
      if document_row.approver_profile_id is null then
        raise exception using errcode = '23514', message = 'approval document has no template steps or legacy approver';
      end if;
      select jsonb_build_array(jsonb_build_object(
        'profile_id', p.id,
        'profile_name', coalesce(p.name, p.email, ''),
        'unit_id', null,
        'unit_name', '',
        'role_key', 'legacy_approver',
        'delegate_profile_ids', '[]'::jsonb
      )) into resolved_targets
      from public.profiles p
      where p.id = document_row.approver_profile_id and p.company_id = p_company_id
        and p.status = 'active'
        and p.role <> 'partner_vendor'
        and p.id <> document_row.author_profile_id;
      if coalesce(jsonb_array_length(resolved_targets), 0) = 0 then
        raise exception using errcode = '23514', message = 'legacy approver does not belong to the company';
      end if;
      insert into public.approval_document_steps (
        company_id, document_id, document_version_id, step_order, step_key,
        name, action_kind, completion_mode, targets
      ) values (
        p_company_id, document_row.id, version_id, 1, 'legacy_approval',
        '결재', 'approval', 'sequential', resolved_targets
      );
    end if;

    select min(s.step_order) into first_step_order
    from public.approval_document_steps s
    where s.document_version_id = version_id;
    update public.approval_document_steps
    set status = case when step_order = first_step_order then 'active' else 'pending' end,
        started_at = case when step_order = first_step_order then action_time else null end,
        updated_at = action_time
    where document_version_id = version_id;
    update public.approval_document_versions v
    set steps_snapshot = coalesce((
      select jsonb_agg(jsonb_build_object(
        'step_order', s.step_order, 'step_key', s.step_key, 'name', s.name,
        'action_kind', s.action_kind, 'completion_mode', s.completion_mode,
        'targets', s.targets
      ) order by s.step_order)
      from public.approval_document_steps s
      where s.document_version_id = version_id
    ), '[]'::jsonb),
    submitted_at = action_time
    where v.id = version_id;

    update public.approval_attachments
    set document_version_id = version_id
    where company_id = p_company_id
      and document_id = document_row.id
      and document_version_id is null;

    select coalesce(v.retention_years, 5) into retention_years
    from public.approval_template_versions v where v.id = selected_template_version_id;
    retention_years := coalesce(retention_years, 5);
    retention_permanent := document_row.data ->> 'retentionPeriod' = 'permanent';
    retention_years := case document_row.data ->> 'retentionPeriod'
      when '1y' then 1 when '3y' then 3 when '5y' then 5 when '10y' then 10
      else retention_years
    end;
    update public.approval_attachments
    set retention_until = case when retention_permanent then null else (action_time + make_interval(years => retention_years))::date end,
        security_level = document_row.security_level
    where company_id = p_company_id and document_id = document_row.id;
    event_type := case when document_row.status = '임시저장' then '제출' else '재제출' end;
    update public.approval_documents
    set status = '제출',
        current_version_id = version_id,
        current_step_order = first_step_order,
        submitted_at = action_time,
        reviewed_at = null,
        completed_at = null,
        reject_reason = null,
        withdrawn_at = null,
        withdrawn_by = null,
        withdrawal_reason = null,
        retention_until = case when retention_permanent then null else (action_time + make_interval(years => retention_years))::date end,
        updated_by = p_actor_profile_id,
        updated_at = action_time
    where id = document_row.id;
    insert into public.approval_document_events (
      company_id, document_id, document_version_id, event_type, action_key,
      actor_profile_id, actor_snapshot, from_status, to_status, memo
    ) values (
      p_company_id, document_row.id, version_id, event_type, p_action,
      p_actor_profile_id, actor_snapshot, document_row.status, '제출', coalesce(p_memo, '')
    );
    if document_row.source_type = 'supervision-report' then
      perform public.sync_supervision_report_source(
        p_company_id, document_row.source_id, '제출', p_actor_profile_id, p_memo, action_time
      );
    end if;
    perform public.sync_approval_document_workflow(p_company_id, document_row.id, p_action, p_memo);
    return jsonb_build_object(
      'document_id', document_row.id,
      'version_id', version_id,
      'status', '제출',
      'current_step_order', first_step_order,
      'action', p_action
    );
  end if;

  if p_action = 'withdraw' then
    if document_row.author_profile_id <> p_actor_profile_id then
      raise exception using errcode = '42501', message = 'only the document author can withdraw';
    end if;
    if document_row.status <> '제출' or document_row.current_version_id is null then
      raise exception using errcode = '55000', message = 'only an in-review document can be withdrawn';
    end if;
    if exists (
      select 1
      from public.approval_document_steps s
      where s.document_version_id = document_row.current_version_id
        and jsonb_array_length(s.responses) > 0
    ) then
      raise exception using errcode = '55000', message = 'document cannot be withdrawn after a review response';
    end if;
    update public.approval_document_steps
    set status = 'skipped', completed_at = action_time, updated_at = action_time
    where document_version_id = document_row.current_version_id
      and status in ('pending', 'active');
    update public.approval_documents
    set status = '회수', current_step_order = null,
        withdrawn_at = action_time, withdrawn_by = p_actor_profile_id,
        withdrawal_reason = nullif(btrim(coalesce(p_memo, '')), ''),
        updated_by = p_actor_profile_id, updated_at = action_time
    where id = document_row.id;
    insert into public.approval_document_events (
      company_id, document_id, document_version_id, event_type, action_key,
      actor_profile_id, actor_snapshot, from_status, to_status, memo
    ) values (
      p_company_id, document_row.id, document_row.current_version_id, '회수', p_action,
      p_actor_profile_id, actor_snapshot, document_row.status, '회수', coalesce(p_memo, '')
    );
    if document_row.source_type = 'supervision-report' then
      perform public.sync_supervision_report_source(
        p_company_id, document_row.source_id, '임시저장', p_actor_profile_id, p_memo, action_time
      );
    end if;
    perform public.sync_approval_document_workflow(p_company_id, document_row.id, p_action, p_memo);
    return jsonb_build_object('document_id', document_row.id, 'status', '회수', 'action', p_action);
  end if;

  if p_action = 'complete' then
    if document_row.author_profile_id <> p_actor_profile_id then
      raise exception using errcode = '42501', message = 'only the document author can complete';
    end if;
    if document_row.status <> '승인' then
      raise exception using errcode = '55000', message = 'only an approved document can be completed';
    end if;
    update public.approval_documents
    set status = '완료처리', completed_at = action_time,
        updated_by = p_actor_profile_id, updated_at = action_time
    where id = document_row.id;
    insert into public.approval_document_events (
      company_id, document_id, document_version_id, event_type, action_key,
      actor_profile_id, actor_snapshot, from_status, to_status, memo
    ) values (
      p_company_id, document_row.id, document_row.current_version_id, '완료처리', p_action,
      p_actor_profile_id, actor_snapshot, document_row.status, '완료처리', coalesce(p_memo, '')
    );
    perform public.sync_approval_document_workflow(p_company_id, document_row.id, p_action, p_memo);
    return jsonb_build_object('document_id', document_row.id, 'status', '완료처리', 'action', p_action);
  end if;

  if document_row.status <> '제출'
    or document_row.current_version_id is null
    or document_row.current_step_order is null then
    raise exception using errcode = '55000', message = 'document has no active approval step';
  end if;
  select s.* into step_row
  from public.approval_document_steps s
  where s.document_id = document_row.id
    and s.document_version_id = document_row.current_version_id
    and s.step_order = document_row.current_step_order
    and s.status = 'active'
  for update;
  if not found then
    raise exception using errcode = '55000', message = 'current approval step is missing or inactive';
  end if;
  if (p_action in ('approve', 'reject') and step_row.action_kind <> 'approval')
    or (p_action in ('agree', 'disagree') and step_row.action_kind <> 'agreement')
    or (p_action = 'acknowledge' and step_row.action_kind <> 'acknowledgement') then
    raise exception using errcode = '55000', message = 'action does not match the current approval step';
  end if;
  if step_row.action_kind = 'approval' and document_row.author_profile_id = p_actor_profile_id then
    raise exception using errcode = '42501', message = 'document authors cannot approve their own documents';
  end if;

  acting_for_profile_id := null;
  select (target ->> 'profile_id')::uuid into acting_for_profile_id
  from jsonb_array_elements(step_row.targets) target
  where target ->> 'profile_id' = p_actor_profile_id::text
    or coalesce(target -> 'delegate_profile_ids', '[]'::jsonb) ? p_actor_profile_id::text
  order by (target ->> 'profile_id' = p_actor_profile_id::text) desc
  limit 1;
  if acting_for_profile_id is null then
    raise exception using errcode = '42501', message = 'actor is not a target or captured delegate for the current step';
  end if;
  if acting_for_profile_id <> p_actor_profile_id and not exists (
    select 1 from public.approval_delegations d
    where d.company_id = p_company_id
      and d.delegator_profile_id = acting_for_profile_id
      and d.delegate_profile_id = p_actor_profile_id
      and d.active
      and d.starts_at <= action_time
      and d.ends_at >= action_time
      and step_row.action_kind = any(d.action_scope)
  ) then
    raise exception using errcode = '42501', message = 'captured approval delegation is no longer active';
  end if;
  if exists (
    select 1 from jsonb_array_elements(step_row.responses) response
    where response ->> 'target_profile_id' = acting_for_profile_id::text
  ) then
    raise exception using errcode = '55000', message = 'the approval target already responded';
  end if;

  updated_responses := step_row.responses || jsonb_build_array(jsonb_build_object(
    'actor_profile_id', p_actor_profile_id,
    'target_profile_id', acting_for_profile_id,
    'action', p_action,
    'memo', coalesce(p_memo, ''),
    'occurred_at', action_time
  ));
  update public.franchise_notifications notification
  set dismissed_at = action_time, updated_at = action_time
  where notification.company_id = p_company_id
    and notification.source_type = 'workflow-approval'
    and notification.source_id = document_row.id::text || ':step-' || step_row.step_order::text
    and notification.dismissed_at is null
    and exists (
      select 1
      from jsonb_array_elements(step_row.targets) response_target
      where response_target ->> 'profile_id' = acting_for_profile_id::text
        and (
          notification.recipient_profile_id = acting_for_profile_id
          or coalesce(response_target -> 'delegate_profile_ids', '[]'::jsonb)
            ? notification.recipient_profile_id::text
        )
    );
  target_count := jsonb_array_length(step_row.targets);
  select count(*) filter (where response ->> 'action' in ('approve', 'agree', 'acknowledge')),
         count(*) filter (where response ->> 'action' in ('reject', 'disagree'))
  into positive_count, negative_count
  from jsonb_array_elements(updated_responses) response;
  positive_complete := positive_count >= case when step_row.completion_mode = 'parallel_any' then 1 else target_count end;
  negative_complete := negative_count >= 1;
  event_type := case p_action
    when 'approve' then '승인'
    when 'reject' then '반려'
    when 'agree' then '합의'
    when 'disagree' then '비합의'
    when 'acknowledge' then '확인'
  end;

  if negative_complete then
    update public.approval_document_steps
    set responses = updated_responses,
        status = case when p_action = 'reject' then 'rejected' else 'disagreed' end,
        completed_at = action_time,
        updated_at = action_time
    where id = step_row.id;
    update public.approval_documents
    set status = '반려', current_step_order = null, reviewed_at = action_time,
        reject_reason = nullif(btrim(coalesce(p_memo, '')), ''),
        reviewer_profile_id = p_actor_profile_id,
        updated_by = p_actor_profile_id, updated_at = action_time
    where id = document_row.id;
    insert into public.approval_document_events (
      company_id, document_id, document_version_id, document_step_id,
      event_type, action_key, actor_profile_id, actor_snapshot,
      from_status, to_status, memo, payload
    ) values (
      p_company_id, document_row.id, document_row.current_version_id, step_row.id,
      event_type, p_action, p_actor_profile_id, actor_snapshot,
      document_row.status, '반려', coalesce(p_memo, ''),
      jsonb_build_object('acting_for_profile_id', acting_for_profile_id)
    );
    if document_row.source_type = 'supervision-report' then
      perform public.sync_supervision_report_source(
        p_company_id, document_row.source_id, '반려', p_actor_profile_id, p_memo, action_time
      );
    end if;
    perform public.sync_approval_document_workflow(p_company_id, document_row.id, p_action, p_memo);
    return jsonb_build_object('document_id', document_row.id, 'status', '반려', 'action', p_action);
  end if;

  if positive_complete then
    update public.approval_document_steps
    set responses = updated_responses,
        status = case p_action
          when 'approve' then 'approved'
          when 'agree' then 'agreed'
          else 'acknowledged'
        end,
        completed_at = action_time,
        updated_at = action_time
    where id = step_row.id;
    select min(s.step_order) into next_step_order
    from public.approval_document_steps s
    where s.document_version_id = document_row.current_version_id
      and s.status = 'pending';
    if next_step_order is null then
      resulting_status := '승인';
      update public.approval_documents
      set status = resulting_status, current_step_order = null, reviewed_at = action_time,
          reviewer_profile_id = p_actor_profile_id,
          updated_by = p_actor_profile_id, updated_at = action_time
      where id = document_row.id;
    else
      resulting_status := document_row.status;
      update public.approval_document_steps
      set status = 'active', started_at = action_time, updated_at = action_time
      where document_version_id = document_row.current_version_id
        and step_order = next_step_order and status = 'pending';
      update public.approval_documents
      set current_step_order = next_step_order,
          updated_by = p_actor_profile_id, updated_at = action_time
      where id = document_row.id;
    end if;
  else
    resulting_status := document_row.status;
    update public.approval_document_steps
    set responses = updated_responses, updated_at = action_time
    where id = step_row.id;
    next_step_order := document_row.current_step_order;
  end if;

  insert into public.approval_document_events (
    company_id, document_id, document_version_id, document_step_id,
    event_type, action_key, actor_profile_id, actor_snapshot,
    from_status, to_status, memo, payload
  ) values (
    p_company_id, document_row.id, document_row.current_version_id, step_row.id,
    event_type, p_action, p_actor_profile_id, actor_snapshot,
    document_row.status, resulting_status, coalesce(p_memo, ''),
    jsonb_build_object('acting_for_profile_id', acting_for_profile_id)
  );
  if document_row.source_type = 'supervision-report' and resulting_status = '승인' then
    perform public.sync_supervision_report_source(
      p_company_id, document_row.source_id, '승인', p_actor_profile_id, p_memo, action_time
    );
  end if;
  perform public.sync_approval_document_workflow(p_company_id, document_row.id, p_action, p_memo);
  return jsonb_build_object(
    'document_id', document_row.id,
    'version_id', document_row.current_version_id,
    'status', resulting_status,
    'current_step_order', next_step_order,
    'action', p_action
  );
end;
$$;

revoke all on function public.perform_approval_document_action(uuid, uuid, text, uuid, text) from public;
grant execute on function public.perform_approval_document_action(uuid, uuid, text, uuid, text) to authenticated, service_role;

create or replace function public.sync_supervision_report_approval(
  p_company_id uuid,
  p_report_id uuid,
  p_event_type text,
  p_actor_profile_id uuid,
  p_approver_profile_id uuid,
  p_title text,
  p_data jsonb,
  p_memo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  document_row public.approval_documents%rowtype;
  action_key text;
  action_result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'supervision approval sync requires the service role';
  end if;
  if p_event_type not in ('임시저장', '제출', '승인', '반려') then
    raise exception using errcode = '22023', message = 'unsupported supervision approval event';
  end if;

  if p_event_type in ('임시저장', '제출') then
    insert into public.approval_documents (
      company_id, template_id, source_type, source_id, title, status,
      author_profile_id, approver_profile_id, values, data,
      created_by, updated_by
    ) values (
      p_company_id, null, 'supervision-report', p_report_id::text, p_title, '임시저장',
      p_actor_profile_id, p_approver_profile_id, '{}'::jsonb, coalesce(p_data, '{}'::jsonb),
      p_actor_profile_id, p_actor_profile_id
    ) on conflict (company_id, source_type, source_id)
      where source_type is not null and source_id is not null
      do nothing;
  end if;

  select d.* into document_row
  from public.approval_documents d
  where d.company_id = p_company_id
    and d.source_type = 'supervision-report'
    and d.source_id = p_report_id::text
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'supervision approval document was not found';
  end if;

  if p_event_type = '제출' and document_row.status = '제출' then
    return jsonb_build_object(
      'document_id', document_row.id,
      'status', document_row.status,
      'action', 'submit',
      'idempotent', true
    );
  end if;

  if p_event_type in ('임시저장', '제출') then
    if document_row.status not in ('임시저장', '반려', '회수') then
      raise exception using errcode = '55000', message = 'supervision approval document is not editable';
    end if;
    if document_row.author_profile_id <> p_actor_profile_id then
      raise exception using errcode = '42501', message = 'only the supervision report author can update its approval document';
    end if;
    update public.approval_documents
    set title = p_title,
        approver_profile_id = coalesce(p_approver_profile_id, approver_profile_id),
        data = coalesce(p_data, '{}'::jsonb),
        updated_by = p_actor_profile_id,
        updated_at = timezone('utc'::text, now())
    where id = document_row.id
    returning * into document_row;
    if p_event_type = '임시저장' then
      return jsonb_build_object(
        'document_id', document_row.id,
        'status', document_row.status,
        'action', 'saveDraft'
      );
    end if;
  end if;

  action_key := case p_event_type
    when '제출' then 'submit'
    when '승인' then 'approve'
    else 'reject'
  end;
  select public.perform_approval_document_action(
    document_row.id,
    p_company_id,
    action_key,
    p_actor_profile_id,
    coalesce(p_memo, '')
  ) into action_result;
  return action_result;
end;
$$;

revoke all on function public.sync_supervision_report_approval(uuid, uuid, text, uuid, uuid, text, jsonb, text) from public;
grant execute on function public.sync_supervision_report_approval(uuid, uuid, text, uuid, uuid, text, jsonb, text) to service_role;

create or replace function public.save_supervision_report_with_approval(
  p_company_id uuid,
  p_report_id uuid,
  p_create boolean,
  p_expected_updated_at timestamptz,
  p_location_id uuid,
  p_supervisor_profile_id uuid,
  p_visit_id uuid,
  p_report_status text,
  p_inspection_items jsonb,
  p_photo_attachments jsonb,
  p_special_note text,
  p_reject_reason text,
  p_submitted_at timestamptz,
  p_reviewed_by uuid,
  p_reviewed_at timestamptz,
  p_template_id uuid,
  p_event_type text,
  p_actor_profile_id uuid,
  p_approver_profile_id uuid,
  p_title text,
  p_approval_data jsonb,
  p_memo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.franchise_inspection_reports%rowtype;
  approval_result jsonb;
  action_time timestamptz := timezone('utc'::text, now());
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'supervision report workflow requires the service role';
  end if;
  if p_create then
    if p_event_type not in ('임시저장', '제출') then
      raise exception using errcode = '22023', message = 'a new supervision report must be saved or submitted';
    end if;
    insert into public.franchise_inspection_reports (
      id, company_id, location_id, supervisor_profile_id, visit_id, status,
      inspection_items, photo_attachments, special_note, reject_reason,
      submitted_at, reviewed_by, reviewed_at, template_id,
      created_by, updated_by, created_at, updated_at
    ) values (
      p_report_id, p_company_id, p_location_id, p_supervisor_profile_id, p_visit_id, p_report_status,
      coalesce(p_inspection_items, '[]'::jsonb), coalesce(p_photo_attachments, '[]'::jsonb),
      p_special_note, p_reject_reason, p_submitted_at, p_reviewed_by, p_reviewed_at, p_template_id,
      p_actor_profile_id, p_actor_profile_id, action_time, action_time
    ) returning * into report_row;
  else
    select r.* into report_row
    from public.franchise_inspection_reports r
    where r.id = p_report_id and r.company_id = p_company_id
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'supervision report was not found';
    end if;
    if report_row.updated_at is distinct from p_expected_updated_at then
      raise exception using errcode = '40001', message = 'supervision report changed concurrently';
    end if;
    if p_event_type in ('임시저장', '제출') and report_row.created_by is distinct from p_actor_profile_id then
      raise exception using errcode = '42501', message = 'only the supervision report author can save or submit';
    end if;
    if p_event_type = '제출' and report_row.status = '제출' then
      select public.sync_supervision_report_approval(
        p_company_id,
        p_report_id,
        p_event_type,
        p_actor_profile_id,
        p_approver_profile_id,
        p_title,
        p_approval_data,
        p_memo
      ) into approval_result;
      return jsonb_build_object(
        'report_id', report_row.id,
        'report_status', report_row.status,
        'approval', approval_result
      );
    end if;
    if p_event_type in ('임시저장', '제출') then
      update public.franchise_inspection_reports
      set location_id = p_location_id,
          supervisor_profile_id = p_supervisor_profile_id,
          visit_id = p_visit_id,
          status = p_report_status,
          inspection_items = coalesce(p_inspection_items, '[]'::jsonb),
          photo_attachments = coalesce(p_photo_attachments, '[]'::jsonb),
          special_note = p_special_note,
          reject_reason = p_reject_reason,
          submitted_at = p_submitted_at,
          reviewed_by = p_reviewed_by,
          reviewed_at = p_reviewed_at,
          template_id = p_template_id,
          updated_by = p_actor_profile_id,
          updated_at = action_time
      where id = p_report_id and company_id = p_company_id
      returning * into report_row;
    end if;
  end if;

  select public.sync_supervision_report_approval(
    p_company_id,
    p_report_id,
    p_event_type,
    p_actor_profile_id,
    p_approver_profile_id,
    p_title,
    p_approval_data,
    p_memo
  ) into approval_result;
  if p_event_type = '임시저장' then
    insert into public.franchise_supervision_report_events (
      company_id, report_id, event_type, actor_profile_id, memo
    ) values (
      p_company_id, report_row.id, '임시저장', p_actor_profile_id,
      nullif(btrim(coalesce(p_memo, '')), '')
    );
  end if;
  select report.* into report_row
  from public.franchise_inspection_reports report
  where report.id = p_report_id and report.company_id = p_company_id;
  return jsonb_build_object(
    'report_id', report_row.id,
    'report_status', report_row.status,
    'approval', approval_result
  );
end;
$$;

revoke all on function public.save_supervision_report_with_approval(
  uuid, uuid, boolean, timestamptz, uuid, uuid, uuid, text, jsonb, jsonb,
  text, text, timestamptz, uuid, timestamptz, uuid, text, uuid, uuid, text, jsonb, text
) from public;
grant execute on function public.save_supervision_report_with_approval(
  uuid, uuid, boolean, timestamptz, uuid, uuid, uuid, text, jsonb, jsonb,
  text, text, timestamptz, uuid, timestamptz, uuid, text, uuid, uuid, text, jsonb, text
) to service_role;

commit;
