create extension if not exists "uuid-ossp";

alter table public.schedules
  add column if not exists source_type text,
  add column if not exists source_id text,
  add column if not exists assignee_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists manager_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists due_at timestamp with time zone,
  add column if not exists remind_at timestamp with time zone,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists metadata jsonb default '{}'::jsonb not null,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create unique index if not exists idx_schedules_source_unique
  on public.schedules (company_id, source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists idx_schedules_company_due
  on public.schedules (company_id, due_at);

create index if not exists idx_schedules_assignee_due
  on public.schedules (assignee_profile_id, due_at);

create index if not exists idx_schedules_manager_due
  on public.schedules (manager_profile_id, due_at);

create index if not exists idx_schedules_company_status_due
  on public.schedules (company_id, status, due_at);

drop policy if exists "Company members can insert schedules" on public.schedules;
create policy "Company members can insert schedules" on public.schedules
  for insert with check (
    company_id = get_my_company_id()
    and source_type is null
  );

drop policy if exists "Company members can update schedules" on public.schedules;
create policy "Company members can update schedules" on public.schedules
  for update using (
    company_id = get_my_company_id()
    and source_type is null
  )
  with check (
    company_id = get_my_company_id()
    and source_type is null
  );

drop policy if exists "Company members can delete schedules" on public.schedules;
create policy "Company members can delete schedules" on public.schedules
  for delete using (
    company_id = get_my_company_id()
    and source_type is null
  );

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_approval_templates_company
  on public.approval_templates (company_id, active, document_type, created_at desc);

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
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  completed_at timestamp with time zone,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint approval_documents_status_check
    check (status in ('임시저장', '제출', '승인', '반려', '완료처리'))
);

create unique index if not exists idx_approval_documents_source_unique
  on public.approval_documents (company_id, source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists idx_approval_documents_company_status
  on public.approval_documents (company_id, status, updated_at desc);

create index if not exists idx_approval_documents_author
  on public.approval_documents (author_profile_id, updated_at desc);

create index if not exists idx_approval_documents_approver
  on public.approval_documents (approver_profile_id, status, updated_at desc);

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint approval_document_events_type_check
    check (event_type in ('임시저장', '제출', '승인', '반려', '재제출', '완료처리'))
);

create index if not exists idx_approval_document_events_document
  on public.approval_document_events (document_id, created_at desc);

create index if not exists idx_approval_document_events_company
  on public.approval_document_events (company_id, created_at desc);

alter table public.approval_templates enable row level security;
alter table public.approval_documents enable row level security;
alter table public.approval_document_events enable row level security;

drop policy if exists "Company members can view approval templates" on public.approval_templates;
create policy "Company members can view approval templates" on public.approval_templates
  for select using (company_id = get_my_company_id());

drop policy if exists "Company members can insert approval templates" on public.approval_templates;
create policy "Company members can insert approval templates" on public.approval_templates
  for insert with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.company_id = approval_templates.company_id and p.role = 'manager'))
    )
  );

drop policy if exists "Company members can update approval templates" on public.approval_templates;
create policy "Company members can update approval templates" on public.approval_templates
  for update using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.company_id = approval_templates.company_id and p.role = 'manager'))
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.company_id = approval_templates.company_id and p.role = 'manager'))
    )
  );

drop policy if exists "Company members can view approval documents" on public.approval_documents;
create policy "Company members can view approval documents" on public.approval_documents
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = approval_documents.company_id and p.role = 'manager')
          or approval_documents.author_profile_id = auth.uid()
          or approval_documents.approver_profile_id = auth.uid()
        )
    )
  );

drop policy if exists "Company members can insert approval documents" on public.approval_documents;
create policy "Company members can insert approval documents" on public.approval_documents
  for insert with check (false);

drop policy if exists "Company members can update approval documents" on public.approval_documents;
create policy "Company members can update approval documents" on public.approval_documents
  for update using (false)
  with check (false);

drop policy if exists "Company members can view approval document events" on public.approval_document_events;
create policy "Company members can view approval document events" on public.approval_document_events
  for select using (
    exists (
      select 1
      from public.approval_documents d
      join public.profiles p on p.id = auth.uid()
      where d.id = approval_document_events.document_id
        and d.company_id = approval_document_events.company_id
        and (
          p.role = 'admin'
          or (p.company_id = d.company_id and p.role = 'manager')
          or d.author_profile_id = auth.uid()
          or d.approver_profile_id = auth.uid()
        )
    )
  );

drop policy if exists "Company members can insert approval document events" on public.approval_document_events;
create policy "Company members can insert approval document events" on public.approval_document_events
  for insert with check (false);
