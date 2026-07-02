create extension if not exists "uuid-ossp";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.franchise_supervisor_assignments (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  supervisor_profile_id uuid references public.profiles(id) on delete cascade not null,
  region_scope text,
  memo text,
  active boolean default true not null,
  assigned_at date default current_date,
  ended_at date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_store_visits (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  supervisor_profile_id uuid references public.profiles(id) on delete cascade not null,
  assignment_id uuid references public.franchise_supervisor_assignments(id) on delete set null,
  schedule_id uuid references public.schedules(id) on delete set null,
  visit_date date not null,
  purpose text default '정기점검' not null,
  status text default '예정' not null,
  memo text,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_inspection_reports (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  supervisor_profile_id uuid references public.profiles(id) on delete cascade not null,
  visit_id uuid references public.franchise_store_visits(id) on delete set null,
  status text default '임시저장' not null,
  inspection_items jsonb default '[]'::jsonb not null,
  photo_attachments jsonb default '[]'::jsonb not null,
  special_note text,
  reject_reason text,
  submitted_at timestamp with time zone,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_corrective_actions (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  report_id uuid references public.franchise_inspection_reports(id) on delete cascade,
  inspection_item_id text,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  status text default '요청' not null,
  title text not null,
  memo text,
  due_date date,
  completed_at timestamp with time zone,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'franchise_store_visits_purpose_check') then
    alter table public.franchise_store_visits
      add constraint franchise_store_visits_purpose_check
      check (purpose in ('정기점검', '긴급방문', '오픈후점검', '교육/지원'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'franchise_store_visits_status_check') then
    alter table public.franchise_store_visits
      add constraint franchise_store_visits_status_check
      check (status in ('예정', '진행중', '보고서대기', '승인대기', '완료', '취소'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'franchise_inspection_reports_status_check') then
    alter table public.franchise_inspection_reports
      add constraint franchise_inspection_reports_status_check
      check (status in ('임시저장', '제출', '승인', '반려'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'franchise_corrective_actions_status_check') then
    alter table public.franchise_corrective_actions
      add constraint franchise_corrective_actions_status_check
      check (status in ('요청', '진행중', '완료', '보류'));
  end if;
end $$;

create unique index if not exists idx_franchise_supervisor_assignments_one_active
  on public.franchise_supervisor_assignments (company_id, location_id)
  where active = true;

create index if not exists idx_franchise_supervisor_assignments_sv
  on public.franchise_supervisor_assignments (company_id, supervisor_profile_id, active);

create index if not exists idx_franchise_store_visits_company_date
  on public.franchise_store_visits (company_id, visit_date, status);

create index if not exists idx_franchise_store_visits_sv_date
  on public.franchise_store_visits (supervisor_profile_id, visit_date);

create index if not exists idx_franchise_inspection_reports_company_status
  on public.franchise_inspection_reports (company_id, status, updated_at desc);

create unique index if not exists idx_franchise_corrective_actions_report_item
  on public.franchise_corrective_actions (report_id, inspection_item_id)
  where report_id is not null and inspection_item_id is not null;

create index if not exists idx_franchise_corrective_actions_assignee
  on public.franchise_corrective_actions (assignee_profile_id, status, due_date);

alter table public.franchise_supervisor_assignments enable row level security;
alter table public.franchise_store_visits enable row level security;
alter table public.franchise_inspection_reports enable row level security;
alter table public.franchise_corrective_actions enable row level security;

drop policy if exists "Company members can view franchise_supervisor_assignments" on public.franchise_supervisor_assignments;
drop policy if exists "Company managers can write franchise_supervisor_assignments" on public.franchise_supervisor_assignments;
drop policy if exists "Company members can view franchise_store_visits" on public.franchise_store_visits;
drop policy if exists "Company members can write franchise_store_visits" on public.franchise_store_visits;
drop policy if exists "Company members can view franchise_inspection_reports" on public.franchise_inspection_reports;
drop policy if exists "Company members can write franchise_inspection_reports" on public.franchise_inspection_reports;
drop policy if exists "Company members can view franchise_corrective_actions" on public.franchise_corrective_actions;
drop policy if exists "Company members can write franchise_corrective_actions" on public.franchise_corrective_actions;

create policy "Company members can view franchise_supervisor_assignments" on public.franchise_supervisor_assignments
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company managers can write franchise_supervisor_assignments" on public.franchise_supervisor_assignments
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.role = 'manager' and p.company_id = franchise_supervisor_assignments.company_id))
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.role = 'manager' and p.company_id = franchise_supervisor_assignments.company_id))
    )
  );

create policy "Company members can view franchise_store_visits" on public.franchise_store_visits
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can write franchise_store_visits" on public.franchise_store_visits
  for all using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can view franchise_inspection_reports" on public.franchise_inspection_reports
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can write franchise_inspection_reports" on public.franchise_inspection_reports
  for all using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can view franchise_corrective_actions" on public.franchise_corrective_actions
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can write franchise_corrective_actions" on public.franchise_corrective_actions
  for all using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop trigger if exists trg_franchise_supervisor_assignments_updated_at on public.franchise_supervisor_assignments;
create trigger trg_franchise_supervisor_assignments_updated_at
before update on public.franchise_supervisor_assignments
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_franchise_store_visits_updated_at on public.franchise_store_visits;
create trigger trg_franchise_store_visits_updated_at
before update on public.franchise_store_visits
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_franchise_inspection_reports_updated_at on public.franchise_inspection_reports;
create trigger trg_franchise_inspection_reports_updated_at
before update on public.franchise_inspection_reports
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_franchise_corrective_actions_updated_at on public.franchise_corrective_actions;
create trigger trg_franchise_corrective_actions_updated_at
before update on public.franchise_corrective_actions
for each row execute function public.update_updated_at_column();
