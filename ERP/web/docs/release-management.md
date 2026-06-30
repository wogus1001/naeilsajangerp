# Release Management

이 문서는 ERP/web 업데이트를 브랜치, 커밋, 배포 이력과 함께 관리하기 위한 운영 규칙이다. 현재 상태 요약은 `franchise-current-status.md`, 코드 구현 세부 로드맵은 `franchise-growth-roadmap.md`, QA 결과는 `franchise-dev-qa-log.md`, 로컬 worktree 운영 방식은 `../../MAC_CONTEXT.md`에 기록한다.

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
3. 문서 갱신: current status, README, roadmap, QA log, MAC_CONTEXT 중 변경 사실을 알 필요가 있는 문서만 수정한다.
   - 공개 설명/사용 흐름에 영향이 있으면 데모 페이지를 함께 갱신하고, 영향이 없으면 QA 로그에 `데모 영향 없음`으로 남긴다.
4. 기능 커밋 생성: 커밋 해시와 메시지를 작업 요약에 남긴다.
5. dev 배포 요청 시: `my_project_dev_deploy`에서 해당 커밋을 반영하고 `dev`로 push한다.
6. 실서버 배포 요청 시: `my_project_main_release`에서 검증 후 `main`으로 push한다.
7. 배포 후 확인: Vercel READY 상태, 주요 URL, API 상태, known env gap을 기록한다.

## Fast Release Runbook

문서 작성, 커밋, 푸시, 배포 요청이 반복될 때는 아래 순서를 기본값으로 사용한다. 요청 범위가 작은 문구 수정이어도 순서는 유지하되, 검증 범위만 축소한다.

### 1. 시작 확인

```bash
git status --short
git branch --show-current
git rev-parse --short origin/dev
git rev-parse --short origin/main
```

- 기존 미추적 `.omo/*` 작업물은 사용자/에이전트 작업일 수 있으므로 임의로 삭제하거나 커밋하지 않는다.
- `ERP/web/handoff.md`, `.env*`, provider token, 서비스 키는 읽거나 커밋하지 않는다.
- SQL을 작성하거나 migration 파일을 바꾸면 최종 보고에 반드시 `SQL 등록 필요` 또는 `SQL 등록 완료 확인` 상태를 적는다.

### 2. 변경 반영과 검증

```bash
cd ERP/web
npx tsc --noEmit --pretty false
npm run lint -- --quiet
npm run build
```

- 라이브러리/유틸 변경이 있으면 관련 `npx tsx --test ...`를 먼저 실행한다.
- UI 변경이면 Playwright 또는 실제 브라우저로 해당 화면을 직접 열어 확인한다.
- 문서만 변경한 경우에는 `git diff --check`와 문서 diff 확인을 최소 검증으로 둔다.

### 3. 문서 갱신

- 현재 상태 요약: `ERP/web/docs/franchise-current-status.md`
- 긴 릴리즈 ledger: `ERP/web/docs/release-management.md`
- QA와 실제 확인 내역: `ERP/web/docs/franchise-dev-qa-log.md`
- 장기 방향/후속 아이디어: `ERP/web/docs/franchise-growth-roadmap.md`
- 실행/env/SQL 안내가 바뀐 경우: `ERP/web/README.md`

문서에는 긴 명령 출력 대신 통과한 명령, 브라우저 QA 대상 URL/화면, 미검증 리스크만 남긴다.

### 4. 커밋

```bash
git diff --check
git status --short
git diff --stat
git add <changed-files>
git diff --staged --stat
git commit -m "<type(scope): summary>"
git log -1 --oneline
```

- 최근 커밋 스타일은 `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`를 우선한다.
- 구현 파일과 그 검증 테스트는 같은 커밋에 묶는다.
- unrelated 문서/설정 변경은 별도 커밋으로 분리한다.

### 5. 푸시

```bash
git push origin HEAD
```

- 사용자가 `dev/main 반영`을 명시하지 않았으면 작업 브랜치만 push한다.
- `dev` 또는 `main`으로 직접 push/merge/promotion은 사용자가 명시적으로 요청한 경우에만 진행한다.

### 6. 배포

배포 대상은 요청 문구로 고정한다.

- `Dev 실서버`, `dev 배포`: Vercel dev 환경과 `https://naeilsajang-dev.vercel.app` 확인.
- `실서버`, `운영`, `production`, `main 배포`: Vercel production 환경과 `https://www.fcerp.co.kr` 확인.

운영 도메인 `www.fcerp.co.kr`은 Vercel `naeilsajang` 프로젝트에 연결되어 있다. `web` 프로젝트로 배포하면 preview URL은 뜨지만 운영 도메인에는 반영되지 않는다.

운영 배포 확인 기준:

```bash
npx vercel projects ls --scope team_NcWNRifDHvr7GdFW0rcpR3ym
npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym
```

- `name`이 `naeilsajang`, `target`이 `production`, `status`가 `Ready`여야 한다.
- Aliases에 `https://www.fcerp.co.kr`와 `https://fcerp.co.kr`가 보여야 한다.
- 배포 후 사용자에게 deployment id, 커밋 해시, 검증 명령, 남은 미추적 파일을 보고한다.

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

상세 명령 출력과 긴 브라우저 QA 내역은 `franchise-dev-qa-log.md`에 남기고, 이 문서에는 릴리즈 판단에 필요한 요약과 링크 가능한 기준만 남긴다. 최신 한 장 요약은 `franchise-current-status.md`에 반영한다.

## Pending Work Ledger

### 2026-06-22 전자계약/관리자 후속 작업

