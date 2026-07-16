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

create unique index if not exists franchise_work_intake_deleted_source_uidx
  on public.franchise_work_intake_deleted_records(source_table, source_id);

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
  v_source_row jsonb;
  v_deleted_count integer;
begin
  if p_kind = 'properties' then
    v_source_table := 'properties';
    select p.company_id, to_jsonb(p) into v_company_id, v_source_row
      from public.properties p
      where p.id = p_source_id and p.operation_type = '물건등록'
      for update;

    if v_source_row is null then
      raise exception 'WORK_INTAKE_RECORD_NOT_FOUND';
    end if;

    insert into public.franchise_work_intake_deleted_records (
      company_id, kind, source_table, source_id, deleted_by, title, summary, snapshot
    ) values (
      v_company_id, p_kind, v_source_table, p_source_id, p_deleted_by,
      coalesce(nullif(p_title, ''), '삭제된 입점 요청'),
      coalesce(p_summary, ''),
      jsonb_build_object('sourceTable', v_source_table, 'row', v_source_row)
    )
    returning id into v_deleted_record_id;

    delete from public.properties
      where id = p_source_id and operation_type = '물건등록';
    get diagnostics v_deleted_count = row_count;
    if v_deleted_count <> 1 then
      raise exception 'WORK_INTAKE_DELETE_CONFLICT';
    end if;

    return v_deleted_record_id;
  end if;

  if p_kind = 'leadRegistrations' then
    v_source_table := 'franchise_lead_registration_requests';
    select r.company_id, to_jsonb(r) into v_company_id, v_source_row
      from public.franchise_lead_registration_requests r
      where r.id = p_source_id
      for update;

    if v_source_row is null then
      raise exception 'WORK_INTAKE_RECORD_NOT_FOUND';
    end if;

    insert into public.franchise_work_intake_deleted_records (
      company_id, kind, source_table, source_id, deleted_by, title, summary, snapshot
    ) values (
      v_company_id, p_kind, v_source_table, p_source_id, p_deleted_by,
      coalesce(nullif(p_title, ''), '삭제된 예비 창업자 등록'),
      coalesce(p_summary, ''),
      jsonb_build_object('sourceTable', v_source_table, 'row', v_source_row)
    )
    returning id into v_deleted_record_id;

    delete from public.franchise_lead_registration_requests
      where id = p_source_id;
    get diagnostics v_deleted_count = row_count;
    if v_deleted_count <> 1 then
      raise exception 'WORK_INTAKE_DELETE_CONFLICT';
    end if;

    return v_deleted_record_id;
  end if;

  if p_kind = 'matchingRequests' then
    v_source_table := 'franchise_leads';
    select l.company_id, to_jsonb(l) into v_company_id, v_source_row
      from public.franchise_leads l
      where l.id = p_source_id and l.source = '프랜차이즈 매칭 요청'
      for update;

    if v_source_row is null then
      raise exception 'WORK_INTAKE_RECORD_NOT_FOUND';
    end if;

    insert into public.franchise_work_intake_deleted_records (
      company_id, kind, source_table, source_id, deleted_by, title, summary, snapshot
    ) values (
      v_company_id, p_kind, v_source_table, p_source_id, p_deleted_by,
      coalesce(nullif(p_title, ''), '삭제된 예비 창업자 등록'),
      coalesce(p_summary, ''),
      jsonb_build_object('sourceTable', v_source_table, 'row', v_source_row)
    )
    returning id into v_deleted_record_id;

    delete from public.franchise_leads
      where id = p_source_id and source = '프랜차이즈 매칭 요청';
    get diagnostics v_deleted_count = row_count;
    if v_deleted_count <> 1 then
      raise exception 'WORK_INTAKE_DELETE_CONFLICT';
    end if;

    return v_deleted_record_id;
  end if;

  raise exception 'UNSUPPORTED_WORK_INTAKE_KIND';
end;
$$;

revoke all on function public.delete_franchise_work_intake_record_with_snapshot(text, uuid, uuid, text, text, jsonb) from public;
grant execute on function public.delete_franchise_work_intake_record_with_snapshot(text, uuid, uuid, text, text, jsonb) to service_role;

commit;
