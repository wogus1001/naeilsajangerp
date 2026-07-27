# Release Management

이 문서는 ERP/web 업데이트를 브랜치, 커밋, 배포 이력과 함께 관리하기 위한 운영 규칙이다. 현재 상태 요약은 `franchise-current-status.md`, 코드 구현 세부 로드맵은 `franchise-growth-roadmap.md`, QA 결과는 `franchise-dev-qa-log.md`, 로컬 worktree 운영 방식은 `../../MAC_CONTEXT.md`에 기록한다.

## Branch Policy

- 기능 작업은 `codex/<topic>-YYYYMMDD` 브랜치에서 시작한다.
- 일반 기능 작업의 기준 브랜치는 최신 `origin/dev`다. 운영 긴급 수정처럼 dev의 미완성 작업을 포함하면 안 되는 경우에만 사용자 승인 후 `origin/main`에서 hotfix 브랜치를 만든다.
- `dev`와 `main`은 배포 반영 단계에서만 사용한다.
- 배포 요청이 없으면 `dev` 또는 `main`으로 push하지 않는다.
- 실서버 배포는 사용자가 명시적으로 요청한 경우에만 `my_project_main_release` worktree에서 진행한다.
- production의 Git 기준점은 `origin/main`이다. 기능 브랜치에서 production을 직접 배포한 경우 해당 배포는 임시 릴리즈로 보고, 같은 작업에서 main 통합과 main 기준 재배포까지 완료한다.
- 기본 승격 방향은 `feature -> dev -> dev 배포·QA -> main -> production`이다. dev 전체가 운영 배포 가능한 상태일 때만 dev를 main으로 승격한다. dev에 미완성 작업이 섞였으면 검증된 커밋만 `origin/main` 기반 release 브랜치로 선별해 main PR을 만든다.
- GitHub protected branch 규칙을 우선한다. `main`과 `dev`는 PR, merge commit 없는 선형 이력, 필수 Vercel check 통과를 기본으로 하며, 직접 push나 rule bypass는 사용자가 긴급 예외를 명시한 경우에만 수행하고 우회 사유와 GitHub 경고를 릴리즈 기록에 남긴다.

## Commit Policy

- 커밋은 기능, 버그 수정, 문서 정리처럼 되돌릴 수 있는 단위로 나눈다.
- 구현과 그 구현을 검증하는 테스트는 같은 커밋에 포함한다.
- DB migration, API, UI가 한 기능을 이루면 같은 기능 커밋에 묶되, unrelated 정리는 분리한다.
- `ERP/web/handoff.md`, `.env*`, provider token, service-role key, 개인 인증 정보는 커밋하지 않는다.
- 커밋 전에는 `git diff --check`, `git status --short`, 관련 검증 결과를 확인한다.
- staged diff와 새 파일을 대상으로 비밀값 패턴을 확인한다. 키 이름만 있는 환경변수 참조는 허용하지만 실제 값, JWT, `sb_secret_` 값은 차단한다.
- 사용자 설명 방식에 영향을 주는 기능은 `/landing`과 `/demo`의 프랜차이즈 데모 시나리오, 딤드 설명 단계, 샘플 데이터 갱신 여부도 함께 확인한다.
- 직원용 보호 API를 호출하는 client 코드는 `requesterId`를 인증으로 간주하지 않고 `getApiAuthHeaders()`로 Supabase 세션 header를 붙인다. 새 보호 API를 추가하거나 인증 정책을 강화할 때는 기존 호출부를 전수 검색해 함께 점검한다.

## Update Flow

1. 작업 브랜치 생성: `git switch -c codex/<topic>-YYYYMMDD origin/dev`
2. 구현 후 로컬 검증: lint, typecheck, tests, build, browser QA 중 변경 범위에 맞는 항목을 수행한다.
3. 문서 갱신: current status, README, roadmap, QA log, MAC_CONTEXT 중 변경 사실을 알 필요가 있는 문서만 수정한다.
   - 공개 설명/사용 흐름에 영향이 있으면 데모 페이지를 함께 갱신하고, 영향이 없으면 QA 로그에 `데모 영향 없음`으로 남긴다.
4. 기능 커밋 생성: 커밋 해시와 메시지를 작업 요약에 남긴다.
5. 기능 브랜치를 dev PR로 반영하고 필수 Vercel check 통과 후 `https://naeilsajang-dev.vercel.app`에서 dev QA를 수행한다.
6. dev QA가 통과하고 dev 전체가 운영 배포 가능한지 확인한다. 가능하면 dev를 main PR로 승격하고, 미완성 작업이 있으면 검증된 커밋만 release 브랜치로 선별한다.
7. main PR과 필수 Vercel check를 통과한 뒤 production 자동 배포를 확인한다.
8. 운영 배포 후 Vercel READY 상태, 주요 URL, API 상태, known env gap을 기록한다.

## Fast Release Runbook

과거 Git 이력에서 확인된 Supabase service-role key 사고가 종결되기 전에는 `docs/supabase-service-role-incident-response.md`의 P0 체크리스트를 먼저 확인한다. 이전 키가 활성 상태라면 일반 배포보다 폐기·교체·재배포를 우선한다.

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
- 보호 API 연동 변경이면 비로그인 401뿐 아니라 로그인 세션의 조회·저장·수정·삭제 중 변경된 경로를 최소 1회 확인한다. 실계정 QA가 불가능하면 mock session/browser QA와 남은 live QA를 구분해 기록한다.
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
- `dev` 또는 `main`은 직접 push하지 않고 통합 브랜치를 push해 PR을 만든다. 긴급 직접 반영은 사용자가 rule bypass까지 명시적으로 승인한 경우에만 예외로 둔다.
- protected branch push에서 `Bypassed rule violations`, `PR required`, `merge commits prohibited`, `Required status check` 경고가 나오면 성공 여부와 무관하게 릴리즈 기록에 남기고 다음 릴리즈부터 PR/선형 이력으로 복귀한다.

### 5.1 dev 검증 후 main 승격

모든 일반 릴리즈는 dev 환경에서 먼저 검증한다. dev를 테스트용 기준점으로 사용하고, QA가 끝난 변경만 main과 production으로 승격한다.

```bash
git fetch origin --prune
git rev-list --left-right --count origin/dev...origin/<feature-branch>
git rev-list --left-right --count origin/main...origin/dev
```

1. 기능 브랜치를 최신 `origin/dev`에서 만들고 구현과 로컬 검증을 완료한다.
2. 기능 브랜치를 dev PR로 반영한다. 필수 Vercel check 통과 후 `naeilsajang-dev.vercel.app`에서 실제 업무 흐름과 회귀 항목을 QA한다. QA한 dev PR의 최종 반영 커밋을 기록한다. squash 병합이면 dev에 생성된 squash 커밋, rebase 병합이면 dev에 반영된 커밋 목록을 기준으로 하며 원래 기능 브랜치 커밋을 임의로 대신 사용하지 않는다.
3. dev QA deployment ID, 최종 반영 커밋, SQL/env 적용 상태, 남은 known risk를 릴리즈 문서에 기록한다.
4. dev 전체가 운영 배포 가능한 상태면 dev를 main PR로 승격한다. 저장소가 허용한 squash/rebase 방식으로 병합하고 `--no-ff` merge commit은 사용하지 않는다.
5. dev에 미완성 기능이 섞였으면 dev 전체를 main으로 병합하지 않는다. `origin/main` 기반 release 브랜치에 앞 단계에서 기록한 dev 최종 반영 커밋만 의존 순서대로 cherry-pick한다. 충돌 해결이 발생했거나 여러 커밋을 선별했다면 dev QA와 다른 산출물로 취급한다.
6. release 브랜치를 push해 Vercel preview의 deployment ID와 `Ready` 상태를 확인하고, 실제 승격할 변경 범위의 smoke와 회귀 QA를 다시 통과한 뒤 main PR을 만든다. release preview QA를 dev QA로 대체하지 않는다.
7. main PR의 필수 Vercel check가 통과하면 production 자동 배포를 확인하고 운영 도메인 smoke와 로그 검사를 수행한다.

dev는 다음 개발 변경을 포함할 수 있으므로 main과 항상 같은 tree일 필요는 없다. 중요한 기준은 운영 승격 대상이 dev에서 먼저 검증됐고, main에는 그 검증 범위만 들어갔는지다. protected branch 자체에는 force-push나 이력 재작성을 사용하지 않는다.

동기화 완료 기준:

```bash
git rev-list --left-right --count origin/main...main
git rev-list --left-right --count origin/dev...dev
git merge-base --is-ancestor <dev-final-commit> origin/dev
git diff --check origin/main...origin/<release-branch>
git diff --stat origin/main...origin/<release-branch>
```

- feature -> dev PR과 dev/release -> main PR URL, 필수 check 결과, dev 최종 반영 커밋, release 브랜치에 선별한 커밋 목록을 릴리즈 기록에 남긴다.
- release 브랜치를 사용했다면 main PR 전에 release preview deployment ID, 변경 경로 diff, smoke/회귀 QA 결과를 남긴다. cherry-pick 충돌 해결이나 선별 조합으로 산출물이 달라질 수 있으므로 patch-id 비교만으로 dev QA와 동등하다고 판단하지 않는다.
- main/dev upstream parity는 각각 `0 0`이어야 한다.
- main/dev worktree에는 요청 범위 밖 변경이 없어야 한다.
- dev inspect 결과는 `name=naeilsajang`, `target=preview`, `status=Ready`, alias `https://naeilsajang-dev.vercel.app`이어야 한다.
- production inspect 결과는 `name=naeilsajang`, `target=production`, `status=Ready`여야 한다.
- Vercel Git 연동은 main의 문서 전용 커밋도 production 배포를 생성할 수 있다. 릴리즈 문서는 가능한 한 배포 전에 확정하고, 배포 후 main push가 추가되면 모든 push와 required check가 끝난 뒤 운영 도메인을 다시 inspect해 최종 deployment를 확인한다.
- 배포 ID를 문서에 다시 적는 커밋이 또 자동 배포를 만드는 순환은 피한다. 수동 배포 ID는 릴리즈 기록으로 유지하고, 마지막 자동 배포 ID는 최종 보고에 남긴다.

### 5.2 긴급 production 직접 배포 복구

기능 브랜치나 로컬 소스를 production에 직접 배포하는 방식은 일반 절차가 아니다. 사용자가 긴급 예외를 명시한 경우에만 수행하고, 해당 배포는 Git 기준점이 정리될 때까지 임시 릴리즈로 본다.

1. production 직접 배포와 동시에 동일 기능 브랜치를 dev PR로 반영한다.
2. dev 환경에서 직접 배포본과 같은 기능 범위를 QA한다.
3. dev 전체가 운영 준비 상태면 dev를 main으로 승격하고, 미완성 작업이 섞였으면 검증된 커밋만 release 브랜치로 선별한다.
4. main PR과 필수 check 통과 후 main 소스로 production을 다시 배포한다.
5. 직접 배포본, dev QA deployment, 최종 main deployment를 릴리즈 기록에 함께 남긴다.

2026-07-10의 `feature -> main -> dev` 동기화는 이미 production에 직접 배포된 기능과 크게 분기된 dev를 복구하기 위한 일회성 예외다. 일반 배포 순서로 재사용하지 않는다.

### 6. 배포

