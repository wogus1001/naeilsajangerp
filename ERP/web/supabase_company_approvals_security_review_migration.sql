begin;

create or replace function public.guard_approval_organization_unit_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.approval_template_steps step
    join public.approval_template_versions version on version.id = step.template_version_id
    where version.company_id = old.company_id
      and (
        step.target_config ->> 'unit_id' = old.id::text
        or step.target_config ->> 'unitId' = old.id::text
      )
  ) then
    raise exception using errcode = '23503', message = 'organization unit is referenced by an approval template';
  end if;

  if exists (
    select 1
    from public.approval_documents document
    where document.company_id = old.company_id
      and (
        coalesce(document.data -> 'receiver_unit_ids', '[]'::jsonb) ? old.id::text
        or coalesce(document.data -> 'receiverUnitIds', '[]'::jsonb) ? old.id::text
      )
  ) then
    raise exception using errcode = '23503', message = 'organization unit is referenced by an approval document';
  end if;

  return old;
end;
$$;

drop trigger if exists guard_approval_organization_unit_delete_trigger on public.organization_units;
create trigger guard_approval_organization_unit_delete_trigger
before delete on public.organization_units
for each row execute function public.guard_approval_organization_unit_delete();

create or replace function public.validate_required_approval_attachments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requires_attachment boolean;
begin
  if new.status <> '제출' or new.current_version_id is null
    or new.status is not distinct from old.status then
    return new;
  end if;

  select exists (
    select 1
    from public.approval_document_versions document_version
    join public.approval_template_versions template_version
      on template_version.id = document_version.template_version_id
    cross join lateral jsonb_array_elements(template_version.fields) field
    where document_version.id = new.current_version_id
      and document_version.document_id = new.id
      and document_version.company_id = new.company_id
      and coalesce((field ->> 'required')::boolean, false)
      and field ->> 'type' = 'attachment'
      and coalesce(field ->> 'editableBy', 'author') not in ('approver', 'agreement')
  ) into requires_attachment;

  if requires_attachment and not exists (
    select 1
    from public.approval_attachments attachment
    where attachment.company_id = new.company_id
      and attachment.document_id = new.id
      and attachment.document_version_id = new.current_version_id
  ) then
    raise exception using errcode = '23514', message = '필수 첨부파일을 등록해 주세요.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_required_approval_attachments_trigger on public.approval_documents;
create trigger validate_required_approval_attachments_trigger
before update of status, current_version_id on public.approval_documents
for each row execute function public.validate_required_approval_attachments();

-- A sequential step with several resolved people must advance one person at a time.
create or replace function public.apply_approval_document_step_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_profile_ids jsonb;
  document_author_id uuid;
  resolved_targets jsonb;
  selected_index integer;
  base_step_order integer;
  base_step_key text;
begin
  if new.template_step_id is null then return new; end if;

  base_step_order := new.step_order * 1000;
  base_step_key := new.step_key;
  new.step_order := base_step_order;

  select document.author_profile_id,
         document.data -> 'approvalLineSelections' -> new.template_step_id::text
  into document_author_id, selected_profile_ids
  from public.approval_documents document
  where document.id = new.document_id and document.company_id = new.company_id;

  if jsonb_typeof(selected_profile_ids) = 'array'
    and jsonb_array_length(selected_profile_ids) > 0 then
    resolved_targets := public.resolve_approval_step_targets(
      new.company_id,
      document_author_id,
      'profiles',
      jsonb_build_object('profile_ids', selected_profile_ids),
      new.action_kind,
      clock_timestamp()
    );
    if coalesce(jsonb_array_length(resolved_targets), 0) = 0 then
      raise exception using errcode = '23514', message = '선택한 결재자를 사용할 수 없습니다.';
    end if;
    new.targets := resolved_targets;
  end if;

  if new.completion_mode = 'sequential' and jsonb_array_length(new.targets) > 1 then
    resolved_targets := new.targets;
    for selected_index in 0..jsonb_array_length(resolved_targets) - 1 loop
      if selected_index = 0 then
        new.step_order := base_step_order + 1;
        new.step_key := base_step_key || ':1';
        new.targets := jsonb_build_array(resolved_targets -> selected_index);
      else
        insert into public.approval_document_steps (
          company_id, document_id, document_version_id, template_step_id,
          step_order, step_key, name, action_kind, completion_mode,
          status, targets, responses
        ) values (
          new.company_id, new.document_id, new.document_version_id, null,
          base_step_order + selected_index + 1,
          base_step_key || ':' || (selected_index + 1)::text,
          new.name, new.action_kind, 'sequential',
          new.status, jsonb_build_array(resolved_targets -> selected_index), new.responses
        );
      end if;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function public.apply_approval_document_step_override() from public;

