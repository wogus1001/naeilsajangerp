create extension if not exists "uuid-ossp";

create table if not exists public.franchise_disclosure_documents (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  brand_name text,
  franchisor_name text,
  version text default 'v1' not null,
  file_url text,
  file_name text,
  issued_at date,
  memo text,
  status text default 'active' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create table if not exists public.franchise_lead_disclosure_deliveries (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  lead_id uuid references public.franchise_leads(id) on delete cascade not null,
  document_id uuid references public.franchise_disclosure_documents(id) on delete set null,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamp with time zone not null,
  channel text default 'manual' not null,
  recipient_name text,
  recipient_contact text,
  document_title text not null,
  document_version text default 'v1' not null,
  evidence_url text,
  memo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_disclosure_documents enable row level security;
alter table public.franchise_lead_disclosure_deliveries enable row level security;

drop policy if exists "Company members can view franchise_disclosure_documents" on public.franchise_disclosure_documents;
drop policy if exists "Company members can insert franchise_disclosure_documents" on public.franchise_disclosure_documents;
drop policy if exists "Company members can update franchise_disclosure_documents" on public.franchise_disclosure_documents;
drop policy if exists "Company members can delete franchise_disclosure_documents" on public.franchise_disclosure_documents;
drop policy if exists "Company members can view franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries;
drop policy if exists "Company members can insert franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries;
drop policy if exists "Company members can update franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries;
drop policy if exists "Company members can delete franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries;

create policy "Company members can view franchise_disclosure_documents" on public.franchise_disclosure_documents
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_disclosure_documents" on public.franchise_disclosure_documents
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_disclosure_documents" on public.franchise_disclosure_documents
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_disclosure_documents" on public.franchise_disclosure_documents
  for delete using (company_id = get_my_company_id());

create policy "Company members can view franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_lead_disclosure_deliveries" on public.franchise_lead_disclosure_deliveries
  for delete using (company_id = get_my_company_id());

create index if not exists idx_franchise_disclosure_documents_company_status
  on public.franchise_disclosure_documents (company_id, status, updated_at desc);

create index if not exists idx_franchise_disclosure_documents_company_brand
  on public.franchise_disclosure_documents (company_id, brand_name);

create index if not exists idx_franchise_lead_disclosure_deliveries_lead_sent
  on public.franchise_lead_disclosure_deliveries (lead_id, sent_at desc);

create index if not exists idx_franchise_lead_disclosure_deliveries_company_sent
  on public.franchise_lead_disclosure_deliveries (company_id, sent_at desc);

create index if not exists idx_franchise_lead_disclosure_deliveries_document
  on public.franchise_lead_disclosure_deliveries (document_id);