- 상태: 현재까지 구현된 전자계약 v2, 회사별 템플릿 관리, UCanSign API KEY 발송, 문서 다운로드, 회사별 아이디 로그인은 유지한다. 아래 항목은 다음 작업 범위로 남긴다.
- 전자계약 메뉴 정리: 사이드바/메뉴 관리의 `권리금 전자계약` 표기를 `전자계약`으로 바꾸고, 프랜차이즈 하위 메뉴 가장 하단에 배치한다.
- 개인정보 수정 정리: 개인정보 수정 화면의 `서비스 연동 > 유캔싸인` 영역은 사용자에게 노출하지 않는다. UCanSign은 내일사장 공용 API KEY 운영이므로 개인별 연결 UI가 필요 없다.
- UCanSign 운영 설정: 실서버에는 `UCANSIGN_API_KEY`, `UCANSIGN_WEBHOOK_SECRET` 등 production env를 확인하고, UCanSign 개발자 설정에는 `https://www.fcerp.co.kr/api/electronic-contracts/webhooks/ucansign?secret=...` webhook URL을 등록한다.
- 문서 접근 액션: UCanSign read/embedding URL은 운영 샘플에서 빈 화면, `reason=1docError`, 또는 UCanSign 로그인 페이지가 확인되어 ERP 문서함 액션에서 제외한다. 서명자는 UCanSign이 발송한 이메일/카카오톡 링크를 사용한다.
- 서명 취소 검토: UCanSign 문서 취소 API가 제공되면 ERP에서 `서명취소` 액션을 추가하고, 취소 성공 시 ERP 문서 상태를 `canceled` 계열로 동기화한다. API 미지원이면 UCanSign 관리자 화면 이동 또는 운영 안내로 처리한다.
- 어드민 사용량: 어드민에서 회사별 전자계약 사용량을 볼 수 있게 한다. 우선 컬럼은 회사명, 전체 문서 수, 초안/발송/완료/실패/취소 건수, 최근 발송일, 최근 완료일을 검토한다.
- 어드민 사용자 아이디: 어드민 회원 및 권한 관리 표에 `login_id`를 노출해 이메일과 별도로 실제 로그인 아이디를 확인할 수 있게 한다.
- 신규 SQL: 위 후속 작업은 우선 기존 `electronic_contracts`, `profiles.login_id` 기준 조회/표시로 처리 가능하다. 추가 집계 테이블이나 audit column이 필요해지면 SQL 작성 후 사용자가 직접 Supabase SQL Editor에 등록한다.

## Current Release Baseline

- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 개인정보 저장/진행현황 작성자 핫픽스 커밋 예정
  - 주요 기능: 실서버 개인정보 수정에서 저장 후 `사용자 정보를 다시 불러오지 못했습니다.`가 표시되던 문제를 수정한다. 최종 프로필 재조회 쿼리가 `company:companies(...)` 암묵 관계 대신 `company:companies!company_id(...)`를 사용하도록 보강하고, 프로필 업데이트 오류를 무시하지 않게 했다. 진행현황 입점 요청 행에는 회사명 옆 작성자 표시를 추가했다.
  - dev 반영: none
  - main 반영: 실서버 장애 대응으로 운영 배포 예정
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/work-intake-display.test.mts src/app/api/franchise-work-intake/route.test.mts src/app/api/user/update/route.test.mts src/lib/profile-contact.test.mts src/lib/user-role-policy.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 로컬 production 서버 `127.0.0.1:3106`에서 Playwright auth/API mock으로 `/profile` 저장 요청과 성공 모달, `/dashboard/franchise-leads/work-intake` 작성자 표시, console/page error 0건, 1440px body overflow 0건을 확인했다.
  - 남은 이슈: 이번 핫픽스의 신규 SQL은 없다. 실제 미래 회사 계정 저장 persistence는 운영 배포 후 실계정에서 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 직원 관리/개인정보 수정 보강 커밋 예정
  - 주요 기능: 기존 회사 브랜드 임직원 가입자가 `sub_manager`(매니저)로 접수되는 정책과 직원 관리 화면/API 분류를 맞췄다. `sub_manager`와 `staff`를 회사 직원 그룹으로 함께 표시하고, 승인 대기와 팀장 승격 대상에도 매니저를 포함한다. 개인정보 수정 화면은 등록 이메일/휴대폰 수정이 가능하며, 회사 로고 등록/삭제는 팀장(`manager`)에게만 노출 및 허용한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 이번 커밋 반영 예정
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/user-role-policy.test.mts src/lib/profile-contact.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 로컬 production 서버 `127.0.0.1:3105`에서 Playwright auth/API mock으로 `/company/staff`와 `/profile`을 확인했고, 직원 `sub_manager`/`staff` 표시, 승인 대기 `sub_manager` 표시, 팀장 전용 로고 버튼, 매니저 로고 버튼 숨김, console/page error 0건을 확인했다.
  - 남은 이슈: 이번 범위의 신규 SQL은 없다. 로컬 `.env.local` 연결 데이터에는 `미래` 회사가 없어 운영 실데이터 직접 조회는 하지 못했으며, 운영 배포 후 `미래` 회사 팀장 실계정으로 목록 표시를 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점포개발 미팅 도구 코드리뷰 보강 커밋 예정
  - 주요 기능: 출점 검토 리포트 회사 공용 프리셋 API를 보강했다. 빈 `meetingTool` 저장을 차단하고, UUID 검증, 프리셋 테이블 미적용 424 안내, 교차 회사 삭제 404 응답, `reportMemo` 제외 저장 테스트를 추가했다. UI는 후보지/회사 전환 시 이전 프리셋 목록을 비우고, 삭제 확인창과 비율 순차 소수 입력 유지를 보강했다.
  - dev 반영: none
  - main 반영: 이번 커밋 반영 예정
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool.test.mts` 14건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 로컬 production 서버 `http://localhost:3126`의 `/demo`에서 1280px/390px 리포트 모달, 목표매출 `4,500` 표시, 비율 순차 입력 `4` -> `4.` -> `4.5` 유지, 금액 `203` 역산, dialog overflow 0건, console/page error 0건을 확인했다.
  - 남은 이슈: 이번 보강의 신규 SQL은 없다. 기존 `supabase_franchise_location_meeting_tool_presets_migration.sql`은 사용자 확인 기준 실서버 등록 완료. 실제 로그인 세션에서 프리셋 persistence는 배포 후 추가 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 출점 검토 리포트 PDF/인쇄 blank 핫픽스 커밋 예정
  - 주요 기능: 출점 검토 리포트의 `PDF 저장`/`인쇄` 새 창이 `about:blank`로 남는 문제를 수정했다. 새 창은 완성된 보고서 HTML을 Blob URL로 열고 로드 완료 후 브라우저 인쇄를 실행한다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 7건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, Playwright 브라우저 스모크 통과.
  - 남은 이슈: 이번 PDF/인쇄 blank 핫픽스의 신규 SQL은 없다. 실제 로그인 세션에서 리포트 버튼을 눌러 PDF 저장/인쇄 미리보기가 보고서 내용으로 열리는지 최종 육안 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점포개발 미팅 도구 회사 공용 프리셋/숫자 표시 커밋 예정
  - 주요 기능: 출점 검토 리포트의 간단 수익분석표에 회사 공용 프리셋 저장/적용/삭제를 추가한다. 프리셋은 목표매출 변화 차수와 비용 항목만 저장하고 후보지별 보고 메모는 덮어쓰지 않는다. 프리셋 행은 제목과 보조 문구가 잘리지 않도록 정리했고 금액 입력은 콤마 표시를 적용했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. Playwright CSS 스모크로 프리셋 문구 노출과 `4,500`/`2,100` 콤마 표시를 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
  - 남은 이슈: `supabase_franchise_location_meeting_tool_presets_migration.sql`은 사용자 확인 기준 실서버 등록 완료. 실제 로그인 세션에서 프리셋 저장/불러오기/삭제 UX를 배포 후 추가 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 OAuth 심사 영상 준비/공개 진입점 정리 커밋
  - 주요 기능: `/landing` 상단 메뉴에 `로그인` 링크를 추가해 신규 도메인 랜딩에서 실제 로그인 화면으로 이동할 수 있게 했다. 로그인 화면 브랜드명은 `FC ERP`로 변경하고, 가입/개인정보처리방침/앱 metadata도 같은 브랜드 기준으로 정리했다.
  - dev 반영: none
  - main 반영: 이번 커밋 반영 예정
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 로컬 production 서버 `http://localhost:3114`에서 1280px/390px `/landing` 로그인 링크, `/login` 이동, `FC ERP` 브랜드 문구, `/signup`/`/privacy` 브랜드 문구를 Playwright로 확인했다.
  - 남은 이슈: Google OAuth 심사 화면의 앱 이름/홈페이지 정보는 Google Cloud Console에서 `FC ERP`/`https://www.fcerp.co.kr` 기준으로 별도 확인한다. 이번 변경의 신규 SQL은 없다.