배포 대상은 요청 문구로 고정한다.

- `Dev 실서버`, `dev 배포`: Vercel dev 환경과 `https://naeilsajang-dev.vercel.app` 확인.
- `실서버`, `운영`, `production`, `main 배포`: Vercel production 환경과 `https://www.fcerp.co.kr` 확인.

운영 도메인 `www.fcerp.co.kr`은 Vercel `naeilsajang` 프로젝트에 연결되어 있다. `web` 프로젝트로 배포하면 preview URL은 뜨지만 운영 도메인에는 반영되지 않는다.

운영 배포 CLI는 반드시 repo root에서 `naeilsajang` 프로젝트를 명시해 실행한다. `ERP/web` 안에서 실행하면 Vercel 프로젝트의 Root Directory 설정(`ERP/web`)이 한 번 더 붙어 `ERP/web/ERP/web` 경로 오류가 날 수 있고, repo root에서 프로젝트를 명시하지 않으면 새 Vercel 프로젝트가 생성될 수 있다.

```bash
# repo root: /Users/kimjaehyun/Documents/project/erp_workspace/my_project_main_release
npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes
npx vercel deploy --prod --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes
```

dry-run에서 다음을 먼저 확인한 뒤 실제 production 배포를 실행한다.

- `framework`가 `Next.js`로 감지된다.
- 배포 대상 프로젝트가 `naeilsajang`이다.
- `ERP/web/.env.local`, `ERP/web/.next`, `ERP/web/node_modules`, `ERP/web/.vercel`은 ignored 목록에 포함된다.
- `.env*`, provider token, service-role key, 개인 인증 정보가 업로드 목록에 없어야 한다.

실수로 다른 프로젝트가 생성되거나 다른 preview URL이 뜨면 운영 도메인과 무관하더라도 즉시 정리하고, 다시 `naeilsajang` 기준으로 배포한다.

```bash
npx vercel project list --scope team_NcWNRifDHvr7GdFW0rcpR3ym
npx vercel project remove <wrong-project-name> --scope team_NcWNRifDHvr7GdFW0rcpR3ym
```

정리 후에는 local root `.vercel/` 같은 잘못 생성된 링크와 `.gitignore` 변경이 남지 않았는지 확인한다.

```bash
git status --short
find . -maxdepth 2 -path '*/.vercel/project.json' -print
```

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

- 2026-07-30 모객 DB 유입경로 관리·필터 정리
  - 작업 브랜치: `codex/meta-business-page-targets-20260727`
  - 기능 커밋: `ca9e4dd fix(franchise): 모객 DB 필터 옵션 정리`, `8ac62d8 feat(franchise): 회사별 유입경로 항목 관리`
  - 주요 기능: 모객 DB의 불필요한 정보공개서 정렬을 제거하고 예산 필터 단위를 명확히 했다. 회사별 유입경로는 자동 수집·DB 승격 고정 항목과 직접 수정 가능한 항목으로 분리해 이름 변경·사용 중지·재사용을 지원하며, 안정 코드를 유지해 기존 리드·필터·내보내기 호환성을 보존한다.
  - 검증: 관련 테스트 35건, TypeScript, 전체 ESLint, production build 113개 페이지, `git diff --check`, 독립 디자인·한국어 UI 리뷰를 통과했다. localhost Browser 정책 제한으로 배포 후 dev/운영 smoke를 남은 QA로 둔다.
  - SQL: `supabase_franchise_lead_source_options_migration.sql` 사용자 직접 적용 필요. 미적용 상태에서는 기본 목록 조회를 유지하고 항목 변경을 비활성화한다. **SQL 등록 필요**.
  - dev/main/production: Fast Release Runbook의 PR·Vercel check·dev smoke 후 검증된 커밋만 main과 production으로 승격한다. 최종 deployment ID는 배포 결과로 보고한다.
  - 공개 `/landing`·`/demo` 영향 없음.

- 2026-07-23 로그인·가입·모객 DB QA 안정화
  - 작업 브랜치: `codex/qa-stabilization-20260723`
  - 기능 커밋: `b7ab2e9 fix(auth): 회사 검색 대표자 정보 제거`, `9191a49 fix(auth): 가입 인증 오류 재시도`, `48ba4bf fix(company): 가입 승인 내부 ID 숨김`, `f5dc4e7 fix(auth): 모바일 회사 찾기 배치 보정`과 모객 DB 표 간격 보정.
  - 주요 기능: 회사 검색의 미지원 대표자 표시 제거, 가입 JWT key 일시 오류 제한 재시도, 승인 요청 내부 UUID 숨김, 모바일 회사 찾기 배치, 모객 DB 컬럼 폭·정렬·컬럼 선택 메뉴 overflow를 정리했다.
  - 검증: 모객 DB와 로그인·가입·승인 관련 테스트 47건, TypeScript, 전체 ESLint, `git diff --check` 통과. 1652px·390px 표와 390x500 컬럼 선택 메뉴 화면 QA 및 독립 기능·한국어 UI 게이트 `PASS`. 로컬 production build 제약은 상세 QA 로그에 기록했으며 Vercel 필수 check를 최종 build gate로 사용한다.
  - SQL 및 데모: 신규 SQL 없음. 공개 `/landing`·`/demo` 흐름 영향 없음.
  - dev/main/production: 이 릴리스 요청에서 Fast Release Runbook에 따라 순차 승격하고 최종 deployment ID는 배포 결과로 보고한다.

- 2026-07-21 입점 요청 사진 업로드 긴급 보정
  - 작업 브랜치: `codex/work-intake-photo-upload-hotfix-20260721`
  - 주요 기능: 큰 사진이 Vercel `/api/upload` 본문 제한에 걸리지 않도록 Supabase Storage signed upload로 전환하고, 서버측 최종 바이트 검증과 10MB/50MB 중앙 커스텀 용량 알럿을 추가했다.
  - 운영 근거: 신고 시각의 production runtime log에서 `/api/upload` 413을 확인했다. DB 저장 후 업로드가 실패한 기존 건은 배포 후 사진 재첨부가 필요하다.
  - 검증: 직접 업로드·위조 파일 제거 테스트 8건, `tsc`, lint, build, `git diff --check`, 로컬 브라우저 용량 초과 알럿 QA 통과.
  - SQL: 신규 SQL 없음.
  - dev 반영: 점주 문의 SLA 자동화 3단계 1차와 함께 PR #26으로 통합해 `61e865f`가 됐고, dev deployment `dpl_66VJBL1yjFVjLJ2S9r5R9rNjGGL7` READY를 확인했다.
  - main 반영: 점주 문의 SLA 자동화는 SQL 적용 확인 전까지 제외하고, 사진 업로드 핫픽스만 별도 main PR과 Fast Release Runbook으로 승격한다.
  - 3단계 1차: `f0032f6 feat(franchise): 점주 문의 SLA 자동화 1차`. `supabase_franchise_owner_submission_sla_migration.sql` 적용 확인 전 운영 승격 금지. **SQL 등록 필요**.

- 2026-07-20 진행현황 삭제 긴급 보정
  - 작업 브랜치: `codex/hotfix-work-intake-delete-id-type-20260720`
  - 타입 핫픽스 커밋: `2855ea8 fix(franchise): 진행현황 삭제 RPC 타입 보정`
  - 완전삭제 커밋: `cdac47d feat(franchise): 삭제 목록 완전삭제 추가`
  - dev 반영: `b3f82fe fix: 진행현황 삭제 안정화와 완전삭제 (#23)`
  - main 반영: `2f3bfb3 fix: 진행현황 삭제 안정화와 완전삭제 (#24)`
  - 보호 규칙 예외: 사용자 승인에 따라 필수 리뷰와 사용하지 않는 legacy Netlify preview 실패 체크를 관리자 권한으로 우회했다. 실제 배포 기준인 Vercel preview check는 통과했다.
  - 주요 기능: `properties.id(text)`와 삭제 RPC UUID 입력 비교를 보정하고, 관리자 삭제 목록에 복구 불가능한 `완전삭제` API·확인 알럿·결과 알럿을 추가했다. 완전삭제는 관리자 UI뿐 아니라 서버에서 활성 세션과 `admin` 역할을 다시 검증하고, 성공한 행위자·대상 ID·처리 시각을 구조화 운영 로그로 남긴다.
  - SQL: 수정된 `supabase_franchise_work_intake_deleted_records_migration.sql`은 사용자 확인 기준 운영 DB 적용 완료다. 완전삭제 기능의 신규 SQL은 없다. **SQL 등록 완료 확인**.
  - 운영 확인: 수정 전 DELETE 503 요청이 SQL 반영 후 200으로 전환되고 삭제 목록에 이력이 저장되는 것을 production runtime log로 확인했다.
  - 임시 운영 배포: `dpl_9GUoyaDDEybDmRziDm9DbUojG6zG`, source `https://naeilsajang-5n5t3k7iw-jaehyuns-projects-b4d20c6f.vercel.app`.
  - main 자동 운영 배포: `dpl_3RBXoDdctt4QPpJNpKfxwUzKhrEM`, source `https://naeilsajang-539ogcu8h-jaehyuns-projects-b4d20c6f.vercel.app`. `https://www.fcerp.co.kr`, `https://fcerp.co.kr` alias와 주요 URL 200 응답을 확인했다.

- 2026-07-16
  - 작업 브랜치: `codex/work-intake-pagination-local-fix-20260716`, release 브랜치 `codex/work-intake-main-release-20260716`
  - 기능 커밋: `a0d5a3b feat(franchise): 진행현황 삭제 목록 상세 확인 개선`, `0729bd2 fix(franchise): 진행현황 목록과 삭제 이력 보강`, `021a079 fix(franchise): 진행현황 범위 조회 정렬 안정화`
  - 주요 기능: 진행현황의 검색·상태·기간 필터와 10건 페이지네이션, 관리자 전용 삭제 목록/상세 스냅샷, 작성자·팀장·관리자 수정/삭제 권한, 협력업체 본인 작성 건 제한을 반영했다. 삭제 이력 저장 실패 시 원본 삭제를 막고, 대량 조회는 timestamp와 `id`의 결정적 정렬로 페이지 누락을 방지한다.
  - 후속 보정: 관리자 삭제 목록의 `상세 확인`은 삭제 당시 전체 row 스냅샷을 원본 진행현황 확인 폼으로 복원해 모든 등록 항목을 읽기 전용으로 표시한다. 사이드바 활성 판정은 전체 메뉴의 최장 일치 URL을 기준으로 바꿔 `업무 > 진행현황`과 `프랜차이즈 > 모객 DB`가 동시에 선택되는 상태를 제거했다.
  - 반영 상태: 검색·삭제 이력 기반 기능은 `main` `82e3d88`까지 반영됐다. 후속 상세·메뉴 보정은 `dev` `7c1a143`에서 QA를 마쳤고, legacy URL-only 첨부의 교차 원본 연결 차단까지 포함한 `origin/main` 기반 release `c85bf36`을 main/production 승격 후보로 사용한다.
  - SQL: 사용자 확인 기준 최신 `supabase_franchise_work_intake_deleted_records_migration.sql`을 2026-07-16 운영 DB에 적용했다. **SQL 등록 완료 확인**.
  - 검증: 기반 기능 관련 테스트 29건과 후속 보정 회귀 테스트 16건, `tsc`, lint, build, `git diff --check` 통과. 후속 보정의 1440px·390px mock browser QA에서 관리자 삭제 목록의 전체 form 상세, 과거 선택값·면적 단위 보존, 메뉴 단일 활성, 읽기 전용 fieldset, 가로 overflow 0, console error 0건을 확인했다. 첨부 경로 이탈 및 legacy URL-only 첨부의 교차 원본 연결 차단, 과거 상태 원문 표시, 숨김 메뉴 활성 판정도 테스트로 검증했다.
  - 배포: dev preview `dpl_FEWEFHzvnDbD3kehbD4tQQkMQsHa`와 release `c85bf36` preview `dpl_5b7MS7Cikc1k4odMVWDs6Qui1eE6`가 `Ready`다. main PR과 production 배포는 최종 review gate 통과 후 진행한다.
  - 남은 이슈: 운영 실계정으로 역할별 수정·삭제 권한과 삭제 이력 persistence를 확인한다.

