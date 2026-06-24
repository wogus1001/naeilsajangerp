create extension if not exists "uuid-ossp";

create unique index if not exists idx_franchise_leads_id_company_unique
  on public.franchise_leads (id, company_id);

alter table public.franchise_lead_contract_checklist_steps
  add column if not exists requirement_type text default 'required' not null,
  add column if not exists basis_type text default 'internal' not null,
  add column if not exists basis_text text,
  add column if not exists owner_team text,
  add column if not exists applicability text default 'applicable' not null,
  add column if not exists required_evidence boolean default false not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_contract_checklist_steps_requirement_type_check'
  ) then
    alter table public.franchise_lead_contract_checklist_steps
      add constraint franchise_lead_contract_checklist_steps_requirement_type_check
      check (requirement_type in ('required', 'report', 'optional'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_contract_checklist_steps_basis_type_check'
  ) then
    alter table public.franchise_lead_contract_checklist_steps
      add constraint franchise_lead_contract_checklist_steps_basis_type_check
      check (basis_type in ('franchise_law', 'privacy', 'internal'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_contract_checklist_steps_applicability_check'
  ) then
    alter table public.franchise_lead_contract_checklist_steps
      add constraint franchise_lead_contract_checklist_steps_applicability_check
      check (applicability in ('applicable', 'not_applicable'));
  end if;
end $$;

alter table public.electronic_contracts
  add column if not exists lead_id uuid references public.franchise_leads(id) on delete set null;

create index if not exists idx_electronic_contracts_company_lead_created
  on public.electronic_contracts (company_id, lead_id, created_at desc);

create table if not exists public.franchise_lead_documents (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  lead_id uuid references public.franchise_leads(id) on delete cascade not null,
  source_type text default 'manual' not null,
  source_id text,
  title text not null,
  document_status text default 'stored' not null,
  file_url text,
  file_name text,
  memo text,
  status text default 'active' not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create unique index if not exists idx_franchise_lead_documents_source_unique
  on public.franchise_lead_documents (company_id, lead_id, source_type, source_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_documents_source_type_check'
  ) then
    alter table public.franchise_lead_documents
      add constraint franchise_lead_documents_source_type_check
      check (source_type in ('upload', 'external_url', 'electronic_contract', 'disclosure', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_documents_status_check'
  ) then
    alter table public.franchise_lead_documents
      add constraint franchise_lead_documents_status_check
      check (status in ('active', 'archived'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_documents_lead_company_fkey'
  ) then
    alter table public.franchise_lead_documents
      add constraint franchise_lead_documents_lead_company_fkey
      foreign key (lead_id, company_id)
      references public.franchise_leads(id, company_id)
      on delete cascade;
  end if;
end $$;

create table if not exists public.franchise_lead_document_checklist_links (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  lead_id uuid references public.franchise_leads(id) on delete cascade not null,
  lead_document_id uuid references public.franchise_lead_documents(id) on delete cascade not null,
  step_key text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb,
  unique (lead_document_id, step_key)
);

create unique index if not exists idx_franchise_lead_documents_id_company_unique
  on public.franchise_lead_documents (id, company_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_document_links_lead_company_fkey'
  ) then
    alter table public.franchise_lead_document_checklist_links
      add constraint franchise_lead_document_links_lead_company_fkey
      foreign key (lead_id, company_id)
      references public.franchise_leads(id, company_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_document_links_document_company_fkey'
  ) then
    alter table public.franchise_lead_document_checklist_links
      add constraint franchise_lead_document_links_document_company_fkey
      foreign key (lead_document_id, company_id)
      references public.franchise_lead_documents(id, company_id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_franchise_lead_documents_company_lead_updated
  on public.franchise_lead_documents (company_id, lead_id, updated_at desc);

create index if not exists idx_franchise_lead_documents_source
  on public.franchise_lead_documents (company_id, source_type, source_id);

create index if not exists idx_franchise_lead_document_links_lead_step
  on public.franchise_lead_document_checklist_links (lead_id, step_key);

alter table public.franchise_lead_documents enable row level security;
alter table public.franchise_lead_document_checklist_links enable row level security;

drop policy if exists "Company members can view franchise_lead_documents" on public.franchise_lead_documents;
drop policy if exists "Company members can insert franchise_lead_documents" on public.franchise_lead_documents;
drop policy if exists "Company members can update franchise_lead_documents" on public.franchise_lead_documents;
drop policy if exists "Company members can delete franchise_lead_documents" on public.franchise_lead_documents;

create policy "Company members can view franchise_lead_documents" on public.franchise_lead_documents
  for select using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_documents.lead_id
        and lead.company_id = franchise_lead_documents.company_id
    )
  );

create policy "Company members can insert franchise_lead_documents" on public.franchise_lead_documents
  for insert with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_documents.lead_id
        and lead.company_id = franchise_lead_documents.company_id
    )
  );

create policy "Company members can update franchise_lead_documents" on public.franchise_lead_documents
  for update using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_documents.lead_id
        and lead.company_id = franchise_lead_documents.company_id
    )
  )
  with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_documents.lead_id
        and lead.company_id = franchise_lead_documents.company_id
    )
  );

create policy "Company members can delete franchise_lead_documents" on public.franchise_lead_documents
  for delete using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_documents.lead_id
        and lead.company_id = franchise_lead_documents.company_id
    )
  );

drop policy if exists "Company members can view franchise_lead_document_links" on public.franchise_lead_document_checklist_links;
drop policy if exists "Company members can insert franchise_lead_document_links" on public.franchise_lead_document_checklist_links;
drop policy if exists "Company members can update franchise_lead_document_links" on public.franchise_lead_document_checklist_links;
drop policy if exists "Company members can delete franchise_lead_document_links" on public.franchise_lead_document_checklist_links;

create policy "Company members can view franchise_lead_document_links" on public.franchise_lead_document_checklist_links
  for select using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_document_checklist_links.lead_id
        and lead.company_id = franchise_lead_document_checklist_links.company_id
    )
  );

create policy "Company members can insert franchise_lead_document_links" on public.franchise_lead_document_checklist_links
  for insert with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_document_checklist_links.lead_id
        and lead.company_id = franchise_lead_document_checklist_links.company_id
    )
  );

create policy "Company members can update franchise_lead_document_links" on public.franchise_lead_document_checklist_links
  for update using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_document_checklist_links.lead_id
        and lead.company_id = franchise_lead_document_checklist_links.company_id
    )
  )
  with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_document_checklist_links.lead_id
        and lead.company_id = franchise_lead_document_checklist_links.company_id
    )
  );

create policy "Company members can delete franchise_lead_document_links" on public.franchise_lead_document_checklist_links
  for delete using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_document_checklist_links.lead_id
        and lead.company_id = franchise_lead_document_checklist_links.company_id
    )
  );
