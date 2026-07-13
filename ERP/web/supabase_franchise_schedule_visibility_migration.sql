-- Franchise schedule visibility migration
-- SQL 등록 필요: apply after public.franchise_schedules has been created.
-- Existing and workflow-generated schedules remain shared by default.

begin;

do $$
begin
  if to_regclass('public.franchise_schedules') is null then
    raise exception 'FRANCHISE_SCHEDULES_TABLE_REQUIRED';
  end if;
end $$;

alter table public.franchise_schedules
  add column if not exists visibility text default 'shared';

update public.franchise_schedules
set visibility = 'shared'
where visibility is null;

alter table public.franchise_schedules
  alter column visibility set default 'shared',
  alter column visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_schedules_visibility_check'
      and conrelid = 'public.franchise_schedules'::regclass
  ) then
    alter table public.franchise_schedules
      add constraint franchise_schedules_visibility_check
      check (visibility in ('shared', 'personal'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'franchise_schedules_personal_owner_check'
      and conrelid = 'public.franchise_schedules'::regclass
  ) then
    alter table public.franchise_schedules
      add constraint franchise_schedules_personal_owner_check
      check (
        visibility = 'shared'
        or (
          source_type is null
          and source_id is null
          and creator_profile_id is not null
          and creator_profile_id = assignee_profile_id
          and manager_profile_id is null
        )
      );
  end if;
end $$;

create index if not exists idx_franchise_schedules_company_visibility_date
  on public.franchise_schedules (company_id, visibility, date);

drop policy if exists "Company members can view franchise schedules" on public.franchise_schedules;
create policy "Company members can view franchise schedules" on public.franchise_schedules
  for select using (
    company_id = public.get_my_company_id()
    and (visibility = 'shared' or creator_profile_id = auth.uid())
  );

drop policy if exists "Company members can insert manual franchise schedules" on public.franchise_schedules;
create policy "Company members can insert manual franchise schedules" on public.franchise_schedules
  for insert with check (
    company_id = public.get_my_company_id()
    and source_type is null
    and source_id is null
    and (
      visibility = 'shared'
      or (creator_profile_id = auth.uid() and assignee_profile_id = auth.uid() and manager_profile_id is null)
    )
  );

drop policy if exists "Company members can update manual franchise schedules" on public.franchise_schedules;
create policy "Company members can update manual franchise schedules" on public.franchise_schedules
  for update using (
    company_id = public.get_my_company_id()
    and source_type is null
    and source_id is null
    and (visibility = 'shared' or creator_profile_id = auth.uid())
  )
  with check (
    company_id = public.get_my_company_id()
    and source_type is null
    and source_id is null
    and (
      visibility = 'shared'
      or (creator_profile_id = auth.uid() and assignee_profile_id = auth.uid() and manager_profile_id is null)
    )
  );

drop policy if exists "Company members can delete manual franchise schedules" on public.franchise_schedules;
create policy "Company members can delete manual franchise schedules" on public.franchise_schedules
  for delete using (
    company_id = public.get_my_company_id()
    and source_type is null
    and source_id is null
    and (visibility = 'shared' or creator_profile_id = auth.uid())
  );

commit;
