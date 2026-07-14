begin;

create or replace function public.ensure_approval_delegation_profiles_eligible()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = new.delegator_profile_id
      and p.company_id = new.company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
  ) or not exists (
    select 1
    from public.profiles p
    where p.id = new.delegate_profile_id
      and p.company_id = new.company_id
      and p.status = 'active'
      and p.role <> 'partner_vendor'
  ) then
    raise exception using errcode = '23514', message = 'approval delegation profiles must be active company employees';
  end if;
  return new;
end;
$$;

drop trigger if exists approval_delegations_eligible_profiles on public.approval_delegations;
create trigger approval_delegations_eligible_profiles before insert or update on public.approval_delegations
  for each row execute function public.ensure_approval_delegation_profiles_eligible();

drop policy if exists "Users can view own franchise notifications" on public.franchise_notifications;
create policy "Users can view own franchise notifications"
  on public.franchise_notifications
  for select
  using (
    (
      recipient_profile_id = auth.uid()
      and (
        source_type is distinct from 'workflow-approval'
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.company_id = franchise_notifications.company_id
            and p.status = 'active'
            and p.role <> 'partner_vendor'
        )
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Users can update own franchise notifications" on public.franchise_notifications;
create policy "Users can update own franchise notifications"
  on public.franchise_notifications
  for update
  using (
    (
      recipient_profile_id = auth.uid()
      and (
        source_type is distinct from 'workflow-approval'
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.company_id = franchise_notifications.company_id
            and p.status = 'active'
            and p.role <> 'partner_vendor'
        )
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    (
      recipient_profile_id = auth.uid()
      and (
        source_type is distinct from 'workflow-approval'
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.company_id = franchise_notifications.company_id
            and p.status = 'active'
            and p.role <> 'partner_vendor'
        )
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.sync_approval_document_workflow(
  target_company_id uuid,
  target_document_id uuid,
  action_key text,
  action_memo text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  document_row public.approval_documents%rowtype;
  active_step record;
  recipient_id uuid;
  pending_recipient_ids uuid[] := array[]::uuid[];
  event_source_id text;
  action_time timestamptz := clock_timestamp();
begin
  select d.* into document_row
  from public.approval_documents d
  where d.id = target_document_id and d.company_id = target_company_id;
  if not found then return; end if;

  if document_row.status = '제출' and document_row.current_version_id is not null then
    select s.step_order, s.action_kind, s.targets, s.responses into active_step
    from public.approval_document_steps s
    where s.document_version_id = document_row.current_version_id
      and s.step_order = document_row.current_step_order
      and s.status = 'active';
    select coalesce(array_agg(distinct candidate.recipient_id order by candidate.recipient_id), array[]::uuid[])
    into pending_recipient_ids
    from (
      select nullif(step_target.value ->> 'profile_id', '')::uuid as recipient_id
      from jsonb_array_elements(coalesce(active_step.targets, '[]'::jsonb)) step_target(value)
      join public.profiles recipient_profile
        on recipient_profile.id = nullif(step_target.value ->> 'profile_id', '')::uuid
        and recipient_profile.company_id = target_company_id
        and recipient_profile.status = 'active'
        and recipient_profile.role <> 'partner_vendor'
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(active_step.responses, '[]'::jsonb)) response(value)
        where response.value ->> 'target_profile_id' = step_target.value ->> 'profile_id'
      )
      union
      select nullif(delegate_id.value, '')::uuid as recipient_id
      from jsonb_array_elements(coalesce(active_step.targets, '[]'::jsonb)) step_target(value)
      cross join lateral jsonb_array_elements_text(
        coalesce(step_target.value -> 'delegate_profile_ids', '[]'::jsonb)
      ) delegate_id(value)
      join public.profiles delegator_profile
        on delegator_profile.id = nullif(step_target.value ->> 'profile_id', '')::uuid
        and delegator_profile.company_id = target_company_id
        and delegator_profile.status = 'active'
        and delegator_profile.role <> 'partner_vendor'
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(active_step.responses, '[]'::jsonb)) response(value)
        where response.value ->> 'target_profile_id' = step_target.value ->> 'profile_id'
      )
        and exists (
          select 1
          from public.approval_delegations delegation
          join public.profiles delegate_profile
            on delegate_profile.id = delegation.delegate_profile_id
            and delegate_profile.company_id = target_company_id
            and delegate_profile.status = 'active'
            and delegate_profile.role <> 'partner_vendor'
          where delegation.company_id = target_company_id
            and delegation.delegator_profile_id = nullif(step_target.value ->> 'profile_id', '')::uuid
            and delegation.delegate_profile_id = nullif(delegate_id.value, '')::uuid
            and delegation.active
            and delegation.starts_at <= action_time
            and delegation.ends_at >= action_time
            and active_step.action_kind = any(delegation.action_scope)
        )
    ) candidate
    where candidate.recipient_id is not null
      and (
        active_step.action_kind <> 'approval'
        or candidate.recipient_id is distinct from document_row.author_profile_id
      );
    event_source_id := document_row.id::text || ':step-' || coalesce(active_step.step_order, document_row.current_step_order)::text;
    update public.franchise_notifications
    set dismissed_at = action_time, updated_at = action_time
    where company_id = target_company_id
      and source_type = 'workflow-approval'
      and source_id like document_row.id::text || ':step-%'
      and source_id <> event_source_id
      and dismissed_at is null;
    update public.franchise_notifications
    set dismissed_at = action_time, updated_at = action_time
    where company_id = target_company_id
      and source_type = 'workflow-approval'
      and source_id = event_source_id
      and not (recipient_profile_id = any(pending_recipient_ids))
      and dismissed_at is null;
    foreach recipient_id in array pending_recipient_ids
    loop
      insert into public.franchise_notifications (
        company_id, recipient_profile_id, source_type, source_id, severity,
        title, body, action_url, due_at, delivery_channel, data, updated_at
      ) values (
        target_company_id, recipient_id, 'workflow-approval', event_source_id, 'info',
        '결재 요청', document_row.title || ' 문서의 결재 순서가 도착했습니다.',
        '/approvals/documents/' || document_row.id::text, document_row.due_at,
        'in_app', jsonb_build_object('documentId', document_row.id, 'stepOrder', active_step.step_order), action_time
      ) on conflict (company_id, recipient_profile_id, source_type, source_id)
        do update set title = excluded.title, body = excluded.body, action_url = excluded.action_url,
          due_at = excluded.due_at, dismissed_at = null, updated_at = excluded.updated_at;
    end loop;

    insert into public.schedules (
      id, company_id, user_id, title, date, scope, status, type, color, details,
      source_type, source_id, assignee_profile_id, due_at, metadata, updated_at
    ) values (
      'approval-' || document_row.id::text, target_company_id,
      case when cardinality(pending_recipient_ids) = 1 then pending_recipient_ids[1] else null end,
      '결재 검토: ' || document_row.title,
      to_char(coalesce(document_row.due_at, action_time) at time zone 'Asia/Seoul', 'YYYY-MM-DD'),
      'company', '진행중', '결재', '#3182f6', '현재 결재 단계 문서 검토',
      'approval-document', document_row.id::text,
      case when cardinality(pending_recipient_ids) = 1 then pending_recipient_ids[1] else null end,
      document_row.due_at,
      jsonb_build_object(
        'documentId', document_row.id,
        'stepOrder', active_step.step_order,
        'targetProfileIds', to_jsonb(pending_recipient_ids)
      ), action_time
    ) on conflict (company_id, source_type, source_id)
      where source_type is not null and source_id is not null
      do update set user_id = excluded.user_id, title = excluded.title, date = excluded.date,
        status = excluded.status, assignee_profile_id = excluded.assignee_profile_id,
        due_at = excluded.due_at, completed_at = null, metadata = excluded.metadata,
        updated_at = excluded.updated_at;

    if action_key = 'submit' and document_row.security_level <> 'confidential' then
      for recipient_id in
        select r.profile_id
        from public.approval_document_readers r
        where r.company_id = target_company_id and r.document_id = document_row.id
        union
        select value::uuid
        from jsonb_array_elements_text(coalesce(document_row.data -> 'receiver_profile_ids', '[]'::jsonb))
        union
        select m.profile_id
        from public.organization_memberships m
        where m.company_id = target_company_id and m.active
          and m.unit_id in (
            select value::uuid
            from jsonb_array_elements_text(coalesce(document_row.data -> 'receiver_unit_ids', '[]'::jsonb))
          )
      loop
        if recipient_id <> document_row.author_profile_id then
          insert into public.franchise_notifications (
            company_id, recipient_profile_id, source_type, source_id, severity,
            title, body, action_url, delivery_channel, data, updated_at
          ) values (
            target_company_id, recipient_id, 'workflow-approval', document_row.id::text || ':shared', 'info',
            '결재 문서 공유', document_row.title || ' 문서가 참조 또는 수신 문서로 공유되었습니다.',
            '/approvals/documents/' || document_row.id::text, 'in_app',
            jsonb_build_object('documentId', document_row.id), action_time
          ) on conflict (company_id, recipient_profile_id, source_type, source_id)
            do update set body = excluded.body, action_url = excluded.action_url,
              dismissed_at = null, updated_at = excluded.updated_at;
        end if;
      end loop;
    end if;
    return;
  end if;

  update public.schedules
  set status = '완료', completed_at = action_time, updated_at = action_time
  where company_id = target_company_id
    and source_type = 'approval-document'
    and source_id = document_row.id::text;

  update public.franchise_notifications
  set dismissed_at = action_time, updated_at = action_time
  where company_id = target_company_id
    and source_type = 'workflow-approval'
    and source_id like document_row.id::text || ':step-%'
    and dismissed_at is null;

  if document_row.author_profile_id is not null and document_row.status in ('승인', '반려') then
    event_source_id := document_row.id::text || ':' || action_key;
    insert into public.franchise_notifications (
      company_id, recipient_profile_id, source_type, source_id, severity,
      title, body, action_url, delivery_channel, data, updated_at
    ) values (
      target_company_id, document_row.author_profile_id, 'workflow-approval', event_source_id,
      case when document_row.status = '반려' then 'warning' else 'success' end,
      case when document_row.status = '반려' then '결재 반려' else '결재 승인 완료' end,
      case when document_row.status = '반려' and btrim(coalesce(action_memo, '')) <> ''
        then document_row.title || ' 문서가 반려되었습니다. 사유: ' || action_memo
        else document_row.title || ' 문서가 ' || document_row.status || '되었습니다.' end,
      '/approvals/documents/' || document_row.id::text, 'in_app',
      jsonb_build_object('documentId', document_row.id), action_time
    ) on conflict (company_id, recipient_profile_id, source_type, source_id)
      do update set title = excluded.title, body = excluded.body, action_url = excluded.action_url,
        dismissed_at = null, updated_at = excluded.updated_at;
  end if;
end;
$$;

revoke all on function public.sync_approval_document_workflow(uuid, uuid, text, text) from public;

commit;
