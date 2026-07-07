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

create table if not exists public.franchise_labor_settings (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  effective_year integer default extract(year from now())::integer not null,
  minimum_hourly_wage numeric default 10030 not null,
  employee_insurance_rate numeric default 9.4 not null,
  employer_insurance_rate numeric default 11 not null,
  withholding_rate numeric default 3.3 not null,
  overtime_multiplier numeric default 1.5 not null,
  night_multiplier numeric default 1.5 not null,
  holiday_multiplier numeric default 1.5 not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id, effective_year)
);

create table if not exists public.franchise_labor_staffing_plans (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  title text default '인력 세팅안' not null,
  monthly_sales_target numeric default 0 not null,
  target_labor_ratio numeric default 20 not null,
  operating_weekdays jsonb default '[]'::jsonb not null,
  open_time text default '10:00' not null,
  close_time text default '22:00' not null,
  settings_snapshot jsonb default '{}'::jsonb not null,
  summary jsonb default '{}'::jsonb not null,
  schedule jsonb default '[]'::jsonb not null,
  memo text,
  status text default 'active' not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_labor_staffing_roles (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references public.franchise_labor_staffing_plans(id) on delete cascade not null,
  role_key text not null,
  label text not null,
  employment_type text not null,
  headcount numeric default 0 not null,
  monthly_cost numeric default 0 not null,
  weekly_hours numeric default 0 not null,
  note text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'franchise_labor_staffing_plans_status_check') then
    alter table public.franchise_labor_staffing_plans
      add constraint franchise_labor_staffing_plans_status_check
      check (status in ('active', 'archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'franchise_labor_staffing_roles_key_check') then
    alter table public.franchise_labor_staffing_roles
      add constraint franchise_labor_staffing_roles_key_check
      check (role_key in ('store_manager', 'full_time', 'part_time', 'freelancer'));
  end if;
end $$;

create index if not exists idx_franchise_labor_settings_company_year
  on public.franchise_labor_settings (company_id, effective_year desc);

create index if not exists idx_franchise_labor_staffing_plans_company_location
  on public.franchise_labor_staffing_plans (company_id, location_id, created_at desc);

create index if not exists idx_franchise_labor_staffing_roles_plan
  on public.franchise_labor_staffing_roles (plan_id, sort_order);

drop trigger if exists trg_franchise_labor_settings_updated_at on public.franchise_labor_settings;
create trigger trg_franchise_labor_settings_updated_at
  before update on public.franchise_labor_settings
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_franchise_labor_staffing_plans_updated_at on public.franchise_labor_staffing_plans;
create trigger trg_franchise_labor_staffing_plans_updated_at
  before update on public.franchise_labor_staffing_plans
  for each row execute function public.update_updated_at_column();

alter table public.franchise_labor_settings enable row level security;
alter table public.franchise_labor_staffing_plans enable row level security;
alter table public.franchise_labor_staffing_roles enable row level security;

drop policy if exists "Company labor users can view settings" on public.franchise_labor_settings;
drop policy if exists "Company managers can write labor settings" on public.franchise_labor_settings;
drop policy if exists "Company labor users can view staffing plans" on public.franchise_labor_staffing_plans;
drop policy if exists "Company labor users can write staffing plans" on public.franchise_labor_staffing_plans;
drop policy if exists "Company labor users can view staffing roles" on public.franchise_labor_staffing_roles;
drop policy if exists "Company labor users can write staffing roles" on public.franchise_labor_staffing_roles;

create policy "Company labor users can view settings" on public.franchise_labor_settings
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = franchise_labor_settings.company_id and coalesce(p.role, '') <> 'partner_vendor')
        )
    )
  );

create policy "Company managers can write labor settings" on public.franchise_labor_settings
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = franchise_labor_settings.company_id and p.role = 'manager')
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = franchise_labor_settings.company_id and p.role = 'manager')
        )
    )
  );

create policy "Company labor users can view staffing plans" on public.franchise_labor_staffing_plans
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = franchise_labor_staffing_plans.company_id and coalesce(p.role, '') <> 'partner_vendor')
        )
    )
  );

create policy "Company labor users can write staffing plans" on public.franchise_labor_staffing_plans
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = franchise_labor_staffing_plans.company_id and p.role in ('manager', 'sub_manager', 'staff'))
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.company_id = franchise_labor_staffing_plans.company_id and p.role in ('manager', 'sub_manager', 'staff'))
        )
    )
  );

create policy "Company labor users can view staffing roles" on public.franchise_labor_staffing_roles
  for select using (
    exists (
      select 1
      from public.franchise_labor_staffing_plans sp
      join public.profiles p on p.id = auth.uid()
      where sp.id = franchise_labor_staffing_roles.plan_id
        and (
          p.role = 'admin'
          or (p.company_id = sp.company_id and coalesce(p.role, '') <> 'partner_vendor')
        )
    )
  );

create policy "Company labor users can write staffing roles" on public.franchise_labor_staffing_roles
  for all using (
    exists (
      select 1
      from public.franchise_labor_staffing_plans sp
      join public.profiles p on p.id = auth.uid()
      where sp.id = franchise_labor_staffing_roles.plan_id
        and (
          p.role = 'admin'
          or (p.company_id = sp.company_id and p.role in ('manager', 'sub_manager', 'staff'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.franchise_labor_staffing_plans sp
      join public.profiles p on p.id = auth.uid()
      where sp.id = franchise_labor_staffing_roles.plan_id
        and (
          p.role = 'admin'
          or (p.company_id = sp.company_id and p.role in ('manager', 'sub_manager', 'staff'))
        )
    )
  );