- 2026-07-13
  - 작업 브랜치: `codex/progress-request-map-gallery-20260713`
  - 기능 커밋: 이번 입점 요청 상세 지도·사진 탐색 커밋
  - 주요 기능: 진행현황의 입점 요청 상세에서 등록 주소를 Kakao 지도와 외부 지도 링크로 연결하고, 첨부 이미지를 큰 화면·썸네일·이전/다음 버튼으로 탐색한다. 임대 조건 요약과 금액 입력에는 천 단위 쉼표를 표시한다.
  - dev/main 반영: protected branch PR과 필수 Vercel check를 거쳐 반영한다. dev 고유 커밋을 main 전체 병합하지 않고 이번 기능 패치만 선형 반영한다.
  - 배포: main 반영 후 `my_project_main_release`에서 `naeilsajang` production을 배포하고 `www.fcerp.co.kr`의 Kakao 지도 타일·마커와 운영 도메인 READY를 확인한다.
  - 검증: 관련 테스트 17건, `tsc`, lint, build, diff check를 통과했다. Playwright mock으로 사진 좌우 이동, 쉼표 표기, 1440px·390px overflow 0건을 확인했다. 로컬 Kakao SDK는 허용 도메인 제한으로 fallback을 확인했으며 실제 지도는 운영 배포 후 확인한다.
  - SQL: 신규 SQL 없음.

- 2026-07-10
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `955f42b feat(franchise): 공통 일정 결재 기반 추가`
  - main 통합: `12ba4fb merge: 공통 일정과 점주 소통 운영 반영`
  - 주요 기능: 점주 소통 후속 고도화와 공통 일정·결재 MVP를 main에 통합했다. 점주 체크리스트는 발송 이력별 목록과 가맹점별 현황을 유지하고, 공지 첨부/삭제 및 알림톡 연동을 포함한다. `/schedule`은 기존 `점포개발 일정` 탭을 유지하면서 `전사 업무·결재` 탭을 추가한다.
  - SQL: `supabase_franchise_approval_calendar_migration.sql` 운영 DB 적용 완료 확인. dev/production Supabase가 분리된 환경은 각 환경 적용 여부를 별도 확인한다.
  - 직접 배포 기록: 기능 브랜치 기준 `dpl_HZGEyoWQ6835zzpr9Y5CQbvytrVw` READY 확인 후, main `b6d4559` 기준 `dpl_7am4D2Devjn3EQhGE8ZYhUQVekNW`를 `naeilsajang` production에 재배포했다.
  - 브랜치 동기화: `origin/main`은 `b6d4559`, `origin/dev`는 `3793d08`이며 기능 커밋의 main 포함, main의 dev 포함, 양쪽 upstream parity `0 0`을 확인했다.
  - 검증: main에서 점주 포털·공통 workflow·슈퍼바이징·지도 유틸 51건, dev 역병합에서 관련 83건, `tsc`, lint, build, staged diff check를 통과했다. production inspect는 `name=naeilsajang`, `target=production`, `status=Ready`, 운영 도메인 aliases를 확인했다.
  - 남은 이슈: 인증 세션으로 `/schedule`의 전사 업무·결재 탭과 SV 보고서 제출/승인/반려 데이터 persistence를 live QA한다.

- 2026-07-09
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 공통 일정/결재 기반 커밋 예정
  - 주요 기능: 기존 `/schedule`의 점포개발 일정관리는 `점포개발 일정` 탭으로 유지하고, `전사 업무·결재` 탭을 추가해 오늘 처리, 승인 대기, 지연 업무, 이번주 일정 큐를 분리했다. 공통 workflow schedule 필드와 내부 보고/결재 테이블을 추가하고, `/api/schedules`의 source 기반 upsert/완료 처리, `/api/franchise-approvals/*` 템플릿/문서/액션 API, 슈퍼바이징 방문/점검보고서 일정·결재 동기화 기반을 연결했다. 결재 알림 URL(`/schedule?approvalDocumentId=...`)은 전사 업무·결재 탭으로 바로 진입해 관련 결재 일정을 강조한다. 코드리뷰 후 결재 source ID 서버 생성, 작성자/결재자 분리, 결재자/승인 권한 제한, `approval-document` 일정 직접 수정·삭제·완료 차단, source upsert unique 충돌 회복, workflow side-effect 격리, 결재 문서/이벤트 server-only RLS 보강을 반영했다.
  - 신규 SQL: `supabase_franchise_approval_calendar_migration.sql`은 `schedules` workflow 컬럼을 확장하고 `approval_templates`, `approval_documents`, `approval_document_events`를 추가한다. 이 릴리즈 기록 후 사용자 확인 기준 2026-07-10 운영 DB 적용을 완료했다. **SQL 등록 완료 확인**.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-workflow.test.mts src/lib/franchise-supervision.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. `/schedule` 실제 탭 클릭 QA는 인증 세션과 SQL 적용이 필요해 live QA로 남긴다.
  - 남은 이슈: SQL 적용 후 인증 세션으로 `/schedule` 전사 업무·결재 탭, 결재 알림 딥링크, SV 보고서 제출/승인/반려 알림과 일정 동기화를 live QA한다.
- 2026-07-09
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점주 공지 첨부와 점주 포털 목록 보강 커밋 예정
  - 주요 기능: 본사 `가맹 운영 > 점주 소통 > 공지/공문`에서 이미지, PDF, 문서 파일을 첨부해 발행하고, 점주 `/owner/notices`에서 파일명과 용량을 확인한 뒤 다운로드할 수 있게 했다. 공지 삭제 시 점주 포털 목록에서도 사라지고, 첨부 Storage 파일과 읽음 기록도 함께 정리한다. 점주 포털의 운영 체크리스트와 제출 이력은 기본 목록을 간소화하고, 상세 확인이 필요한 내용은 펼쳐서 확인하는 흐름으로 정리했다.
  - 신규 SQL: 기존 점주 포털 SQL 적용 DB에는 `supabase_franchise_owner_notice_attachments_migration.sql` 추가 적용이 필요하다. 이 SQL은 `franchise_owner_notices.attachments` JSON 컬럼을 추가한다. **SQL 등록 필요**.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` / `https://fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3137`에서 본사 공지 첨부 선택, 발행 확인 모달, 발행 완료 알럿, 본사 읽음 현황 첨부 링크, 점주 모바일 `/owner/notices` 다운로드 링크, 공지 삭제 확인 모달과 삭제 완료 알럿을 확인했다. `attachments` 컬럼이 없는 기존 응답 기준 본사 공지 목록과 점주 `/owner/opening-tasks` fallback 렌더도 확인했다.
  - 남은 이슈: 운영 SQL 적용 후 실계정으로 공지 첨부 업로드, 점주 다운로드, 공지 삭제 시 점주 포털 미노출과 Storage 정리를 live QA한다.
- 2026-07-09
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `032151c feat(franchise): 점주 체크리스트 공지형 목록화`
  - 주요 기능: 점주 포털 `운영 체크리스트` 기본 화면을 공지/공문처럼 발송 1건 목록 카드와 `총 1건` 페이지 바 형태로 재구성했다. 6개 세부 항목은 기본 화면에 바로 나열하지 않고 `항목별 완료 요청 보기`를 펼쳤을 때만 표시한다. 본사 `점주 소통 > 체크리스트`에서는 `체크리스트 발송 6개 항목`과 `발송 항목 6개` 노출을 제거하고, `발송 현황` 상세에서 가맹점별 완료 요청 상태를 한 줄에 여러 가맹점이 표시되는 그리드로 보정했다. 상태 배지는 `.locationItem` 공용 텍스트 규칙에 밀리지 않도록 세로 중앙 정렬을 고정했다.
  - 신규 SQL: 없음.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_3DPHWePbgCxnneVpWKbx1nV4DvBu`, READY; source `https://naeilsajang-cmgix9fwa-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. `next start -p 3160` production build에서 Playwright mock 세션으로 `/owner/opening-tasks`와 `/dashboard/franchise-operations/owner-portal`을 확인했다. 점주 화면은 접힌 기본 목록과 펼친 6개 완료 요청 행을 표시하고, 본사 발송 현황 상세는 가맹점 카드 9개가 데스크톱 5열로 줄바꿈되며, 상태 배지는 `display:flex`, `align-items:center`, `height:30px`로 중앙 정렬됐다. desktop horizontal overflow 0건, console error 0건. QA 증거: `/tmp/fcerp-owner-checklist-release-qa-20260709/result.json`.
  - 배포 검증: `npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes`에서 `framework=Next.js`, project `naeilsajang`, `.env.local`, `.omo`, `ERP/web/handoff.md`, `.next`, `node_modules` 제외를 확인했다. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/owner/opening-tasks`, `curl -I -L https://www.fcerp.co.kr/dashboard/franchise-operations/owner-portal`, `curl -I -L https://fcerp.co.kr/owner/opening-tasks`는 200 응답이었다.
  - 남은 이슈: 운영 배포 후 실계정으로 운영 체크리스트 전체/복수 운영점 발송, 점주 완료 요청, 본사 발송 현황의 완료/미완료 집계 persistence를 확인한다.
- 2026-07-09
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `f8d3ee8 개선 점주포털 단축 링크와 체크리스트 구성`
  - 주요 기능: 점주 포털 회사별 로그인 링크를 `/owner/login/{companyId}` 단축 경로로 바꾸고, 점주 로그인 화면에서 회사명 입력 필드를 숨겼다. 기존 `?companyId=`/`?company=` 쿼리 링크는 호환 유지한다. 본사 `점주 소통 > 점주 계정 설정`에서 회사별 점주 포털 링크를 복사할 수 있고, 점주 운영 체크리스트는 전체 가맹점 또는 선택한 복수 운영점에 한 번에 저장할 수 있게 정리했다.
  - 신규 SQL: 없음.
  - dev 반영: none
  - main 반영: `f264eed 개선 점주포털 단축 링크와 체크리스트 구성`, `f8ffa12 문서 점주포털 단축 링크 배포 기록`, `86faac9 보정 점주포털 체크리스트 릴리즈 연결`
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_4WrjSSxde5Ggxq8jMjpFsYmbpTot`, READY; source `https://naeilsajang-njwnwme6n-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: 기능 브랜치와 release worktree에서 `git diff --check`, `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build` 통과. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/owner/login/92924bd6-b2a1-49bb-844b-05eabcc51bbf`와 `curl -I -L https://www.fcerp.co.kr/login`는 200 응답이었다.
  - 남은 이슈: 실서버 로그인 세션에서 점주 계정 설정의 링크 복사, 전용 링크 로그인, 운영 체크리스트 전체/복수 운영점 저장 흐름을 live QA한다.
