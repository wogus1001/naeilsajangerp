create table if not exists public.franchise_notifications (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  recipient_profile_id uuid references public.profiles(id) on delete cascade not null,
  source_type text not null,
  source_id text not null,
  lead_id uuid references public.franchise_leads(id) on delete cascade,
  severity text default 'info' not null,
  title text not null,
  body text default '' not null,
  action_url text default '' not null,
  due_at timestamp with time zone,
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  delivery_channel text default 'in_app' not null,
  kakao_template_key text default '' not null,
  data jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists idx_franchise_notifications_source
  on public.franchise_notifications (company_id, recipient_profile_id, source_type, source_id);

create index if not exists idx_franchise_notifications_recipient
  on public.franchise_notifications (recipient_profile_id, dismissed_at, read_at, due_at);

create index if not exists idx_franchise_notifications_company
  on public.franchise_notifications (company_id, created_at desc);

alter table public.franchise_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_notifications'
      and policyname = 'Users can view own franchise notifications'
  ) then
    create policy "Users can view own franchise notifications"
      on public.franchise_notifications
      for select
      using (
        recipient_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_notifications'
      and policyname = 'Users can update own franchise notifications'
  ) then
    create policy "Users can update own franchise notifications"
      on public.franchise_notifications
      for update
      using (
        recipient_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        recipient_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;
end $$;