- 2026-06-29
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점포개발 미팅 도구 커밋
  - 주요 기능: 출점 후보지 목록에 `출점 검토 리포트`를 추가했다. 후보지별 목표매출과 주요 비용 금액/비율을 만원 단위로 입력해 세전수익과 세전 수익률을 계산하고, 목표매출 변화 `1차 / 2차 / 3차` 전환과 자유 비용 항목 추가/삭제를 지원한다. 보고 메모와 함께 브라우저 PDF 저장/인쇄가 가능하다. 리포트는 기존 `franchise_locations.data.meetingTool`에 저장하므로 신규 SQL은 없다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: 1차 구현에서 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 4건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 보강 후 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 6건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. headless Playwright mock 세션에서는 대상 페이지 본문이 빈 상태로 남아 브라우저 캡처를 확보하지 못했으므로 실제 로그인 세션에서 리포트 다이얼로그 시각 QA를 추가 확인한다.
  - 남은 이슈: 회사/브랜드별 비용 항목 라이브러리, 선긋기 상권 지도 이미지 첨부, 리포트 버전 이력은 후속 고도화로 분리한다.
- 2026-06-29
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 회원가입 승인/Solapi/데모 가이드 릴리즈 커밋
  - 주요 기능: 회원가입 화면의 입력 순서를 회사 찾기 우선으로 정리하고, 이메일 `@` 누락/비밀번호 확인 불일치/휴대폰 자동 하이픈 정책을 추가했다. 기존 회사 브랜드 임직원 가입은 회사 팀장 유무에 따라 팀장 또는 매니저 권한으로 백엔드에서 자동 접수한다. Solapi SDK로 회원가입 요청 관리자 알림과 승인 완료 신청자 알림을 추가했고, 문자 문구 prefix는 `[ERP]`로 통일했다. `/demo` 가이드는 대시보드와 모객 DB의 필터, 1차 유입 DB, 개별 상세, 승격, 가맹 희망자 단계 설명과 상세 드로어를 실제 업무 흐름에 맞게 조정했다. 어드민 관리 홈에서는 회사별 전자계약 사용량과 회사별 메뉴 관리를 각각 `전자계약 관리`, `회사별 메뉴 관리` 전용 페이지로 분리했고, 전자계약 사용량과 회원 및 권한 관리에 검색/필터/정렬/페이지네이션을 추가했다.
  - dev 반영: 이번 커밋 반영 예정
  - main 반영: 이번 커밋 반영 예정
  - 배포 URL: 배포 후 최종 보고
  - 검증: `npx tsx --test src/lib/signup-approval-policy.test.mts`, `npx tsx --test src/lib/solapi-notifications.test.mts`, `npx tsx --test src/app/demo/demoContent.test.mts`, `npx tsx --test src/app/admin/electronicContractUsageTableState.test.mts src/app/admin/users/adminUsersTableState.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. Playwright로 `/signup` 390px 입력 순서/검증 메시지/휴대폰 자동 포맷을 확인했다. 로컬 production 서버 `127.0.0.1:3094`에서 `/admin`, `/admin/electronic-contracts`, `/admin/company-access`, `/admin/users`의 관리 메뉴 분리, 전자계약 사용량/회원 관리 검색·필터·정렬·페이지네이션, console/page error 0건을 확인했다.
  - 남은 이슈: 신규 SQL 없음. Solapi 실문자 발송은 운영 환경변수와 관리자 수신 번호 설정이 완료된 배포 환경에서 실제 가입/승인 흐름으로 확인한다.
- 2026-06-24
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 `/demo` 접근 게이트 커밋
  - 주요 기능: `/demo`와 `/demo/[role]` 샘플 데이터 화면을 데모 전용 ID/PW 접근 게이트로 보호했다. 실제 Supabase 로그인과 분리하고, `POST /api/demo/access`에서 httpOnly `/demo` 범위 쿠키를 발급하며 `DELETE /api/demo/access`에서 로그아웃한다. 기존 데모 API guard는 `/api/demo/access`만 예외로 허용하고 실제 ERP API 호출 차단을 유지한다. 데모 헤더에는 `데모 로그아웃` 액션을 추가했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/demo-access.test.mts src/app/api/demo/access/route.test.mts src/app/demo/demoContent.test.mts` 12건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 로컬 production 서버 `127.0.0.1:3047`에서 `/demo`, `/demo/manager`, `/demo/partner` 로그인/오류/딥링크/로그아웃 흐름과 모바일 390px 접근 게이트 overflow 0건을 확인했다.
  - 남은 이슈: 신규 SQL 없음. Vercel Production, Development, Preview(dev) 환경에 `DEMO_ACCESS_ID`, `DEMO_ACCESS_PASSWORD`, `DEMO_ACCESS_COOKIE_SECRET` 등록은 완료했다. 기존 배포에는 자동 반영되지 않으므로 다음 dev/main 재배포 후 `/demo` 접근 게이트를 실서버에서 확인한다.
