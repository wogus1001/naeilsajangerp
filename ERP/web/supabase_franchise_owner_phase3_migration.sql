begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'franchise-owner-private',
  'franchise-owner-private',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/haansofthwp',
    'application/x-hwp',
    'application/vnd.hancom.hwp',
    'application/zip'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.franchise_owner_content_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.franchise_locations(id) on delete cascade,
  source_type text not null default 'content_item',
  source_id text,
  content_type text not null,
  category text not null default '',
  title text not null,
  summary text not null default '',
  body text not null default '',
  version integer not null default 1 check (version > 0),
  status text not null default 'draft',
  requires_acknowledgement boolean not null default false,
  due_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (content_type in ('education', 'manual', 'official_document', 'corrective_action', 'contract_document')),
  check (status in ('draft', 'published', 'archived')),
  check (location_id is not null or content_type in ('education', 'manual', 'official_document'))
);

create unique index if not exists franchise_owner_content_source_unique
  on public.franchise_owner_content_items(company_id, source_type, source_id)
  where source_id is not null and btrim(source_id) <> '';
create index if not exists franchise_owner_content_company_list_idx
  on public.franchise_owner_content_items(company_id, status, content_type, published_at desc, created_at desc);
create index if not exists franchise_owner_content_location_idx
  on public.franchise_owner_content_items(company_id, location_id, status, published_at desc);

create table if not exists public.franchise_owner_content_attachments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.franchise_owner_content_items(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  storage_bucket text not null default 'franchise-owner-private',
  storage_path text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (storage_bucket = 'franchise-owner-private')
);

create index if not exists franchise_owner_content_attachments_content_idx
  on public.franchise_owner_content_attachments(content_id, created_at);

create table if not exists public.franchise_owner_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  reminder_kind text not null default 'manual',
  message text not null default '',
  due_at timestamptz,
  sent_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (source_type in ('checklist_issue', 'content_item')),
  unique (company_id, owner_account_id, source_type, source_id, reminder_kind)
);

create index if not exists franchise_owner_reminders_owner_idx
  on public.franchise_owner_reminders(owner_account_id, acknowledged_at, sent_at desc);

create table if not exists public.franchise_owner_portal_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid references public.franchise_owner_accounts(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (source_type in ('checklist_issue', 'content_item', 'settlement_request', 'settlement_submission'))
);

create index if not exists franchise_owner_portal_events_source_idx
  on public.franchise_owner_portal_events(company_id, source_type, source_id, occurred_at desc);
create index if not exists franchise_owner_portal_events_owner_idx
  on public.franchise_owner_portal_events(owner_account_id, occurred_at desc);

create table if not exists public.franchise_owner_settlement_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.franchise_locations(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  period_start date not null,
  period_end date not null,
  due_at timestamptz not null,
  status text not null default 'open',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (status in ('open', 'closed'))
);

create index if not exists franchise_owner_settlement_requests_company_idx
  on public.franchise_owner_settlement_requests(company_id, status, due_at, created_at desc);

create table if not exists public.franchise_owner_settlement_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.franchise_owner_settlement_requests(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  status text not null default 'draft',
  total_amount numeric(18, 2) not null default 0 check (total_amount >= 0),
  note text not null default '',
  review_note text not null default '',
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft', 'submitted', 'rejected', 'confirmed')),
  unique (request_id, owner_account_id)
);

create index if not exists franchise_owner_settlement_submissions_company_idx
  on public.franchise_owner_settlement_submissions(company_id, status, submitted_at desc, created_at desc);

create table if not exists public.franchise_owner_settlement_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.franchise_owner_settlement_submissions(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  storage_bucket text not null default 'franchise-owner-private',
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (storage_bucket = 'franchise-owner-private')
);

create index if not exists franchise_owner_settlement_files_submission_idx
  on public.franchise_owner_settlement_files(submission_id, created_at);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'franchise_owner_content_items',
    'franchise_owner_content_attachments',
    'franchise_owner_reminders',
    'franchise_owner_portal_events',
    'franchise_owner_settlement_requests',
    'franchise_owner_settlement_submissions',
    'franchise_owner_settlement_files'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on table public.%I from anon', target_table);
  end loop;
end $$;

drop policy if exists franchise_owner_content_items_staff_select on public.franchise_owner_content_items;
create policy franchise_owner_content_items_staff_select on public.franchise_owner_content_items
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and (p.role = 'admin' or p.company_id = franchise_owner_content_items.company_id)
    )
  );
drop policy if exists franchise_owner_content_items_staff_write on public.franchise_owner_content_items;
create policy franchise_owner_content_items_staff_write on public.franchise_owner_content_items
  for all to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and (p.role = 'admin' or (p.company_id = franchise_owner_content_items.company_id and p.role in ('manager', 'sub_manager')))
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and (p.role = 'admin' or (p.company_id = franchise_owner_content_items.company_id and p.role in ('manager', 'sub_manager')))
    )
  );

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'franchise_owner_content_attachments',
    'franchise_owner_reminders',
    'franchise_owner_portal_events',
    'franchise_owner_settlement_requests',
    'franchise_owner_settlement_submissions',
    'franchise_owner_settlement_files'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target_table || '_staff_select', target_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active'' and (p.role = ''admin'' or p.company_id = %I.company_id)))',
      target_table || '_staff_select', target_table, target_table
    );
    execute format('drop policy if exists %I on public.%I', target_table || '_staff_write', target_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active'' and (p.role = ''admin'' or (p.company_id = %I.company_id and p.role in (''manager'', ''sub_manager''))))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active'' and (p.role = ''admin'' or (p.company_id = %I.company_id and p.role in (''manager'', ''sub_manager'')))))',
      target_table || '_staff_write', target_table, target_table, target_table
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
