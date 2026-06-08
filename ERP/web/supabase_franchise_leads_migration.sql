-- Franchise leads CRM migration
-- Run this in Supabase SQL Editor before deploying the franchise lead dashboard.

create extension if not exists "uuid-ossp";

create table if not exists public.franchise_leads (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id),
  name text not null,
  mobile text,
  mobile_normalized text,
  source text,
  status text default '문의접수' not null,
  grade text,
  desired_region text,
  budget_min numeric,
  budget_max numeric,
  interested_brand text,
  memo text,
  next_contact_at timestamp with time zone,
  last_contacted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_leads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_leads'
      and policyname = 'Company members can view franchise_leads'
  ) then
    create policy "Company members can view franchise_leads" on public.franchise_leads
      for select using (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_leads'
      and policyname = 'Company members can insert franchise_leads'
  ) then
    create policy "Company members can insert franchise_leads" on public.franchise_leads
      for insert with check (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_leads'
      and policyname = 'Company members can update franchise_leads'
  ) then
    create policy "Company members can update franchise_leads" on public.franchise_leads
      for update using (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_leads'
      and policyname = 'Company members can delete franchise_leads'
  ) then
    create policy "Company members can delete franchise_leads" on public.franchise_leads
      for delete using (company_id = get_my_company_id());
  end if;
end $$;

create index if not exists idx_franchise_leads_company_created
  on public.franchise_leads (company_id, created_at desc);

create index if not exists idx_franchise_leads_company_status
  on public.franchise_leads (company_id, status);

create index if not exists idx_franchise_leads_company_manager
  on public.franchise_leads (company_id, manager_id);

create unique index if not exists idx_franchise_leads_company_mobile_unique
  on public.franchise_leads (company_id, mobile_normalized)
  where mobile_normalized is not null and mobile_normalized <> '';
