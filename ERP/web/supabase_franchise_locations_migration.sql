-- Franchise location master migration
-- Run this in Supabase SQL Editor before using the location master UI.

create extension if not exists "uuid-ossp";

create table if not exists public.franchise_locations (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id),
  name text not null,
  location_type text default '예정점' not null,
  brand text,
  status text default '검토중' not null,
  region text,
  address text,
  latitude numeric,
  longitude numeric,
  opened_at date,
  source_property_id text references public.properties(id) on delete set null,
  memo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_locations
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create or replace function public.can_access_franchise_location(
  target_company_id uuid,
  target_created_by uuid
)
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
      and (
        p.role = 'admin'
        or (
          p.company_id = target_company_id
          and (
            p.role in ('manager', 'sub_manager', 'staff')
            or (p.role = 'partner_vendor' and target_created_by = auth.uid())
          )
        )
      )
  );
$$;

alter table public.franchise_locations enable row level security;

drop policy if exists "Company members can view franchise_locations" on public.franchise_locations;
drop policy if exists "Company members can insert franchise_locations" on public.franchise_locations;
drop policy if exists "Company members can update franchise_locations" on public.franchise_locations;
drop policy if exists "Company members can delete franchise_locations" on public.franchise_locations;

create policy "Company members can view franchise_locations" on public.franchise_locations
  for select using (public.can_access_franchise_location(company_id, created_by));

create policy "Company members can insert franchise_locations" on public.franchise_locations
  for insert with check (public.can_access_franchise_location(company_id, created_by));

create policy "Company members can update franchise_locations" on public.franchise_locations
  for update using (public.can_access_franchise_location(company_id, created_by))
  with check (public.can_access_franchise_location(company_id, created_by));

create policy "Company members can delete franchise_locations" on public.franchise_locations
  for delete using (public.can_access_franchise_location(company_id, created_by));

create index if not exists idx_franchise_locations_company_updated
  on public.franchise_locations (company_id, updated_at desc);

create index if not exists idx_franchise_locations_company_type_status
  on public.franchise_locations (company_id, location_type, status);

create index if not exists idx_franchise_locations_company_region
  on public.franchise_locations (company_id, region);

create index if not exists idx_franchise_locations_company_creator_updated
  on public.franchise_locations (company_id, created_by, updated_at desc);
