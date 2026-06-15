create extension if not exists "uuid-ossp";

create unique index if not exists idx_franchise_leads_id_company_unique
  on public.franchise_leads (id, company_id);

create table if not exists public.franchise_lead_contract_checklist_steps (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  lead_id uuid references public.franchise_leads(id) on delete cascade not null,
  step_key text not null,
  label text not null,
  required boolean default true not null,
  completed boolean default false not null,
  completed_at timestamp with time zone,
  completed_by uuid references public.profiles(id) on delete set null,
  memo text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb,
  unique (lead_id, step_key)
);

delete from public.franchise_lead_contract_checklist_steps checklist
where not exists (
  select 1
  from public.franchise_leads lead
  where lead.id = checklist.lead_id
    and lead.company_id = checklist.company_id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_lead_contract_checklist_steps_lead_company_fkey'
  ) then
    alter table public.franchise_lead_contract_checklist_steps
      add constraint franchise_lead_contract_checklist_steps_lead_company_fkey
      foreign key (lead_id, company_id)
      references public.franchise_leads(id, company_id)
      on delete cascade;
  end if;
end $$;

alter table public.franchise_lead_contract_checklist_steps enable row level security;

drop policy if exists "Company members can view franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps;
drop policy if exists "Company members can insert franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps;
drop policy if exists "Company members can update franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps;
drop policy if exists "Company members can delete franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps;

create policy "Company members can view franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps
  for select using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_contract_checklist_steps.lead_id
        and lead.company_id = franchise_lead_contract_checklist_steps.company_id
    )
  );

create policy "Company members can insert franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps
  for insert with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_contract_checklist_steps.lead_id
        and lead.company_id = franchise_lead_contract_checklist_steps.company_id
    )
  );

create policy "Company members can update franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps
  for update using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_contract_checklist_steps.lead_id
        and lead.company_id = franchise_lead_contract_checklist_steps.company_id
    )
  )
  with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_contract_checklist_steps.lead_id
        and lead.company_id = franchise_lead_contract_checklist_steps.company_id
    )
  );

create policy "Company members can delete franchise_lead_contract_checklist_steps" on public.franchise_lead_contract_checklist_steps
  for delete using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.franchise_leads lead
      where lead.id = franchise_lead_contract_checklist_steps.lead_id
        and lead.company_id = franchise_lead_contract_checklist_steps.company_id
    )
  );

create index if not exists idx_franchise_lead_contract_checklist_company_updated
  on public.franchise_lead_contract_checklist_steps (company_id, updated_at desc);

create index if not exists idx_franchise_lead_contract_checklist_lead_sort
  on public.franchise_lead_contract_checklist_steps (lead_id, sort_order);

create index if not exists idx_franchise_lead_contract_checklist_completed
  on public.franchise_lead_contract_checklist_steps (company_id, completed, updated_at desc);
