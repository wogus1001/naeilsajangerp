alter table public.franchise_owner_notices
  add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column public.franchise_owner_notices.attachments
  is '점주 포털 공지/공문 첨부 파일 메타데이터 배열. 각 항목은 파일명, MIME, 용량, storage bucket/path, 다운로드 URL을 포함한다.';
