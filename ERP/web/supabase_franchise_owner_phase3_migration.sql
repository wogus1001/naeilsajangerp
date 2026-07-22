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

do $$
declare
  phase3_history_missing boolean := to_regclass('public.franchise_owner_content_versions') is null;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'franchise_owner_content_attachments'
      and column_name = 'location_id'
  ) then
    alter table public.franchise_owner_content_attachments
      add column location_id uuid references public.franchise_locations(id) on delete cascade;

  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'franchise_owner_content_attachments'
      and column_name = 'content_version'
  ) then
    alter table public.franchise_owner_content_attachments
      add column content_version integer not null default 1;

  end if;

  if phase3_history_missing then
    update public.franchise_owner_content_attachments attachment
    set location_id = content.location_id,
        content_version = content.version
    from public.franchise_owner_content_items content
    where content.id = attachment.content_id
      and content.company_id = attachment.company_id
      and (attachment.location_id is distinct from content.location_id or attachment.content_version is distinct from content.version);
  end if;
end $$;

alter table public.franchise_owner_content_attachments
  add column if not exists deletion_state text not null default 'active',
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.franchise_owner_content_attachments'::regclass
      and conname = 'franchise_owner_content_attachments_deletion_state_check'
  ) then
    alter table public.franchise_owner_content_attachments
      add constraint franchise_owner_content_attachments_deletion_state_check
      check (deletion_state in ('active', 'pending', 'deleted'));
  end if;
end $$;