drop trigger if exists apply_approval_document_step_override_before_insert on public.approval_document_steps;
create trigger apply_approval_document_step_override_before_insert
before insert on public.approval_document_steps
for each row execute function public.apply_approval_document_step_override();

-- Ignore memberships that are not effective when the approval line is resolved.
create or replace function public.resolve_approval_step_targets(
  target_company_id uuid,
  author_profile_id uuid,
  target_type text,
  target_config jsonb,
  action_kind text,
  effective_at timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target_profiles as (
    select parsed.profile_id, ''::text as role_key
    from (
      select case
        when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then value::uuid
        else null
      end as profile_id
      from jsonb_array_elements_text(coalesce(target_config -> 'profile_ids', '[]'::jsonb)) value
    ) parsed
    where target_type = 'profiles' and parsed.profile_id is not null
    union all
    select assignment.profile_id, assignment.role_key
    from public.approval_role_assignments assignment
    where target_type = 'role'
      and assignment.company_id = target_company_id
      and assignment.role_key = target_config ->> 'role_key'
      and assignment.active
      and (assignment.active_from is null or assignment.active_from <= effective_at)
      and (assignment.active_until is null or assignment.active_until >= effective_at)
      and (nullif(target_config ->> 'unit_id', '') is null
        or assignment.unit_id = (target_config ->> 'unit_id')::uuid)
    union all
    select unit.manager_profile_id, 'unit_manager'
    from public.organization_units unit
    where target_type = 'unit_manager'
      and unit.company_id = target_company_id
      and unit.id = (target_config ->> 'unit_id')::uuid
      and unit.active and unit.manager_profile_id is not null
    union all
    select membership.profile_id, 'unit_member'
    from public.organization_memberships membership
    where target_type = 'unit_members'
      and membership.company_id = target_company_id
      and membership.unit_id = (target_config ->> 'unit_id')::uuid
      and membership.active
      and (membership.starts_on is null or membership.starts_on <= effective_at::date)
      and (membership.ends_on is null or membership.ends_on >= effective_at::date)
    union all
    select unit.manager_profile_id, 'author_manager'
    from public.organization_memberships membership
    join public.organization_units unit
      on unit.company_id = membership.company_id and unit.id = membership.unit_id
    where target_type = 'author_manager'
      and membership.company_id = target_company_id
      and membership.profile_id = author_profile_id
      and membership.active and membership.is_primary and unit.active
      and (membership.starts_on is null or membership.starts_on <= effective_at::date)
      and (membership.ends_on is null or membership.ends_on >= effective_at::date)
      and unit.manager_profile_id is not null
  ), distinct_targets as (
    select distinct on (profile_id) profile_id, role_key
    from target_profiles
    where profile_id is not null
    order by profile_id, role_key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'profile_id', target.profile_id,
    'profile_name', coalesce(profile.name, profile.email, ''),
    'unit_id', membership.unit_id,
    'unit_name', coalesce(unit.name, ''),
    'role_key', target.role_key,
    'delegate_profile_ids', coalesce((
      select jsonb_agg(delegation.delegate_profile_id::text order by delegation.delegate_profile_id::text)
      from public.approval_delegations delegation
      join public.profiles delegate_profile
        on delegate_profile.id = delegation.delegate_profile_id
        and delegate_profile.company_id = target_company_id
        and delegate_profile.status = 'active'
        and delegate_profile.role <> 'partner_vendor'
      where delegation.company_id = target_company_id
        and delegation.delegator_profile_id = target.profile_id
        and delegation.active
        and action_kind = any(delegation.action_scope)
        and delegation.starts_at <= effective_at
        and delegation.ends_at >= effective_at
    ), '[]'::jsonb)
  ) order by target.profile_id::text), '[]'::jsonb)
  from distinct_targets target
  join public.profiles profile
    on profile.id = target.profile_id and profile.company_id = target_company_id
    and profile.status = 'active' and profile.role <> 'partner_vendor'
    and (action_kind <> 'approval' or profile.id <> author_profile_id)
  left join lateral (
    select active_membership.unit_id
    from public.organization_memberships active_membership
    where active_membership.company_id = target_company_id
      and active_membership.profile_id = target.profile_id
      and active_membership.active
      and (active_membership.starts_on is null or active_membership.starts_on <= effective_at::date)
      and (active_membership.ends_on is null or active_membership.ends_on >= effective_at::date)
    order by active_membership.is_primary desc, active_membership.position_rank desc
    limit 1
  ) membership on true
  left join public.organization_units unit
    on unit.company_id = target_company_id and unit.id = membership.unit_id;