- 2026-07-08
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점주 포털 회사별 로그인 및 운영 체크리스트 보정 커밋 예정
  - 주요 기능: 점주 로그인 API를 `회사명 + 아이디 + 비밀번호` 기준으로 바꿔 회사별로 발급한 점주 계정만 조회한다. 본사 `점주 소통`은 공지/공문, 체크리스트, 제출 처리, 점주 계정 설정으로 분리하고, 점주용 운영 체크리스트는 `franchise_locations.data.ownerPortalChecklist`에 저장해 오픈 준비 프로젝트 체크리스트와 분리한다. 점주 화면은 이미 완료 요청한 체크리스트 항목을 다시 요청하지 못하게 막고, 구비서류 조회/저장 호출은 세션 인증 헤더로 `requesterId is required` 회귀를 방지한다.
  - 신규 SQL: 기존 점주 포털 SQL 적용 DB에는 `supabase_franchise_owner_company_login_scope.sql` 추가 적용이 필요하다. 이 SQL은 전역 점주 로그인 ID unique 제약을 회사별 unique 제약으로 바꾼다. **SQL 등록 필요**.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/franchise-owner-auth.test.mts src/lib/franchise-owner-portal.test.mts src/lib/franchise-lead-contract-checklist.test.mts` 20건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright로 로컬 `http://localhost:3137/owner/login` 모바일 390px와 `내일 / admin` 본사 세션의 `/dashboard/franchise-operations/owner-portal` 탭 구성을 확인했다.
  - 남은 이슈: 운영 SQL 적용 후 회사별 같은 점주 ID 발급, 회사명 오입력 로그인 차단, 운영 체크리스트 저장/완료 요청/보관 persistence를 live QA한다.
- 2026-07-07
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `cff58ee 수정 슈퍼바이징 보고서 이력 세션 분리`
  - 주요 기능: `가맹 운영 > 슈퍼바이징 > 승인·시정요청`에서 보고서 검토 화면을 `승인 대기`, `승인 완료 보관함`, `반려 보고서` 세션으로 분리했다. 전체 처리 이력은 제거하고, `보고서 확인` 상세 화면에서 해당 보고서의 제출/승인/반려/시정요청 이력만 확인한다.
  - 신규 SQL: 없음.
  - dev 반영: none
  - main 반영: Vercel production 배포 완료
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_9F5AmwUrYQnumoUDYsSHx4ApqtL1`, READY; source `https://naeilsajang-be4b3ulzs-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. Playwright로 로컬 `http://localhost:3000`에서 `내일 / 관리자` 세션으로 `슈퍼바이징 > 승인·시정요청` 진입, 세션 탭 분리, 전역 이력 미노출, 승인 완료 보관함과 보고서별 이력 표시를 확인했다.
  - 배포 검증: `npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes`에서 `framework=Next.js`, project `naeilsajang`, `.env.local`, `.omo`, `ERP/web/handoff.md`, `.next`, `node_modules` 제외를 확인했다. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/dashboard/franchise-operations`는 200 응답이었다.
  - 남은 이슈: 운영 배포 후 실서버 세션에서 동일 화면의 승인 완료 보관함과 보고서별 이력 표시를 live QA한다.
- 2026-07-07
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `6bc9455 개선 슈퍼바이징 AI 보고서 출력 정리`
  - 주요 기능: 슈퍼바이징 점검 보고서 AI 결과에서 `점주 의견 기준`, `직원 진술 기준` 같은 출처 접두어가 항목별 메모에 반복되지 않게 프롬프트와 응답 정규화를 보강했다. AI 종합 요약은 보고서 특이사항에 `종합 요약`으로 보존하고, PDF/인쇄의 `조치 필요 항목`은 상태와 항목명 요약만 보여주며 상세 메모는 `전체 점검 내역` 표에만 남긴다.
  - 신규 SQL: 없음.
  - dev 반영: none
  - main 반영: Vercel production 배포 완료
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_4keMEHZv2Qd4H2MwAY6QNrYiqmnD`, READY; source `https://naeilsajang-5wckwi1um-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx tsx --test src/lib/franchise-supervision-ai-summary.test.mts src/lib/franchise-supervision.test.mts` 30건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright로 로컬 `http://localhost:3000`에서 `내일 / admin` 로그인 후 `가맹 운영 > 슈퍼바이징 > 점검 보고서 > 보고서 작성` 진입, AI 패널 모델명 미노출, PDF/인쇄 팝업의 조치 필요 항목/전체 점검 내역 분리 표시를 확인했다.
  - 배포 검증: `npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes`에서 `framework=Next.js`, project `naeilsajang`, `.env.local`, `.omo`, `ERP/web/handoff.md`, `.next`, `node_modules` 제외를 확인했다. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/dashboard/franchise-operations`는 200 응답이었다.
  - 남은 이슈: 실서버 로그인 세션에서 실제 운영 데이터로 AI 정리 적용 후 PDF 저장/인쇄를 한 번 더 확인한다.
- 2026-07-07
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 보안 감사 후속/인증 헤더 회귀 보정 커밋 예정
  - 주요 기능: Meta 연동 및 후보지 연결 API 호출에 Supabase 세션 인증 헤더를 붙여 모객 DB의 `requesterId is required` 콘솔 오류를 보정했다. 전자계약 권한의 잘못된 `super_manager` 참조를 실제 역할 `sub_manager`로 수정하고, UCanSign 미연결 계정의 대시보드 진입 시 예상 가능한 미연결 로그를 error로 반복 출력하지 않게 했다. 보안 감사 SQL-only 항목은 `supabase_platform_audit_required_sql_2026_07_07.sql`에 정리했다.
  - 신규 SQL: `share_links.revoked_at`, `system_settings`, 중복 방지 unique index 적용용 SQL이 있다. 사용자가 Supabase SQL Editor에서 직접 적용한다. **SQL 등록 필요**.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/electronic-contracts/document-permissions.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `git diff --check` 통과.
  - 남은 이슈: 운영 배포 후 모객 DB Meta 연동/후보지 연결 콘솔 오류 재발 여부, UCanSign 미연결 계정 대시보드 로그, 같은 회사 `sub_manager` 전자계약 접근을 live QA한다.
- 2026-07-03
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 가맹계약 가능 상태 알림톡 변수 보정 커밋 예정
  - 주요 기능: `가맹계약 가능 상태 안내` 알림톡의 승인 템플릿 변수 차이를 흡수하도록 `후보자명`, `예비창업자명`, `확인일`, `수령확인일`, `수령일`, `계약가능일`, `계약가능예정일`, `가능일`을 모두 채운다. 계약 가능 알림 후보 생성 시 정보공개서 수령확인일과 발송일을 함께 전달해 운영 템플릿에서 날짜 변수가 비지 않게 한다.
  - 신규 SQL: 없음. 기존 정보공개서 발송 이력, 알림 후보 생성 로직, 알림톡 운영 테이블을 사용한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/franchise-notifications.test.mts` 11건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
  - 남은 이슈: 운영 배포 후 내일 회사 admin 계정 테스트 데이터로 `franchise_contract_eligible` 알림톡을 다시 발송해 카카오 메시지와 `alimtalk_send_logs.variables`에 후보자명, 수령확인일, 계약가능일이 표시되는지 live QA한다.
- 2026-07-03
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 정보공개서 수령 확인 알림톡 변수/미확인 큐 보정 커밋 예정
  - 주요 기능: `정보공개서 수령 확인 완료` 알림톡의 승인 템플릿 변수 차이를 흡수하도록 `확인일`, `수령확인일`, `수령일`, `계약가능일`을 모두 채운다. 메일 열람 추정은 법적 수령 신호로 쓰지 않고 참고값으로 유지하며, 발송 또는 열람 추정 후 1일 이상 수령 확인이 없으면 내부 `정보공개서 수령 미확인` 업무 큐를 생성한다.
  - 신규 SQL: 없음. 기존 정보공개서 발송 이력, 알림 후보 생성 로직, 알림톡 운영 테이블을 사용한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/franchise-notifications.test.mts src/lib/alimtalk-send-support.test.mts src/lib/alimtalk-operations.test.mts` 15건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. 로컬 스모크로 `disclosure-unconfirmed` 내부 큐 생성과 `disclosure_confirmed` 변수 매핑을 확인했다.
  - 남은 이슈: 운영에서 실제 수령 확인 버튼 클릭 후 카카오 알림톡 변수 표시와 `alimtalk_send_logs` payload를 live QA한다. 미확인 큐는 발송 후 1일 이상 지난 미확인 데이터로 점검한다.
- 2026-07-03
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `43d7ff2 fix(admin): reorder management menu cards`, `3c44d52 feat(franchise): connect disclosure email alimtalk`
  - 주요 기능: 어드민 관리 홈의 관리 메뉴 순서를 `회원 및 권한 관리`, `회사별 메뉴 관리`, `프랜차이즈 인입 관리`, `전자계약 관리`, `알림톡 운영 관리`, `시스템 설정` 순서로 정리했다. 정보공개서 Gmail 발송 폼에는 필수 `후보자명` 입력과 발송 전 `정보공개서 확인 안내` 알림톡 목업을 추가했다. Gmail 발송 성공 시 `recipientName`, 브랜드명, 후보자 휴대폰을 기준으로 `disclosure_email_sent` 알림톡을 발송하고 `alimtalk_send_logs`에 결과를 남긴다. 수령 확인 버튼 클릭 시 기존 `disclosure_confirmed` 알림톡과 14일 숙고기간 감사 기록을 유지한다.
  - 신규 SQL: 없음. 기존 `supabase_franchise_alimtalk_operations_migration.sql`의 알림톡 운영 테이블과 기존 정보공개서 발송 테이블을 사용한다.
  - dev 반영: none
  - main 반영: Vercel production 배포 완료
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_4Sj1Um221XT4u7i3ULtpEKjkQ4HG`, READY; source `https://naeilsajang-ob5zwywkf-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx tsx --test src/lib/franchise-notifications.test.mts` 9건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. 로컬 스모크로 정보공개서 발송 API의 후보자명 필수 검증, 알림톡 미리보기 변수, `disclosure_email_sent`/`disclosure_confirmed` 변수 매핑을 확인했다.
  - 배포 검증: `npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes`에서 `framework=Next.js`, project `naeilsajang`, `.env.local`, `.omo`, `ERP/web/handoff.md`, `.next`, `node_modules` 제외를 확인했다. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/admin/alimtalk`는 200 응답이었다.
  - 남은 이슈: 운영 Google OAuth 승인/연결 상태에서 실제 Gmail 발송 후 후보자 휴대폰으로 `정보공개서 확인 안내` 알림톡 도착과 발송 로그 성공 기록을 live QA한다.
- 2026-07-02
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 알림톡 승인 템플릿 발송 훅 커밋 예정
  - 주요 기능: 승인된 알림톡 템플릿을 회원가입 승인 요청/완료, 정보공개서 수령 확인 완료, 가맹계약 가능 상태, 업체 계약 만료 D-30/D-7 업무 이벤트에 연결한다. 검수중인 정보공개서 확인 안내 템플릿은 승인 전까지 발송 훅에서 제외한다. 각 발송은 시나리오 ON, 템플릿 승인/사용, 회사 설정, 월 한도, Solapi env를 확인하고 성공/실패/차단 결과를 `alimtalk_send_logs`에 남긴다.
  - 신규 SQL: 없음. 기존 `supabase_franchise_alimtalk_operations_migration.sql`의 `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`를 사용한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/alimtalk-send-support.test.mts src/lib/alimtalk-operations.test.mts src/lib/solapi-notifications.test.mts src/lib/franchise-notifications.test.mts` 19건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
  - 남은 이슈: 운영 admin에서 승인 템플릿 ID, channel ID, 시나리오 ON, 회사 설정을 저장한 뒤 각 이벤트별 실발송/로그를 live QA한다.