create or replace function public.mutate_franchise_owner_content(
  p_content_id uuid,
  p_company_id uuid,
  p_actor_id uuid,
  p_expected_version integer,
  p_action text,
  p_location_id uuid default null,
  p_content_type text default null,
  p_category text default '',
  p_title text default '',
  p_summary text default '',
  p_body text default '',
  p_requires_acknowledgement boolean default false,
  p_due_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_content record;
  changed_content record;
  next_version integer;
  mutation_time timestamptz := now();
begin
  select *
  into current_content
  from public.franchise_owner_content_items content
  where content.id = p_content_id
    and content.company_id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_NOT_FOUND';
  end if;
  if p_expected_version is null or p_expected_version <> current_content.version then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;

  if p_action = 'update' then
    if current_content.status = 'archived' then
      raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ARCHIVED';
    end if;
    if current_content.location_id is distinct from p_location_id and exists (
      select 1
      from public.franchise_owner_content_attachments attachment
      where attachment.content_id = current_content.id
        and attachment.deletion_state <> 'deleted'
    ) then
      raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_SCOPE_LOCKED_BY_ATTACHMENTS';
    end if;
    next_version := current_content.version + 1;
    update public.franchise_owner_content_items
    set location_id = p_location_id,
        content_type = p_content_type,
        category = coalesce(p_category, ''),
        title = p_title,
        summary = coalesce(p_summary, ''),
        body = coalesce(p_body, ''),
        requires_acknowledgement = p_requires_acknowledgement,
        due_at = p_due_at,
        version = next_version,
        published_at = case when current_content.status = 'published' then mutation_time else current_content.published_at end,
        updated_by = p_actor_id,
        updated_at = mutation_time
    where id = current_content.id
      and version = p_expected_version
    returning * into changed_content;

    if current_content.status = 'published' then
      perform public.capture_franchise_owner_content_version(changed_content.id, changed_content.version, 'published_update');
    end if;
  elsif p_action = 'publish' then
    if current_content.status = 'published' then
      raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ALREADY_PUBLISHED';
    end if;
    if current_content.status = 'archived' then
      raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ARCHIVED';
    end if;
    update public.franchise_owner_content_items
    set status = 'published',
        version = current_content.version + 1,
        published_at = mutation_time,
        updated_by = p_actor_id,
        updated_at = mutation_time
    where id = current_content.id
      and version = p_expected_version
    returning * into changed_content;
    perform public.capture_franchise_owner_content_version(changed_content.id, changed_content.version, 'publish');
  elsif p_action = 'archive' then
    if current_content.status = 'archived' then
      raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ALREADY_ARCHIVED';
    end if;
    update public.franchise_owner_content_items
    set status = 'archived',
        version = current_content.version + 1,
        updated_by = p_actor_id,
        updated_at = mutation_time
    where id = current_content.id
      and version = p_expected_version
    returning * into changed_content;
  else
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_INVALID_ACTION';
  end if;

  if changed_content.id is null then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;
  return to_jsonb(changed_content);
end;
$$;

drop function if exists public.register_franchise_owner_content_attachment(uuid, uuid, uuid, uuid, integer, text, text, bigint, text, text);

create or replace function public.register_franchise_owner_content_attachment(
  p_attachment_id uuid,
  p_content_id uuid,
  p_company_id uuid,
  p_actor_id uuid,
  p_expected_version integer,
  p_expected_location_id uuid,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_storage_bucket text,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_content record;
  stored_attachment record;
  next_version integer;
begin
  select * into current_content
  from public.franchise_owner_content_items content
  where content.id = p_content_id
    and content.company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_NOT_FOUND';
  end if;
  if current_content.version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;
  if current_content.location_id is distinct from p_expected_location_id then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;
  if current_content.status = 'archived' then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ARCHIVED';
  end if;
  if (
    select count(*)
    from public.franchise_owner_content_attachments attachment
    where attachment.content_id = current_content.id
      and attachment.deletion_state <> 'deleted'
  ) >= 10 then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_FILE_LIMIT';
  end if;

  next_version := current_content.version + 1;
  insert into public.franchise_owner_content_attachments (
    id, content_id, company_id, location_id, content_version,
    file_name, mime_type, file_size, storage_bucket, storage_path, created_by
  ) values (
    p_attachment_id, current_content.id, current_content.company_id,
    current_content.location_id, next_version, p_file_name, p_mime_type,
    p_file_size, p_storage_bucket, p_storage_path, p_actor_id
  )
  returning * into stored_attachment;

  update public.franchise_owner_content_items
  set version = next_version,
      published_at = case when current_content.status = 'published' then now() else current_content.published_at end,
      updated_by = p_actor_id,
      updated_at = now()
  where id = current_content.id;
  if current_content.status = 'published' then
    perform public.capture_franchise_owner_content_version(current_content.id, next_version, 'attachment_added');
  end if;
  return jsonb_build_object('attachment', to_jsonb(stored_attachment), 'contentVersion', next_version);
end;
$$;

create or replace function public.request_franchise_owner_content_attachment_deletion(
  p_attachment_id uuid,
  p_company_id uuid,
  p_actor_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attachment record;
  current_content record;
  outbox_row record;
  next_version integer;
  preserve_history boolean := false;
begin
  select * into current_attachment
  from public.franchise_owner_content_attachments attachment
  where attachment.id = p_attachment_id
    and attachment.company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ATTACHMENT_NOT_FOUND';
  end if;

  select * into current_content
  from public.franchise_owner_content_items content
  where content.id = current_attachment.content_id
    and content.company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_NOT_FOUND';
  end if;
  if current_attachment.deletion_state = 'active' and current_content.version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;

  if current_attachment.deletion_state = 'active' then
    select exists (
      select 1 from public.franchise_owner_content_version_attachments snapshot
      where snapshot.attachment_id = current_attachment.id
    ) into preserve_history;
    update public.franchise_owner_content_attachments
    set deletion_state = case when preserve_history then 'deleted' else 'pending' end,
        deleted_at = case when preserve_history then now() else deleted_at end
    where id = current_attachment.id;
    next_version := current_content.version + 1;
    update public.franchise_owner_content_items
    set version = next_version,
        published_at = case when current_content.status = 'published' then now() else current_content.published_at end,
        updated_by = p_actor_id,
        updated_at = now()
    where id = current_content.id;
    if current_content.status = 'published' then
      perform public.capture_franchise_owner_content_version(current_content.id, next_version, 'attachment_removed');
    end if;
  else
    next_version := current_content.version;
  end if;

  if preserve_history then
    return jsonb_build_object(
      'attachmentId', current_attachment.id,
      'contentVersion', next_version,
      'deletionState', 'deleted',
      'outboxId', null,
      'storageBucket', current_attachment.storage_bucket,
      'storagePath', current_attachment.storage_path,
      'completed', true,
      'historyPreserved', true
    );
  end if;

  insert into public.franchise_owner_file_deletion_outbox (
    file_kind, file_id, company_id, storage_bucket, storage_path
  ) values (
    'content_attachment', current_attachment.id, current_attachment.company_id,
    current_attachment.storage_bucket, current_attachment.storage_path
  )
  on conflict (file_kind, file_id) do update
  set state = case when public.franchise_owner_file_deletion_outbox.state = 'completed' then 'completed' else 'pending' end,
      last_error = null
  returning * into outbox_row;

  return jsonb_build_object(
    'attachmentId', current_attachment.id,
    'contentVersion', next_version,
    'deletionState', case when outbox_row.state = 'completed' then 'deleted' else 'pending' end,
    'outboxId', outbox_row.id,
    'storageBucket', current_attachment.storage_bucket,
    'storagePath', current_attachment.storage_path,
    'completed', outbox_row.state = 'completed'
  );
end;
$$;

create or replace function public.record_franchise_owner_content_receipt(
  p_content_id uuid,
  p_content_version integer,
  p_company_id uuid,
  p_location_id uuid,
  p_owner_account_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_content record;
  stored_receipt record;
  receipt_time timestamptz := now();
  reminder_row record;
begin
  select * into current_content
  from public.franchise_owner_content_items content
  where content.id = p_content_id
    and content.company_id = p_company_id
  for share;
  if not found or current_content.status <> 'published'
    or (current_content.location_id is not null and current_content.location_id <> p_location_id) then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_NOT_FOUND';
  end if;
  if current_content.version <> p_content_version then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;
  if p_action not in ('view', 'acknowledge') then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_INVALID_ACTION';
  end if;
  if p_action = 'acknowledge' and not current_content.requires_acknowledgement then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_ACK_NOT_REQUIRED';
  end if;

  insert into public.franchise_owner_content_receipts (
    content_id, company_id, location_id, owner_account_id,
    content_version, viewed_at, acknowledged_at
  ) values (
    current_content.id, p_company_id, p_location_id, p_owner_account_id,
    p_content_version, receipt_time,
    case when p_action = 'acknowledge' then receipt_time else null end
  )
  on conflict (content_id, owner_account_id, content_version) do update
  set viewed_at = coalesce(public.franchise_owner_content_receipts.viewed_at, excluded.viewed_at),
      acknowledged_at = case
        when p_action = 'acknowledge' then coalesce(public.franchise_owner_content_receipts.acknowledged_at, excluded.acknowledged_at)
        else public.franchise_owner_content_receipts.acknowledged_at
      end
  returning * into stored_receipt;

  insert into public.franchise_owner_portal_events (
    company_id, location_id, owner_account_id, source_type, source_id,
    event_type, event_data, occurred_at, event_idempotency_key
  ) values (
    p_company_id, p_location_id, p_owner_account_id, 'content_item', p_content_id::text,
    case when p_action = 'acknowledge' then 'content_acknowledged' else 'content_viewed' end,
    jsonb_build_object('content_version', p_content_version), receipt_time,
    'content:' || p_content_id::text || ':' || p_content_version::text || ':' || p_owner_account_id::text || ':' || p_action
  )
  on conflict (event_idempotency_key) do nothing;

  if p_action = 'acknowledge' then
    for reminder_row in
      update public.franchise_owner_reminders reminder
      set acknowledged_at = coalesce(reminder.acknowledged_at, stored_receipt.acknowledged_at)
      where reminder.company_id = p_company_id
        and reminder.location_id = p_location_id
        and reminder.owner_account_id = p_owner_account_id
        and reminder.source_type = 'content_item'
        and reminder.source_id = p_content_id::text
        and reminder.source_version = p_content_version
        and reminder.acknowledged_at is null
      returning reminder.*
    loop
      insert into public.franchise_owner_portal_events (
        company_id, location_id, owner_account_id, source_type, source_id,
        event_type, event_data, occurred_at, event_idempotency_key
      ) values (
        reminder_row.company_id, reminder_row.location_id, reminder_row.owner_account_id,
        reminder_row.source_type, reminder_row.source_id, 'reminder_acknowledged',
        jsonb_build_object('reminder_id', reminder_row.id, 'delivery_id', reminder_row.delivery_id),
        stored_receipt.acknowledged_at,
        'reminder:' || reminder_row.delivery_id::text || ':acknowledged'
      )
      on conflict (event_idempotency_key) do nothing;
    end loop;
  end if;

  return to_jsonb(stored_receipt);
end;
$$;

create index if not exists franchise_owner_content_attachments_content_idx
  on public.franchise_owner_content_attachments(content_id, created_at);

create table if not exists public.franchise_owner_content_receipts (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.franchise_owner_content_items(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null references public.franchise_locations(id) on delete cascade,
  owner_account_id uuid not null references public.franchise_owner_accounts(id) on delete cascade,
  content_version integer not null default 1 check (content_version > 0),
  viewed_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_id, owner_account_id, content_version)
);

do $$
declare
  phase3_history_missing boolean := to_regclass('public.franchise_owner_content_versions') is null;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'franchise_owner_content_receipts'
      and column_name = 'content_version'
  ) then
    alter table public.franchise_owner_content_receipts
      add column content_version integer not null default 1;

  end if;

  if phase3_history_missing then
    update public.franchise_owner_content_receipts receipt
    set content_version = content.version
    from public.franchise_owner_content_items content
    where content.id = receipt.content_id
      and content.company_id = receipt.company_id
      and receipt.content_version is distinct from content.version;
  end if;
end $$;

alter table public.franchise_owner_content_receipts
  add column if not exists viewed_at timestamptz;

alter table public.franchise_owner_content_receipts
  alter column acknowledged_at drop not null;
alter table public.franchise_owner_content_receipts
  drop constraint if exists franchise_owner_content_receipts_content_id_owner_account_id_key;
create unique index if not exists franchise_owner_content_receipts_version_unique
  on public.franchise_owner_content_receipts(content_id, owner_account_id, content_version);

create index if not exists franchise_owner_content_receipts_company_content_idx
  on public.franchise_owner_content_receipts(company_id, content_id, content_version, owner_account_id);
create index if not exists franchise_owner_content_receipts_owner_idx
  on public.franchise_owner_content_receipts(company_id, location_id, owner_account_id, acknowledged_at);

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

do $$
declare
  phase3_history_missing boolean := to_regclass('public.franchise_owner_content_versions') is null;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'franchise_owner_reminders'
      and column_name = 'source_version'
  ) then
    alter table public.franchise_owner_reminders
      add column source_version integer not null default 1;

  end if;

  if phase3_history_missing then
    update public.franchise_owner_reminders reminder
    set source_version = content.version
    from public.franchise_owner_content_items content
    where reminder.source_type = 'content_item'
      and reminder.source_id = content.id::text
      and reminder.company_id = content.company_id
      and reminder.source_version is distinct from content.version;
  end if;
end $$;

alter table public.franchise_owner_reminders
  add column if not exists request_idempotency_key uuid,
  add column if not exists delivery_id uuid,
  add column if not exists request_fingerprint text;

update public.franchise_owner_reminders
set request_idempotency_key = coalesce(request_idempotency_key, gen_random_uuid()),
    delivery_id = coalesce(delivery_id, gen_random_uuid()),
    request_fingerprint = coalesce(
      nullif(request_fingerprint, ''),
      md5(concat_ws(
        chr(31), source_type, source_id, source_version::text, reminder_kind,
        message, coalesce(due_at::text, ''), location_id::text, owner_account_id::text
      ))
    );

alter table public.franchise_owner_reminders
  alter column request_idempotency_key set not null,
  alter column delivery_id set not null,
  alter column request_fingerprint set not null;

do $$
declare
  old_constraint record;
begin
  for old_constraint in
    select constraint_name
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'franchise_owner_reminders'
      and constraint_name in (
        select tc.constraint_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on kcu.constraint_schema = tc.constraint_schema
         and kcu.constraint_name = tc.constraint_name
        where tc.table_schema = 'public'
          and tc.table_name = 'franchise_owner_reminders'
          and tc.constraint_type = 'UNIQUE'
        group by tc.constraint_name
        having array_agg(kcu.column_name::text order by kcu.ordinal_position) = array[
          'company_id', 'owner_account_id', 'source_type', 'source_id', 'reminder_kind'
        ]::text[]
      )
  loop
    execute format('alter table public.franchise_owner_reminders drop constraint if exists %I', old_constraint.constraint_name);
  end loop;
end $$;

create unique index if not exists franchise_owner_reminders_request_unique
  on public.franchise_owner_reminders(company_id, owner_account_id, request_idempotency_key);
create unique index if not exists franchise_owner_reminders_delivery_unique
  on public.franchise_owner_reminders(delivery_id);
create index if not exists franchise_owner_reminders_request_idx
  on public.franchise_owner_reminders(company_id, request_idempotency_key);

create index if not exists franchise_owner_reminders_owner_idx
  on public.franchise_owner_reminders(owner_account_id, acknowledged_at, sent_at desc);

create table if not exists public.franchise_owner_reminder_requests (
  company_id uuid not null references public.companies(id) on delete cascade,
  request_idempotency_key uuid not null,
  request_fingerprint text not null check (btrim(request_fingerprint) <> ''),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (company_id, request_idempotency_key)
);

insert into public.franchise_owner_reminder_requests (
  company_id, request_idempotency_key, request_fingerprint, created_by, created_at
)
select distinct on (reminder.company_id, reminder.request_idempotency_key)
  reminder.company_id,
  reminder.request_idempotency_key,
  reminder.request_fingerprint,
  reminder.created_by,
  reminder.created_at
from public.franchise_owner_reminders reminder
order by reminder.company_id, reminder.request_idempotency_key, reminder.created_at, reminder.id
on conflict (company_id, request_idempotency_key) do nothing;

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

alter table public.franchise_owner_portal_events
  add column if not exists event_idempotency_key text;
update public.franchise_owner_portal_events
set event_idempotency_key = coalesce(event_idempotency_key, 'legacy:' || id::text);
alter table public.franchise_owner_portal_events
  alter column event_idempotency_key set not null;
create unique index if not exists franchise_owner_portal_events_idempotency_unique
  on public.franchise_owner_portal_events(event_idempotency_key);

create index if not exists franchise_owner_portal_events_source_idx
  on public.franchise_owner_portal_events(company_id, source_type, source_id, occurred_at desc);
create index if not exists franchise_owner_portal_events_owner_idx
  on public.franchise_owner_portal_events(owner_account_id, occurred_at desc);

create table if not exists public.franchise_owner_settlement_requests (
  id uuid primary key default gen_random_uuid(),
  request_idempotency_key uuid not null default gen_random_uuid(),
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

alter table public.franchise_owner_settlement_requests
  add column if not exists request_idempotency_key uuid not null default gen_random_uuid();
create unique index if not exists franchise_owner_settlement_requests_idempotency_unique
  on public.franchise_owner_settlement_requests(company_id, request_idempotency_key);

create or replace function public.create_franchise_owner_settlement_request(
  p_company_id uuid,
  p_location_id uuid,
  p_title text,
  p_instructions text,
  p_period_start date,
  p_period_end date,
  p_due_at timestamptz,
  p_actor_id uuid,
  p_request_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row record;
begin
  insert into public.franchise_owner_settlement_requests (
    request_idempotency_key, company_id, location_id, title, instructions,
    period_start, period_end, due_at, status, created_by
  ) values (
    p_request_idempotency_key, p_company_id, p_location_id, p_title, coalesce(p_instructions, ''),
    p_period_start, p_period_end, p_due_at, 'open', p_actor_id
  ) on conflict (company_id, request_idempotency_key) do nothing;

  select * into request_row
  from public.franchise_owner_settlement_requests request
  where request.company_id = p_company_id
    and request.request_idempotency_key = p_request_idempotency_key
  for update;
  if request_row.location_id is distinct from p_location_id
    or request_row.title <> p_title
    or request_row.instructions <> coalesce(p_instructions, '')
    or request_row.period_start <> p_period_start
    or request_row.period_end <> p_period_end
    or request_row.due_at <> p_due_at then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_IDEMPOTENCY_MISMATCH';
  end if;
  return to_jsonb(request_row);
end;
$$;

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

alter table public.franchise_owner_settlement_files
  add column if not exists client_file_id uuid,
  add column if not exists content_sha256 text,
  add column if not exists upload_state text not null default 'active',
  add column if not exists deletion_state text not null default 'active',
  add column if not exists deleted_at timestamptz;

update public.franchise_owner_settlement_files
set client_file_id = coalesce(client_file_id, gen_random_uuid()),
    content_sha256 = coalesce(content_sha256, repeat('0', 64));
alter table public.franchise_owner_settlement_files
  alter column client_file_id set not null,
  alter column content_sha256 set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.franchise_owner_settlement_files'::regclass
      and conname = 'franchise_owner_settlement_files_upload_state_check'
  ) then
    alter table public.franchise_owner_settlement_files
      add constraint franchise_owner_settlement_files_upload_state_check
      check (upload_state in ('reserved', 'active'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.franchise_owner_settlement_files'::regclass
      and conname = 'franchise_owner_settlement_files_deletion_state_check'
  ) then
    alter table public.franchise_owner_settlement_files
      add constraint franchise_owner_settlement_files_deletion_state_check
      check (deletion_state in ('active', 'pending', 'deleted'));
  end if;
end $$;

create unique index if not exists franchise_owner_settlement_files_client_unique
  on public.franchise_owner_settlement_files(submission_id, owner_account_id, client_file_id);

create table if not exists public.franchise_owner_content_versions (
  content_id uuid not null references public.franchise_owner_content_items(id) on delete restrict,
  content_version integer not null check (content_version > 0),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.franchise_locations(id) on delete cascade,
  source_type text not null,
  source_id text,
  content_type text not null,
  category text not null default '',
  title text not null,
  summary text not null default '',
  body text not null default '',
  status text not null,
  requires_acknowledgement boolean not null default false,
  due_at timestamptz,
  published_at timestamptz,
  snapshot_reason text not null default 'publish',
  captured_at timestamptz not null default now(),
  primary key (content_id, content_version)
);

alter table public.franchise_owner_content_versions
  drop constraint if exists franchise_owner_content_versions_content_id_fkey;
alter table public.franchise_owner_content_versions
  add constraint franchise_owner_content_versions_content_id_fkey
  foreign key (content_id) references public.franchise_owner_content_items(id) on delete restrict;

create index if not exists franchise_owner_content_versions_company_idx
  on public.franchise_owner_content_versions(company_id, content_id, content_version desc);

create table if not exists public.franchise_owner_content_version_attachments (
  content_id uuid not null,
  content_version integer not null,
  attachment_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid references public.franchise_locations(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  storage_bucket text not null,
  storage_path text not null,
  attachment_created_at timestamptz not null,
  captured_at timestamptz not null default now(),
  primary key (content_id, content_version, attachment_id),
  foreign key (content_id, content_version)
    references public.franchise_owner_content_versions(content_id, content_version)
    on delete cascade
);

create index if not exists franchise_owner_content_version_attachments_company_idx
  on public.franchise_owner_content_version_attachments(company_id, content_id, content_version);

create table if not exists public.franchise_owner_file_deletion_outbox (
  id uuid primary key default gen_random_uuid(),
  file_kind text not null,
  file_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (file_kind, file_id),
  check (file_kind in ('content_attachment', 'settlement_file')),
  check (state in ('pending', 'completed')),
  check (attempt_count >= 0)
);

create index if not exists franchise_owner_file_deletion_outbox_pending_idx
  on public.franchise_owner_file_deletion_outbox(state, requested_at)
  where state = 'pending';

create index if not exists franchise_owner_settlement_files_submission_idx
  on public.franchise_owner_settlement_files(submission_id, created_at);

create or replace function public.capture_franchise_owner_content_version(
  p_content_id uuid,
  p_content_version integer,
  p_snapshot_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.franchise_owner_content_versions version_snapshot
    where version_snapshot.content_id = p_content_id
      and version_snapshot.content_version = p_content_version
  ) then
    return;
  end if;

  insert into public.franchise_owner_content_versions (
    content_id, content_version, company_id, location_id, source_type, source_id,
    content_type, category, title, summary, body, status,
    requires_acknowledgement, due_at, published_at, snapshot_reason
  )
  select
    content.id, content.version, content.company_id, content.location_id,
    content.source_type, content.source_id, content.content_type, content.category,
    content.title, content.summary, content.body, content.status,
    content.requires_acknowledgement, content.due_at, content.published_at,
    coalesce(nullif(btrim(p_snapshot_reason), ''), 'publish')
  from public.franchise_owner_content_items content
  where content.id = p_content_id
    and content.version = p_content_version;

  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_CONTENT_STALE';
  end if;

  insert into public.franchise_owner_content_version_attachments (
    content_id, content_version, attachment_id, company_id, location_id,
    file_name, mime_type, file_size, storage_bucket, storage_path, attachment_created_at
  )
  select
    attachment.content_id, p_content_version, attachment.id, attachment.company_id,
    attachment.location_id, attachment.file_name, attachment.mime_type,
    attachment.file_size, attachment.storage_bucket, attachment.storage_path,
    attachment.created_at
  from public.franchise_owner_content_attachments attachment
  where attachment.content_id = p_content_id
    and attachment.deletion_state = 'active';
end;
$$;

insert into public.franchise_owner_content_versions (
  content_id, content_version, company_id, location_id, source_type, source_id,
  content_type, category, title, summary, body, status,
  requires_acknowledgement, due_at, published_at, snapshot_reason, captured_at
)
select
  content.id, content.version as content_version, content.company_id, content.location_id,
  content.source_type, content.source_id, content.content_type, content.category,
  content.title, content.summary, content.body, content.status,
  content.requires_acknowledgement, content.due_at, content.published_at,
  'migration_backfill',
  now()
from public.franchise_owner_content_items content
where (
    content.status in ('published', 'archived')
    or exists (
      select 1
      from public.franchise_owner_content_receipts receipt
      where receipt.content_id = content.id
        and receipt.content_version = content.version
    )
  )
on conflict (content_id, content_version) do nothing;

insert into public.franchise_owner_content_version_attachments (
  content_id, content_version, attachment_id, company_id, location_id,
  file_name, mime_type, file_size, storage_bucket, storage_path, attachment_created_at
)
select
  version_snapshot.content_id, version_snapshot.content_version, attachment.id,
  attachment.company_id, attachment.location_id, attachment.file_name,
  attachment.mime_type, attachment.file_size, attachment.storage_bucket,
  attachment.storage_path, attachment.created_at
from public.franchise_owner_content_versions version_snapshot
join public.franchise_owner_content_attachments attachment
  on attachment.content_id = version_snapshot.content_id
join public.franchise_owner_content_items current_content
  on current_content.id = version_snapshot.content_id
 and current_content.version = version_snapshot.content_version
where attachment.deletion_state = 'active'
on conflict (content_id, content_version, attachment_id) do nothing;

create or replace function public.enforce_franchise_owner_phase3_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_location_id uuid;
begin
  if new.location_id is not null and not exists (
    select 1
    from public.franchise_locations location
    where location.id = new.location_id
      and location.company_id = new.company_id
  ) then
    raise exception using errcode = '23514', message = 'OWNER_PHASE3_LOCATION_SCOPE_MISMATCH';
  end if;

  if tg_table_name in (
    'franchise_owner_content_receipts',
    'franchise_owner_reminders',
    'franchise_owner_portal_events',
    'franchise_owner_settlement_submissions',
    'franchise_owner_settlement_files'
  ) then
    if new.owner_account_id is not null and not exists (
      select 1
      from public.franchise_owner_accounts account
      where account.id = new.owner_account_id
        and account.company_id = new.company_id
        and (new.location_id is null or account.location_id = new.location_id)
    ) then
      raise exception using errcode = '23514', message = 'OWNER_PHASE3_OWNER_SCOPE_MISMATCH';
    end if;
  end if;

  if tg_table_name = 'franchise_owner_content_attachments' then
    if not exists (
      select 1
      from public.franchise_owner_content_items content
      where content.id = new.content_id
        and content.company_id = new.company_id
        and content.location_id is not distinct from new.location_id
    ) then
      raise exception using errcode = '23514', message = 'OWNER_CONTENT_ATTACHMENT_SCOPE_MISMATCH';
    end if;
  elsif tg_table_name = 'franchise_owner_content_receipts' then
    if not exists (
      select 1
      from public.franchise_owner_content_versions version_snapshot
      where version_snapshot.content_id = new.content_id
        and version_snapshot.content_version = new.content_version
        and version_snapshot.company_id = new.company_id
        and (version_snapshot.location_id is null or version_snapshot.location_id = new.location_id)
    ) then
      raise exception using errcode = '23514', message = 'OWNER_CONTENT_RECEIPT_SCOPE_MISMATCH';
    end if;
  elsif tg_table_name = 'franchise_owner_reminders' and new.source_type = 'content_item' then
    if not exists (
      select 1
      from public.franchise_owner_content_versions version_snapshot
      where version_snapshot.content_id::text = new.source_id
        and version_snapshot.company_id = new.company_id
        and version_snapshot.content_version = new.source_version
        and (version_snapshot.location_id is null or version_snapshot.location_id = new.location_id)
    ) then
      raise exception using errcode = '23514', message = 'OWNER_REMINDER_CONTENT_SCOPE_MISMATCH';
    end if;
  elsif tg_table_name = 'franchise_owner_settlement_submissions' then
    select settlement_request.location_id
    into parent_location_id
    from public.franchise_owner_settlement_requests settlement_request
    where settlement_request.id = new.request_id
      and settlement_request.company_id = new.company_id;
    if not found or (parent_location_id is not null and parent_location_id <> new.location_id) then
      raise exception using errcode = '23514', message = 'OWNER_SETTLEMENT_REQUEST_SCOPE_MISMATCH';
    end if;
  elsif tg_table_name = 'franchise_owner_settlement_files' then
    if not exists (
      select 1
      from public.franchise_owner_settlement_submissions submission
      where submission.id = new.submission_id
        and submission.company_id = new.company_id
        and submission.location_id = new.location_id
        and submission.owner_account_id = new.owner_account_id
    ) then
      raise exception using errcode = '23514', message = 'OWNER_SETTLEMENT_FILE_SCOPE_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'franchise_owner_content_items',
    'franchise_owner_content_attachments',
    'franchise_owner_content_receipts',
    'franchise_owner_reminders',
    'franchise_owner_portal_events',
    'franchise_owner_settlement_requests',
    'franchise_owner_settlement_submissions',
    'franchise_owner_settlement_files'
  ]
  loop
    execute format('drop trigger if exists franchise_owner_phase3_scope_guard on public.%I', target_table);
    execute format(
      'create trigger franchise_owner_phase3_scope_guard before insert or update on public.%I for each row execute function public.enforce_franchise_owner_phase3_scope()',
      target_table
    );
  end loop;
end $$;

drop function if exists public.create_franchise_owner_reminder_deliveries(
  uuid, uuid, text, text, integer, text, text, timestamptz, uuid, jsonb
);

create or replace function public.create_franchise_owner_reminder_deliveries(
  p_company_id uuid,
  p_created_by uuid,
  p_source_type text,
  p_source_id text,
  p_source_version integer,
  p_reminder_kind text,
  p_message text,
  p_due_at timestamptz,
  p_request_idempotency_key uuid,
  p_target_location_ids jsonb,
  p_targets jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target jsonb;
  current_content record;
  reminder_request_row record;
  reminder_row record;
  inserted_id uuid;
  canonical_targets jsonb;
  canonical_location_ids jsonb;
  request_fingerprint_value text;
  delivery_rows jsonb := '[]'::jsonb;
  created_count integer := 0;
  delivery_time timestamptz := now();
  request_created boolean := false;
begin
  if p_source_type not in ('checklist_issue', 'content_item')
    or p_source_version < 1
    or p_request_idempotency_key is null
    or jsonb_typeof(p_target_location_ids) <> 'array'
    or jsonb_typeof(p_targets) <> 'array' then
    raise exception using errcode = 'P0001', message = 'OWNER_REMINDER_INVALID_INPUT';
  end if;

  select jsonb_agg(location_entry.value order by location_entry.value)
  into canonical_location_ids
  from jsonb_array_elements(p_target_location_ids) as location_entry(value);
  if canonical_location_ids is null or jsonb_array_length(canonical_location_ids) = 0 then
    raise exception using errcode = 'P0001', message = 'OWNER_REMINDER_INVALID_INPUT';
  end if;

  request_fingerprint_value := md5(concat_ws(
    chr(31), p_source_type, p_source_id, p_source_version::text,
    coalesce(nullif(btrim(p_reminder_kind), ''), 'manual'), coalesce(p_message, ''),
    coalesce(p_due_at::text, ''), canonical_location_ids::text
  ));

  insert into public.franchise_owner_reminder_requests (
    company_id, request_idempotency_key, request_fingerprint, created_by
  ) values (
    p_company_id, p_request_idempotency_key, request_fingerprint_value, p_created_by
  )
  on conflict (company_id, request_idempotency_key) do nothing
  returning true into request_created;

  select * into reminder_request_row
  from public.franchise_owner_reminder_requests reminder_request
  where reminder_request.company_id = p_company_id
    and reminder_request.request_idempotency_key = p_request_idempotency_key
  for update;
  if reminder_request_row.request_fingerprint <> request_fingerprint_value then
    raise exception using errcode = 'P0001', message = 'OWNER_REMINDER_IDEMPOTENCY_MISMATCH';
  end if;

  if request_created is distinct from true then
    select coalesce(jsonb_agg(to_jsonb(reminder) order by reminder.created_at, reminder.id), '[]'::jsonb)
    into delivery_rows
    from public.franchise_owner_reminders reminder
    where reminder.company_id = p_company_id
      and reminder.request_idempotency_key = p_request_idempotency_key;
    return jsonb_build_object(
      'createdCount', 0,
      'existingCount', jsonb_array_length(delivery_rows),
      'targetCount', jsonb_array_length(delivery_rows),
      'eventsCreatedCount', 0,
      'reminders', delivery_rows
    );
  end if;

  if p_source_type = 'content_item' then
    select * into current_content
    from public.franchise_owner_content_items content
    where content.id::text = p_source_id
      and content.company_id = p_company_id
    for share;
    if not found
      or current_content.status <> 'published'
      or current_content.version <> p_source_version then
      raise exception using errcode = 'P0001', message = 'OWNER_REMINDER_CONTENT_STALE';
    end if;
  end if;

  select jsonb_agg(target_entry.value order by target_entry.value->>'ownerAccountId', target_entry.value->>'locationId')
  into canonical_targets
  from jsonb_array_elements(p_targets) as target_entry(value);
  if canonical_targets is null or jsonb_array_length(canonical_targets) = 0 then
    raise exception using errcode = 'P0001', message = 'OWNER_REMINDER_INVALID_INPUT';
  end if;

  for target in select value from jsonb_array_elements(p_targets)
  loop
    inserted_id := null;
    insert into public.franchise_owner_reminders (
      company_id, location_id, owner_account_id, source_type, source_id,
      source_version, reminder_kind, message, due_at, sent_at,
      request_idempotency_key, delivery_id, request_fingerprint, created_by
    ) values (
      p_company_id, (target->>'locationId')::uuid, (target->>'ownerAccountId')::uuid,
      p_source_type, p_source_id, p_source_version,
      coalesce(nullif(btrim(p_reminder_kind), ''), 'manual'), coalesce(p_message, ''),
      p_due_at, delivery_time, p_request_idempotency_key, gen_random_uuid(),
      request_fingerprint_value, p_created_by
    )
    on conflict (company_id, owner_account_id, request_idempotency_key) do nothing
    returning id into inserted_id;

    if inserted_id is not null then
      created_count := created_count + 1;
      select * into reminder_row
      from public.franchise_owner_reminders reminder
      where reminder.id = inserted_id;
      insert into public.franchise_owner_portal_events (
        company_id, location_id, owner_account_id, source_type, source_id,
        event_type, event_data, occurred_at, event_idempotency_key
      ) values (
        reminder_row.company_id, reminder_row.location_id, reminder_row.owner_account_id,
        reminder_row.source_type, reminder_row.source_id, 'reminder_created',
        jsonb_build_object(
          'reminder_id', reminder_row.id,
          'delivery_id', reminder_row.delivery_id,
          'source_version', reminder_row.source_version,
          'reminder_kind', reminder_row.reminder_kind,
          'actor_id', p_created_by
        ),
        reminder_row.sent_at,
        'reminder:' || reminder_row.delivery_id::text || ':created'
      )
      on conflict (event_idempotency_key) do nothing;
    else
      select * into reminder_row
      from public.franchise_owner_reminders reminder
      where reminder.company_id = p_company_id
        and reminder.owner_account_id = (target->>'ownerAccountId')::uuid
        and reminder.request_idempotency_key = p_request_idempotency_key;
    end if;
    delivery_rows := delivery_rows || jsonb_build_array(to_jsonb(reminder_row));
  end loop;

  return jsonb_build_object(
    'createdCount', created_count,
    'existingCount', jsonb_array_length(delivery_rows) - created_count,
    'targetCount', jsonb_array_length(delivery_rows),
    'eventsCreatedCount', created_count,
    'reminders', delivery_rows
  );
end;
$$;

create or replace function public.acknowledge_franchise_owner_reminder(
  p_reminder_id uuid,
  p_company_id uuid,
  p_location_id uuid,
  p_owner_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder_row record;
  acknowledgement_time timestamptz := now();
begin
  select * into reminder_row
  from public.franchise_owner_reminders reminder
  where reminder.id = p_reminder_id
    and reminder.company_id = p_company_id
    and reminder.location_id = p_location_id
    and reminder.owner_account_id = p_owner_account_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_REMINDER_NOT_FOUND';
  end if;

  if reminder_row.acknowledged_at is null then
    update public.franchise_owner_reminders
    set acknowledged_at = acknowledgement_time
    where id = reminder_row.id
    returning * into reminder_row;
    insert into public.franchise_owner_portal_events (
      company_id, location_id, owner_account_id, source_type, source_id,
      event_type, event_data, occurred_at, event_idempotency_key
    ) values (
      reminder_row.company_id, reminder_row.location_id, reminder_row.owner_account_id,
      reminder_row.source_type, reminder_row.source_id, 'reminder_acknowledged',
      jsonb_build_object(
        'reminder_id', reminder_row.id,
        'delivery_id', reminder_row.delivery_id,
        'source_version', reminder_row.source_version,
        'actor_id', p_owner_account_id
      ),
      reminder_row.acknowledged_at,
      'reminder:' || reminder_row.delivery_id::text || ':acknowledged'
    )
    on conflict (event_idempotency_key) do nothing;
  end if;
  return to_jsonb(reminder_row);
end;
$$;

drop function if exists public.mutate_franchise_owner_settlement_submission(uuid, uuid, uuid, uuid, text, numeric, text);

create or replace function public.mutate_franchise_owner_settlement_submission(
  p_request_id uuid,
  p_company_id uuid,
  p_location_id uuid,
  p_owner_account_id uuid,
  p_action text,
  p_total_amount numeric,
  p_note text,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settlement_request record;
  current_submission record;
  changed_submission record;
  mutation_time timestamptz := now();
  event_name text;
begin
  select * into settlement_request
  from public.franchise_owner_settlement_requests request_row
  where request_row.id = p_request_id
    and request_row.company_id = p_company_id
  for update;
  if not found or (settlement_request.location_id is not null and settlement_request.location_id <> p_location_id) then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REQUEST_NOT_FOUND';
  end if;
  if settlement_request.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REQUEST_CLOSED';
  end if;
  if p_action not in ('save', 'submit') or p_total_amount < 0 then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_INVALID_INPUT';
  end if;

  select * into current_submission
  from public.franchise_owner_settlement_submissions submission
  where submission.request_id = settlement_request.id
    and submission.company_id = p_company_id
    and submission.location_id = p_location_id
    and submission.owner_account_id = p_owner_account_id
  for update;

  if found and current_submission.status not in ('draft', 'rejected') then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_STALE';
  end if;
  if current_submission.id is not null
    and (
      p_expected_updated_at is null
      or current_submission.updated_at is distinct from p_expected_updated_at
    ) then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_STALE_VERSION';
  end if;

  if p_action = 'submit' and current_submission.id is not null and exists (
    select 1
    from public.franchise_owner_settlement_files settlement_file
    where settlement_file.submission_id = current_submission.id
      and settlement_file.upload_state = 'reserved'
      and settlement_file.deletion_state = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_PENDING';
  end if;

  if current_submission.id is null then
    insert into public.franchise_owner_settlement_submissions (
      request_id, company_id, location_id, owner_account_id, status,
      total_amount, note, submitted_at, updated_at
    ) values (
      settlement_request.id, p_company_id, p_location_id, p_owner_account_id,
      case when p_action = 'submit' then 'submitted' else 'draft' end,
      p_total_amount, coalesce(p_note, ''),
      case when p_action = 'submit' then mutation_time else null end,
      mutation_time
    ) returning * into changed_submission;
    event_name := 'submitted';
  else
    event_name := case when current_submission.status = 'rejected' then 'resubmitted' else 'submitted' end;
    update public.franchise_owner_settlement_submissions
    set status = case when p_action = 'submit' then 'submitted' else current_submission.status end,
        total_amount = p_total_amount,
        note = coalesce(p_note, ''),
        submitted_at = case when p_action = 'submit' then mutation_time else current_submission.submitted_at end,
        review_note = case when p_action = 'submit' then '' else current_submission.review_note end,
        reviewed_by = case when p_action = 'submit' then null else current_submission.reviewed_by end,
        reviewed_at = case when p_action = 'submit' then null else current_submission.reviewed_at end,
        updated_at = mutation_time
    where id = current_submission.id
      and status = current_submission.status
      and updated_at = p_expected_updated_at
    returning * into changed_submission;
  end if;

  if changed_submission.id is null then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_STALE';
  end if;
  if p_action = 'submit' then
    insert into public.franchise_owner_portal_events (
      company_id, location_id, owner_account_id, source_type, source_id,
      event_type, event_data, occurred_at, event_idempotency_key
    ) values (
      changed_submission.company_id, changed_submission.location_id,
      changed_submission.owner_account_id, 'settlement_submission',
      changed_submission.id::text, event_name,
      jsonb_build_object('request_id', changed_submission.request_id, 'total_amount', changed_submission.total_amount),
      changed_submission.submitted_at,
      'settlement-submission:' || changed_submission.id::text || ':' || changed_submission.submitted_at::text
    );
  end if;
  return to_jsonb(changed_submission);
end;
$$;

create or replace function public.close_franchise_owner_settlement_request(
  p_request_id uuid,
  p_company_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_request record;
  mutation_time timestamptz := now();
begin
  update public.franchise_owner_settlement_requests request_row
  set status = 'closed', updated_at = mutation_time
  where request_row.id = p_request_id
    and request_row.company_id = p_company_id
    and request_row.status = 'open'
  returning request_row.* into changed_request;
  if changed_request.id is null then
    if exists (
      select 1 from public.franchise_owner_settlement_requests request_row
      where request_row.id = p_request_id and request_row.company_id = p_company_id
    ) then
      raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REQUEST_CLOSED';
    end if;
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REQUEST_NOT_FOUND';
  end if;
  insert into public.franchise_owner_portal_events (
    company_id, location_id, owner_account_id, source_type, source_id,
    event_type, event_data, occurred_at, event_idempotency_key
  ) values (
    changed_request.company_id, changed_request.location_id, null,
    'settlement_request', changed_request.id::text, 'closed',
    jsonb_build_object('actor_id', p_actor_id), mutation_time,
    'settlement-request:' || changed_request.id::text || ':closed'
  ) on conflict (event_idempotency_key) do nothing;
  return to_jsonb(changed_request);
end;
$$;

create or replace function public.review_franchise_owner_settlement_submission(
  p_submission_id uuid,
  p_company_id uuid,
  p_actor_id uuid,
  p_action text,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_submission record;
  changed_submission record;
  next_status text;
  mutation_time timestamptz := now();
begin
  if p_action = 'reject' and coalesce(nullif(btrim(p_review_note), ''), '') = '' then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REVIEW_NOTE_REQUIRED';
  end if;
  next_status := case p_action when 'reject' then 'rejected' when 'confirm' then 'confirmed' else null end;
  if next_status is null then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_INVALID_ACTION';
  end if;

  select * into current_submission
  from public.franchise_owner_settlement_submissions submission
  where submission.id = p_submission_id
    and submission.company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_SUBMISSION_NOT_FOUND';
  end if;
  if current_submission.status <> 'submitted' then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_STALE';
  end if;

  update public.franchise_owner_settlement_submissions
  set status = next_status,
      review_note = coalesce(p_review_note, ''),
      reviewed_by = p_actor_id,
      reviewed_at = mutation_time,
      updated_at = mutation_time
  where id = current_submission.id
    and status = 'submitted'
  returning * into changed_submission;
  if changed_submission.id is null then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_STALE';
  end if;

  insert into public.franchise_owner_portal_events (
    company_id, location_id, owner_account_id, source_type, source_id,
    event_type, event_data, occurred_at, event_idempotency_key
  ) values (
    changed_submission.company_id, changed_submission.location_id,
    changed_submission.owner_account_id, 'settlement_submission',
    changed_submission.id::text, next_status,
    jsonb_build_object(
      'request_id', changed_submission.request_id,
      'reviewer_id', p_actor_id,
      'review_note', coalesce(p_review_note, '')
    ),
    mutation_time,
    'settlement-review:' || changed_submission.id::text || ':' || mutation_time::text
  );
  return to_jsonb(changed_submission);
end;
$$;

drop function if exists public.reserve_franchise_owner_settlement_file(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, text
);

create or replace function public.reserve_franchise_owner_settlement_file(
  p_submission_id uuid,
  p_company_id uuid,
  p_location_id uuid,
  p_owner_account_id uuid,
  p_client_file_id uuid,
  p_content_sha256 text,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_storage_bucket text,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_request_id uuid;
  settlement_request record;
  submission_row record;
  file_row record;
begin
  if p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_RETRY_MISMATCH';
  end if;
  select submission.request_id into parent_request_id
  from public.franchise_owner_settlement_submissions submission
  where submission.id = p_submission_id
    and submission.company_id = p_company_id
    and submission.location_id = p_location_id
    and submission.owner_account_id = p_owner_account_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_SUBMISSION_NOT_FOUND';
  end if;

  select * into settlement_request
  from public.franchise_owner_settlement_requests settlement_request
  where settlement_request.id = parent_request_id
    and settlement_request.company_id = p_company_id
  for update;
  if not found or settlement_request.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REQUEST_CLOSED';
  end if;

  select * into submission_row
  from public.franchise_owner_settlement_submissions submission
  where submission.id = p_submission_id
    and submission.request_id = settlement_request.id
    and submission.company_id = p_company_id
    and submission.location_id = p_location_id
    and submission.owner_account_id = p_owner_account_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_SUBMISSION_NOT_FOUND';
  end if;
  if submission_row.status not in ('draft', 'rejected') then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_IMMUTABLE';
  end if;

  insert into public.franchise_owner_settlement_files (
    submission_id, company_id, location_id, owner_account_id, client_file_id,
    file_name, mime_type, file_size, content_sha256, storage_bucket, storage_path,
    upload_state, deletion_state
  ) values (
    p_submission_id, p_company_id, p_location_id, p_owner_account_id, p_client_file_id,
    p_file_name, p_mime_type, p_file_size, p_content_sha256, p_storage_bucket, p_storage_path,
    'reserved', 'active'
  )
  on conflict (submission_id, owner_account_id, client_file_id) do nothing
  returning * into file_row;

  if file_row.id is null then
    select * into file_row
    from public.franchise_owner_settlement_files settlement_file
    where settlement_file.submission_id = p_submission_id
      and settlement_file.owner_account_id = p_owner_account_id
      and settlement_file.client_file_id = p_client_file_id
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_RETRY_MISMATCH';
    end if;
    if file_row.deletion_state = 'deleted' then
      raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_DELETED';
    end if;
    if file_row.company_id <> p_company_id
      or file_row.location_id <> p_location_id
      or file_row.submission_id <> p_submission_id
      or file_row.owner_account_id <> p_owner_account_id
      or file_row.client_file_id <> p_client_file_id
      or file_row.file_name <> p_file_name
      or file_row.mime_type <> p_mime_type
      or file_row.file_size <> p_file_size
      or file_row.content_sha256 <> p_content_sha256
      or file_row.storage_bucket <> p_storage_bucket
      or file_row.storage_path <> p_storage_path then
      raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_RETRY_MISMATCH';
    end if;
    return to_jsonb(file_row);
  end if;

  if (
    select count(*)
    from public.franchise_owner_settlement_files settlement_file
    where settlement_file.submission_id = p_submission_id
      and settlement_file.deletion_state <> 'deleted'
  ) > 10 then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_LIMIT';
  end if;
  return to_jsonb(file_row);
end;
$$;

create or replace function public.activate_franchise_owner_settlement_file(
  p_file_id uuid,
  p_company_id uuid,
  p_owner_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_row record;
  settlement_request record;
begin
  select request_row.* into settlement_request
  from public.franchise_owner_settlement_files settlement_file
  join public.franchise_owner_settlement_submissions submission
    on submission.id = settlement_file.submission_id
  join public.franchise_owner_settlement_requests request_row
    on request_row.id = submission.request_id
  where settlement_file.id = p_file_id
    and settlement_file.company_id = p_company_id
    and settlement_file.owner_account_id = p_owner_account_id
  for update of request_row;
  if not found or settlement_request.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_REQUEST_CLOSED';
  end if;

  update public.franchise_owner_settlement_files settlement_file
  set upload_state = 'active'
  where settlement_file.id = p_file_id
    and settlement_file.company_id = p_company_id
    and settlement_file.owner_account_id = p_owner_account_id
    and settlement_file.deletion_state = 'active'
  returning settlement_file.* into file_row;
  if file_row.id is null then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_NOT_FOUND';
  end if;
  return to_jsonb(file_row);
end;
$$;

create or replace function public.enqueue_franchise_owner_stale_file_cleanup()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  settlement_count integer := 0;
  content_count integer := 0;
begin
  with stale_files as (
    update public.franchise_owner_settlement_files settlement_file
    set deletion_state = 'pending'
    where settlement_file.upload_state = 'reserved'
      and settlement_file.deletion_state = 'active'
      and settlement_file.created_at < now() - interval '24 hours'
    returning settlement_file.*
  )
  insert into public.franchise_owner_file_deletion_outbox (
    file_kind, file_id, company_id, storage_bucket, storage_path
  )
  select
    'settlement_file', stale_file.id, stale_file.company_id,
    stale_file.storage_bucket, stale_file.storage_path
  from stale_files stale_file
  on conflict (file_kind, file_id) do update
  set state = 'pending',
      completed_at = null,
      last_error = null,
      requested_at = now();
  get diagnostics settlement_count = row_count;

  with storage_candidates as (
    select
      storage_object.name as storage_path,
      case
        when split_part(storage_object.name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then split_part(storage_object.name, '/', 2)::uuid
        else null
      end as company_id,
      case
        when substring(split_part(storage_object.name, '/', 5) from 1 for 36) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then substring(split_part(storage_object.name, '/', 5) from 1 for 36)::uuid
        else null
      end as attachment_id
    from storage.objects storage_object
    where storage_object.bucket_id = 'franchise-owner-private'
      and storage_object.name like 'content/%'
      and storage_object.created_at < now() - interval '24 hours'
  ), orphaned_objects as (
    select candidate.*
    from storage_candidates candidate
    join public.companies company on company.id = candidate.company_id
    where candidate.attachment_id is not null
      and not exists (
        select 1
        from public.franchise_owner_content_attachments attachment
        where attachment.storage_bucket = 'franchise-owner-private'
          and attachment.storage_path = candidate.storage_path
          and attachment.deletion_state = 'active'
      )
      and not exists (
        select 1
        from public.franchise_owner_content_version_attachments snapshot
        where snapshot.storage_bucket = 'franchise-owner-private'
          and snapshot.storage_path = candidate.storage_path
      )
  )
  insert into public.franchise_owner_file_deletion_outbox (
    file_kind, file_id, company_id, storage_bucket, storage_path
  )
  select
    'content_attachment', orphan.attachment_id, orphan.company_id,
    'franchise-owner-private', orphan.storage_path
  from orphaned_objects orphan
  on conflict (file_kind, file_id) do update
  set state = 'pending',
      completed_at = null,
      last_error = null,
      requested_at = now()
  where public.franchise_owner_file_deletion_outbox.storage_path = excluded.storage_path;
  get diagnostics content_count = row_count;

  return settlement_count + content_count;
end;
$$;

create or replace function public.request_franchise_owner_settlement_file_deletion(
  p_file_id uuid,
  p_company_id uuid,
  p_location_id uuid,
  p_owner_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_row record;
  submission_row record;
  outbox_row record;
begin
  select * into file_row
  from public.franchise_owner_settlement_files settlement_file
  where settlement_file.id = p_file_id
    and settlement_file.company_id = p_company_id
    and settlement_file.location_id = p_location_id
    and settlement_file.owner_account_id = p_owner_account_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_NOT_FOUND';
  end if;

  select * into submission_row
  from public.franchise_owner_settlement_submissions submission
  where submission.id = file_row.submission_id
    and submission.company_id = p_company_id
    and submission.location_id = p_location_id
    and submission.owner_account_id = p_owner_account_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_SUBMISSION_NOT_FOUND';
  end if;
  if file_row.deletion_state = 'active' and submission_row.status not in ('draft', 'rejected') then
    raise exception using errcode = 'P0001', message = 'OWNER_SETTLEMENT_FILE_IMMUTABLE';
  end if;

  if file_row.deletion_state = 'active' then
    update public.franchise_owner_settlement_files
    set deletion_state = 'pending'
    where id = file_row.id;
  end if;
  insert into public.franchise_owner_file_deletion_outbox (
    file_kind, file_id, company_id, storage_bucket, storage_path
  ) values (
    'settlement_file', file_row.id, file_row.company_id,
    file_row.storage_bucket, file_row.storage_path
  )
  on conflict (file_kind, file_id) do update
  set state = case when public.franchise_owner_file_deletion_outbox.state = 'completed' then 'completed' else 'pending' end,
      last_error = null
  returning * into outbox_row;

  return jsonb_build_object(
    'fileId', file_row.id,
    'outboxId', outbox_row.id,
    'storageBucket', file_row.storage_bucket,
    'storagePath', file_row.storage_path,
    'completed', outbox_row.state = 'completed'
  );
end;
$$;

create or replace function public.complete_franchise_owner_file_deletion(
  p_outbox_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox_row record;
begin
  select * into outbox_row
  from public.franchise_owner_file_deletion_outbox deletion_job
  where deletion_job.id = p_outbox_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_FILE_DELETION_NOT_FOUND';
  end if;
  if outbox_row.state = 'completed' then
    return to_jsonb(outbox_row);
  end if;

  if outbox_row.file_kind = 'content_attachment' then
    update public.franchise_owner_content_attachments
    set deletion_state = 'deleted', deleted_at = coalesce(deleted_at, now())
    where id = outbox_row.file_id and company_id = outbox_row.company_id;
  elsif outbox_row.file_kind = 'settlement_file' then
    update public.franchise_owner_settlement_files
    set deletion_state = 'deleted', deleted_at = coalesce(deleted_at, now())
    where id = outbox_row.file_id and company_id = outbox_row.company_id;
  end if;
  update public.franchise_owner_file_deletion_outbox
  set state = 'completed', completed_at = coalesce(completed_at, now()), last_error = null
  where id = outbox_row.id
  returning * into outbox_row;
  return to_jsonb(outbox_row);
end;
$$;

create or replace function public.record_franchise_owner_file_deletion_failure(
  p_outbox_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.franchise_owner_file_deletion_outbox
  set attempt_count = attempt_count + 1,
      last_error = left(coalesce(p_error, 'storage deletion failed'), 1000)
  where id = p_outbox_id and state = 'pending';
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'franchise_owner_content_items',
    'franchise_owner_content_attachments',
    'franchise_owner_content_receipts',
    'franchise_owner_reminders',
    'franchise_owner_reminder_requests',
    'franchise_owner_portal_events',
    'franchise_owner_settlement_requests',
    'franchise_owner_settlement_submissions',
    'franchise_owner_settlement_files',
    'franchise_owner_content_versions',
    'franchise_owner_content_version_attachments',
    'franchise_owner_file_deletion_outbox'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on table public.%I from anon', target_table);
    execute format('revoke all on table public.%I from authenticated', target_table);
    execute format('grant select, insert, update, delete on table public.%I to service_role', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_staff_select', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_staff_write', target_table);
  end loop;
end $$;

revoke update, delete on table public.franchise_owner_content_versions from service_role;
revoke update, delete on table public.franchise_owner_content_version_attachments from service_role;
revoke delete on table public.franchise_owner_content_items from service_role;
grant select, insert on table public.franchise_owner_content_versions to service_role;
grant select, insert on table public.franchise_owner_content_version_attachments to service_role;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'franchise_owner_content_items',
    'franchise_owner_content_attachments',
    'franchise_owner_content_receipts',
    'franchise_owner_reminders',
    'franchise_owner_portal_events',
    'franchise_owner_settlement_requests',
    'franchise_owner_settlement_submissions',
    'franchise_owner_settlement_files',
    'franchise_owner_content_versions',
    'franchise_owner_content_version_attachments'
  ]
  loop
    execute format('grant select on table public.%I to authenticated', target_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active'' and (p.role = ''admin'' or (p.company_id = %I.company_id and p.role in (''manager'', ''sub_manager'')))))',
      target_table || '_staff_select', target_table, target_table
    );
  end loop;
end $$;

revoke insert, update, delete on table public.franchise_owner_settlement_requests from authenticated;
revoke insert, update, delete on table public.franchise_owner_settlement_submissions from authenticated;
revoke insert, update, delete on table public.franchise_owner_settlement_files from authenticated;

revoke execute on function public.capture_franchise_owner_content_version(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.create_franchise_owner_settlement_request(uuid, uuid, text, text, date, date, timestamptz, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mutate_franchise_owner_content(uuid, uuid, uuid, integer, text, uuid, text, text, text, text, text, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.register_franchise_owner_content_attachment(uuid, uuid, uuid, uuid, integer, uuid, text, text, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.request_franchise_owner_content_attachment_deletion(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.record_franchise_owner_content_receipt(uuid, integer, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.create_franchise_owner_reminder_deliveries(uuid, uuid, text, text, integer, text, text, timestamptz, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.acknowledge_franchise_owner_reminder(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mutate_franchise_owner_settlement_submission(uuid, uuid, uuid, uuid, text, numeric, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.close_franchise_owner_settlement_request(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.review_franchise_owner_settlement_submission(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.reserve_franchise_owner_settlement_file(uuid, uuid, uuid, uuid, uuid, text, text, text, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.activate_franchise_owner_settlement_file(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.request_franchise_owner_settlement_file_deletion(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.complete_franchise_owner_file_deletion(uuid) from public, anon, authenticated;
revoke execute on function public.record_franchise_owner_file_deletion_failure(uuid, text) from public, anon, authenticated;
revoke execute on function public.enqueue_franchise_owner_stale_file_cleanup() from public, anon, authenticated;

grant execute on function public.capture_franchise_owner_content_version(uuid, integer, text) to service_role;
grant execute on function public.create_franchise_owner_settlement_request(uuid, uuid, text, text, date, date, timestamptz, uuid, uuid) to service_role;
grant execute on function public.mutate_franchise_owner_content(uuid, uuid, uuid, integer, text, uuid, text, text, text, text, text, boolean, timestamptz) to service_role;
grant execute on function public.register_franchise_owner_content_attachment(uuid, uuid, uuid, uuid, integer, uuid, text, text, bigint, text, text) to service_role;
grant execute on function public.request_franchise_owner_content_attachment_deletion(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.record_franchise_owner_content_receipt(uuid, integer, uuid, uuid, uuid, text) to service_role;
grant execute on function public.create_franchise_owner_reminder_deliveries(uuid, uuid, text, text, integer, text, text, timestamptz, uuid, jsonb, jsonb) to service_role;
grant execute on function public.acknowledge_franchise_owner_reminder(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.mutate_franchise_owner_settlement_submission(uuid, uuid, uuid, uuid, text, numeric, text, timestamptz) to service_role;
grant execute on function public.close_franchise_owner_settlement_request(uuid, uuid, uuid) to service_role;
grant execute on function public.review_franchise_owner_settlement_submission(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.reserve_franchise_owner_settlement_file(uuid, uuid, uuid, uuid, uuid, text, text, text, bigint, text, text) to service_role;
grant execute on function public.activate_franchise_owner_settlement_file(uuid, uuid, uuid) to service_role;
grant execute on function public.request_franchise_owner_settlement_file_deletion(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.complete_franchise_owner_file_deletion(uuid) to service_role;
grant execute on function public.record_franchise_owner_file_deletion_failure(uuid, text) to service_role;
grant execute on function public.enqueue_franchise_owner_stale_file_cleanup() to service_role;

notify pgrst, 'reload schema';

commit;