$$;

revoke all on function public.resolve_approval_step_targets(uuid, uuid, text, jsonb, text, timestamptz) from public;

create or replace function public.can_access_approval_document(target_company_id uuid, target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approval_company_member(target_company_id)
    and exists (
      select 1
      from public.approval_documents document
      where document.id = target_document_id
        and document.company_id = target_company_id
        and (
          public.can_manage_company_approvals(target_company_id)
          or document.author_profile_id = auth.uid()
          or document.approver_profile_id = auth.uid()
          or exists (
            select 1
            from public.approval_document_readers reader
            where reader.document_id = document.id
              and reader.company_id = document.company_id
              and reader.profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.approval_document_steps step
            cross join lateral jsonb_array_elements(step.targets) target
            where step.document_id = document.id
              and step.company_id = document.company_id
              and (
                target ->> 'profile_id' = auth.uid()::text
                or (
                  coalesce(target -> 'delegate_profile_ids', '[]'::jsonb) ? auth.uid()::text
                  and exists (
                    select 1
                    from public.approval_delegations delegation
                    where delegation.company_id = document.company_id
                      and delegation.delegator_profile_id = nullif(target ->> 'profile_id', '')::uuid
                      and delegation.delegate_profile_id = auth.uid()
                      and delegation.active
                      and step.action_kind = any(delegation.action_scope)
                      and delegation.starts_at <= clock_timestamp()
                      and delegation.ends_at >= clock_timestamp()
                  )
                )
              )
          )
        )
    );
$$;

create or replace function public.can_read_approval_document(target_document_id uuid, target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_approval_document(target_company_id, target_document_id);
$$;

revoke all on function public.can_access_approval_document(uuid, uuid) from public;
revoke all on function public.can_read_approval_document(uuid, uuid) from public;
grant execute on function public.can_read_approval_document(uuid, uuid) to authenticated, service_role;

create or replace function public.can_act_on_approval_document(
  target_company_id uuid,
  target_document_id text,
  target_actor_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    (coalesce(auth.role(), '') = 'service_role' or auth.uid() = target_actor_profile_id)
    and exists (
      select 1
      from public.profiles actor
      where actor.id = target_actor_profile_id
        and actor.company_id = target_company_id
        and actor.status = 'active'
        and actor.role <> 'partner_vendor'
    )
    and exists (
      select 1
      from public.approval_documents document
      join public.approval_document_steps step
        on step.document_id = document.id
        and step.company_id = document.company_id
        and step.document_version_id = document.current_version_id
        and step.step_order = document.current_step_order
        and step.status = 'active'
      cross join lateral jsonb_array_elements(step.targets) target
      where document.id::text = target_document_id
        and document.company_id = target_company_id
        and document.status = '제출'
        and not exists (
          select 1
          from jsonb_array_elements(coalesce(step.responses, '[]'::jsonb)) response
          where response ->> 'target_profile_id' = target ->> 'profile_id'
        )
        and (
          target ->> 'profile_id' = target_actor_profile_id::text
          or (
            coalesce(target -> 'delegate_profile_ids', '[]'::jsonb) ? target_actor_profile_id::text
            and exists (
              select 1
              from public.approval_delegations delegation
              where delegation.company_id = document.company_id
                and delegation.delegator_profile_id = nullif(target ->> 'profile_id', '')::uuid
                and delegation.delegate_profile_id = target_actor_profile_id
                and delegation.active
                and step.action_kind = any(delegation.action_scope)
                and delegation.starts_at <= clock_timestamp()
                and delegation.ends_at >= clock_timestamp()
            )
          )
        )
    )
  );
$$;

revoke all on function public.can_act_on_approval_document(uuid, text, uuid) from public;
grant execute on function public.can_act_on_approval_document(uuid, text, uuid) to authenticated, service_role;

drop policy if exists "Company members can view schedules" on public.schedules;
create policy "Company members can view schedules" on public.schedules
  for select using (
    public.is_approval_company_member(company_id)
    and (
      source_type is distinct from 'approval-document'
      or public.can_act_on_approval_document(company_id, source_id, auth.uid())
      or exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and profile.company_id = schedules.company_id
          and profile.status = 'active'
          and profile.role = 'admin'
      )
    )
  );

drop policy if exists "Users can view own franchise notifications" on public.franchise_notifications;
create policy "Users can view own franchise notifications"
  on public.franchise_notifications
  for select
  using (
    (
      recipient_profile_id = auth.uid()
      and exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and profile.company_id = franchise_notifications.company_id
          and profile.status = 'active'
          and profile.role <> 'partner_vendor'
      )
      and (
        source_type is distinct from 'workflow-approval'
        or not (coalesce(data, '{}'::jsonb) ? 'stepOrder')
        or public.can_act_on_approval_document(
          company_id,
          coalesce(data ->> 'documentId', ''),
          auth.uid()
        )
      )
    )
    or exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.status = 'active'
        and profile.role = 'admin'
    )
  );

