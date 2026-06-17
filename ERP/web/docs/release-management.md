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

## Update Flow

1. 작업 브랜치 생성: `git switch -c codex/<topic>-YYYYMMDD origin/main`
2. 구현 후 로컬 검증: lint, typecheck, tests, build, browser QA 중 변경 범위에 맞는 항목을 수행한다.
3. 문서 갱신: README, roadmap, QA log, MAC_CONTEXT 중 변경 사실을 알 필요가 있는 문서만 수정한다.
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

- 2026-06-16 기준 최근 실서버 기능 커밋: `23e8d54 feat(franchise): finalize alerts and OAuth policy`
- 이 커밋은 인앱 알림, 알림 상세 딥링크, 모객 DB 정보공개서 컬럼/정렬, 회사별 대시보드 타입, 팀장/매니저 직급 분리, 공개 개인정보처리방침 `/privacy`, 랜딩 정책 링크를 포함한다.
- production Gmail 발송은 Vercel production 환경변수 설정 전까지 `configReady: false`가 정상 상태다.

## Release Ledger

2026-06-16
- 작업 브랜치: `codex/franchise-next-alerts-20260616`
- 기능 커밋: `5b4bf8d docs(franchise): document release management workflow`, `de3127d feat(franchise): add disclosure alerts and role controls`, `bdad4ae feat(dashboard): add franchise KPI view`, `8d2082f feat(admin): configure company dashboard roles`, `8f5dfde feat(franchise): finalize alerts and OAuth policy`
- dev 반영: `2b50bb4 docs(franchise): document release management workflow`, `ee9a70b feat(franchise): add disclosure alerts and role controls`, `bb17d0e feat(dashboard): add franchise KPI view`, `e38d7e3 feat(admin): configure company dashboard roles`, `056b731 feat(franchise): finalize alerts and OAuth policy`, `afc2b14 docs(franchise): record dev deployment`
- main 반영: `3352bd1 docs(franchise): document release management workflow`, `e6c8a2b feat(franchise): add disclosure alerts and role controls`, `57a5cd9 feat(dashboard): add franchise KPI view`, `d9bef13 feat(admin): configure company dashboard roles`, `23e8d54 feat(franchise): finalize alerts and OAuth policy`
- 배포 URL: `https://naeilsajang.vercel.app` (`main` Vercel deployment success)
- 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/components/franchise/leads/leadWorkspaceState.test.mts src/components/franchise/leads/leadDetailDeepLink.test.mts src/lib/franchise-notifications.test.mts src/components/franchise/leads/leadTableConfig.test.mts src/lib/company-menu-features.test.mts`, `npm run build`, production `/privacy` and `/landing` HTTP 200 checks
- 남은 이슈: Google OAuth production 검증 전 비공개 YouTube 데모 영상 준비와 `supabase_franchise_notifications_migration.sql` 운영 DB 적용 여부 확인이 필요하다.
