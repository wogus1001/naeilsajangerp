# 점주 포털 알림톡 3종 리뷰 노트

작성일: 2026-07-09

## 범위

- 점주 공지/공문 발행: `owner_notice_published`
- 점주 시설/고장 문의 등록 및 반려 건 재제출: `owner_facility_request_created`
- 점주 포털 계정 신규 발급: `owner_account_created`
- 승인 템플릿 seed SQL: `supabase_franchise_owner_portal_alimtalk_templates_migration.sql`

## 리뷰 반영

- 점주 계정 발급 알림톡의 실제 발송 변수에는 임시 비밀번호를 포함하되, `alimtalk_send_logs.variables`에는 `[마스킹]`으로 저장한다.
- 계정 발급 알림톡은 휴대폰 번호 수신자만 허용한다.
- 실패/차단 로그는 재시도를 막지 않으며, 기존 `success` 또는 `fallback_sms` 로그는 이후 실패/차단 재시도로 덮어쓰지 않는다.
- 중복 로그 정책은 `alimtalk-send-log.ts`로 분리했고, 전용 테스트에서 성공 로그 보존, 실패 로그 갱신, 최초 insert 경로를 검증한다.
- 점주 포털 공지 첨부 유틸은 `franchise-owner-portal-attachments.ts`로 분리해 `franchise-owner-portal.ts` 파일 크기를 줄였다.

## 검증

- `npx tsx --test src/lib/alimtalk-send.test.mts src/lib/alimtalk-owner-portal-notifications.test.mts src/lib/alimtalk-send-support.test.mts src/lib/franchise-owner-portal.test.mts`
- `npx tsc --noEmit --pretty false --incremental false`
- `npm run lint -- --quiet`
- `npm run build`
- `git diff --check`
- `next start -p 3158` 후 비로그인 POST 스모크:
  - `/api/franchise-owner-portal/notices` -> 401
  - `/api/franchise-owner-portal/accounts` -> 401
  - `/api/owner/requests` -> 401

## 남은 운영 QA

- SQL 등록 완료 확인: `supabase_franchise_owner_portal_alimtalk_templates_migration.sql`
- `/admin/alimtalk`에서 SOLAPI template ID와 Kakao channel ID를 저장해야 실제 발송된다.
- 실계정으로 공지/공문 발행, 시설/고장 문의 등록/재제출, 점주 계정 신규 발급을 실행해 `alimtalk_send_logs`와 실제 카카오 메시지 변수 치환을 확인한다.

## 범위 밖 관찰

- `OwnerPortalPanel.tsx`, `OwnerPortalPanelSections.tsx`는 기존 점주 소통 UI 변경분이 남아 있는 대형 파일이다. 이번 알림톡 이벤트 훅의 핵심 변경 파일은 아니며, 별도 UI 분해 작업으로 다루는 편이 안전하다.