- 2026-07-02
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 입점요청/예비 창업자 등록 진행현황 이동 커밋 예정
  - 주요 기능: 입점요청과 예비 창업자 등록 저장 성공 후 작성 페이지에 머물지 않고 진행현황으로 이동한다. 입점요청은 `?tab=properties`, 예비 창업자 등록은 `?tab=matchingRequests`로 이동해 해당 유형 탭을 바로 연다.
  - 신규 SQL: 없음
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright mock 세션에서 입점요청/예비 창업자 등록 저장 후 진행현황 각 탭 이동을 확인했다.
  - 남은 이슈: 운영 배포 후 실계정에서 두 등록 흐름의 저장 후 이동을 live QA한다.
- 2026-07-02
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 입점요청/예비 창업자 등록 Solapi 문자 알림 커밋 예정
  - 주요 기능: 입점요청 등록 성공 시 `[ERP] 입점요청 등록`, 예비 창업자 등록 성공 시 `[ERP] 예비창업자 등록` 문자를 Solapi로 발송한다. 수신 번호는 `FRANCHISE_INTAKE_ALERT_PHONES`를 우선 사용하고, 값이 없으면 `SIGNUP_ADMIN_ALERT_PHONES`로 fallback 한다. 문자 발송 실패는 서버 로그만 남기고 등록 흐름은 성공 처리한다.
  - 신규 SQL: 없음
  - 운영 env: `SOLAPI_SMS_ENABLED=true`, `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_PHONE`, `FRANCHISE_INTAKE_ALERT_PHONES` 필요. 인입 알림 전용 수신 번호를 분리하지 않을 경우 기존 `SIGNUP_ADMIN_ALERT_PHONES`를 사용한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: 운영 Vercel Production env 이름 존재 확인. `npx tsx --test src/lib/solapi-notifications.test.mts` 9건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
  - 남은 이슈: 운영 Vercel Production env 이름 존재를 확인했다. 배포 후 실서버에서 입점요청/예비 창업자 등록을 1건씩 생성해 실제 문자 수신을 확인한다.
- 2026-07-02
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 진행현황 확인/수정 첨부 열람 보강 커밋 예정
  - 주요 기능: 입점요청 등록에서 `현재 상태=영업중`일 때 `현재 영업중 상호/매장명`을 저장한다. 진행현황의 입점요청/예비 창업자 등록 액션은 `확인/수정`으로 통일했고, 모달 상단에서 등록 요약과 첨부 자료를 확인한 뒤 기존 수정 폼을 사용할 수 있게 했다. 신규 첨부는 Storage 업로드 후 이미지 썸네일/다운로드, PDF/문서 다운로드를 제공하며, URL 없이 파일명/용량만 남은 과거 첨부는 `재첨부 필요`로 안내한다.
  - 신규 SQL: 없음. 기존 `properties.data` JSON과 `/api/upload` Storage 경로를 사용한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsx --test src/lib/work-intake-display.test.mts src/lib/franchise-property-registration-uploads.test.mts src/lib/franchise-property-registration.test.mts src/lib/franchise-file-attachments.test.mts 'src/app/(main)/dashboard/franchise-leads/work-intake/requests.test.mts'` 14건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright mock 세션에서 `/dashboard/franchise-leads/work-intake` 확인/수정 모달의 새 PDF 첨부 다운로드 버튼 visible, `blob:` 링크, 파일명 download 속성을 확인했다.
  - 남은 이슈: 과거에 `publicUrl`/Storage 경로 없이 메타데이터만 저장된 첨부는 원본 파일이 없어 다운로드할 수 없으며, 화면에서 `재첨부 필요`로 안내한다. 운영 배포 후 실계정으로 영업중 매장명, 이미지 썸네일, PDF 다운로드, 예비 창업자 등록 확인/수정 모달을 live QA한다.
- 2026-07-02
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 알림톡 운영 관리 커밋 예정
  - 주요 기능: `/admin/alimtalk` 알림톡 운영 관리 페이지를 추가했다. 어드민은 회사별 월간 발송량, 월 한도/주의 기준, 템플릿 검수 상태와 SOLAPI template/channel ID, 시나리오 ON/OFF, 최근 발송 로그를 관리한다. 시나리오 관리는 전체 발송 플로우 보드와 개별 시나리오 카드로 구성한다. 1차 대상은 사용자가 신청 중인 1,2,3,4,5,8번 템플릿만 포함한다.
  - 후속 계획: 2차는 승인 템플릿을 회원가입, 정보공개서, 계약 가능일, 업체계약 만료 이벤트의 실제 발송 훅에 연결하고 `alimtalk_send_logs`에 성공/실패/fallback을 남긴다. 3차는 사용량 대시보드, 실패 분석, 수동 재발송, provider 상태 점검, 공용 달력/업체계약 만료 큐, 비용/과금 리포트를 검토한다.
  - 신규 SQL: `supabase_franchise_alimtalk_operations_migration.sql` 추가. `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`와 6개 기본 seed를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/alimtalk-operations.test.mts src/app/admin/alimtalk/alimtalkOperationsTableState.test.mts` 5건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3126/admin/alimtalk`에서 Playwright mock API로 desktop 1280px/mobile 390px 렌더링, 탭 전환, 전체 발송 플로우 보드, 개별 시나리오 카드, 로그 표시, horizontal overflow 0건을 확인했다.
  - 남은 이슈: SQL 적용 전에는 `/admin/alimtalk`이 SQL 적용 안내를 보여준다. SQL 적용 후 실계정으로 템플릿/시나리오/회사 설정 저장과 발송 로그 조회를 live QA한다.
- 2026-07-02
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `feat(franchise): split vendor contract registration flow`
  - 주요 기능: `/contracts/vendor` 업체 계약함의 좌측 상시 등록 폼을 제거하고, 헤더 `계약 등록` 버튼으로 `/contracts/vendor/register` 전용 등록 페이지에 진입하도록 변경했다. 계약 목록의 `수정`은 동일 페이지에 `contractId` query로 진입해 기존 계약 값을 불러온다.
  - 신규 SQL: 없음
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_CfPurRkjSkWModDNQ9KzAbSyYLVZ`, READY; source `https://naeilsajang-nqdt3v6sc-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx tsx --test src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts src/lib/franchise-vendor-contracts.test.mts` 17건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3120`에서 Playwright mock 세션으로 목록 화면 상시 등록 폼 제거, `계약 등록` 버튼 이동, `목록으로` 복귀, `수정` 버튼의 `contractId` 기반 수정 페이지 이동, 기존 계약명 로딩, horizontal overflow 0건을 확인했다. Vercel `naeilsajang` 프로젝트의 Node.js Version을 20.x에서 24.x로 정렬했고, 재배포 전 dry-run에서 `framework=Next.js`, `.omo`, `ERP/web/.env.local`, `ERP/web/.next`, `ERP/web/node_modules`, `ERP/web/.vercel`, `ERP/web/handoff.md` 제외를 확인했다. 운영 배포 후 `npx vercel project inspect naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `Node.js Version=24.x`, `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/contracts/vendor`, `curl -I -L https://www.fcerp.co.kr/contracts/vendor/register`는 200 응답이었다.
  - 남은 이슈: 운영 배포 후 실계정에서 신규 등록, 수정 진입, 목록 복귀 동선을 확인한다.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 업체 마스터 등록/계약 상세 배치 보정 커밋 예정
  - 주요 기능: `/dashboard/franchise-vendors` 업체 목록 안에 `업체 생성` 버튼을 추가했다. 버튼을 누르면 같은 목록 섹션 안에서 업체 생성/수정 폼이 열리고, `franchise_vendors` 업체 마스터와 업체 계약함 집계가 `vendor_id` 우선, 업체명 fallback 방식으로 병합된다. 계약이 없는 업체도 목록에 표시되며, 기존 계약 기반 업체는 `계약 보기`로 계약함 검색 상태에 연결된다. `/contracts/vendor`의 계약 상세 패널은 화면 하단 전체 폭으로 떨어지지 않고 상단 작업영역 우측에 표시되도록 배치했다.
  - 신규 SQL: `supabase_franchise_vendors_migration.sql` 추가. 회사 범위 업체 마스터, 담당자/연락처/이메일/사업자번호/거래상태/메모, 회사별 업체명 unique index, RLS를 포함한다. `supabase_franchise_vendor_contracts_migration.sql`은 업체 마스터 연동용 `vendor_id` 컬럼/인덱스/FK가 추가됐다. 사용자 확인 기준 Supabase SQL Editor 등록 완료.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts` 5건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과. 파일별 pure LOC는 신규/수정 TSX/CSS 모두 250줄 이하로 확인했다.
  - 남은 이슈: 실제 계정에서 업체 생성/수정, 계약 없는 업체 표시, 업체 선택 계약의 ID 기반 병합, 기존 직접입력 계약의 업체명 fallback 병합, 계약 상세 우측 배치 live QA를 진행한다.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 업체 계약함 2차-2A 커밋 예정
  - 주요 기능: `/contracts/vendor` 업체 계약함에 만료 업무 큐, 계약 상세 패널, 갱신/종료 처리, 처리 이력 조회를 추가했다. 갱신은 기존 계약을 `renewed`로 닫고 새 active 계약을 복사 생성하며, 종료는 사유를 남기고 `terminated`로 처리한다. 처리 이력은 신규 `franchise_vendor_contract_events` 테이블에 회사 범위로 저장한다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-vendor-contracts.test.mts src/app/(main)/contracts/vendor/vendorContractsModel.test.mts` 11건 통과. 확장 회귀 `npx tsx --test src/lib/franchise-vendor-contracts.test.mts src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/lib/franchise-notifications.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts` 24건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3108`에서 `/login`, `/contracts/vendor` HTTP 200 응답을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
  - 남은 이슈: 사용자가 신규 SQL 적용 완료를 알렸다. 실계정으로 갱신/종료 처리, 새 계약 생성, 처리 이력 최신순 표시, 만료 업무 큐 카운트/필터를 live QA한다. 로컬 샘플 데이터 주입은 현재 `.env.local`이 hosted Supabase를 가리켜 사용자 확인 전까지 보류한다.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 업체 관리 별도 메뉴 커밋 예정
  - 주요 기능: `/dashboard/franchise-vendors` 업체 관리를 프랜차이즈 별도 메뉴로 추가했다. 신규 SQL 없이 업체 계약함 데이터를 업체명 기준으로 집계해 등록 업체 수, 전체 계약, 진행 계약, 관리 필요 업체, 업체별 다음 만료 계약과 최근 메모를 보여준다. 업체 목록의 `계약 보기`는 업체 계약함 검색 query로 연결된다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/company-menu-features.test.mts src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/lib/franchise-vendor-contracts.test.mts src/lib/franchise-notifications.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts` 39건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. production 서버 `http://localhost:3110/dashboard/franchise-vendors`에서 Playwright mock 데이터로 desktop 1280px/mobile 390px 렌더링을 확인했고, 업체 관리 본문 텍스트, 샘플 업체 3개, 관리 필요 업체 요약, horizontal overflow 0, console/page error 0건을 확인했다.
  - 남은 이슈: hosted Supabase 샘플 주입 여부 사용자 확인 필요.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 업체 계약함 MVP 커밋
  - 주요 기능: 프랜차이즈 메뉴에 `/contracts/vendor` 업체 계약함을 추가했다. 회사 범위로 물류/식자재/인테리어/마케팅/임대차/기타 업체 계약을 등록하고, 파일 업로드 문서 또는 같은 회사 전자계약 문서를 연결한다. 업로드 문서는 `property-documents/franchise-vendor-contracts/<company>/<contract>/...`에 저장하고 signed URL로 열람한다. 계약 만료 D-30/D-7 알림은 기존 프랜차이즈 인앱 알림으로 계약 담당자와 회사 팀장에게 생성한다. 증거 묶음 PDF 출력은 이번 범위에서 제외했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-vendor-contracts.test.mts src/lib/franchise-notifications.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts src/lib/company-menu-features.test.mts` 28건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
  - 남은 이슈: 사용자 확인 기준 신규 SQL `supabase_franchise_vendor_contracts_migration.sql`은 Supabase SQL Editor 등록 완료. 실계정으로 신규 등록, 업로드 문서 열람, 전자계약 연결, 수정/삭제, 만료 알림 sync를 live QA한다.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `a98c692 feat(franchise): add meeting report market map`
  - 주요 기능: 출점 검토 리포트 다이얼로그에 Kakao 상권 지도 섹션을 추가했다. 후보지 좌표/주소 기반으로 마커와 300m/500m/1km 반경을 표시하고, 선택 반경은 후보지별 `meetingTool.marketMap.radiusMeters`에 저장한다. 지도에는 확대/축소, 일반/스카이뷰/지적편집도 전환, 거리재기, 면적재기 도구를 제공한다. 측정 모드와 클릭 점은 후보지 `meetingTool.marketMap`에 저장해 저장/버전 불러오기 후에도 유지한다. PDF/인쇄 출력물은 Kakao SDK를 새 출력창에서 로드해 지도 타일, 마커, 반경 원, 측정 선·면·점을 표시하고, 별도 좌표 기준 박스는 출력하지 않는다. 저장 좌표가 없는 후보지도 다이얼로그 지도에서 확인된 지오코딩 중심 좌표를 출력 HTML에 전달한다. 출력물의 상권분석·목표매출 근거는 비용 구조 아래에 배치하고, 인쇄 카드가 페이지 경계에서 잘리지 않도록 보강했다. 회사 공용 프리셋에는 포함하지 않고, 프리셋 적용 시 기존 후보지 반경은 유지한다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 Fast Release Runbook 기준으로 진행
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인
  - 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts` 17건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 dev 서버 `http://localhost:3000/demo` 접근과 데모 로그인은 확인했으나, MCP Playwright에서는 데모 투어 레이어가 닫힘 클릭 후에도 pointer를 계속 가로채 출점 후보지 리포트 다이얼로그까지 실클릭 확인이 제한됐다.
  - 남은 이슈: 이번 범위의 신규 SQL은 없다. 실제 로그인 세션에서 Kakao 도메인 허용 기준 지도 로딩, 반경 저장/새로고침, 버전 저장/출력물 기준 포함을 live QA한다.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `0508a58 fix(auth): send session headers from service screens`
  - 주요 기능: 모객 DB, 고객 목록/상세, 명함 목록/상세, 고객/명함 -> 모객 DB 전환, 점포 목록/상세/신규등록/선택 모달/물건지도에서 legacy service API 호출에 Supabase 세션 auth header를 붙였다. `/api/users` 응답이 배열이 아닐 때 화면이 client-side exception으로 떨어지지 않도록 guard를 추가했고, 명함 신규입력의 `BusinessCard` -> `PropertyCard` 정적 순환 import는 동적 import로 끊었다. Vercel Node.js 20 deprecation 대응을 위해 `package.json`에 Node.js `24.x` engine을 명시했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_FomWQRRrrEn61UvAQFYA4mYria4e`, READY; source `https://naeilsajang-i0eczpni7-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `npx -p node@24 -c 'node ./node_modules/typescript/bin/tsc --noEmit --pretty false'`, `npx -p node@24 -c 'npm run lint -- --quiet'`, `npx -p node@24 -c 'npm run build'`, `npx -p node@24 -p tsx -c 'tsx --test src/lib/api-auth.test.mts src/app/api/users/userRouteHelpers.test.mts'` 10건, `git diff --check` 통과. preview `https://naeilsajang-g9878xa3f-jaehyuns-projects-b4d20c6f.vercel.app`에서 사용자 Chrome 로그인 세션으로 `모객 DB`, `명함관리 > 신규입력`, `점포 목록`을 실제 클릭 확인했고, `requesterId is required` 모달과 명함 신규입력 client-side exception은 재현되지 않았다. `npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes`에서 Next.js 감지, `naeilsajang` 프로젝트, 민감/로컬 파일 제외를 확인했다. 운영 배포는 Node.js version 변경으로 build cache를 새로 만들었고, `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/landing`은 200 응답이었다.
  - 남은 이슈: 이번 범위의 신규 SQL은 없다. preview 물건지도 타일 공백은 Kakao JavaScript 키 허용 도메인에 preview host가 없어 발생한 `domain mismatched`로 확인되어 이번 범위에서 제외했다. 운영 도메인 `www.fcerp.co.kr` 기준 Kakao SDK 응답은 정상이다. 운영 배포 후 실계정으로 모객 DB/고객/명함/점포개발 주요 화면을 live QA한다.
