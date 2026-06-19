# Release Management

이 문서는 ERP/web 업데이트를 브랜치, 커밋, 배포 이력과 함께 관리하기 위한 운영 규칙이다. 코드 구현 세부 로드맵은 `franchise-growth-roadmap.md`, QA 결과는 `franchise-dev-qa-log.md`, 로컬 worktree 상태는 `../../MAC_CONTEXT.md`에 기록한다.

## Branch Policy

- 기능 작업은 `codex/<topic>-YYYYMMDD` 브랜치에서 시작한다.
- 기준 브랜치는 특별한 이유가 없으면 최신 `origin/main`이다.
- `dev`와 `main`은 배포 반영 단계에서만 사용한다.
- 배포 요청이 없으면 `dev` 또는 `main`으로 push하지 않는다.
- 실서버 배포는 사용자가 명시적으로 요청한 경우에만 `my_project_main_release` worktree에서 진행한다.

## Commit Policy

- 커밋은 기능, 버그 수정, 문서 정리처럼 되돌릴 수 있는 단위로 나눈다.
- 구현과 그 구현을 검증하는 테스트는 같은 커밋에 포함한다.
- DB migration, API, UI가 한 기능을 이루면 같은 기능 커밋에 묶되, unrelated 정리는 분리한다.
- `ERP/web/handoff.md`, `.env*`, provider token, service-role key, 개인 인증 정보는 커밋하지 않는다.
- 커밋 전에는 `git diff --check`, `git status --short`, 관련 검증 결과를 확인한다.
- 사용자 설명 방식에 영향을 주는 기능은 `/landing`과 `/demo`의 프랜차이즈 데모 시나리오, 딤드 설명 단계, 샘플 데이터 갱신 여부도 함께 확인한다.

## Update Flow

1. 작업 브랜치 생성: `git switch -c codex/<topic>-YYYYMMDD origin/main`
2. 구현 후 로컬 검증: lint, typecheck, tests, build, browser QA 중 변경 범위에 맞는 항목을 수행한다.
3. 문서 갱신: README, roadmap, QA log, MAC_CONTEXT 중 변경 사실을 알 필요가 있는 문서만 수정한다.
   - 공개 설명/사용 흐름에 영향이 있으면 데모 페이지를 함께 갱신하고, 영향이 없으면 QA 로그에 `데모 영향 없음`으로 남긴다.
4. 기능 커밋 생성: 커밋 해시와 메시지를 작업 요약에 남긴다.
5. dev 배포 요청 시: `my_project_dev_deploy`에서 해당 커밋을 반영하고 `dev`로 push한다.
6. 실서버 배포 요청 시: `my_project_main_release`에서 검증 후 `main`으로 push한다.
7. 배포 후 확인: Vercel READY 상태, 주요 URL, API 상태, known env gap을 기록한다.

## Version Ledger Format

업데이트 이력은 다음 형식으로 남긴다.

```text
YYYY-MM-DD
- 작업 브랜치: codex/<topic>-YYYYMMDD
- 기능 커밋: <hash> <message>
- dev 반영: <hash 또는 none>
- main 반영: <hash 또는 none>
- 배포 URL: <url 또는 none>
- 검증: lint/tsc/tests/build/browser QA 결과
- 남은 이슈: env, migration, 외부 계정 승인 등
```

## Current Release Baseline

- 2026-06-19
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `127b0ff feat(demo): add public franchise walkthrough`
  - 주요 기능: 공개 `/demo` 프랜차이즈 샘플 데모, 실제 ERP UI 기반 대시보드/DB 관리/계약 완료/출점 후보지/가맹 운영 체험, 첫 진입 딤드 설명, 우측 사용 방법 패널, 랜딩 데모 CTA
  - dev 반영: 이 릴리즈 문서 커밋 포함 HEAD를 `dev`로 반영 예정
  - main 반영: 이 릴리즈 문서 커밋 포함 HEAD를 `main`으로 반영 예정
  - 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/app/demo/demoContent.test.mts`, `npm run build` 통과. Playwright로 `/demo` 1440px/390px 자동 투어, 우측 설명 패널, 로고 `데모`, `/api/**` 요청 0건, page-level horizontal overflow 0건 확인
  - 남은 이슈: 공개 데모는 샘플 데이터만 사용하며 실제 저장/발송/삭제 API를 호출하지 않는다.
- 2026-06-18
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `efced6e feat(franchise): add partner access and DB exports`
  - 주요 기능: 회원가입 휴대폰 필수화, 협력업체 역할/승인/권한 격리, 모객 DB/출점 후보지/가맹 운영 export, 인입 관리/후보지/모객 DB 권한 보강
  - dev 반영: 이 릴리즈 문서 커밋 포함 HEAD를 `dev`로 반영 예정
  - main 반영: 이 릴리즈 문서 커밋 포함 HEAD를 `main`으로 반영 예정
  - 검증: `npx tsx --test src/components/franchise/franchiseDbExport.test.mts src/lib/user-role-policy.test.mts src/lib/signup-approval-policy.test.mts src/lib/franchise-location-access.test.mts src/lib/franchise-lead-access.test.mts src/lib/franchise-manager-display.test.mts src/components/franchise/leads/leadWorkspaceState.test.mts`, `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과
  - 남은 이슈: `supabase_partner_vendor_access_migration.sql`은 사용자가 Supabase SQL Editor에서 직접 적용해야 협력업체 권한 격리 schema/RLS가 완전히 활성화된다.
- 2026-06-16 기준 최근 실서버 반영 커밋: `9817b10 feat(franchise): connect insights and disclosure email`
- 이 커밋은 지역 인사이트 고도화, 정보공개서 Gmail 발송/열람 추정/수신 확인, 문서 관리 팝업, 문서 삭제를 포함한다.
- production Gmail 발송은 Vercel production 환경변수 설정 전까지 `configReady: false`가 정상 상태다.
