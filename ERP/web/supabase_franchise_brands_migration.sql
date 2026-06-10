-- Franchise brand master migration
-- Run this in Supabase SQL Editor before using brand master search.

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

create table if not exists public.franchise_brands (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  brand_name text not null,
  franchisor_name text,
  disclosure_brand_id text,
  industry text,
  business_type text,
  category_major text,
  category_middle text,
  category_small text,
  recommended_keywords text[] default '{}'::text[],
  source text default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_brands enable row level security;

drop policy if exists "Company members can view franchise_brands" on public.franchise_brands;
drop policy if exists "Company members can insert franchise_brands" on public.franchise_brands;
drop policy if exists "Company members can update franchise_brands" on public.franchise_brands;
drop policy if exists "Company members can delete franchise_brands" on public.franchise_brands;

create policy "Company members can view franchise_brands" on public.franchise_brands
  for select using (company_id is null or company_id = get_my_company_id());

create policy "Company members can insert franchise_brands" on public.franchise_brands
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_brands" on public.franchise_brands
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_brands" on public.franchise_brands
  for delete using (company_id = get_my_company_id());

create unique index if not exists idx_franchise_brands_company_name
  on public.franchise_brands (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(brand_name));

create index if not exists idx_franchise_brands_name
  on public.franchise_brands using gin (brand_name gin_trgm_ops);

create index if not exists idx_franchise_brands_company_updated
  on public.franchise_brands (company_id, updated_at desc);