- 2026-07-01
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `9e69b3c fix(security): require sessions for legacy service routes`
  - 배포 보강 커밋: `e4fe6e7 chore(deploy): ignore local artifacts in vercel uploads`
  - 주요 기능: 출점 검토 리포트 2차-1/2차-4/2차-5, 공개 사업자정보 푸터, 진행현황 작성자·수정·삭제 권한, 직원 관리/개인정보 저장 핫픽스, legacy requester/admin fallback 제거 보안 하드닝을 운영 배포했다. Vercel dry-run에서 루트 `.omo`, `.claude`, `.agents`, `MAC_CONTEXT.md`, `ERP/web/handoff.md`, `.env*`, `.next`, `.vercel`, `node_modules`가 업로드에서 제외되는 것을 확인하고 `.vercelignore`를 추가했다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: `https://www.fcerp.co.kr` / `https://fcerp.co.kr` (`dpl_CEyXPQ2hVy5PnifeFkUMpcesxLLN`, READY; source `https://naeilsajang-6ch94bu1x-jaehyuns-projects-b4d20c6f.vercel.app`)
  - 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/api-auth.test.mts src/app/api/users/userRouteHelpers.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts` 20건, `npm run build` 통과. `npx vercel deploy --dry --project naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym --yes`에서 Next.js 감지, `naeilsajang` 프로젝트, 앱 파일 포함, 민감/로컬 파일 제외를 확인했다. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/landing`은 200 응답이었다. `npx vercel logs https://naeilsajang-6ch94bu1x-jaehyuns-projects-b4d20c6f.vercel.app --scope team_NcWNRifDHvr7GdFW0rcpR3ym --level error --since 1h`는 `No logs found`였다.
  - 남은 이슈: 사용자 확인 기준 `supabase_franchise_location_meeting_tool_versions_migration.sql`은 실서버 등록 완료. 이번 배포 중 신규 SQL은 없다. 실계정으로 관리자 로그인, 미래 회사 직원 관리, 개인정보 이메일/휴대폰 저장, 진행현황 권한/삭제, 리포트 버전/상권분석 근거 persistence를 live QA한다. Vercel 원격 빌드는 Node.js 20 deprecation 경고를 출력했으므로 2026-10-01 전 Project Settings의 Node.js version 24.x 전환을 검토한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: `862c59e feat(franchise): add market report evidence`
  - 리뷰 보강: 코드리뷰에서 확인된 `franchise-location-meeting-tool.ts` 비대화와 `page.module.css` 미팅 도구 스타일 누적을 해소했다. 미팅 도구 모델/정규화/계산/상권분석 근거 정의를 작은 lib 모듈로 분리하고, `meetingTool*` 스타일은 컴포넌트 전용 CSS module로 이동했다.
  - 주요 기능: 출점 검토 리포트 다이얼로그에 `상권분석·목표매출 근거` 섹션을 추가했다. 상권 요약, 수요 근거, 목표매출 산정 근거, 리스크/확인사항은 후보지별 `meetingTool.marketReport`에 저장하고, PDF/인쇄 출력물과 후보지별 리포트 버전 snapshot에 포함한다. 회사 공용 프리셋 저장/적용에서는 후보지 전용 근거를 제외하고 기존 값을 유지한다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts` 12건 통과. 관련 회귀 묶음 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool-versions.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts` 30건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 코드리뷰/QA artifact는 `.omo/evidence/2cha-5-report-dialog-review-fix/code-review.md`, `.omo/evidence/2cha-5-report-dialog-review-fix/manualQa.json`에 남겼다. fresh local dev QA는 `.omo/evidence/2cha-5-report-dialog-review-fix/fresh-qa-result.json`에 남겼고, `/demo`에서 출점 후보지 `리포트` 다이얼로그를 1280px/390px으로 확인했다. `상권분석·목표매출 근거` 섹션 노출, 목표매출 산정 근거 입력 유지, PDF/인쇄 출력물 섹션 포함 및 HTML escape, horizontal overflow 0을 확인했다.
  - 남은 이슈: 이번 범위의 신규 SQL은 없다. 기존 `supabase_franchise_location_meeting_tool_versions_migration.sql`은 사용자 확인 기준 실서버 등록 완료. 실계정에서 버전 저장/불러오기와 `marketReport` snapshot 왕복을 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점포개발 미팅 도구 2차-1/2차-4 커밋 예정
  - 주요 기능: 출점 검토 리포트 PDF/인쇄 출력물을 후보지 요약, 목표매출 1차/2차/3차 비교표, 비용 구조, 검토 의견, 내부 검토 안내 중심의 미팅 자료형 레이아웃으로 고도화했다. 후보지별 `리포트 버전 이력`을 추가해 현재안을 version snapshot으로 저장하고, 이전안을 불러온 뒤 기존 저장 버튼으로 현재안에 반영할 수 있게 했다. 다이얼로그는 프리셋/버전 이력 훅과 렌더 섹션 컴포넌트로 분리해 `LocationMeetingToolDialog.tsx`를 217 pure LOC로 낮췄다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool-versions.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts` 28건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. local dev 서버 데모에서 출점 후보지 `리포트` 다이얼로그를 열어 `분석표 프리셋`과 `리포트 버전 이력` 영역을 desktop/mobile로 확인했고, dialog horizontal overflow 0, console/page error 없음, 데모 API 차단 원문 미노출을 확인했다.
  - 남은 이슈: `supabase_franchise_location_meeting_tool_versions_migration.sql`은 사용자 확인 기준 실서버 등록 완료. 실계정에서 현재안 버전 저장, 목록 최신순 표시, 이전안 불러오기, 저장 persistence를 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 공개 사업자정보/진행현황 권한 안내 문구 정리 커밋 예정
  - 주요 기능: Kakao 비즈니스 심사 대응을 위해 `/landing`, `/login`, `/signup`, `/privacy` 하단에 주식회사 내일사장 사업자정보 푸터를 추가했다. 개인정보처리방침 문의 이메일은 `cs@sajang.app`로 맞췄다. 진행현황 표의 관리 칸은 수정/삭제 권한이 없는 행에서 권한 안내 문구를 표시하지 않고 빈칸으로 남긴다.
  - dev 반영: none
  - main 반영: 운영 배포 요청에 따라 이번 커밋 반영 예정
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 로컬 production 서버 `127.0.0.1:3107`에서 `/landing`, `/login`, `/signup`, `/privacy` 사업자정보 푸터를 1280px/390px Playwright로 확인했고, horizontal overflow 0건을 확인했다.
  - 남은 이슈: 이번 범위의 신규 SQL은 없다. 운영 배포 후 `www.fcerp.co.kr`에서 공개 페이지 푸터와 Kakao 비즈니스 심사 제출 화면의 사업자정보 인식 여부를 확인한다.
- 2026-06-30
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 진행현황 권한/삭제 및 프리셋 UI 정리 커밋 예정
  - 주요 기능: `/dashboard/franchise-leads/work-intake` 진행현황에서 입점 요청과 예비 창업자 등록을 삭제할 수 있게 하고, 수정/삭제 권한을 실제 작성자, 같은 회사 팀장(`manager`), 관리자 예외로 제한한다. 팀장/관리자 수정 시 기존 작성자/담당자 값은 유지한다. 출점 검토 리포트 수익분석표의 회사 공용 프리셋 UI는 `분석표 프리셋` 툴바로 분리해 목표매출 입력의 하위 옵션처럼 보이지 않도록 정리했다.
  - dev 반영: none
  - main 반영: 운영 배포 요청 시 Fast Release Runbook 기준으로 반영
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인
  - 검증: `npx tsx --test src/lib/work-intake-access.test.mts src/app/(main)/dashboard/franchise-leads/work-intake/requests.test.mts src/app/api/franchise-work-intake/route.test.mts src/lib/franchise-lead-access.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 보호 라우트는 실 Supabase 세션 없이 로그인으로 리다이렉트되어, 현재 CSS module/JSX 상태를 반영한 Playwright harness로 진행현황 수정/삭제 버튼과 프리셋 UI desktop/mobile overflow 0건을 확인했다.
  - 남은 이슈: 이번 범위의 신규 SQL은 없다. 운영 배포 후 미래 회사 실계정으로 작성자/팀장/관리자/일반 직원 권한 표시와 삭제 persistence를 확인한다.
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
  - 주요 기능: `/landing` 상단 메뉴에 `로그인` 링크를 추가해 신규 도메인 랜딩에서 실제 로그인 화면으로 이동할 수 있게 했다. 로그인 화면 브랜드명은 `프랜차이즈 본부 ERP`로 변경하고, 가입/개인정보처리방침/앱 metadata도 같은 브랜드 기준으로 정리했다.
  - dev 반영: none
  - main 반영: 이번 커밋 반영 예정
  - 배포 URL: 운영 배포 후 `https://www.fcerp.co.kr` 확인 예정
  - 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 로컬 production 서버 `http://localhost:3114`에서 1280px/390px `/landing` 로그인 링크, `/login` 이동, `프랜차이즈 본부 ERP` 브랜드 문구, `/signup`/`/privacy` 브랜드 문구를 Playwright로 확인했다.
  - 남은 이슈: Google OAuth 심사 화면의 앱 이름/홈페이지 정보는 Google Cloud Console에서 `프랜차이즈 본부 ERP`/`https://www.fcerp.co.kr` 기준으로 별도 확인한다. 이번 변경의 신규 SQL은 없다.
