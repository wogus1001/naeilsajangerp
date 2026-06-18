create extension if not exists "uuid-ossp";

create table if not exists public.franchise_lead_registration_requests (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
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

alter table public.franchise_lead_registration_requests
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.franchise_lead_registration_requests enable row level security;

create or replace function public.can_access_franchise_lead(
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

drop policy if exists "Company members can view franchise_lead_registration_requests" on public.franchise_lead_registration_requests;
drop policy if exists "Company members can insert franchise_lead_registration_requests" on public.franchise_lead_registration_requests;
drop policy if exists "Company members can update franchise_lead_registration_requests" on public.franchise_lead_registration_requests;
drop policy if exists "Company members can delete franchise_lead_registration_requests" on public.franchise_lead_registration_requests;

create policy "Company members can view franchise_lead_registration_requests"
  on public.franchise_lead_registration_requests
  for select using (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can insert franchise_lead_registration_requests"
  on public.franchise_lead_registration_requests
  for insert with check (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can update franchise_lead_registration_requests"
  on public.franchise_lead_registration_requests
  for update using (public.can_access_franchise_lead(company_id, created_by))
  with check (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can delete franchise_lead_registration_requests"
  on public.franchise_lead_registration_requests
  for delete using (public.can_access_franchise_lead(company_id, created_by));

create index if not exists idx_franchise_lead_registration_requests_company_created
  on public.franchise_lead_registration_requests (company_id, created_at desc);

create index if not exists idx_franchise_lead_registration_requests_company_manager
  on public.franchise_lead_registration_requests (company_id, manager_id);

create index if not exists idx_franchise_lead_registration_requests_company_creator_created
  on public.franchise_lead_registration_requests (company_id, created_by, created_at desc);

create index if not exists idx_franchise_lead_registration_requests_promoted
  on public.franchise_lead_registration_requests (company_id, promoted_at);

create unique index if not exists idx_franchise_lead_registration_requests_pending_mobile_unique
  on public.franchise_lead_registration_requests (company_id, mobile_normalized)
  where mobile_normalized is not null and mobile_normalized <> '' and promoted_at is null;
