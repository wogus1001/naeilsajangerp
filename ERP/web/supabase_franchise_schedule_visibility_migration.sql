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

create or replace function public.is_active_franchise_schedule_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = target_company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
  );
$$;

create or replace function public.can_manage_franchise_schedules(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = target_company_id
      and p.status = 'active'
      and p.role in ('admin', 'manager')
  );
$$;

create or replace function public.is_assignable_franchise_schedule_profile(
  target_company_id uuid,
  target_profile_id uuid,
  manager_only boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and p.company_id = target_company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
      and (not manager_only or p.role in ('admin', 'manager'))
      and (
        auth.role() = 'service_role'
        or exists (
          select 1
          from public.profiles requester
          where requester.id = auth.uid()
            and requester.company_id = target_company_id
            and requester.status = 'active'
            and requester.role <> 'partner_vendor'
        )
      )
  );
$$;

revoke all on function public.is_active_franchise_schedule_member(uuid) from public, anon;
revoke all on function public.can_manage_franchise_schedules(uuid) from public, anon;
revoke all on function public.is_assignable_franchise_schedule_profile(uuid, uuid, boolean) from public, anon;
grant execute on function public.is_active_franchise_schedule_member(uuid) to authenticated, service_role;
grant execute on function public.can_manage_franchise_schedules(uuid) to authenticated, service_role;
grant execute on function public.is_assignable_franchise_schedule_profile(uuid, uuid, boolean) to authenticated, service_role;

drop policy if exists "Company members can view franchise schedules" on public.franchise_schedules;
create policy "Company members can view franchise schedules" on public.franchise_schedules
  for select using (
    public.is_active_franchise_schedule_member(company_id)
    and (
      (
        source_type = 'approval-document'
        and (
          public.can_act_on_approval_document(company_id, source_id, auth.uid())
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.company_id = franchise_schedules.company_id
              and p.status = 'active'
              and p.role = 'admin'
          )
        )
      )
      or (
        source_type is distinct from 'approval-document'
        and (
          creator_profile_id = auth.uid()
          or visibility = 'shared'
        )
      )
    )
  );

drop policy if exists "Company members can insert manual franchise schedules" on public.franchise_schedules;
create policy "Company members can insert manual franchise schedules" on public.franchise_schedules
  for insert with check (
    public.is_active_franchise_schedule_member(company_id)
    and source_type is null
    and source_id is null
    and public.is_assignable_franchise_schedule_profile(company_id, creator_profile_id)
    and public.is_assignable_franchise_schedule_profile(company_id, assignee_profile_id)
    and (
      manager_profile_id is null
      or public.is_assignable_franchise_schedule_profile(company_id, manager_profile_id, true)
    )
    and (
      (
        visibility = 'shared'
        and (
          public.can_manage_franchise_schedules(company_id)
          or (
            creator_profile_id = auth.uid()
            and assignee_profile_id = auth.uid()
            and manager_profile_id is null
          )
        )
      )
      or (creator_profile_id = auth.uid() and assignee_profile_id = auth.uid() and manager_profile_id is null)
    )
  );

drop policy if exists "Company members can update manual franchise schedules" on public.franchise_schedules;
create policy "Company members can update manual franchise schedules" on public.franchise_schedules
  for update using (
    public.is_active_franchise_schedule_member(company_id)
    and source_type is null
    and source_id is null
    and (
      (visibility = 'personal' and creator_profile_id = auth.uid())
      or (
        visibility = 'shared'
        and (
          public.can_manage_franchise_schedules(company_id)
          or creator_profile_id = auth.uid()
        )
      )
    )
  )
  with check (
    public.is_active_franchise_schedule_member(company_id)
    and source_type is null
    and source_id is null
    and public.is_assignable_franchise_schedule_profile(company_id, creator_profile_id)
    and public.is_assignable_franchise_schedule_profile(company_id, assignee_profile_id)
    and (
      manager_profile_id is null
      or public.is_assignable_franchise_schedule_profile(company_id, manager_profile_id, true)
    )
    and (
      (
        visibility = 'shared'
        and (
          public.can_manage_franchise_schedules(company_id)
          or (
            creator_profile_id = auth.uid()
            and assignee_profile_id = auth.uid()
            and manager_profile_id is null
          )
        )
      )
      or (creator_profile_id = auth.uid() and assignee_profile_id = auth.uid() and manager_profile_id is null)
    )
  );

drop policy if exists "Company members can delete manual franchise schedules" on public.franchise_schedules;
create policy "Company members can delete manual franchise schedules" on public.franchise_schedules
  for delete using (
    public.is_active_franchise_schedule_member(company_id)
    and source_type is null
    and source_id is null
    and (
      (visibility = 'personal' and creator_profile_id = auth.uid())
      or (
        visibility = 'shared'
        and (
          public.can_manage_franchise_schedules(company_id)
          or creator_profile_id = auth.uid()
        )
      )
    )
  );

commit;
