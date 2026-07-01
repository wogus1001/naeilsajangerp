create extension if not exists "uuid-ossp";

create table if not exists public.franchise_vendor_contracts (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  category text default 'other' not null,
  vendor_name text not null,
  contract_title text not null,
  contract_start_date date,
  contract_end_date date,
  status text default 'active' not null,
  document_source text default 'manual' not null,
  electronic_contract_id uuid references public.electronic_contracts(id) on delete set null,
  storage_bucket text,
  storage_path text,
  file_name text,
  memo text,
  data jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendor_contracts_category_check'
  ) then
    alter table public.franchise_vendor_contracts
      add constraint franchise_vendor_contracts_category_check
      check (category in ('logistics', 'food_material', 'interior', 'marketing', 'lease', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendor_contracts_status_check'
  ) then
    alter table public.franchise_vendor_contracts
      add constraint franchise_vendor_contracts_status_check
      check (status in ('active', 'renewal_due', 'expired', 'terminated', 'renewed', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendor_contracts_document_source_check'
  ) then
    alter table public.franchise_vendor_contracts
      add constraint franchise_vendor_contracts_document_source_check
      check (document_source in ('upload', 'electronic_contract', 'manual'));
  end if;
end $$;

create index if not exists idx_franchise_vendor_contracts_company_end_date
  on public.franchise_vendor_contracts (company_id, contract_end_date asc);

create index if not exists idx_franchise_vendor_contracts_company_status
  on public.franchise_vendor_contracts (company_id, status, updated_at desc);

create index if not exists idx_franchise_vendor_contracts_owner
  on public.franchise_vendor_contracts (owner_profile_id, contract_end_date asc);

create index if not exists idx_franchise_vendor_contracts_electronic_contract
  on public.franchise_vendor_contracts (electronic_contract_id);

alter table public.franchise_vendor_contracts enable row level security;

drop policy if exists "Company members can view franchise_vendor_contracts" on public.franchise_vendor_contracts;
drop policy if exists "Company members can insert franchise_vendor_contracts" on public.franchise_vendor_contracts;
drop policy if exists "Company members can update franchise_vendor_contracts" on public.franchise_vendor_contracts;

create policy "Company members can view franchise_vendor_contracts" on public.franchise_vendor_contracts
  for select using (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Company members can insert franchise_vendor_contracts" on public.franchise_vendor_contracts
  for insert with check (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Company members can update franchise_vendor_contracts" on public.franchise_vendor_contracts
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

drop trigger if exists trg_franchise_vendor_contracts_updated_at on public.franchise_vendor_contracts;
create trigger trg_franchise_vendor_contracts_updated_at
before update on public.franchise_vendor_contracts
for each row execute procedure public.update_updated_at_column();
