-- Meta Lead Ads integration migration
-- Run this in Supabase SQL Editor before enabling Meta Lead Ads collection.

create extension if not exists "uuid-ossp";

create table if not exists public.meta_lead_connections (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  connected_by uuid references public.profiles(id),
  meta_user_id text,
  meta_page_id text not null,
  meta_page_name text,
  access_token_encrypted text not null,
  token_expires_at timestamp with time zone,
  status text default 'connected' not null,
  last_sync_at timestamp with time zone,
  last_webhook_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create table if not exists public.meta_lead_forms (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  connection_id uuid references public.meta_lead_connections(id) on delete cascade not null,
  meta_form_id text not null,
  meta_form_name text,
  enabled boolean default false not null,
  default_manager_id uuid references public.profiles(id),
  field_mapping jsonb default '{}'::jsonb,
  last_synced_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create table if not exists public.meta_lead_imports (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  connection_id uuid references public.meta_lead_connections(id) on delete cascade,
  form_id uuid references public.meta_lead_forms(id) on delete set null,
  meta_lead_id text not null,
  franchise_lead_id uuid references public.franchise_leads(id) on delete set null,
  status text default 'received' not null,
  error_message text,
  payload jsonb default '{}'::jsonb,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null,
  imported_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meta_lead_connections enable row level security;
alter table public.meta_lead_forms enable row level security;
alter table public.meta_lead_imports enable row level security;

drop policy if exists "Company members can view meta_lead_connections" on public.meta_lead_connections;
drop policy if exists "Company managers can manage meta_lead_connections" on public.meta_lead_connections;
drop policy if exists "Company members can view meta_lead_forms" on public.meta_lead_forms;
drop policy if exists "Company managers can manage meta_lead_forms" on public.meta_lead_forms;
drop policy if exists "Company members can view meta_lead_imports" on public.meta_lead_imports;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meta_lead_connections'
      and policyname = 'Company members can view meta_lead_connections'
  ) then
    create policy "Company members can view meta_lead_connections" on public.meta_lead_connections
      for select using (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meta_lead_connections'
      and policyname = 'Company managers can manage meta_lead_connections'
  ) then
    create policy "Company managers can manage meta_lead_connections" on public.meta_lead_connections
      for all using (
        company_id = get_my_company_id()
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.company_id = meta_lead_connections.company_id
            and p.role in ('manager', 'admin')
        )
      )
      with check (
        company_id = get_my_company_id()
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.company_id = meta_lead_connections.company_id
            and p.role in ('manager', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meta_lead_forms'
      and policyname = 'Company members can view meta_lead_forms'
  ) then
    create policy "Company members can view meta_lead_forms" on public.meta_lead_forms
      for select using (company_id = get_my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meta_lead_forms'
      and policyname = 'Company managers can manage meta_lead_forms'
  ) then
    create policy "Company managers can manage meta_lead_forms" on public.meta_lead_forms
      for all using (
        company_id = get_my_company_id()
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.company_id = meta_lead_forms.company_id
            and p.role in ('manager', 'admin')
        )
      )
      with check (
        company_id = get_my_company_id()
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.company_id = meta_lead_forms.company_id
            and p.role in ('manager', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meta_lead_imports'
      and policyname = 'Company members can view meta_lead_imports'
  ) then
    create policy "Company members can view meta_lead_imports" on public.meta_lead_imports
      for select using (company_id = get_my_company_id());
  end if;
end $$;

create unique index if not exists idx_meta_lead_connections_company_page_unique
  on public.meta_lead_connections (company_id, meta_page_id);

create index if not exists idx_meta_lead_connections_company_status
  on public.meta_lead_connections (company_id, status);

create unique index if not exists idx_meta_lead_forms_company_form_unique
  on public.meta_lead_forms (company_id, meta_form_id);

create index if not exists idx_meta_lead_forms_connection_enabled
  on public.meta_lead_forms (connection_id, enabled);

create unique index if not exists idx_meta_lead_imports_company_lead_unique
  on public.meta_lead_imports (company_id, meta_lead_id);

create index if not exists idx_meta_lead_imports_company_created
  on public.meta_lead_imports (company_id, created_at desc);
