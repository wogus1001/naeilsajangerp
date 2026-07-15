-- Franchise source schedule profile security hardening
-- SQL 등록 필요: apply after supabase_franchise_source_schedule_upsert_migration.sql.
-- Rejects inactive, partner-vendor and invalid manager assignments inside the authoritative RPC.

begin;

do $$
begin
  if to_regprocedure('public.upsert_franchise_schedule_from_payload(jsonb)') is null then
    raise exception 'FRANCHISE_SOURCE_SCHEDULE_UPSERT_RPC_REQUIRED';
  end if;
end $$;

create or replace function public.upsert_franchise_schedule_from_payload(schedule_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_id text := coalesce(nullif(trim(schedule_payload->>'id'), ''), uuid_generate_v4()::text);
  schedule_company uuid := nullif(schedule_payload->>'company_id', '')::uuid;
  schedule_creator uuid := nullif(schedule_payload->>'creator_profile_id', '')::uuid;
  schedule_assignee uuid := nullif(schedule_payload->>'assignee_profile_id', '')::uuid;
  schedule_manager uuid := nullif(schedule_payload->>'manager_profile_id', '')::uuid;
  schedule_source_type text := nullif(trim(schedule_payload->>'source_type'), '');
  schedule_source_id text := nullif(trim(schedule_payload->>'source_id'), '');
  schedule_date date := coalesce(
    nullif(schedule_payload->>'date', '')::date,
    nullif(schedule_payload->>'due_at', '')::timestamp with time zone::date
  );
  normalized_status text;
  normalized_completed_at timestamp with time zone;
  persisted_id text;
begin
  if schedule_company is null then raise exception 'FRANCHISE_SCHEDULE_COMPANY_REQUIRED'; end if;
  if schedule_source_type is null or schedule_source_id is null then
    raise exception 'FRANCHISE_SCHEDULE_SOURCE_REQUIRED';
  end if;
  if schedule_date is null then raise exception 'FRANCHISE_SCHEDULE_DATE_REQUIRED'; end if;
  if nullif(trim(schedule_payload->>'title'), '') is null then raise exception 'FRANCHISE_SCHEDULE_TITLE_REQUIRED'; end if;

  if exists (
    select 1
    from unnest(array[schedule_creator, schedule_assignee]) as candidate(profile_id)
    where profile_id is not null
      and not exists (
        select 1
        from public.profiles p
        where p.id = profile_id
          and p.company_id = schedule_company
          and p.status = 'active'
          and coalesce(p.role, '') <> 'partner_vendor'
      )
  ) then
    raise exception 'FRANCHISE_SCHEDULE_PROFILE_NOT_ASSIGNABLE';
  end if;

  if schedule_manager is not null and not exists (
    select 1
    from public.profiles p
    where p.id = schedule_manager
      and p.company_id = schedule_company
      and p.status = 'active'
      and p.role in ('admin', 'manager')
  ) then
    raise exception 'FRANCHISE_SCHEDULE_MANAGER_NOT_ASSIGNABLE';
  end if;

  normalized_status := public.normalize_franchise_schedule_status(
    schedule_payload->>'status',
    nullif(schedule_payload->>'completed_at', '')::timestamp with time zone,
    '예정'
  );
  normalized_completed_at := case
    when normalized_status = '완료' then coalesce(
      nullif(schedule_payload->>'completed_at', '')::timestamp with time zone,
      timezone('utc'::text, now())
    )
    else null
  end;

  insert into public.franchise_schedules (
    id, company_id, creator_profile_id, assignee_profile_id, manager_profile_id,
    title, date, status, type, color, details, source_type, source_id,
    due_at, remind_at, completed_at, metadata, created_at, updated_at
  ) values (
    requested_id,
    schedule_company,
    schedule_creator,
    schedule_assignee,
    schedule_manager,
    trim(schedule_payload->>'title'),
    schedule_date,
    normalized_status,
    coalesce(nullif(schedule_payload->>'type', ''), 'workflow'),
    coalesce(nullif(schedule_payload->>'color', ''), '#3182f6'),
    coalesce(schedule_payload->>'details', ''),
    schedule_source_type,
    schedule_source_id,
    nullif(schedule_payload->>'due_at', '')::timestamp with time zone,
    nullif(schedule_payload->>'remind_at', '')::timestamp with time zone,
    normalized_completed_at,
    coalesce(schedule_payload->'metadata', '{}'::jsonb),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  on conflict (company_id, source_type, source_id)
    where source_type is not null and source_id is not null
  do update set
    title = excluded.title,
    date = excluded.date,
    status = excluded.status,
    type = excluded.type,
    color = excluded.color,
    details = excluded.details,
    assignee_profile_id = excluded.assignee_profile_id,
    manager_profile_id = excluded.manager_profile_id,
    due_at = excluded.due_at,
    remind_at = excluded.remind_at,
    completed_at = case
      when excluded.status = '완료' then coalesce(
        public.franchise_schedules.completed_at,
        excluded.completed_at,
        timezone('utc'::text, now())
      )
      else null
    end,
    metadata = excluded.metadata,
    updated_at = timezone('utc'::text, now())
  returning id into persisted_id;

  return persisted_id;
end;
$$;

revoke all on function public.upsert_franchise_schedule_from_payload(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_franchise_schedule_from_payload(jsonb) to service_role;

commit;
