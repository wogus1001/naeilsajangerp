create extension if not exists "uuid-ossp";

create table if not exists public.franchise_location_messages (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  author_id uuid references public.profiles(id) not null,
  body text not null,
  kind text default 'note' not null,
  request_status text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint franchise_location_messages_kind_check
    check (kind in ('note', 'request')),
  constraint franchise_location_messages_request_status_check
    check (
      (kind = 'note' and request_status is null)
      or
      (kind = 'request' and request_status in ('open', 'done'))
    )
);

alter table public.franchise_location_messages enable row level security;

drop policy if exists "Company members can view franchise_location_messages" on public.franchise_location_messages;
drop policy if exists "Company members can insert franchise_location_messages" on public.franchise_location_messages;
drop policy if exists "Company members can update franchise_location_messages" on public.franchise_location_messages;

create policy "Company members can view franchise_location_messages" on public.franchise_location_messages
  for select using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can insert franchise_location_messages" on public.franchise_location_messages
  for insert with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can update franchise_location_messages" on public.franchise_location_messages
  for update using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  )
  with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create index if not exists idx_franchise_location_messages_company_created
  on public.franchise_location_messages (company_id, created_at desc);

create index if not exists idx_franchise_location_messages_location_created
  on public.franchise_location_messages (location_id, created_at asc);

create index if not exists idx_franchise_location_messages_location_status
  on public.franchise_location_messages (location_id, request_status)
  where kind = 'request';
