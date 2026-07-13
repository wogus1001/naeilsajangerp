begin;

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

  select d.author_profile_id,
         d.data -> 'approvalLineSelections' -> new.template_step_id::text
  into document_author_id, selected_profile_ids
  from public.approval_documents d
  where d.id = new.document_id and d.company_id = new.company_id;

  if jsonb_typeof(selected_profile_ids) = 'array'
    and jsonb_array_length(selected_profile_ids) > 0 then
    if new.completion_mode = 'sequential' then
      for selected_index in 0..jsonb_array_length(selected_profile_ids) - 1 loop
        resolved_targets := public.resolve_approval_step_targets(
          new.company_id,
          document_author_id,
          'profiles',
          jsonb_build_object('profile_ids', jsonb_build_array(selected_profile_ids -> selected_index)),
          new.action_kind,
          clock_timestamp()
        );
        if coalesce(jsonb_array_length(resolved_targets), 0) = 0 then
          raise exception using errcode = '23514', message = '선택한 결재자를 사용할 수 없습니다.';
        end if;
        if selected_index = 0 then
          new.step_order := base_step_order + 1;
          new.step_key := base_step_key || ':1';
          new.targets := resolved_targets;
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
            new.status, resolved_targets, new.responses
          );
        end if;
      end loop;
    else
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
  end if;
  return new;
end;
$$;

revoke all on function public.apply_approval_document_step_override() from public;

drop trigger if exists apply_approval_document_step_override_before_insert on public.approval_document_steps;
create trigger apply_approval_document_step_override_before_insert
  before insert on public.approval_document_steps
  for each row execute function public.apply_approval_document_step_override();

commit;
