create table if not exists public.franchise_owner_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  login_id text not null,
  login_id_normalized text not null,
  owner_name text,
  owner_phone text,
  password_hash text not null,
  status text not null default 'active',
  temporary_password boolean not null default true,
  last_login_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, location_id),
  unique (company_id, login_id_normalized)
);

create table if not exists public.franchise_owner_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.franchise_owner_notices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.franchise_locations(id) on delete cascade,
  title text not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'published',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.franchise_owner_notice_reads (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.franchise_owner_notices(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (notice_id, owner_account_id)
);

create table if not exists public.franchise_owner_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  submission_type text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.franchise_owner_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  submission_id uuid references public.franchise_owner_submissions(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  storage_bucket text not null,
  storage_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

create index if not exists franchise_owner_accounts_company_idx on public.franchise_owner_accounts(company_id, status);
create index if not exists franchise_owner_sessions_token_idx on public.franchise_owner_sessions(session_token_hash);
create index if not exists franchise_owner_notices_company_idx on public.franchise_owner_notices(company_id, location_id, created_at desc);
create index if not exists franchise_owner_submissions_company_idx on public.franchise_owner_submissions(company_id, status, created_at desc);
create index if not exists franchise_owner_files_submission_idx on public.franchise_owner_files(submission_id);

alter table public.franchise_owner_accounts enable row level security;
alter table public.franchise_owner_sessions enable row level security;
alter table public.franchise_owner_notices enable row level security;
alter table public.franchise_owner_notice_reads enable row level security;
alter table public.franchise_owner_submissions enable row level security;
alter table public.franchise_owner_files enable row level security;

drop policy if exists franchise_owner_accounts_staff_select on public.franchise_owner_accounts;
create policy franchise_owner_accounts_staff_select on public.franchise_owner_accounts
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_accounts.company_id)
    )
  );

drop policy if exists franchise_owner_accounts_staff_write on public.franchise_owner_accounts;
create policy franchise_owner_accounts_staff_write on public.franchise_owner_accounts
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.company_id = franchise_owner_accounts.company_id and p.role in ('manager', 'sub_manager')))
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.company_id = franchise_owner_accounts.company_id and p.role in ('manager', 'sub_manager')))
    )
  );

drop policy if exists franchise_owner_notices_staff on public.franchise_owner_notices;
create policy franchise_owner_notices_staff on public.franchise_owner_notices
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_notices.company_id)
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_notices.company_id)
    )
  );

drop policy if exists franchise_owner_submissions_staff on public.franchise_owner_submissions;
create policy franchise_owner_submissions_staff on public.franchise_owner_submissions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_submissions.company_id)
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_submissions.company_id)
    )
  );

drop policy if exists franchise_owner_files_staff on public.franchise_owner_files;
create policy franchise_owner_files_staff on public.franchise_owner_files
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_files.company_id)
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.company_id = franchise_owner_files.company_id)
    )
  );