- 2026-06-29
  - 작업 브랜치: `codex/franchise-next-alerts-20260616`
  - 기능 커밋: 이번 점포개발 미팅 도구 커밋
  - 주요 기능: 출점 후보지 목록에 `출점 검토 리포트`를 추가했다. 후보지별 목표매출과 주요 비용 금액/비율을 만원 단위로 입력해 세전수익과 세전 수익률을 계산하고, 목표매출 변화 `1차 / 2차 / 3차` 전환과 자유 비용 항목 추가/삭제를 지원한다. 보고 메모와 함께 브라우저 PDF 저장/인쇄가 가능하다. 리포트는 기존 `franchise_locations.data.meetingTool`에 저장하므로 신규 SQL은 없다.
  - dev 반영: none
  - main 반영: none
  - 배포 URL: none
  - 검증: 1차 구현에서 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 4건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 보강 후 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 6건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. headless Playwright mock 세션에서는 대상 페이지 본문이 빈 상태로 남아 브라우저 캡처를 확보하지 못했으므로 실제 로그인 세션에서 리포트 다이얼로그 시각 QA를 추가 확인한다.
  - 남은 이슈: 회사/브랜드별 비용 항목 라이브러리와 브랜드별 기본 원가율 템플릿은 후속 고도화로 분리한다.
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

## 2026-07-22 Gmail OAuth 연결 인증 보정

- 기능 브랜치: `codex/gmail-connect-auth-20260722`
- 기능 커밋: `60ee429 fix(franchise): Gmail OAuth 연결 인증 보정`
- 주요 기능: 정보공개서 `Gmail 연결`을 bearer 인증 없는 전체 페이지 이동에서 인증된 JSON handoff 후 Google OAuth 이동으로 변경했다. nonce/state와 회사 범위 검증은 유지하고 query `requesterId`만으로 인증하지 않는다.
- OAuth 설정: 로컬 `http://localhost:3017/api/integrations/gmail/callback`과 운영 `https://www.fcerp.co.kr/api/integrations/gmail/callback`의 승인 리디렉션 URI 등록을 확인했다.
- 검증: 요청 회귀 테스트 3건, TypeScript, lint, production build, `git diff --check` 통과. 분리 로컬 서버에서 실계정 Gmail 연결 완료를 확인했다.
- 승격: 기능 브랜치를 dev PR로 반영해 dev 배포를 확인한 뒤 main PR과 production으로 승격한다. 운영에서는 `Gmail 연결`이 Google 승인 화면으로 이동하고 callback 후 연결 상태가 표시되는지 확인한다.
- 신규 SQL: 없음. 데모 영향 없음.

## 2026-07-22 Gmail OAuth callback 세션 후속 보정

- 기능 브랜치: `codex/gmail-callback-session-20260722`
- 주요 기능: Google 동의 후 bearer 헤더가 없는 callback을 정상 OAuth 반환으로 처리한다. 연결 시작 시 발급한 전체 state를 HttpOnly 쿠키에 묶고 callback에서 원문 일치, nonce, 활성 사용자, 회사 범위를 차례로 검증한 뒤 Gmail 연결 정보를 저장한다.
- 보안: callback query의 `requesterId`와 `companyId`를 단독으로 신뢰하지 않으며, 발급 당시 state와 다른 callback은 `invalid_state`로 차단한다.
- 검증: Gmail OAuth state·provider·암호화·API 인증 테스트 15건, TypeScript, lint, production build, `git diff --check` 통과. 로컬 브라우저 callback에서 로그인 헤더 없이 Google 토큰 교환 단계 진입을 확인했다.
- 승격: feature → dev PR → Vercel dev check → main PR → `naeilsajang` production 순서로 진행한다.
- 신규 SQL: 없음. 데모 영향 없음.

## 2026-07-14 플랫폼 통합 리뷰 및 운영 릴리스

- 승격 경로: 플랫폼 코드리뷰 PR #4, main 문서 동기화 PR #6, 업무 접수 모바일 보정 PR #7·#8을 `dev`에 순차 반영한 뒤 `dev -> main` PR #5를 병합했다. 운영 기준 main 커밋은 `7306723`이며 병합 시점의 `origin/dev`와 `origin/main` 파일 트리는 동일하다.
- 운영 배포: repo root에서 Fast Release Runbook의 dry-run과 production 배포를 실행했다. deployment ID는 `dpl_45fnu8CDmTTJpFhi6Jk2uVnX84sL`, source URL은 `https://naeilsajang-lx0yaxcx4-jaehyuns-projects-b4d20c6f.vercel.app`이며 `naeilsajang` production에서 `READY`를 확인했다.
- 운영 도메인: `https://www.fcerp.co.kr`, `https://fcerp.co.kr`가 같은 deployment를 가리킨다. `/login`, `/approvals`, `/dashboard/franchise-operations/schedule`는 200 응답을 확인했다.
- 검증: 관련 자동 테스트 96건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 1440px/390px 브라우저 QA에서 전자결재, 가맹운영 일정, 업무 접수의 가로 넘침과 console error가 0건이었고, 업무 접수 모바일 카드와 한글 줄바꿈은 독립 시각 QA를 통과했다.
- 배포 체크: GitHub의 필수 Vercel 체크는 통과했다. 저장소의 필수 체크로 지정되지 않은 Netlify preview는 실패했으나 Vercel production 승격을 막는 조건은 아니었다.
- SQL 적용 순서: `supabase_company_approvals_v2_migration.sql` -> `supabase_company_approvals_organization_delete_safety_migration.sql` -> `supabase_company_approvals_document_line_override_migration.sql` -> 최신 `supabase_company_approvals_security_review_migration.sql` -> `supabase_company_approvals_workflow_schedule_fix_migration.sql` -> 최신 `supabase_franchise_schedule_visibility_migration.sql` 순서로 적용한다. 일정 수신자 보정 파일은 대결자 적격성 보정이 포함된 보안 리뷰 migration 뒤에, visibility 파일은 `can_act_on_approval_document` 함수가 준비된 뒤에 적용해야 한다. **SQL 등록 필요**.
- 보안 후속: 과거 Git 이력에 포함됐던 Supabase service-role key 폐기·재발급, 배포 환경 교체, 접근 로그 점검과 GitHub Secret scanning 경고 종결을 2026-07-14 완료했다. Git 이력 재작성은 보호 브랜치와 여러 worktree 영향을 고려해 별도 유지보수 창에서 결정한다.
- 알려진 의존성 잔여: `npm audit --omit=dev` 기준 3건(보통 2, 높음 1)이 남아 있다. `xlsx`는 upstream 수정 버전이 없고 Next/PostCSS의 강제 수정은 호환되지 않는 다운그레이드를 제안하므로 이번 릴리스에서 `--force`는 사용하지 않았다.

## 2026-07-15 전자결재 운영 보안·일정·PDF 저장 릴리스

