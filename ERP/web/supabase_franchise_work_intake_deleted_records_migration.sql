begin;

create table if not exists public.franchise_work_intake_deleted_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  kind text not null check (kind in ('properties', 'leadRegistrations', 'matchingRequests')),
  source_table text not null,
  source_id uuid not null,
  deleted_by uuid references public.profiles(id) on delete set null,
  title text not null default '',
  summary text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  deleted_at timestamptz not null default now()
);

create index if not exists franchise_work_intake_deleted_company_idx
  on public.franchise_work_intake_deleted_records(company_id, deleted_at desc);

create index if not exists franchise_work_intake_deleted_kind_idx
  on public.franchise_work_intake_deleted_records(kind, deleted_at desc);

alter table public.franchise_work_intake_deleted_records enable row level security;

drop policy if exists "franchise_work_intake_deleted_records_service_role" on public.franchise_work_intake_deleted_records;
create policy "franchise_work_intake_deleted_records_service_role"
  on public.franchise_work_intake_deleted_records
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.delete_franchise_work_intake_record_with_snapshot(
  p_kind text,
  p_source_id uuid,
  p_deleted_by uuid,
  p_title text,
  p_summary text,
  p_snapshot jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_source_table text;
  v_deleted_record_id uuid;
begin
  if p_kind = 'properties' then
    v_source_table := 'properties';
    select company_id into v_company_id
      from public.properties
      where id = p_source_id and operation_type = '물건등록';

    if v_company_id is null then
      raise exception 'WORK_INTAKE_RECORD_NOT_FOUND';
    end if;

    insert into public.franchise_work_intake_deleted_records (
      company_id, kind, source_table, source_id, deleted_by, title, summary, snapshot
    ) values (
      v_company_id, p_kind, v_source_table, p_source_id, p_deleted_by,
      coalesce(nullif(p_title, ''), '삭제된 입점 요청'),
      coalesce(p_summary, ''),
      coalesce(p_snapshot, '{}'::jsonb)
    )
    returning id into v_deleted_record_id;

    delete from public.properties
      where id = p_source_id and operation_type = '물건등록';

    return v_deleted_record_id;
  end if;

  if p_kind = 'leadRegistrations' then
    v_source_table := 'franchise_lead_registration_requests';
    select company_id into v_company_id
      from public.franchise_lead_registration_requests
      where id = p_source_id;

    if v_company_id is null then
      raise exception 'WORK_INTAKE_RECORD_NOT_FOUND';
    end if;

    insert into public.franchise_work_intake_deleted_records (
      company_id, kind, source_table, source_id, deleted_by, title, summary, snapshot
    ) values (
      v_company_id, p_kind, v_source_table, p_source_id, p_deleted_by,
      coalesce(nullif(p_title, ''), '삭제된 예비 창업자 등록'),
      coalesce(p_summary, ''),
      coalesce(p_snapshot, '{}'::jsonb)
    )
    returning id into v_deleted_record_id;

    delete from public.franchise_lead_registration_requests
      where id = p_source_id;

    return v_deleted_record_id;
  end if;

  if p_kind = 'matchingRequests' then
    v_source_table := 'franchise_leads';
    select company_id into v_company_id
      from public.franchise_leads
      where id = p_source_id and source = '프랜차이즈 매칭 요청';

    if v_company_id is null then
      raise exception 'WORK_INTAKE_RECORD_NOT_FOUND';
    end if;

    insert into public.franchise_work_intake_deleted_records (
      company_id, kind, source_table, source_id, deleted_by, title, summary, snapshot
    ) values (
      v_company_id, p_kind, v_source_table, p_source_id, p_deleted_by,
      coalesce(nullif(p_title, ''), '삭제된 예비 창업자 등록'),
      coalesce(p_summary, ''),
      coalesce(p_snapshot, '{}'::jsonb)
    )
    returning id into v_deleted_record_id;

    delete from public.franchise_leads
      where id = p_source_id and source = '프랜차이즈 매칭 요청';

    return v_deleted_record_id;
  end if;

  raise exception 'UNSUPPORTED_WORK_INTAKE_KIND';
end;
$$;

revoke all on function public.delete_franchise_work_intake_record_with_snapshot(text, uuid, uuid, text, text, jsonb) from public;
grant execute on function public.delete_franchise_work_intake_record_with_snapshot(text, uuid, uuid, text, text, jsonb) to service_role;

commit;
