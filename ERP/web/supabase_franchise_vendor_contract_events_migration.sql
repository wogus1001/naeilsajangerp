create extension if not exists "uuid-ossp";

create table if not exists public.franchise_vendor_contract_events (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  contract_id uuid references public.franchise_vendor_contracts(id) on delete cascade not null,
  next_contract_id uuid references public.franchise_vendor_contracts(id) on delete set null,
  event_type text not null,
  reason text,
  previous_status text,
  next_status text,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendor_contract_events_event_type_check'
  ) then
    alter table public.franchise_vendor_contract_events
      add constraint franchise_vendor_contract_events_event_type_check
      check (event_type in ('created', 'updated', 'renewed', 'terminated', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendor_contract_events_previous_status_check'
  ) then
    alter table public.franchise_vendor_contract_events
      add constraint franchise_vendor_contract_events_previous_status_check
      check (
        previous_status is null
        or previous_status in ('active', 'renewal_due', 'expired', 'terminated', 'renewed', 'archived')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_vendor_contract_events_next_status_check'
  ) then
    alter table public.franchise_vendor_contract_events
      add constraint franchise_vendor_contract_events_next_status_check
      check (
        next_status is null
        or next_status in ('active', 'renewal_due', 'expired', 'terminated', 'renewed', 'archived')
      );
  end if;
end $$;

create index if not exists idx_franchise_vendor_contract_events_contract_created
  on public.franchise_vendor_contract_events (contract_id, created_at desc);

create index if not exists idx_franchise_vendor_contract_events_company_created
  on public.franchise_vendor_contract_events (company_id, created_at desc);

create index if not exists idx_franchise_vendor_contract_events_next_contract
  on public.franchise_vendor_contract_events (next_contract_id);

alter table public.franchise_vendor_contract_events enable row level security;

drop policy if exists "Company members can view franchise_vendor_contract_events" on public.franchise_vendor_contract_events;
drop policy if exists "Company members can insert franchise_vendor_contract_events" on public.franchise_vendor_contract_events;

create policy "Company members can view franchise_vendor_contract_events" on public.franchise_vendor_contract_events
  for select using (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Company members can insert franchise_vendor_contract_events" on public.franchise_vendor_contract_events
  for insert with check (
    company_id = get_my_company_id()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