- 범위: 만료·해제된 대결자의 문서·첨부·PDF·일정·알림 접근 차단, 병렬 결재 완료자의 stale 일정·알림 정리, 루트 대시보드의 전자결재 일정 제외, 전자결재 PDF 저장 복구를 한 운영 릴리스로 승격한다.
- PDF 보정: 문서 상세의 PDF·첨부 다운로드를 Supabase bearer 세션을 포함한 fetch/Blob 방식으로 통일하고, PDF 뷰어에서 빈 페이지를 만들던 WOFF2 대신 공식 Noto Sans KR TrueType 글꼴을 번들한다. 서버 인스턴스에서는 글꼴 바이트를 재사용한다. 로컬 실계정 다운로드 결과는 A4 1페이지·10,343바이트이며 한글 제목·본문·푸터 렌더링을 확인했다.
- 검증: PDF 집중 테스트 9건, 전체 자동 테스트 727건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 로컬 문서 상세에서 실제 다운로드와 console error 0건을 확인하고, macOS 미리보기와 PDF 렌더링으로 최신 파일이 빈 페이지가 아님을 확인했다.
- 승격: 최신 `dev`의 보안·일정 보정을 유지한 상태에서 PDF 다운로드 최종 리뷰 사항과 릴리즈 문서를 반영하고, protected branch PR/check 절차로 `main`에 승격한 뒤 `naeilsajang` production을 Fast Release Runbook으로 배포한다. 최종 커밋, deployment ID와 운영 도메인 smoke 결과는 배포 보고에 남긴다.
- SQL 적용 순서: 최신 `supabase_company_approvals_security_review_migration.sql` -> `supabase_company_approvals_workflow_schedule_fix_migration.sql` -> 최신 `supabase_franchise_schedule_visibility_migration.sql`. 문서·첨부 RLS와 알림 조회·읽음 처리도 현재 유효한 위임 및 결재 단계만 허용하도록 마지막 두 파일을 보강했다. PDF 보정 자체의 신규 SQL은 없지만 같은 릴리즈의 권한 정책 변경 때문에 최신 파일 기준으로 다시 적용한다. **SQL 재등록 필요**.

## 2026-07-20 가맹운영 일정 2단계 내구성 마감 준비

- 작업 브랜치: `codex/phase2-main-integration-20260716`.
- 범위: 원천 일정 동기화의 큐 선기록, UUID lease 기반 최신 작업 보호, 재시도 수신자 재검증, 업체 계약 담당자 및 슈퍼바이징 회사 범위, 원본 저장 후 일정 동기화 결과 응답을 보강한다.
- 검증: 집중 테스트 56건, 전체 테스트 797건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- SQL 적용 순서: 최신 `supabase_franchise_schedule_visibility_migration.sql` -> `supabase_franchise_source_schedule_upsert_migration.sql` -> `supabase_franchise_source_schedule_profile_security_migration.sql` -> `supabase_franchise_schedule_durable_sync_migration.sql` -> `supabase_franchise_schedule_durable_sync_review_fix_migration.sql`. 사용자 확인 기준 기본 durable migration까지 적용 완료이며 마지막 리뷰 보완 파일은 추가 적용해야 한다. **SQL 등록 필요**.
- 승격 상태: 보완 SQL 적용 확인 후 `feature -> dev PR -> dev 배포·QA -> main PR -> production` 순서로 진행한다. dev와 production DB가 분리돼 있으면 두 환경에 같은 보완 SQL이 적용됐는지 각각 확인한다.

## 2026-07-20 점주 포털 3단계 1차 승격 준비

- 범위: 점주 문의 24시간 처리 SLA, 본사 처리 현황, 제출 건별 마감/초과 표시, 재제출 `submitted_at`, 가맹운영 일정 `due_at` 동기화를 3단계 1차 승격 단위로 관리한다.
- SQL 적용 순서: `supabase_franchise_owner_portal_migration.sql` 적용 상태 확인 -> `supabase_franchise_schedule_durable_sync_review_fix_migration.sql` -> `supabase_franchise_owner_submission_sla_migration.sql`. 후자는 현재 제출 시각 컬럼과 DB KPI 집계를 추가하고 기존 재제출 시각·문의 일정 마감·조기 지연 상태를 보정하며, 날짜 단위 지연 판정을 정확한 `due_at` 시각 판정으로 교체한다. 적용 중에는 실행 worker와 같은 source advisory lock을 획득하고 제출 원본 기준으로 기존 일정·알림·동기화 큐를 보정한다. Supabase Cron은 새로 지연된 일정만 알림 처리한다. **SQL 등록 필요**.
- 승격 기준: 기능 커밋과 SQL을 dev에 반영한 후 실계정 시설 문의 1건으로 최초 제출·반려·재제출을 실행해 새 `submitted_at`, 24시간 `due_at`, 본사 처리, 일정 완료, 점주 결과 확인을 검증한다. Supabase Cron에서 `franchise-schedule-hourly-lateness` 실행 이력도 확인한 뒤 main PR과 production 배포를 진행한다.

## 2026-07-21 입점 요청 네이버 지도 전환 릴리스

- 작업 브랜치: `codex/work-intake-naver-map-20260721`.
- 범위: 진행현황 입점 요청 상세의 주소 지도를 Naver Maps Dynamic Map으로 전환하고 서버 전용 Geocoding API, 공급자별 오류 안내, 네이버 지도 외부 링크를 추가한다. 기존 사진 갤러리와 상세 확인·수정 흐름은 유지한다.
- 로컬 안정화: Naver SDK mount 높이 0 문제를 고정 크기 컨테이너로 보정하고, 첨부 업로드 기본 `fetch`의 브라우저 바인딩 손실을 래퍼 함수로 수정한다.
- 환경변수: production과 preview에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`, `NAVER_MAP_CLIENT_SECRET`이 필요하다. Client Secret은 서버 API에서만 사용하며 브라우저에 노출하지 않는다.
- 검증: 네이버 지도·첨부 업로드 집중 테스트 12건, TypeScript, lint, build, diff check를 통과했다. 로컬 실환경 브라우저에서 Geocoding·SDK 인증 200, 지도 mount 807x219px, 타일 40개와 마커 렌더링, console error 0건을 확인했다.
- 승격: 기능 브랜치를 `dev`에 반영해 개발 배포를 확인한 뒤, 운영 `main`에 있는 대용량 사진 업로드 보정을 유지하면서 이번 검증 커밋만 release branch로 선별 반영한다. 운영은 `naeilsajang` Fast Release Runbook으로 배포한다.
- SQL: 신규 DB 변경이 없으므로 SQL 등록은 필요하지 않다.

## 2026-07-22 커스텀 업종 스키마 및 점주 포털 3단계 QA 승격

- 작업 브랜치: `codex/custom-categories-schema-20260721`.
- 승격 커밋: `b1dbc76 fix(franchise): 커스텀 업종 스키마 복구`, `6956d95 docs(franchise): 3단계 QA 결과 정리`와 이 릴리즈 문서 커밋을 `dev`와 `main`에 순서대로 반영한다.
- 범위: `/api/categories`가 사용하는 `custom_categories` 스키마를 복구하고, 점주 일반·시설 문의의 24시간 SLA 집계·초과 표시·가맹운영 일정 연결을 적용 DB와 로컬 브라우저에서 재검증한 결과를 현재 상태와 QA 문서에 반영한다.
- 검증: 점주 SLA·원천 일정·일정 경계·migration·reconciliation·알림 동기화 집중 테스트 36건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 1440px/390px 브라우저에서 처리 현황, 초과 배지, 가맹운영 일정 상세 이동과 가로 넘침 0을 확인했다.
- SQL: 사용자 확인 기준 `supabase_custom_categories_migration.sql`과 `supabase_franchise_owner_submission_sla_migration.sql` 적용 완료다. **SQL 등록 완료 확인**.
- dev 반영: PR #30을 squash merge해 `240d60d`가 됐다. deployment `dpl_3VBEvTwQFKoeKG38Vc9CPiTFqg4V` READY와 `https://naeilsajang-dev.vercel.app`의 `/login`, 점주 소통, 가맹운영 일정 200 응답을 확인했다.
- main 승격: dev와 main의 기존 squash 이력 차이로 직접 PR #31은 닫고, `origin/main` 기준 release branch에 실제 tree delta만 적용했다. PR #32를 squash merge한 운영 기준 커밋은 `4d43567`이다.
- production: Fast Release Runbook의 dry run 후 deployment `dpl_BTeDA4c4CSFLueekD9r4ZQwo2ALy`를 배포했다. `naeilsajang` production READY, `https://www.fcerp.co.kr`과 `https://fcerp.co.kr` alias, `/login`, 점주 소통, 가맹운영 일정 200 응답을 확인했다.

## 2026-07-22 점주 포털 3단계 통합 및 Gmail 팝업 연결 승격

- 작업 브랜치: `codex/phase3-integrated-franchise-ops-20260722`.
- 범위: 점주 포털 3단계 통합 기능과 migration 보정, 정보공개서 Gmail OAuth 팝업 연결을 한 dev 검증 단위로 승격한다.
- Gmail 보정: `Gmail 연결`은 현재 모객 DB 탭을 벗어나지 않고 별도 창에서 Google 인증을 완료한다. callback 완료 창은 결과를 원래 창에 전달하고 자동 종료하며 기존 상세 모달과 입력 상태를 유지한다.
- 검증: Gmail 관련 테스트 10건, TypeScript, lint, production build, `git diff --check` 통과. 로컬 브라우저에서 결과 메시지 전달, 팝업 자동 종료, 원래 창 유지와 console error 0건을 확인했다.
- SQL: Gmail 변경의 신규 SQL은 없다. 점주 포털 3단계 `supabase_franchise_owner_phase3_migration.sql`은 사용자 확인 기준 적용 완료다. **SQL 등록 완료 확인**.
- 승격: 기능 브랜치 push 후 protected branch 절차에 따라 dev PR과 dev deployment를 확인하고, 검증된 범위를 main PR과 `naeilsajang` production으로 승격한다. 최종 deployment ID와 운영 실계정 Gmail 연결 확인은 배포 보고에 남긴다.
## 2026-07-27 Meta Lead Ads 설정 UI·수집 경계 개발 배포 준비

- 작업 브랜치: `codex/meta-business-page-targets-20260727`.
- 기능 커밋: `fa7c611 fix(franchise): Meta 연동 설정과 수집 경계 보정`.
- 범위: 중복 계정 연결 액션 제거, 설정 토글 상태 명시, 양식/수집 내역 접이식 UI, 업무용 매핑 설명, Meta dummy 표 표시 정리, OAuth redirect allowlist, provider 오류 코드 안정화, 회사 범위 수동 동기화 필터.
- dev 실연동 근거: 회사 관리 페이지 1개, 신청 양식 19개 발견, 활성 양식 1개, Meta Testing Tool Webhook `Success`, 모객 DB raw-intake 테스트 저장을 확인했다. 실제 유료 광고 리드와 장시간 Webhook·백필은 known risk로 남는다. 광고 성과 Marketing API는 별도 HOLD다.
- 검증: 관련 회귀 32건, TypeScript, 전체 ESLint, production build 113개 페이지, `git diff --check`, 1280px·390px 브라우저 패널/터치/overflow QA, console error 0을 통과했다.
- SQL: 신규 SQL 없음. 배포 대상은 이 기능 브랜치의 Preview/dev이며 `dev`, `main`, production에는 아직 반영하지 않는다. push 후 실제 deployment ID·READY 상태·dev URL smoke는 배포 보고에 남긴다.