-- Keep action retries from applying the same approval transition more than once.
create table if not exists public.approval_action_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.approval_documents(id) on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  action text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, document_id, actor_profile_id, request_id)
);

alter table public.approval_action_requests enable row level security;

create or replace function public.perform_approval_document_action_idempotent(
  p_document_id uuid,
  p_company_id uuid,
  p_action text,
  p_actor_profile_id uuid,
  p_memo text,
  p_request_id uuid,
  p_expected_version_id uuid default null,
  p_expected_step_order integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_request public.approval_action_requests%rowtype;
  document_row public.approval_documents%rowtype;
  action_result jsonb;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'approval action request id is required';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() <> p_actor_profile_id) then
    raise exception using errcode = '42501', message = 'approval action actor does not match authenticated user';
  end if;

  if not exists (
    select 1 from public.profiles actor
    where actor.id = p_actor_profile_id
      and actor.company_id = p_company_id
      and actor.status = 'active'
      and actor.role <> 'partner_vendor'
  ) then
    raise exception using errcode = '42501', message = 'approval action actor is not an active company employee';
  end if;

  select document.* into document_row
  from public.approval_documents document
  where document.id = p_document_id
    and document.company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'approval document was not found in the company';
  end if;

  select request.* into existing_request
  from public.approval_action_requests request
  where request.company_id = p_company_id
    and request.document_id = p_document_id
    and request.actor_profile_id = p_actor_profile_id
    and request.request_id = p_request_id;
  if found then
    if existing_request.action <> p_action then
      raise exception using errcode = '22023', message = 'approval request id was reused for another action';
    end if;
    return existing_request.result;
  end if;

  if p_expected_version_id is not null
    and document_row.current_version_id is distinct from p_expected_version_id then
    raise exception using errcode = '55000', message = 'approval document version changed; refresh and try again';
  end if;
  if p_expected_step_order is not null
    and document_row.current_step_order is distinct from p_expected_step_order then
    raise exception using errcode = '55000', message = 'approval step changed; refresh and try again';
  end if;

  action_result := public.perform_approval_document_action(
    p_document_id,
    p_company_id,
    p_action,
    p_actor_profile_id,
    p_memo
  );

  insert into public.approval_action_requests (
    company_id, document_id, actor_profile_id, request_id, action, result
  ) values (
    p_company_id, p_document_id, p_actor_profile_id, p_request_id, p_action, action_result
  );
  return action_result;
end;
$$;

revoke all on function public.perform_approval_document_action_idempotent(uuid, uuid, text, uuid, text, uuid, uuid, integer) from public;
grant execute on function public.perform_approval_document_action_idempotent(uuid, uuid, text, uuid, text, uuid, uuid, integer) to authenticated, service_role;

commit;
