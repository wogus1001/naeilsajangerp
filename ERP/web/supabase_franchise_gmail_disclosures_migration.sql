create extension if not exists "uuid-ossp";

create table if not exists public.profile_gmail_connections (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  gmail_email text not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  token_expires_at timestamp with time zone,
  scope text default 'https://www.googleapis.com/auth/gmail.send' not null,
  status text default 'active' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.profile_gmail_connections enable row level security;

drop policy if exists "Company members can view profile_gmail_connections" on public.profile_gmail_connections;
drop policy if exists "Company members can insert profile_gmail_connections" on public.profile_gmail_connections;
drop policy if exists "Company members can update profile_gmail_connections" on public.profile_gmail_connections;
drop policy if exists "Company members can delete profile_gmail_connections" on public.profile_gmail_connections;

create policy "Company members can view profile_gmail_connections" on public.profile_gmail_connections
  for select using (company_id = get_my_company_id());

create policy "Company members can insert profile_gmail_connections" on public.profile_gmail_connections
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update profile_gmail_connections" on public.profile_gmail_connections
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete profile_gmail_connections" on public.profile_gmail_connections
  for delete using (company_id = get_my_company_id());

create unique index if not exists idx_profile_gmail_connections_profile_company
  on public.profile_gmail_connections (profile_id, company_id);

create index if not exists idx_profile_gmail_connections_company_status
  on public.profile_gmail_connections (company_id, status, updated_at desc);

alter table public.franchise_lead_disclosure_deliveries
  add column if not exists send_status text default 'recorded' not null,
  add column if not exists gmail_connection_id uuid references public.profile_gmail_connections(id) on delete set null,
  add column if not exists gmail_message_id text,
  add column if not exists gmail_thread_id text,
  add column if not exists gmail_sender_email text,
  add column if not exists recipient_email text,
  add column if not exists opened_at timestamp with time zone,
  add column if not exists confirmed_at timestamp with time zone,
  add column if not exists open_token_hash text,
  add column if not exists confirmation_token_hash text,
  add column if not exists send_error text;

update public.franchise_lead_disclosure_deliveries
set send_status = 'recorded'
where send_status is null;

create index if not exists idx_franchise_lead_disclosure_deliveries_send_status
  on public.franchise_lead_disclosure_deliveries (lead_id, send_status, sent_at desc);

create index if not exists idx_franchise_lead_disclosure_deliveries_gmail_connection
  on public.franchise_lead_disclosure_deliveries (gmail_connection_id);

create unique index if not exists idx_franchise_lead_disclosure_deliveries_confirm_token
  on public.franchise_lead_disclosure_deliveries (confirmation_token_hash)
  where confirmation_token_hash is not null;

create unique index if not exists idx_franchise_lead_disclosure_deliveries_open_token
  on public.franchise_lead_disclosure_deliveries (open_token_hash)
  where open_token_hash is not null;
