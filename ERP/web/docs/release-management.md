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

## Pending Work Ledger

### 2026-06-22 전자계약/관리자 후속 작업

- 상태: 현재까지 구현된 전자계약 v2, 회사별 템플릿 관리, UCanSign API KEY 발송, 문서 다운로드, 회사별 아이디 로그인은 유지한다. 아래 항목은 다음 작업 범위로 남긴다.
- 전자계약 메뉴 정리: 사이드바/메뉴 관리의 `권리금 전자계약` 표기를 `전자계약`으로 바꾸고, 프랜차이즈 하위 메뉴 가장 하단에 배치한다.
- 개인정보 수정 정리: 개인정보 수정 화면의 `서비스 연동 > 유캔싸인` 영역은 사용자에게 노출하지 않는다. UCanSign은 내일사장 공용 API KEY 운영이므로 개인별 연결 UI가 필요 없다.
- UCanSign 운영 설정: 실서버에는 `UCANSIGN_API_KEY`, `UCANSIGN_WEBHOOK_SECRET` 등 production env를 확인하고, UCanSign 개발자 설정에는 `https://naeilsajang.vercel.app/api/electronic-contracts/webhooks/ucansign` webhook URL을 등록한다.
- 서명 상태 고도화: `내용 확인 후 서명`은 UCanSign이 문서별 서명/확인 URL을 API로 제공하는지 먼저 확인한 뒤 ERP 문서함 액션으로 연결한다.
- 서명 취소 검토: UCanSign 문서 취소 API가 제공되면 ERP에서 `서명취소` 액션을 추가하고, 취소 성공 시 ERP 문서 상태를 `canceled` 계열로 동기화한다. API 미지원이면 UCanSign 관리자 화면 이동 또는 운영 안내로 처리한다.
- 어드민 사용량: 어드민에서 회사별 전자계약 사용량을 볼 수 있게 한다. 우선 컬럼은 회사명, 전체 문서 수, 초안/발송/완료/실패/취소 건수, 최근 발송일, 최근 완료일을 검토한다.
- 어드민 사용자 아이디: 어드민 회원 및 권한 관리 표에 `login_id`를 노출해 이메일과 별도로 실제 로그인 아이디를 확인할 수 있게 한다.
- 신규 SQL: 위 후속 작업은 우선 기존 `electronic_contracts`, `profiles.login_id` 기준 조회/표시로 처리 가능하다. 추가 집계 테이블이나 audit column이 필요해지면 SQL 작성 후 사용자가 직접 Supabase SQL Editor에 등록한다.

## Current Release Baseline

- 2026-06-23
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `b224e17 feat(contracts): refine electronic contract operations`
  - 주요 기능: `전자계약` 메뉴를 프랜차이즈 하단으로 이동하고 사이드바 아이콘 추가, 개인 UCanSign 프로필 연동 UI/로그아웃 disconnect 제거, UCanSign 문서 접근 링크와 서명 요청 취소 API 액션 추가, 회사별 전자계약 사용량 관리자 패널 추가, 관리자 회원 표 `login_id` 표시, 전자계약 문서함/템플릿 상태 문구 정리, 회사 템플릿 UCanSign 연결 전 상태/버튼 문구 명확화, 미연결 초안 템플릿을 기본 화면에서 숨김, 회사 템플릿 수정 버튼 라벨 축약, 어드민 모바일 레이아웃 보정
  - dev 반영: none
  - main 반영: `ab73c56 feat(contracts): refine electronic contract operations`
  - 배포 URL: `https://naeilsajang.vercel.app` (`dpl_3oq8jstPhr4Nmd9gudRQ4rPLDPDz`, READY)
  - 검증: `npx tsx --test src/lib/company-menu-features.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/electronic-contracts/usage-summary.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/platform-document-actions.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 후속 아이콘/라벨 변경 후 `npx tsx --test src/lib/company-menu-features.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateTableState.test.mts" "src/app/(main)/contracts/electronic/_components/companyTemplateSections.test.mts"`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check` 재통과. Playwright mock QA로 `/contracts/electronic`, `/profile`, `/admin`, `/admin/users`를 확인했고 `/contracts/electronic`, `/admin`, `/admin/users` 모바일 page-level overflow 0건과 전자계약 모바일 표의 한글 단어 nowrap, `전자계약` 사이드바 아이콘, 템플릿 관리 `수정` 버튼 라벨, UCanSign 미연결 템플릿이 기본 화면에 노출되지 않는 것을 확인
  - 남은 이슈: 신규 SQL은 없다. 실제 UCanSign 운영 키로 `내용 확인 후 서명` 접근 URL과 `서명 요청 취소` 후 webhook idempotency를 운영 샘플 문서로 확인한다.
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
