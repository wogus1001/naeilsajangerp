create extension if not exists "uuid-ossp";

create table if not exists public.franchise_opening_projects (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  manager_id uuid references public.profiles(id),
  status text default '준비중' not null,
  target_open_date date,
  memo text,
  tasks jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_opening_projects enable row level security;

drop policy if exists "Company members can view franchise_opening_projects" on public.franchise_opening_projects;
drop policy if exists "Company members can insert franchise_opening_projects" on public.franchise_opening_projects;
drop policy if exists "Company members can update franchise_opening_projects" on public.franchise_opening_projects;
drop policy if exists "Company members can delete franchise_opening_projects" on public.franchise_opening_projects;

create policy "Company members can view franchise_opening_projects" on public.franchise_opening_projects
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_opening_projects" on public.franchise_opening_projects
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_opening_projects" on public.franchise_opening_projects
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_opening_projects" on public.franchise_opening_projects
  for delete using (company_id = get_my_company_id());

create unique index if not exists idx_franchise_opening_projects_company_location
  on public.franchise_opening_projects (company_id, location_id);

create index if not exists idx_franchise_opening_projects_company_status_date
  on public.franchise_opening_projects (company_id, status, target_open_date);

create index if not exists idx_franchise_opening_projects_location
  on public.franchise_opening_projects (location_id);
