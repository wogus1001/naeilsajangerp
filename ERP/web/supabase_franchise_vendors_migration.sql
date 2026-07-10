create extension if not exists "uuid-ossp";

create table if not exists public.franchise_vendors (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  category text default 'other' not null,
  vendor_name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  business_number text,
  status text default 'active' not null,
  memo text,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendors_category_check'
  ) then
    alter table public.franchise_vendors
      add constraint franchise_vendors_category_check
      check (category in ('logistics', 'food_material', 'interior', 'marketing', 'lease', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendors_status_check'
  ) then
    alter table public.franchise_vendors
      add constraint franchise_vendors_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

create unique index if not exists idx_franchise_vendors_company_name
  on public.franchise_vendors (company_id, lower(vendor_name));

create index if not exists idx_franchise_vendors_company_status
  on public.franchise_vendors (company_id, status, updated_at desc);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.franchise_vendors enable row level security;

drop policy if exists "Company members can view franchise_vendors" on public.franchise_vendors;
drop policy if exists "Company members can insert franchise_vendors" on public.franchise_vendors;
drop policy if exists "Company members can update franchise_vendors" on public.franchise_vendors;

create policy "Company members can view franchise_vendors" on public.franchise_vendors
  for select using (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Company members can insert franchise_vendors" on public.franchise_vendors
  for insert with check (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Company members can update franchise_vendors" on public.franchise_vendors
  for update using (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop trigger if exists trg_franchise_vendors_updated_at on public.franchise_vendors;
create trigger trg_franchise_vendors_updated_at
before update on public.franchise_vendors
for each row execute function public.update_updated_at_column();