- 2026-06-24
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `c65bdf8 feat(franchise): refine opening readiness checklist`
  - 주요 기능: 오픈 준비 체크리스트 1차 고도화. 기존 `franchise_opening_projects.tasks` JSON을 확장해 6단계 25개 하위 체크를 제공하고, `확인요청`, 오늘 처리, 기한 임박, 진행 이슈, 오픈 가능도 요약을 추가했다. 단계별 접힘 섹션에서 항목 설명, 필수 배지, 상태, 담당, 기한, 메모를 관리한다. 계약완료 상세의 계약 전 서류 탭/버튼 표기는 `구비서류`로 통일했다. 기존 저장 데이터는 task `id` 기준으로 병합하므로 신규 SQL은 없다.
  - dev 반영: `e4ad21d feat(franchise): refine opening readiness checklist`
  - main 반영: none
  - 배포 URL: `https://naeilsajang-dev.vercel.app` (`dpl_7cvvF2ttQNnoPDu1Vdv9gEomFozX`, READY; source `https://naeilsajang-chtpaq0ki-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증 진행: `npx tsx --test src/lib/franchise-opening-projects.test.mts src/components/franchise/leads/LeadOpeningProjectSection.utils.test.mts src/lib/franchise-contract-store.test.mts` 15건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 기존 dev 서버 `localhost:3000`에서 내일 회사 관리자 세션으로 계약완료 상세 `구비서류` 탭 표기와 1280px/390px overflow 0건을 확인했다. dev worktree 반영 후 같은 15건 테스트, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 재통과했다. Vercel API로 최신 dev deployment가 `e4ad21d`와 매칭되고 `READY`이며 `naeilsajang-dev.vercel.app` alias가 연결됐음을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 2026-06-24
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `0e336e2 feat(franchise): add contract opening preparation tab`
  - 주요 기능: 계약완료 점주 상세 탭을 `오픈 준비 / 구비서류 / 점주 문서함 / 가맹점 정보`로 확장했다. `오픈 준비` 탭은 기존 `franchise_opening_projects` 테이블과 `/api/franchise-opening-projects` API를 재사용하고, 프로젝트는 lead가 아니라 해당 lead에서 생성된 `franchise_locations.id`에 연결한다. 연결 가맹점이 없으면 `가맹점 정보` 탭 이동 CTA를 보여주며, `오픈준비` 상태 가맹점에서만 프로젝트 시작/저장을 허용한다. 구비서류 필수 그룹 헤더는 한 줄형으로 압축하고, 오픈 준비 화면의 별도 우측 상단 상태 배지는 제거했다. `막힘` 상태는 데이터 값으로 유지하되 화면 표기는 `진행 이슈`/`이슈`로 정리했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/components/franchise/leads/LeadOpeningProjectSection.utils.test.mts src/lib/franchise-opening-projects.test.mts src/lib/franchise-contract-store.test.mts` 13건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 로컬 production 서버 `127.0.0.1:3081`에서 내일 회사 관리자 세션으로 계약완료 상세 `오픈 준비` 탭을 1280px/390px에서 확인했고, page-level horizontal overflow 0건, console/page error 0건이었다. 추가 QA로 탭 첫 항목 `오픈 준비`, 오픈 준비 상단 상태 배지 제거, 본문 `막힘` 문구 미노출, 체크리스트 필수 헤더 한 줄 압축을 확인했다.
  - 남은 이슈: 신규 SQL 없음. 실운영 세션에서 오픈 준비 프로젝트 저장 후 새로고침 persistence를 한 번 더 확인한다.
- 2026-06-24
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `58363c9 fix(franchise): harden lead document uploads`
  - 주요 기능: `/api/franchise-lead-documents` GET/POST/PATCH/DELETE에서 `requesterId`/`userId`/`managerId` fallback 경로를 제거하고 bearer 세션 기반 `getAuthenticatedRequesterProfile`만 사용한다. 업로드 문서 열람은 `/api/franchise-lead-documents?action=open&documentId=...` 인증 경로에서 lead/company 권한 확인 후 짧은 TTL signed URL을 발급한다. 점주 문서함 UI와 구비서류 빠른 등록/삭제는 `getApiAuthHeaders()`로 요청하고, 점주 문서함 업로드 문서는 `publicUrl` 대신 Storage `path`를 저장한다. `/api/upload`는 권한 확인 후 파일을 메모리에 읽기 전에 20MB 초과를 먼저 차단하고, MIME/확장자/매직바이트 검증, 허용 bucket/path/권한 검증을 통과한 파일만 Storage에 쓴다. 기존 매물/정보공개서 공개 URL 소비 흐름은 유지하되, 점주 문서함 업로드는 공개 URL을 반환·저장하지 않는다. 전자계약 문서함 연결은 현재 lead/company에 속한 전자계약 `sourceId`만 허용하고, UCanSign 발송 성공 후 문서함 링크 저장만 실패하면 계약 상태를 `send_failed`로 덮지 않고 응답 warning과 서버 로그로 분리한다.
  - dev 반영: `0e4ad3f fix(franchise): harden lead document uploads`
  - main 반영: none
  - 배포 URL: `https://naeilsajang-dev.vercel.app` (`dpl_GkjHTqcgdaP8ARfUXBvS6An4X4yd`, READY; source `https://naeilsajang-eivq6v86h-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: 코드품질 재리뷰에서 지적된 라우트 직접 테스트 부족과 대용량 파일 선검사 위치를 보정했다. `npx tsx --test src/app/api/franchise-lead-documents/route.test.mts src/lib/upload-file-validation.test.mts src/app/api/upload/route.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-lead-documents.test.mts` 25건 통과. 확장 회귀로 `npx tsx --test src/app/api/franchise-lead-documents/route.test.mts src/lib/upload-file-validation.test.mts src/app/api/upload/route.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-lead-documents.test.mts src/lib/api-auth.test.mts src/lib/franchise-lead-access.test.mts src/lib/upload-storage-access.test.mts src/lib/upload-storage-policy.test.mts src/lib/franchise-lead-contract-checklist.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts"` 51건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. Dev worktree 반영 후 같은 51건 확장 회귀, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 재통과했다. Vercel API로 최신 dev deployment가 `0e4ad3f`와 매칭되고 `READY`임을 확인했다. 로컬 production 서버 `127.0.0.1:3079`에 Playwright auth/API mock을 주입해 `/dashboard/franchise-locations`, `/contracts/electronic`를 1280px/390px에서 smoke 확인했다. 두 화면 모두 page-level overflow 0건, console/page error 0건이며, 로컬 도메인은 Kakao JavaScript 키 제한으로 지도 타일 대신 도메인 설정 안내가 표시됐다. Dev 도메인은 Vercel SSO 보호로 외부 `curl -I -L /login`이 Vercel SSO 로그인으로 리다이렉트되는 것을 확인했다.
  - 남은 이슈: 신규 SQL 없음. 실제 운영 세션에서 점주 문서함 signed 열람/삭제, 완료 전자계약 연결, UCanSign 발송 후 링크 warning 케이스를 live QA한다.
- 2026-06-24
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 물건지 지도 반경분석/측정 도구 커밋
  - 주요 기능: `/dashboard/franchise-locations`의 우측 목록 클릭과 지도 마커 클릭을 같은 선택 로직으로 묶어 선택 물건지로 지도 중심을 이동한다. `지도 분석` 패널 안에 `반경분석 / 거리재기 / 면적재기` 탭을 통합하고, 반경 500m/1km/2km 요약, 직접 반경 기준점 지정, 거리 polyline, 면적 polygon, 되돌리기/초기화를 제공한다. 내일 회사 실데이터 확인용으로 `지도QA_20260624_01`부터 `지도QA_20260624_30`까지 30개 샘플 물건지를 기존 API로 생성했다. 사이드바 `물건지 지도`는 `가맹 운영` 바로 아래 같은 레벨 메뉴로 표시하고, 아이콘 왼쪽 하위 표시 선을 제거했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/components/franchise/location-map/mapUtils.test.mts src/lib/company-menu-features.test.mts` 19건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. Playwright/Chrome으로 내일 회사 관리자 테스트 세션(자격증명 마스킹)에서 데스크톱 메뉴 표시와 모바일 390px `지도 분석` 패널 탭 전환을 확인했고 console error 0건이었다.
  - 남은 이슈: 이번 변경의 신규 SQL은 없다. 사용자 확인 기준 `supabase_franchise_lead_documents_migration.sql`, `supabase_franchise_contract_store_linkage_migration.sql`은 실서버 SQL 등록 완료 상태다. 물건지 지도 샘플 30건은 QA용 prefix/tag로 식별 가능하므로 운영 데이터 정리 시 같은 기준으로 제거한다.
- 2026-06-23
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `9322175 feat(franchise): refine contract readiness workflows`
  - 주요 기능: 계약 전 체크를 문서 기반 v2로 확장하고 `필수/내부보고/선택`, 해당 여부, 연결 문서, 문서 메모를 분리해 표시한다. 구비서류 행은 한 줄형 `완료/완료됨` 버튼과 업로드/전자계약 문서 관리 모달 중심으로 정리했고, 필수 항목도 체크 메모 없이 `해당없음` 저장/해결 처리가 가능하다. 점주 문서함은 업로드, 완료 전자계약 문서 연결, 체크 항목 재연결/문서 삭제를 지원한다. 계약완료 점주 상세에는 `구비서류 / 점주 문서함 / 가맹점 정보` 탭을 추가하고, 연결 후보지 또는 직접 입력으로 운영 가맹점 마스터를 생성해 `/dashboard/franchise-operations?locationId=...`로 이어갈 수 있다.
  - 후속 변경: 가맹 운영 마스터를 `대시보드 / 가맹점 목록 / 가맹점 등록` 탭으로 분리했다. 대시보드에는 운영 상태 그래프와 Mixpanel식 지역별 운영 분포 분석 카드를 추가했고, 지역 분포는 실제 시도명 기준 상위 5개를 기본 노출하고 나머지는 중앙 정렬된 `더보기`로 확장한다. 지역명 하단 보조 문구는 제거해 행 밀도를 높였다. 경쟁스캔 UI, 외부 승격 물건지 운영 전환 패널, 오픈 준비 프로젝트 패널은 임시 숨김 처리했다. 오픈 준비 프로젝트는 계약완료 점주 상세의 가맹점 정보/인계 흐름에서 재고도화한다. 계약완료 점주의 가맹점 생성은 후보지/외부 상가 source의 지역/주소/좌표를 폼에 복사하고, 직접 입력은 Kakao 주소 검색으로 받으며, 주소 없는 생성은 API에서 차단한다. 프랜차이즈 하위 `가맹 운영` 아래에 `물건지 지도`(`/dashboard/franchise-locations`)를 추가해 `franchise_locations`의 가맹 운영점과 출점 후보지를 Kakao 지도 위에 함께 표시한다. 기존 `점포개발 업무 > 물건지도`는 정상 동작하므로 전역 Kakao 설정은 건드리지 않고, 새 물건지 지도에서 저장 좌표의 한국 범위 검증, 위도/경도 반전 자동 보정, 범위 밖 좌표의 주소 geocoder fallback을 추가했다. 지오코딩 상한은 주소 조회에만 적용하고 저장 좌표가 있는 물건지는 모두 표시한다. 물건지 지도 캔버스는 명시 높이와 ResizeObserver 기반 relayout을 유지하며, 외부 상가 수집/새로고침 버튼은 숨김 처리했다. 문서 후속으로 외부 상가 수집까지 같은 물건지 축으로 묶는 구조와, 브랜드 검색량/Threads 언급/위험 키워드/경쟁 브랜드 비교 및 가맹점별 네이버·카카오맵·배달앱 리뷰 최신화 고도화 범위를 로드맵에 기록했다. 이번 물건지 지도 v1의 신규 SQL은 없다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: `https://naeilsajang.vercel.app` (`dpl_7b4n3rGnyENexpdjaS43X3gdVzxT`, READY; source `https://naeilsajang-2mn71bkxn-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx tsx --test src/lib/franchise-contract-store.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`는 가맹점 정보 연동 직후 통과했다. 후속 구비서류/문서함 UI 보정과 `PropertyCard` Recharts formatter/purity 정리 후 `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/lib/franchise-lead-documents.test.mts src/lib/franchise-contract-store.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts"` 20개 테스트, `git diff --check`, `npm run build` 통과. Playwright로 `/demo/manager` 계약 완료 요약을 1280px/390px에서 확인했고 page-level horizontal overflow 0건이었다. Supabase 실데이터에는 `contract_check_14day_seed_20260623` 태그로 `내일` 회사 관리자용 계약완료 샘플 3건을 생성/갱신했고, 정보공개서 발송일 `2026-06-01` 기준 14일 게이트 통과를 DB 재조회로 확인했다. 가맹점 정보 탭은 후보지 선택 주소가 폼에서 유지되도록 보정하고, 직접 입력 주소도 Kakao 주소 검색으로 선택하게 바꿨다. 보정 후 `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/franchise-contract-store.test.mts`, `git diff --check`, `npm run build`가 통과했고, Playwright mock QA로 1280px/390px에서 후보지 주소 복사와 `가맹 운영에 생성` 버튼을 확인했다. 코드 리뷰 보정으로 후보지/외부 상가 source의 `region`을 폼 초기값에 포함하고, 점주 문서함 `문서 삭제`를 `status='archived'` soft-delete가 아닌 레코드 삭제로 변경했다. 업로드 문서는 Storage path를 문서 `data`에 저장하고 삭제 시 Storage 파일도 best-effort로 정리한다. 리뷰 보정 후 `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/lib/franchise-lead-documents.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-contract-store.test.mts src/lib/franchise-contract-store-form.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts"` 27건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 재통과했고, Playwright auth/API mock으로 계약 완료 상세의 `구비서류`, `업로드`, `1건 연결` 표시를 확인했다. 가맹 운영 마스터 후속 보정도 `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했고, Playwright auth/API mock으로 `/dashboard/franchise-operations` 1280px/390px에서 탭 분리, 운영 상태 그래프, 지역 분포, 경쟁스캔/외부승격/오픈준비 미노출, overflow 0건, console error 0건을 확인했다. 물건지 지도 최종 보정 후 `npx tsx --test src/components/franchise/location-map/mapUtils.test.mts src/lib/company-menu-features.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-contract-store-form.test.mts src/lib/franchise-contract-store.test.mts` 23건, `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 로컬 `127.0.0.1` production 서버는 Kakao JavaScript 키 도메인 제한으로 지도 fallback 안내를 표시했으며, 메뉴/문구/숨김 버튼/검색 배치/1440px·390px overflow는 확인했다. 공용 `/api/upload`는 Storage 쓰기 전에 `property-images`/`property-documents` 버킷과 허용 prefix를 검증하고, 매물/정보공개서/점주 문서함 각각 bearer 세션 기준 requester 권한을 확인하도록 보정했다. 점주 문서함 storage 삭제도 `property-documents` 버킷과 `franchise-lead-documents/{companyId}/{leadId}/` prefix만 허용한다. 최종 보안 보정 후 `npx tsx --test src/app/api/upload/route.test.mts src/lib/upload-storage-access.test.mts src/lib/upload-storage-policy.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-lead-documents.test.mts src/lib/franchise-lead-contract-checklist.test.mts src/lib/franchise-contract-store-form.test.mts src/lib/franchise-contract-store.test.mts src/lib/company-menu-features.test.mts src/components/franchise/location-map/mapUtils.test.mts` 50건, `git diff --check`, `git check-ignore -v .omo/evidence/foo ERP/web/.omo/evidence/foo`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`를 재통과했다. 실제 지도 타일/마커는 Vercel 실서버 도메인에서 배포 후 확인한다.
  - 남은 이슈: 사용자 확인 기준 `supabase_franchise_lead_documents_migration.sql`, `supabase_franchise_contract_store_linkage_migration.sql` SQL 등록 완료. 실제 후보자 상세에서 체크리스트 저장, 해당없음 저장, 업로드 문서 등록, 완료 전자계약 연결/해제, 계약완료 후 가맹점 정보 생성, 교차 회사 접근 차단을 live QA한다. seed 샘플 생성 자체에는 신규 SQL이 없다.
- 2026-06-23
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `b224e17 feat(contracts): refine electronic contract operations`
  - 주요 기능: `전자계약` 메뉴를 프랜차이즈 하단으로 이동하고 사이드바 아이콘 추가, 개인 UCanSign 프로필 연동 UI/로그아웃 disconnect 제거, 서명 요청 취소 API 액션 추가, 실서버에서 깨지는 UCanSign 문서 접근 액션 제거, 완료 문서 전용 다운로드 가드, 발송 후 문서함 즉시 이동, 아직 완성 전인 기본 제공 권리금계약서 공통 템플릿 숨김, 회사별 전자계약 사용량 관리자 패널 추가, 관리자 회원 표 `login_id` 표시, 전자계약 문서함/템플릿 상태 문구 정리, 회사 템플릿 UCanSign 연결 전 상태/버튼 문구 명확화, 미연결 초안 템플릿을 기본 화면에서 숨김, 회사 템플릿 수정 버튼 라벨 축약, 어드민 모바일 레이아웃 보정
  - dev 반영: none
  - main 반영: `ab73c56 feat(contracts): refine electronic contract operations`
  - 배포 URL: `https://naeilsajang.vercel.app` (`dpl_3oq8jstPhr4Nmd9gudRQ4rPLDPDz`, READY)
  - 검증: `npx tsx --test src/lib/company-menu-features.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/electronic-contracts/usage-summary.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/platform-document-actions.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 후속 아이콘/라벨 변경 후 `npx tsx --test src/lib/company-menu-features.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateTableState.test.mts" "src/app/(main)/contracts/electronic/_components/companyTemplateSections.test.mts"`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check` 재통과. 문서 접근/다운로드/권리금 숨김 변경 후 `npx tsx --test src/lib/electronic-contracts/common-templates.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/ucansign/platform-document-actions.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 재통과. Playwright mock QA로 `/contracts/electronic`, `/profile`, `/admin`, `/admin/users`를 확인했고 `/contracts/electronic`, `/admin`, `/admin/users` 모바일 page-level overflow 0건과 전자계약 모바일 표의 한글 단어 nowrap, `전자계약` 사이드바 아이콘, 템플릿 관리 `수정` 버튼 라벨, UCanSign 미연결 템플릿이 기본 화면에 노출되지 않는 것을 확인. 추가 Playwright mock QA로 `/contracts/electronic` 1280px/390px에서 `내용 확인 후 서명` 0건, 완료 문서만 다운로드 노출, 권리금계약서/공통 템플릿 섹션 숨김, page-level overflow 0건을 확인
  - 남은 이슈: 신규 SQL은 없다. 실제 UCanSign 운영 키로 완료 문서 다운로드 파일과 `서명 요청 취소` 후 webhook idempotency를 운영 샘플 문서로 확인한다.
- 2026-06-22
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 로그인 화면 저장 UX 커밋
  - 주요 기능: 로그인 화면을 `LoginForm`과 저장 helper로 분리하고, 최초 회사 선택값을 저장해 다음 로그인부터 자동 선택되도록 정리. 아이디 저장은 선택 저장, 기존 이메일 로그인 fallback은 유지
  - dev 반영: 이번 커밋 포함 HEAD를 `dev`로 반영 예정
  - main 반영: 이번 커밋 포함 HEAD를 `main`으로 반영 예정
  - 검증: `npx tsx --test src/app/login/loginStorage.test.mts src/lib/login-id.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력
  - 남은 이슈: 신규 SQL은 없다. 회사별 아이디 로그인은 기존 `supabase_login_id_migration.sql` 적용 상태에 의존한다.
- 2026-06-22
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 회사 템플릿 작성 방식 단순화 커밋
  - 주요 기능: 회사 업로드 전자계약 템플릿 작성 화면에서 `작성 방식` 선택과 `템플릿에서 직접 작성` 임베딩 진입을 제거하고, `필드명` 입력/서명자 정보/임시저장/전자계약 발송 단일 흐름으로 정리
  - dev 반영: none
  - main 반영: none
  - 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력
  - 남은 이슈: UCanSign Postman 컬렉션 기준 템플릿 기반 서명문서 생성, 문서 파일/종합 파일 다운로드, 템플릿 생성/수정 임베딩은 확인됐지만, 저장된 템플릿에 ERP 입력값을 넣은 PDF를 발송 전에 렌더링하는 preview endpoint는 확인되지 않았다. 발송 전 확인은 입력값/서명자 요약 UX로 고도화한다. 신규 SQL은 없다.
- 2026-06-22
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 회사 템플릿 직접 작성 임베딩 커밋
  - 주요 기능: 회사 업로드 전자계약 템플릿의 `템플릿에서 직접 작성`을 저장된 UCanSign 템플릿 진행 화면으로 직접 연결, 미연결 템플릿 검증 메시지 보강
  - dev 반영: none
  - main 반영: none
  - 검증: `npx tsx --test src/lib/ucansign/platform-client.test.mts src/lib/ucansign/template-link-state.test.mts src/lib/electronic-contracts/ucansign-webhook.test.mts src/app/(main)/contracts/electronic/_components/signerParticipantModel.test.mts src/lib/electronic-contracts/signer-participant-validation.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과
  - 남은 이슈: UCanSign 템플릿 버전에 `ucansign_template_id`가 없는 경우 사용자가 `템플릿 만들기/수정`으로 UCanSign 설정을 완료해야 한다. UCanSign 공개 임베딩 API는 저장 템플릿 전용 sign-creating endpoint를 제공하지 않아, 직접 작성 모드는 `https://app.ucansign.com/signCreating/progress/{ucansign_template_id}` 진행 화면을 사용한다. 신규 SQL은 없다.
- 2026-06-22
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 회사별 아이디 로그인 커밋
  - 주요 기능: 회원가입 비밀번호 확인, 회사별 로그인 아이디 저장/중복 확인, `회사 + 아이디 + 비밀번호` 로그인 API, 기존 이메일 로그인 fallback, 기존 계정 이메일 local-part backfill SQL
  - dev 반영: none
  - main 반영: none
  - 검증: `npx tsx --test src/lib/login-id.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. Playwright로 `/signup`, `/login` 1440px 라벨과 page-level horizontal overflow 0건 확인
  - 남은 이슈: `supabase_login_id_migration.sql`은 사용자가 Supabase SQL Editor에서 직접 적용해야 회사별 아이디 로그인 schema가 활성화된다. 같은 회사 내 기존 이메일 local-part 중복이 있으면 SQL이 실패하므로 중복 ID를 정리한 뒤 다시 적용한다.
- 2026-06-19
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `185d84d feat(contracts): add platform electronic contract flow`, `127b0ff feat(demo): add public franchise walkthrough`
  - 주요 기능: 기존 계약 기능을 유지한 별도 `/contracts/electronic` 권리금 전자계약 v2, 내일사장 공용 유캔싸인 발송, SafetyData 인허가번호 내부 조회, 공개 `/demo` 프랜차이즈 샘플 데모, 실제 ERP UI 기반 대시보드/DB 관리/계약 완료/출점 후보지/가맹 운영 체험, 첫 진입 딤드 설명, 우측 사용 방법 패널, 랜딩 데모 CTA
  - dev 반영: 이 릴리즈 문서 커밋 포함 HEAD를 `dev`로 반영 예정
  - main 반영: 이 릴리즈 문서 커밋 포함 HEAD를 `main`으로 반영 예정
  - 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/electronic-contracts/*.test.mts src/lib/ucansign/*.test.mts src/lib/api-auth.test.mts src/app/demo/demoContent.test.mts`, `npm run build` 통과. Playwright로 `/demo` 1440px/390px 자동 투어, 우측 설명 패널, 로고 `데모`, `/api/**` 요청 0건, page-level horizontal overflow 0건 확인
  - 남은 이슈: `supabase_electronic_contracts_platform_migration.sql`은 사용자가 Supabase SQL Editor에서 직접 적용해야 전자계약 v2 테이블과 공용 유캔싸인 연결이 활성화된다. 공개 데모는 샘플 데이터만 사용하며 실제 저장/발송/삭제 API를 호출하지 않는다.
- 2026-06-19
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `74d6755 feat(contracts): add company template electronic flow`
  - 주요 기능: 회사별 UCanSign 템플릿 관리, UCanSign 설정 화면 자동 진입/수정, 템플릿 ID/이름 자동 연결, 보관 템플릿 분리, 회사 템플릿 발송 게이트, 내일사장 공용 UCanSign API KEY 발송 전환, 완료 문서 다운로드 PDF 정규화
  - dev 반영: none
  - main 반영: none
  - 검증: `npx tsx --test src/lib/electronic-contracts/company-template.test.mts src/lib/electronic-contracts/template-field-layout.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/electronic-contracts/common-templates.test.mts src/lib/ucansign/platform-config.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/template-link-state.test.mts src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 로컬 브라우저 QA로 템플릿 관리 탭의 상태줄 제거, 사용/보관 분리, 시스템 삭제 다이얼로그를 확인. UCanSign ZIP 다운로드 응답은 내부 주 PDF 추출 테스트로 고정했다
  - 남은 이슈: `supabase_company_contract_templates_migration.sql`은 사용자가 Supabase SQL Editor에서 직접 적용해야 템플릿 관리 API/UI가 실데이터로 동작한다. UCanSign direct PDF 좌표 발송 API는 공개 문서상 확정되지 않아 활성 버전에 `ucansign_template_id`가 연결된 경우만 발송한다. UCanSign 공개 임베딩 API의 범용 `sign-creating`은 문서 선택 화면부터 시작하므로 저장 템플릿 직접 작성은 UCanSign 웹 진행 URL로 연다. 운영/개발 환경에는 `UCANSIGN_API_KEY`를 서버 환경변수로 등록해야 한다.
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
