-- Electronic contract v2: platform UCANSIGN account, ERP-scoped documents, SafetyData license records.
-- Apply manually in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.platform_ucansign_connection (
  id text primary key,
  status text not null default 'disconnected',
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at bigint,
  connected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.electronic_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sent_by_profile_id uuid references public.profiles(id) on delete set null,
  template_key text not null,
  template_version text,
  ucansign_document_id text,
  name text not null,
  status text not null default 'draft',
  license_number text,
  form_snapshot jsonb not null default '{}'::jsonb,
  payload_snapshot jsonb not null default '{}'::jsonb,
  send_error text,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  electronic_contract_id uuid references public.electronic_contracts(id) on delete set null,
  ucansign_document_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.license_import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'safetydata',
  status text not null default 'running',
  total_count integer not null default 0,
  imported_count integer not null default 0,
  started_by uuid references public.profiles(id) on delete set null,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.license_business_records (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.license_import_batches(id) on delete set null,
  license_number text not null,
  business_type text,
  business_name text,
  representative_name text,
  phone text,
  permission_date text,
  address text,
  normalized_search text,
  active boolean not null default true,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_ucansign_connection_status
  on public.platform_ucansign_connection(status);

create index if not exists idx_electronic_contracts_company_status
  on public.electronic_contracts(company_id, status);

create index if not exists idx_electronic_contracts_sent_by
  on public.electronic_contracts(sent_by_profile_id);

create index if not exists idx_electronic_contracts_ucansign_document
  on public.electronic_contracts(ucansign_document_id);

create index if not exists idx_contract_events_contract
  on public.contract_events(electronic_contract_id);

create index if not exists idx_contract_events_ucansign_document
  on public.contract_events(ucansign_document_id);

create index if not exists idx_license_business_records_active_search
  on public.license_business_records(active, normalized_search);

create index if not exists idx_license_business_records_license_number
  on public.license_business_records(license_number);

create index if not exists idx_license_business_records_batch
  on public.license_business_records(import_batch_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_platform_ucansign_connection_updated_at on public.platform_ucansign_connection;
create trigger trg_platform_ucansign_connection_updated_at
before update on public.platform_ucansign_connection
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_electronic_contracts_updated_at on public.electronic_contracts;
create trigger trg_electronic_contracts_updated_at
before update on public.electronic_contracts
for each row execute function public.set_updated_at_timestamp();

alter table public.platform_ucansign_connection enable row level security;
alter table public.electronic_contracts enable row level security;
alter table public.contract_events enable row level security;
alter table public.license_import_batches enable row level security;
alter table public.license_business_records enable row level security;

drop policy if exists "Admins can manage platform ucansign connection" on public.platform_ucansign_connection;
create policy "Admins can manage platform ucansign connection" on public.platform_ucansign_connection
  for all using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  ));

drop policy if exists "Users can view company electronic contracts" on public.electronic_contracts;
create policy "Users can view company electronic contracts" on public.electronic_contracts
  for select using (company_id = get_my_company_id());

drop policy if exists "Users can create company electronic contracts" on public.electronic_contracts;
create policy "Users can create company electronic contracts" on public.electronic_contracts
  for insert with check (company_id = get_my_company_id());

drop policy if exists "Users can update company electronic contracts" on public.electronic_contracts;
create policy "Users can update company electronic contracts" on public.electronic_contracts
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

drop policy if exists "Users can view company contract events" on public.contract_events;
create policy "Users can view company contract events" on public.contract_events
  for select using (exists (
    select 1 from public.electronic_contracts
    where electronic_contracts.id = contract_events.electronic_contract_id
      and electronic_contracts.company_id = get_my_company_id()
  ));

drop policy if exists "Admins can manage license import batches" on public.license_import_batches;
create policy "Admins can manage license import batches" on public.license_import_batches
  for all using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  ));

drop policy if exists "Authenticated users can view active license records" on public.license_business_records;
create policy "Authenticated users can view active license records" on public.license_business_records
  for select using (active = true and auth.uid() is not null);

drop policy if exists "Admins can manage license records" on public.license_business_records;
create policy "Admins can manage license records" on public.license_business_records
  for all using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  ));
