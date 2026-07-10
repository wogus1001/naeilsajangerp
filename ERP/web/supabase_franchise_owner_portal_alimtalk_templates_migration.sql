do $$
begin
  if to_regclass('public.alimtalk_templates') is null
     or to_regclass('public.alimtalk_scenarios') is null then
    raise notice 'alimtalk operation tables are missing. Run supabase_franchise_alimtalk_operations_migration.sql first.';
    return;
  end if;

  insert into public.alimtalk_templates (
    template_key, name, status, enabled, content, variables, review_note, button_label, button_url
  )
  values
    (
      'owner_notice_published',
      '[FC ERP] 공지/공문 안내',
      'approved',
      true,
      '[FC ERP] 공지/공문 안내\n\n#{브랜드명} 본사에서 새 공지/공문을 발행했습니다.\n\n제목: #{공지제목}\n발행일: #{발행일}\n\n점주 포털에서 내용을 확인하고 읽음 처리를 진행해 주세요.',
      '["브랜드명", "공지제목", "발행일"]'::jsonb,
      '본사가 점주 포털 공지/공문을 발행했을 때 대상 점주에게 내용 확인과 읽음 처리를 안내하는 정보성 알림톡입니다.',
      '점주 포털 바로가기',
      ''
    ),
    (
      'owner_facility_request_created',
      '[FC ERP] 시설/고장 문의 접수 안내',
      'approved',
      true,
      '[FC ERP] 시설/고장 문의 접수 안내\n\n#{매장명}에서 시설/고장 문의가 접수되었습니다.\n\n문의 제목: #{문의제목}\n접수일: #{접수일}\n점주: #{점주명}\n\nFC ERP에서 문의 내용과 첨부 사진을 확인한 뒤 처리해 주세요.',
      '["매장명", "문의제목", "접수일", "점주명"]'::jsonb,
      '점주가 시설/고장 문의를 등록하거나 반려 건을 다시 제출했을 때 본사 담당자에게 처리 필요 상태를 안내하는 정보성 알림톡입니다.',
      'FC ERP 바로가기',
      ''
    ),
    (
      'owner_account_created',
      '[FC ERP] 점주 포털 계정 발급 안내',
      'approved',
      true,
      '[FC ERP] 점주 포털 계정 발급 안내\n\n점주 포털 계정이 발급되었습니다.\n\n아이디: #{점주아이디}\n임시 비밀번호: #{임시비밀번호}\n\n처음 로그인 후 안전한 사용을 위해 비밀번호를 변경해 주세요.\n점주 포털에서 공지 확인, 매장 정보 입력, 오픈 체크리스트, 시설 문의를 이용할 수 있습니다.',
      '["점주아이디", "임시비밀번호"]'::jsonb,
      '본사가 점주 포털 계정을 발급했을 때 점주에게 아이디와 임시 비밀번호 및 최초 로그인 안내를 전달하는 정보성 알림톡입니다.',
      '점주 포털 로그인',
      ''
    )
  on conflict (template_key) do update
  set
    name = excluded.name,
    content = excluded.content,
    variables = excluded.variables,
    review_note = excluded.review_note,
    button_label = excluded.button_label,
    button_url = excluded.button_url,
    updated_at = timezone('utc'::text, now());

  insert into public.alimtalk_scenarios (
    scenario_key, template_key, name, trigger_label, recipient_label, enabled, fallback_channel, memo
  )
  values
    (
      'owner_notice_published',
      'owner_notice_published',
      '점주 공지/공문 발행 안내',
      '본사 점주 공지/공문 발행 시',
      '대상 점주 계정',
      true,
      'none',
      '점주 포털 공지/공문 읽음 처리 유도'
    ),
    (
      'owner_facility_request_created',
      'owner_facility_request_created',
      '시설/고장 문의 접수 안내',
      '점주 시설/고장 문의 등록 또는 재제출 시',
      '회사 팀장 및 매니저',
      true,
      'none',
      '본사 제출 처리 확인 요청'
    ),
    (
      'owner_account_created',
      'owner_account_created',
      '점주 포털 계정 발급 안내',
      '본사 점주 계정 신규 발급 시',
      '점주 계정 휴대폰',
      true,
      'none',
      '점주 포털 최초 로그인 안내'
    )
  on conflict (scenario_key) do update
  set
    template_key = excluded.template_key,
    name = excluded.name,
    trigger_label = excluded.trigger_label,
    recipient_label = excluded.recipient_label,
    memo = excluded.memo,
    updated_at = timezone('utc'::text, now());
end $$;
