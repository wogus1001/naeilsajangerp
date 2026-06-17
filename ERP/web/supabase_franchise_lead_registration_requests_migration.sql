create extension if not exists "uuid-ossp";

create table if not exists public.franchise_lead_registration_requests (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id) on delete set null,
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
  promoted_lead_id uuid references public.franchise_leads(id) on delete set null,
  promoted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb not null
);

alter table public.franchise_lead_registration_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_lead_registration_requests'
      and policyname = 'Company members can view franchise_lead_registration_requests'
  ) then
    create policy "Company members can view franchise_lead_registration_requests"
      on public.franchise_lead_registration_requests
      for select using (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_lead_registration_requests'
      and policyname = 'Company members can insert franchise_lead_registration_requests'
  ) then
    create policy "Company members can insert franchise_lead_registration_requests"
      on public.franchise_lead_registration_requests
      for insert with check (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_lead_registration_requests'
      and policyname = 'Company members can update franchise_lead_registration_requests'
  ) then
    create policy "Company members can update franchise_lead_registration_requests"
      on public.franchise_lead_registration_requests
      for update using (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_lead_registration_requests'
      and policyname = 'Company members can delete franchise_lead_registration_requests'
  ) then
    create policy "Company members can delete franchise_lead_registration_requests"
      on public.franchise_lead_registration_requests
      for delete using (company_id = get_my_company_id());
  end if;
end $$;

create index if not exists idx_franchise_lead_registration_requests_company_created
  on public.franchise_lead_registration_requests (company_id, created_at desc);

create index if not exists idx_franchise_lead_registration_requests_company_manager
  on public.franchise_lead_registration_requests (company_id, manager_id);

create index if not exists idx_franchise_lead_registration_requests_promoted
  on public.franchise_lead_registration_requests (company_id, promoted_at);

create unique index if not exists idx_franchise_lead_registration_requests_pending_mobile_unique
  on public.franchise_lead_registration_requests (company_id, mobile_normalized)
  where mobile_normalized is not null and mobile_normalized <> '' and promoted_at is null;
