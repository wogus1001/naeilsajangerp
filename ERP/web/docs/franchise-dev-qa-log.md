# Franchise Development QA Log

## 목적

프랜차이즈 고도화 개발 과정, 검증 결과, 미검증 리스크, 다음 QA 시나리오를 추적한다. 기능 방향과 우선순위는 `franchise-growth-roadmap.md`를 기준으로 하고, 이 문서는 실제 개발/검증 이력을 남기는 운영 로그로 사용한다.

## 문서 범위

- 개발 과정에서 결정된 주요 구현 선택
- 로컬/빌드/브라우저 검증 결과
- 외부 API별 실제 동작과 한계
- 아직 검증하지 못한 항목
- 다음 QA 체크리스트

`ERP/web/handoff.md`는 단일 작성자 규칙 때문에 수정하지 않는다.

## 현재 문서화 상태

- 향후계획: `ERP/web/docs/franchise-growth-roadmap.md`에 정리
- 로컬 세션 인수인계: `MAC_CONTEXT.md`에 정리
- 실행/env/SQL 안내: `ERP/web/README.md`에 정리
- QA/개발 과정: 이 문서에서 신규 관리 시작
- 문서관리 에이전트: `ERP/web/docs/documentation-agent.md`에 역할/권한/보고 형식 정리
- 외부 상가 매물 수집: 구현 범위는 `ERP/web/docs/franchise-growth-roadmap.md`, QA 상태는 이 문서에서 관리

### 2026-07-28 회사별 Meta 신청 항목 매핑 개발·QA

- Meta 양식에서 발견한 실제 질문을 이름, 연락처, 희망 지역, 예산 통합·최소·최대, 관심 브랜드, 메모에 연결하는 UI/API를 구현했다. 자동 추천과 `연결 안 함`을 제공하고, 저장 전 변경은 다른 설정 저장이나 상태 조회 실패에도 유지한다. 자동 수집은 저장된 이름·연락처 매핑과 같은 회사의 재직 중 담당자를 서버에서 다시 확인한 뒤에만 켠다.
- 재연결과 동시 양식 발견은 충돌 시 기존 운영 설정을 보존한다. Webhook은 Page+Form의 회사 소유권이 하나로 확정될 때만 수집하고 모호한 다중 회사 후보는 fail-closed 처리한다. Meta Page token은 Bearer header로 전달하고 10초 timeout을 적용했으며, 질문·옵션·매핑의 길이와 개수를 제한하고 공급자 원본 `data`는 클라이언트 응답에서 제거했다.
- 기능 커밋: `36fd18c feat(franchise): Meta 신청 항목 매핑 보강`.
- 검증: Meta 관련 `npx tsx --test` 43건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, 변경 TS/MTS/TSX 16개 no-excuse 검사, `npm run build` 113개 페이지, `git diff --check` 통과. build는 기존 workspace root, `baseline-browser-mapping`, Browserslist 경고만 출력했다. 독립 코드·보안·목표·CJK/접근성·디자인 코드 리뷰는 모두 PASS/APPROVE였다.
- 로컬 `http://localhost:3000/dashboard/franchise-leads`는 HTTP 200, 3000 포트 listener 1개, 비인증 `/api/integrations/meta/forms` POST는 401을 확인했다. Codex 자체 브라우저는 localhost URL 정책에 차단돼 이번 변경의 새 1280px·768px·375px 렌더, 콘솔 오류, Next.js overlay, 실계정 매핑 저장·새로고침을 직접 확인하지 못했다.
- 남은 dev QA: 실제 회사 Meta 양식에서 질문 연결 저장 후 재방문 복원, 저장 전 담당자 변경/상태 새로고침 보존, `연결 안 함`, 이름·연락처·담당자 누락 시 활성화 차단, Webhook과 백필의 동일 변환 결과, 서로 다른 회사 연결의 격리를 확인한다. 신규 SQL과 공개 `/landing`·`/demo` 영향은 없다.

### 2026-07-27 모객 DB 기간 선택 저장·표 여백 QA

- `/dashboard/franchise-leads`의 빠른 기간 기본값을 `전체`로 변경했다. `franchiseLeadDateRange`에 마지막 빠른 기간 버튼 선택을 저장하고, 저장값이 없거나 유효하지 않으면 `전체`로 복원한다. 직접 날짜를 입력하는 흐름은 마지막 빠른 기간 선택을 변경하지 않는다.
- 기간 선택 저장·복원 테스트 4건과 관련 회귀를 포함한 16건을 통과했다. TypeScript, 전체 ESLint, `git diff --check`, Next.js production build도 통과했다. build는 기존 workspace root, `baseline-browser-mapping`, Browserslist 경고만 출력했다.
- 인증된 로컬 브라우저에서 저장값이 없는 최초 접속의 `전체`, `최근 30일` 선택 후 새로고침 복원, 다시 `전체` 선택 후 새로고침 복원과 조회 API 날짜 조건을 확인했다.
- 표 헤더·본문·체크박스 셀은 공통 12px 좌우 여백을 사용한다. 기존 컬럼 폭과 표 내부 가로 스크롤은 유지하며, 1600px·1280px·390px에서 컬럼 정렬, 모바일 `표시 50건`, 한국어 설명 줄바꿈을 확인했다. 독립 무결성·시각 검토는 모두 `PASS`였다.
- 브라우저 console error와 Next.js 오류 오버레이는 0건이었다. 기존 Supabase GoTrueClient 다중 인스턴스 경고는 별도 이슈로 남긴다. 신규 SQL과 공개 `/landing`·`/demo` 영향은 없다.

### 2026-07-23 로그인·가입·모객 DB QA 안정화

- 회사 찾기는 현재 제품에 별도 대표자 지정 기능이 없으므로 대표자 이름이나 `(미정)`을 검색 결과에 표시하지 않는다. 아이디 로그인용 회사 선택값은 회사 ID와 회사명만 보관해 과거 검색 응답의 대표자 문자열이 다시 노출되지 않게 했다.
- 가입 요청 도중 Supabase JWT key 인식이 일시적으로 실패해도 사용자가 같은 정보를 다시 입력하지 않도록 인증 사용자 조회를 제한적으로 재시도한다. 유효하지 않은 인증과 일반 DB 오류는 재시도 대상으로 넓히지 않는다.
- 직원 관리의 승인 대기 요청에서는 내부 profile UUID를 숨기고 이름과 역할만 보여준다.
- 모바일 로그인에서는 회사 입력과 `회사 찾기` 버튼이 카드 밖으로 잘리지 않도록 입력 영역을 축소 가능한 열로 두고 버튼 너비를 유지한다.
- 모객 DB 표는 컬럼 폭을 한 설정에서 관리하고 8px 간격 리듬으로 정리했다. 희망지역과 예산은 각각 120px로 줄였고, 상태형 컬럼은 가운데, 예산은 오른쪽 정렬했다. 넓은 화면의 남는 공간은 마지막 빈 영역이 흡수해 희망지역·예산만 과도하게 늘어나지 않는다.
- 컬럼 선택 메뉴는 표 카드의 overflow에 잘리지 않고 자체 세로 스크롤로 전체 항목을 확인할 수 있게 했다. 표의 가로 스크롤은 기존 표 스크롤 영역에서만 유지한다.
- 자동 검증: 모객 DB와 로그인·가입·승인 관련 테스트 47건, TypeScript, 전체 ESLint, `git diff --check`를 통과했다.
- 로컬 production build는 Turbopack이 최적화 단계에서 장시간 정체됐고, Webpack 경로는 이번 변경과 무관하게 route module에서 테스트 helper를 export하는 기존 API 파일들을 Next.js 타입 검증 오류로 보고했다. 깨끗한 원격 환경의 Vercel 필수 check를 최종 build gate로 사용하고, 실패하면 배포를 중단한다.
- 화면 QA: 1652px에서 희망지역·예산 120px 고정과 우측 여백 흡수, 390px에서 표 내부 가로 스크롤, 390x500에서 컬럼 선택 메뉴의 카드 밖 표시와 내부 스크롤을 확인했다. 독립 기능·한국어 UI 게이트가 모두 `PASS`했다. 실행 환경의 보안 정책으로 에이전트가 사용자 `localhost:3000` DOM을 직접 읽지는 못해, 사용자 제공 실제 화면과 동일 DOM을 사용하는 격리 화면 검증을 함께 사용했다.
- 공개 `/landing`·`/demo` 설명 흐름에는 영향이 없다. 신규 SQL 없음.

### 2026-07-21 진행현황 입점 요청 네이버 지도 전환

- `/dashboard/franchise-leads/work-intake`의 입점 요청 상세 주소 지도를 Kakao 지도에서 Naver Maps Dynamic Map으로 교체했다. 주소 좌표 변환은 인증된 `/api/integrations/naver/maps/geocode`가 서버 전용 Client Secret으로 처리하고, 브라우저에는 Maps Client ID만 전달한다.
- 지도 SDK/지오코딩 설정 누락, 주소 미검색, 공급자 네트워크 실패를 구분해 한국어 상태 메시지로 표시하고 외부 이동 링크를 `네이버 지도에서 보기`로 변경했다. 기존 사진 갤러리와 상세 확인/수정 흐름은 유지한다.
- 실제 로컬 Maps 인증정보로 Naver Geocoding을 호출해 설정 감지, 주소 매칭, 유효 좌표 반환을 확인했다. 인증·입력 길이·설정·검색 결과·공급자 오류·동시/순차 중복 요청·SDK 재시도 및 클라이언트 응답 파서 테스트를 추가했고, 서버 좌표 결과 캐시는 5분·최대 100개로 제한한다.
- 코드리뷰에서 지도 SDK DOM 정리 시 React 오류 상태까지 지울 수 있는 경계를 확인해 SDK mount와 상태 표시 영역을 분리했다. Naver SDK가 mount 요소의 inline `position`을 덮어써 로컬 지도 높이가 0이 되던 문제는 mount에 명시적인 너비·높이를 지정해 보정했다.
- 로컬 첨부 업로드의 `Failed to execute 'fetch' on 'Window': Illegal invocation`은 기본 의존성에 저장한 `fetch`가 객체 메서드로 호출되며 브라우저 바인딩을 잃은 것이 원인이었다. 기본 요청 함수를 `window.fetch(...args)` 래퍼로 바꿔 운영과 같은 사진 업로드 흐름을 유지했다. 오류 당시 저장된 URL 없는 첨부 메타데이터는 원본 파일을 다시 선택해야 한다.
- 런타임 가설 점검: ① Maps 인증정보 또는 Geocoding 권한 오류 가능성은 실제 공급자 주소 매칭과 유효 좌표 반환으로 기각했다. ② 허용 URL 또는 브라우저 Client ID 오류 가능성은 Naver SDK 인증 200으로 기각했다. ③ 지도 공급자 렌더링 실패 가능성은 보정 후 mount 807x219px, 지도 타일 40개 로드와 유효 이미지 크기, 마커 렌더링으로 기각했다. 새 브라우저 세션의 console error는 0건이었다.
- 검증: `npx tsx --test src/lib/franchise-property-registration-uploads.test.mts src/lib/naver-maps-client.test.mts src/lib/naver-maps-geocoding.test.mts` 12건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- 이번 지도 공급자 교체에는 신규 DB 변경이 없으므로 SQL 등록은 필요하지 않다.

### 2026-07-21 커스텀 업종 카테고리 스키마 복구 QA

- Supabase REST schema에서 `custom_categories`를 찾지 못해 `/api/categories`가 실패하던 환경을 위한 `supabase_custom_categories_migration.sql`을 추가했다. 회사, 업종 분류 계층, 생성자, 생성·수정 시각과 조회 인덱스를 복구한다.
- API가 서버 service role로만 테이블을 사용하는 현재 구조에 맞춰 RLS를 활성화하고 `anon`, `authenticated`의 직접 접근 권한을 회수했다. 기존 데이터에 동일한 회사·분류·이름 조합이 있어도 migration이 중단되지 않도록 중복 정리와 unique 강제는 이번 복구 범위에서 제외했다.
- 로컬 Supabase service-role 조회로 전체 6건과 실제 API 조건에 해당하는 회사별 `industry_detail` 5건을 확인했다. 비로그인 `/api/categories`는 예상대로 401을 반환했고, 로그인한 입점 요청 등록 화면은 카테고리 관련 console error 없이 렌더링됐다. 기존 Supabase GoTrueClient 다중 인스턴스 경고는 별도 이슈로 남긴다.
- 사용자 확인 기준 동일 migration을 운영 Supabase에도 적용했다. **SQL 등록 완료 확인**.

## 개발 과정 로그

### 2026-07-20 진행현황 삭제 이력 긴급 보정·완전삭제

- 운영 삭제 실패 원인은 `properties.id(text)`와 삭제 RPC의 `p_source_id(uuid)` 비교 불일치였다. 함수의 조회·삭제 조건을 `p_source_id::text`로 보정하고, 내부 `operator does not exist` 오류를 스키마 미적용으로 잘못 분류하던 API 판정을 좁혔다.
- 사용자 SQL 적용 후 운영 Vercel 로그에서 기존 DELETE 503이 동일 API의 200 응답으로 전환되고 삭제 목록 건수가 갱신되는 것을 확인했다. **SQL 등록 완료 확인**.
- 관리자 전용 삭제 목록에 `완전삭제`를 추가했다. 중앙 위험 확인 알럿에서 복구 불가를 안내하고, 서버는 활성 로그인 세션과 `admin` 역할을 다시 검증한 뒤 삭제 이력 row만 제거한다. 성공 시 행위자·대상 ID·처리 시각을 구조화 운영 로그로 남기고, 성공·실패 결과는 중앙 커스텀 알럿으로 표시한다.
- 완전삭제는 기존 `franchise_work_intake_deleted_records` 테이블을 사용하므로 신규 SQL은 없다.
- API 권한·성공·미존재·입력 검증·DB 오류와 기존 삭제 RPC 회귀를 포함한 관련 테스트 24건, `tsc`, lint, production build, `git diff --check`를 통과했다. mock 관리자 세션 브라우저 QA에서 취소 시 요청 0건, 최종 확인 시 목록 0건 갱신과 중앙 완료 알럿을 확인했고, 390px 가로 넘침은 0px였다. 운영 실데이터 완전삭제는 수행하지 않았다.
- 런타임 감사는 세 가설을 확인했다. ① 미로그인·일반 직원이 완전삭제를 우회할 가능성은 401/403 테스트와 삭제 adapter 미호출로 기각했다. ② 삭제 성공 후 재조회 실패로 행이 남을 가능성은 성공 즉시 로컬 목록·건수를 먼저 제거하도록 보정하고 브라우저에서 빈 목록을 확인했다. ③ 삭제 RPC 내부의 다른 누락 함수를 SQL 미적용으로 오분류할 가능성은 대상 RPC 이름이 오류 메시지에 직접 포함된 `42883`만 분류하도록 좁히고 회귀 테스트로 확인했다.

### 2026-07-20 가맹 운영 일정 내구성 최종 보정

- `supabase_franchise_schedule_durable_sync_review_fix_migration.sql`은 사용자 확인 기준 대상 DB 적용을 완료했다. **SQL 등록 완료 확인**.
- 원천 저장 전 동기화 경계는 큐 저장 실패를 호출자에게 전달하고, 이미 원본 저장이 끝난 방문·시정요청·오픈 준비·점주 제출·업체 계약·점검 보고서 경로는 성공 응답의 `scheduleSyncRequired`로 후속 동기화 필요 상태를 반환하도록 호출 계약을 분리했다.
- 점검 보고서가 저장된 뒤 시정요청 후처리가 실패하더라도 500을 반환해 같은 보고서를 다시 생성하지 않도록 성공 응답에 지연 경고를 포함한다.
- 재처리 배치는 payload별 프로필 재검증과 RPC 오류를 개별 실패로 기록하고 다음 작업을 계속 처리한다. 필수 필드가 없는 payload도 조용히 폐기하지 않고 실패·재시도 대상으로 남기며, Supabase 객체 오류의 `message`를 재시도 로그에 보존한다.
- 회귀 테스트 28건, 전체 테스트 803건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- mock-session 브라우저 QA에서 `/dashboard/franchise-operations/schedule`의 원천 일정 목록, 상세 이동, 완료 처리와 1440px/390px 레이아웃을 확인했다. 테스트 인증 mock에서 발생하는 다중 GoTrueClient 경고 외 제품 콘솔 오류는 없었다.
- 남은 live QA는 적용 DB의 실계정으로 원천 변경 1건과 재처리 큐 1건을 확인하는 것이다. 신규 SQL 파일은 없다.

### 2026-07-16 가맹 운영 원천 일정 내구성 리뷰 보정

- 원천 일정과 현재 담당자 알림을 `sync_franchise_operational_schedule_from_payload` 한 트랜잭션에서 갱신하고, source 단위 advisory lock으로 동시 동기화를 직렬화했다.
- 일시 실패 payload는 `franchise_schedule_sync_jobs`에 source 기준으로 덮어써 보관하고, 예약 실행에서 `FOR UPDATE SKIP LOCKED`로 가져와 성공 시 삭제·실패 시 지수 backoff를 적용한다.
- 예약 실행은 매일 `0 15 * * *` UTC, KST 자정에 미완료 과거 일정을 `지연`으로 재평가한다.
- SV 방문·보고서·시정요청과 오픈 준비는 원천 동기화와 재시도 저장이 모두 실패하면 성공으로 응답하지 않도록 실패 은폐를 제거했다.
- 일반 점주 문의도 시설 문의와 별도 원천 유형으로 가맹운영 일정에 연결하고, 전자결재·가맹운영 원천 일정은 메인 대시보드 `예정된 일정`에서 제외한다.
- 검증: 내구성 RPC·재시도·지연 승격·실패 전파 경계 집중 테스트 21건, 전체 테스트 592건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- 브라우저 QA: mock-session 개발 서버에서 1440px·390px 가맹운영 일정, 6개 원천 상세 이동, 수동 일정 중앙 알럿, 403/424 안내, 가로 overflow 0을 재확인했다. QA fixture의 Supabase 클라이언트 중복 생성 경고는 남지만 기능 오류나 page error는 없었다.
- 런타임 가설 점검: (1) 원자적 RPC 실패 후 요청이 유실될 가능성은 재시도 큐 upsert 회귀 테스트로 기각했다. (2) 동시 실행이 같은 작업을 중복 처리할 가능성은 source advisory lock과 `FOR UPDATE SKIP LOCKED` SQL 경계 테스트로 기각했다. (3) 원천 변경 없이 날짜가 지나도 `예정`에 머물 가능성은 KST 자정 크론 설정과 지연 승격 RPC 테스트로 기각했다. 실제 DB 실행은 신규 SQL 적용 후 실계정 회귀가 필요하다.
- SQL 상태: `supabase_franchise_schedule_durable_sync_migration.sql` **SQL 등록 필요**.

### 2026-07-16 2단계 통합 릴리즈 후보

- 미배포 상태였던 알림·일정 분리, 가맹운영 원천 일정 연동, 2단계 마감 커밋을 최신 운영 `main` 기준 브랜치에 다시 통합했다. 진행현황 검색·페이지네이션·삭제목록 기능은 유지하고 삭제 확인만 공용 중앙 다이얼로그로 병합했다.
- 관련 일정·알림·원천 동기화 테스트 68건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- 브라우저 QA는 1440px·390px 일정 화면, 6개 원천 상세 이동, 수동 일정 저장 완료 중앙 알럿, SQL 미적용 424 안내, 권한 없음 403 안내, 가로 overflow 0, console error 0건을 확인했다. 실행일이 바뀌면 상세 일정이 사라지던 QA fixture 고정 날짜를 KST 실행일 기준으로 보정했다.
- 사용자 확인 기준 `supabase_company_approvals_security_review_migration.sql`, `supabase_franchise_schedule_visibility_migration.sql`, `supabase_franchise_source_schedule_upsert_migration.sql`, `supabase_franchise_source_schedule_profile_security_migration.sql` 적용을 완료했다. **SQL 등록 완료 확인**.

### 2026-07-16

- `/dashboard/franchise-leads/work-intake` 진행현황의 검색·상태·기간 필터와 10건 페이지네이션을 입점 요청/예비 창업자 등록에 적용하고, 관리자에게만 삭제 목록과 삭제 시점 상세 내용을 제공했다.
- 코드리뷰 보정: 200/500건 선조회 제한을 제거해 오래된 데이터도 검색·페이지 집계에 포함하고, 페이지 파라미터가 없는 기존 API 호출은 전체 결과를 유지한다. 상태 필터는 입점 요청과 예비 창업자 실제 상태값으로 분리하고 KST 날짜 기준을 적용했다.
- 권한/삭제 보정: 소속 회사가 없는 일반 계정과 회사를 옮긴 과거 작성자의 조회·수정·삭제를 차단했다. 수정·삭제는 같은 회사의 실제 작성자, 팀장, 관리자만 가능하고 협력업체는 기존처럼 본인 작성 건만 조회한다. 삭제 이력 RPC를 찾지 못하면 원본 삭제도 중단하며, 기존 직접 삭제 API는 진행현황 전용 삭제 경로로 유도한다.
- 삭제 RPC는 원본 row 잠금, 서버측 전체 row 스냅샷, 원천 ID 중복 방지, 실제 삭제 1건 검증을 포함하도록 강화했다. 사용자 확인 기준 최신 `supabase_franchise_work_intake_deleted_records_migration.sql`을 2026-07-16 운영 DB에 적용했다. **SQL 등록 완료 확인**.
- 삭제 목록 상세는 별도 요약 카드 대신 기존 진행현황 확인 모달의 전체 필드 renderer를 읽기 전용으로 재사용한다. 입점 요청, 가맹 희망자 등록, 예비 창업자 등록의 삭제 스냅샷을 각 원본 form으로 복원하며, 오래된 형식이나 알 수 없는 유형은 기존 요약 상세를 fallback으로 유지한다.
- 메뉴 활성 상태는 현재 섹션 내부가 아니라 전체 사이드바 항목의 URL 길이를 비교하도록 보정했다. `/dashboard/franchise-leads/work-intake`에서 `진행현황`만 활성화되고 `/dashboard/franchise-leads`의 `모객 DB`는 비활성인 것을 회귀 테스트와 브라우저 DOM으로 확인했다.
- 런타임 원인 감사: H1 `삭제 스냅샷 자체가 일부 필드만 저장한다`는 migration의 `to_jsonb(source row)`와 실제 `snapshot.row.data`로 기각했다. H2 `상세 UI가 일부 필드만 선택한다`는 기존 `buildDeletedRecordDetails` 출력과 보정 전 실패 테스트로 확인했고 전체 form 복원 후 통과했다. H3 `모객 DB 중복 활성은 섹션별 경로 비교 때문`은 섹션을 가로지르는 회귀 테스트에서 재현했고 전체 메뉴 최장 URL 비교와 브라우저 active class로 해결을 확인했다.
- 코드리뷰에서 대량 범위 조회가 동일 시각 레코드를 건너뛸 수 있는 비결정적 정렬을 확인해 timestamp 다음 `id` 내림차순 정렬을 추가했다. 최종 gate review는 `PASS`였다.
- 검증: 기존 관련 테스트 29건에 삭제된 3개 유형 전체 form 복원, 과거 선택값·상태값·면적 단위·여러 줄 메모 보존, 외부·경로 이탈 첨부 URL 차단, 메뉴 단일 활성과 숨김 메뉴 회귀 테스트 14건을 추가해 통과했고, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. Playwright로 1920px에서 `1/2 → 2/2` 페이지 이동과 기존 삭제 상세를 확인했으며, 후속 보정 QA는 1440px·390px에서 전체 삭제 폼, 과거 선택값 노출, 메뉴 단일 활성, 가로 overflow 0, 콘솔 오류 0건을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했고 최종 gate review는 `PASS`였다.
- 후속 상세·메뉴 보정 검증: `dev` `7c1a143`과 release에서 회귀 테스트 16건, `tsc`, lint, build, `git diff --check`를 통과했다. 보안 리뷰에서 확인한 legacy URL-only 첨부의 교차 매물 연결 가능성을 차단해 현재 Supabase origin과 삭제 원본 ID 경로가 모두 일치할 때만 복원한다. 1440px·390px mock browser QA에서 삭제 스냅샷의 임대 조건·면적·지원 조건·메모·후속 조치가 읽기 전용 폼에 복원되고, 활성 메뉴가 `진행현황` 하나이며 가로 overflow와 console error가 0건임을 확인했다.
- 배포 확인: 보안 보강을 포함한 release `c85bf36` preview `dpl_5b7MS7Cikc1k4odMVWDs6Qui1eE6`는 `naeilsajang`의 `preview / Ready`다. main/production은 최종 review gate와 main PR 통과 후 반영한다.

### 2026-07-15

- 전자결재 문서 상세의 PDF와 첨부파일 다운로드를 인증 헤더가 포함된 공통 fetch/Blob 흐름으로 분리했다. 브라우저가 보호 API URL을 직접 여는 방식에서 발생하던 `AUTH_REQUIRED` 응답을 차단하고 서버 오류 메시지를 사용자 알럿에 유지한다.
- PDF 생성 글꼴은 한글 glyph를 포함한 Noto Sans KR TrueType 파일로 고정하고 서버 인스턴스에서 캐시한다. PDF 응답은 불필요한 수동 stream 래퍼 없이 완성된 바이트와 RFC 8187 한글 파일명을 반환한다.
- 검증: 다운로드 인증·오류 메시지·한글 glyph·A4 페이지·응답 바이트 집중 테스트 9건, 전체 자동 테스트 727건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- 브라우저 QA: 로그인된 로컬 전자결재 문서에서 `PDF 내려받기`를 실행해 10,343바이트 파일을 저장했다. macOS 미리보기와 PDF 렌더링 결과에서 한글 제목·본문·푸터가 보였고 빈 페이지가 아니었다. 다운로드 중 auth 오류와 console error는 없었다.
- 데모 영향과 SQL: 기존 문서 상세 다운로드만 복구하므로 `/landing`, `/demo` 시나리오 변경은 없고 신규 SQL도 없다.

### 2026-07-13

- 진행현황의 `입점 요청 확인/수정` 모달에 등록 주소 기반 Kakao 지도, Kakao 지도 외부 열기, 첨부 이미지 큰 화면·썸네일·이전/다음 탐색을 추가했다. 임대 조건 요약과 금액 입력은 보증금, 월세, 관리비, 권리금에 천 단위 쉼표를 표시한다.
- 검증: 입점 요청 request/첨부 upload/access/display 관련 테스트 14건, property registration 테스트 3건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- 브라우저 QA: 로컬 `http://localhost:3220/dashboard/franchise-leads/work-intake?tab=properties`에서 첨부 3장 mock 기준 이전/다음 버튼의 `1 / 3 -> 2 / 3` 전환, 활성 파일명, 보증금 `4,000`, 월세 `350`, 1440px·390px page-level horizontal overflow 0건을 확인했다. Kakao SDK는 등록되지 않은 로컬 포트에서 `ERR_BLOCKED_BY_ORB`로 차단되어 지도 fallback과 외부 Kakao 지도 링크를 확인했으며, 실제 타일·마커는 허용 도메인인 `www.fcerp.co.kr` 배포 후 확인한다.
- 런타임 가설 검증: H1 사진 배열 변경 시 index 기반 선택이 다른 사진을 가리킬 수 있다는 리뷰를 파일 identity 기반 선택으로 보강했고, 좌우 버튼과 `ArrowRight`가 모두 `2 / 3`과 동일 활성 파일을 표시하는 것을 확인했다. H2 초기 금액 문자열이 쉼표 포맷을 우회할 가능성은 실제 입력값 `4,000`, `350`, `50`으로 반증했다. H3 로컬 지도 실패가 지오코더 로직이 아니라 SDK 도메인 제한이라는 가설은 Kakao SDK 요청의 `ERR_BLOCKED_BY_ORB`, 지도 fallback, 정상 외부 지도 링크로 확인했으며 운영 도메인 타일 검증을 배포 게이트로 둔다.
- 리뷰 보정: 주소 입력 중 지오코딩은 350ms debounce하고, 지도 host는 `ResizeObserver`와 지연 relayout으로 모달 크기 변화를 반영한다. 지오코더 예외 fallback, 지도 상태 live region, 사진 탐색 그룹의 키보드 안내도 추가했다.
- 데모 영향: 기존 진행현황 상세 확인 UX만 보강하므로 `/landing`, `/demo` 시나리오 변경은 없다. 신규 SQL도 없다.

### 2026-07-10

- 운영에 직접 배포된 기능 브랜치 `955f42b`가 `main`에 없던 상태를 해소하기 위해 `my_project_main_release`에서 기능 브랜치를 병합했다. main 고유 5개 커밋과 기능 브랜치 고유 14개 커밋이 분기된 상태였으며, 점주 포털 관련 충돌은 최신 운영 정책인 체크리스트 승인 제외, 발송 이력 목록, 공지 첨부/삭제 연동을 유지하도록 해결했다. main 전용 물건지 지도 반경 보정은 자동 병합 결과에 유지했다.
- main 병합 커밋: `12ba4fb merge: 공통 일정과 점주 소통 운영 반영`.
- 병합 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts src/lib/franchise-workflow.test.mts src/lib/franchise-supervision.test.mts src/components/franchise/location-map/mapUtils.test.mts` 51건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --cached --check`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 이번 복구 예외: 기능 브랜치가 production에 먼저 배포됐고 dev에는 운영 미검증 고유 커밋이 40개 있어, main에 운영 소스를 먼저 복구한 뒤 main 변경을 dev에 동기화했다. 이 `feature -> main -> dev` 순서는 일회성 복구 절차이며 일반 배포 규칙으로 사용하지 않는다.
- 향후 기본 절차: 최신 dev에서 기능 브랜치를 만들고 `feature -> dev PR -> dev 배포·QA -> main PR -> production` 순서로 진행한다. dev 전체가 운영 준비 상태가 아니면 dev PR의 최종 반영 커밋만 `origin/main` 기반 release 브랜치로 선별하고, release preview에서 smoke와 회귀 QA를 다시 통과한 뒤 main PR을 만든다.
- 병렬 코드리뷰에서 `/schedule`과 고객·명함·물건지·계약 화면의 `/api/schedules` 호출이 보호 API 전환 후에도 세션 header를 누락한 문제를 확인했다. 모든 일정 API 호출에 `getApiAuthHeaders()`를 적용하고, 향후 보호 API 정책 변경 시 기존 호출부 전수 검색과 로그인 세션 CRUD QA를 릴리즈 규칙에 추가했다.
- 점주 체크리스트 모바일 문장은 단어 중간에서 부자연스럽게 끊기지 않도록 `word-break: keep-all`과 긴 문자열 fallback을 적용했다. 구조 개선 후속으로 `franchise-workflow-store.ts`, `OwnerPortalPanelSections.tsx` 책임 분리, 공지 Office/HWPX 첨부의 컨테이너 검증, 회사 범위 route/RLS 통합 테스트 보강을 추적한다.
- `supabase_franchise_approval_calendar_migration.sql`은 사용자 확인 기준 운영 DB 적용 완료다. **SQL 등록 완료 확인**.
- 데모 영향: 이번 작업은 이미 검증된 기능을 main/dev 기준점에 동기화하는 릴리즈 작업이므로 `/landing`, `/demo` 콘텐츠 변경은 없다.
- 최종 브랜치 동기화: `origin/main`은 `b6d4559`, `origin/dev`는 `3793d08 merge: main 운영 기준점을 dev에 동기화`까지 반영했다. 기능 커밋의 main 포함, main의 dev 포함, 각 로컬/원격 parity `0 0`을 확인했다. dev 역병합 결과는 관련 테스트 83건, `tsc`, lint, build를 통과했다.
- 운영 재배포: main worktree에서 `naeilsajang` production을 배포해 `dpl_7am4D2Devjn3EQhGE8ZYhUQVekNW` READY와 두 운영 도메인 alias를 확인했다. `/login`, `/schedule`, `/owner/opening-tasks`는 200, 보호 API 3개는 비로그인 401, 배포 후 error/500 로그는 0건이었다. 점주 체크리스트 mock 비교는 1440px/390px 접힘·펼침 모두 유사도 100점, horizontal overflow 0, console error 0이었다.
- protected branch 경고: 이번 사용자 승인 릴리즈의 main/dev 직접 push는 GitHub에서 `PR required`, `merge commits prohibited`, `Required status check Vercel` 경고를 rule bypass로 통과했다. 향후 기본 절차는 통합 브랜치 PR, 필수 Vercel check, squash/rebase 또는 cherry-pick 기반 선형 이력으로 변경하고, 직접 push/bypass는 명시적 긴급 예외로만 허용한다.
- Vercel Git 연동: 운영 재배포 결과를 기록한 main 문서 커밋도 자동 production 배포를 생성했다. 앞으로 릴리즈 문서는 가능한 한 배포 전에 확정하고, 배포 후 문서 push가 불가피하면 deployment ID를 반복 커밋하지 않고 모든 main push가 끝난 뒤 최종 inspect 결과를 최종 보고에 남긴다.

### 2026-07-09

- 점주 포털 로그인 링크를 회사명 query가 붙은 긴 URL에서 `/owner/login/{companyId}` 형태의 회사별 단축 링크로 변경했다. 본사 `점주 소통 > 점주 계정 설정`은 이 링크를 복사하게 하고, 점주 로그인 화면은 회사명 입력/표시 필드를 숨겨 아이디와 비밀번호만 입력한다. 기존 `?companyId=` 링크는 호환용으로 유지한다.
- 점주용 운영 체크리스트 화면은 완료 요청률과 남은 항목 수를 먼저 보여주고, 본사 체크리스트 설정 화면은 전체 가맹점 저장과 여러 개별 운영점 일괄 저장 흐름으로 정리했다.
- 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `git diff --check`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`를 통과했다.
- 로컬 확인: `http://localhost:3000/owner/login/92924bd6-b2a1-49bb-844b-05eabcc51bbf`가 200 응답을 반환하고, 렌더 HTML의 로그인 폼에는 `점주 포털`, `아이디`, `비밀번호`만 노출되며 `회사명` 필드가 보이지 않는 것을 확인했다.
- 이번 점주 포털 단축 링크/체크리스트 UI 보강 범위의 신규 SQL은 없다.
- 점주 공지/공문에 첨부 파일 발행과 점주 다운로드 링크를 추가했다. 본사는 이미지/PDF/문서 파일을 최대 5개, 파일당 10MB까지 선택해 공지와 함께 발행하고, 본사 읽음 현황과 점주 `/owner/notices`에서 파일명·용량·다운로드 링크를 확인한다.
- 공지 첨부 메타데이터는 신규 `franchise_owner_notices.attachments` JSON 컬럼에 저장한다. 기존 DB에 해당 컬럼이 없으면 본사 공지 목록과 점주 포털 대시보드는 첨부 없이 기존 조회로 fallback하고, 첨부 업로드는 `supabase_franchise_owner_notice_attachments_migration.sql` 적용 안내로 막는다. **SQL 등록 필요**.
- 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 브라우저 QA는 로컬 production 서버 `http://localhost:3137`에서 본사 공지 첨부 선택, 발행 확인 모달, 발행 완료 알럿, 본사 읽음 현황 첨부 링크, 점주 모바일 `/owner/notices` 다운로드 링크를 확인했다. 같은 QA에서 `attachments`가 없는 기존 응답 기준 본사 공지 목록과 점주 `/owner/opening-tasks`가 로딩 오류 없이 렌더되는 것도 확인했다. 추가로 공지 삭제 확인 모달, 삭제 완료 알럿, 본사 목록 제거를 확인했다.

### 2026-07-07

- 슈퍼바이징 `승인·시정요청` 탭의 보고서 검토 화면을 세션 단위로 정리했다. `승인 대기`, `승인 완료 보관함`, `반려 보고서`를 내부 탭으로 분리하고, 전역 처리 이력은 제거했다. 각 보고서의 제출/승인/반려/시정요청 이력은 `보고서 확인` 상세 화면 안의 `이 보고서 처리 이력`에서만 확인한다.
- 검증: `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했다. build는 기존 baseline-browser-mapping/Browserslist/root inference 경고만 출력했다.
- 브라우저 QA: 로컬 `http://localhost:3000/dashboard/franchise-operations`에서 `내일 / 관리자` 세션으로 `슈퍼바이징 > 승인·시정요청`에 진입했다. 기본 세션은 `승인 대기 0`만 표시하고 전역 `전체 처리 이력`은 노출되지 않았다. `승인 완료 보관함`에서 승인 보고서 1건을 확인했고, `보고서 확인`을 연 뒤에만 `이 보고서 처리 이력`이 표시되는 것을 확인했다. 승인 완료 보고서 상세는 읽기 전용 상태로 확인했다.
- 이번 슈퍼바이징 보고서 이력 UI 정리 범위의 신규 SQL은 없다.

### 2026-07-01

- 운영 배포 전 검증으로 `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/api-auth.test.mts src/app/api/users/userRouteHelpers.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts`, `npm run build`를 통과했다.
- Vercel dry-run에서 배포 대상 프로젝트가 `naeilsajang`, framework가 Next.js로 감지되는 것을 확인했다. 첫 dry-run에서 루트 `.omo`, `.claude`, `.agents` 등 로컬 작업 산출물이 업로드 대상에 포함되는 문제가 보여 `.vercelignore`를 추가했고, 재확인에서 `.env.local`, `.next`, `.vercel`, `node_modules`, `.omo`, `MAC_CONTEXT.md`, `ERP/web/handoff.md`가 ignored 목록에 포함되는 것을 확인했다.
- 운영 배포는 `dpl_CEyXPQ2hVy5PnifeFkUMpcesxLLN`으로 완료됐다. `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다.
- 운영 smoke로 `curl -I -L https://www.fcerp.co.kr/login`, `curl -I -L https://www.fcerp.co.kr/landing`이 200 응답을 반환했다. 배포 직후 error log scan은 `No logs found`였다.
- 이번 배포 중 신규 SQL은 없다. 사용자 확인 기준 `supabase_franchise_location_meeting_tool_versions_migration.sql`은 실서버 등록 완료 상태다. Vercel 원격 빌드는 Node.js 20 deprecation 경고를 출력했으므로 2026-10-01 전 Node.js 24.x 전환을 검토한다.

### 2026-06-30

- Kakao 비즈니스 심사 대응을 위해 공개 화면 하단에 사업자정보 푸터를 추가했다. `/landing`, `/login`, `/signup`, `/privacy`에 `상호: 주식회사 내일사장`, `대표: 박규태`, `사업자등록번호: 448-81-03095`, `주소: 경기도 하남시 조정대로45 미사센텀비즈 F922`, `이메일: cs@sajang.app`, `연락처: 070-8095-2881`을 노출한다. 개인정보처리방침 문의 이메일도 `cs@sajang.app`로 맞췄다.
- `/dashboard/franchise-leads/work-intake` 진행현황 표에서 수정/삭제 권한이 없는 행의 관리 칸에 `작성자/팀장/관리자만 가능` 안내 문구를 표시하지 않고 빈칸으로 남기도록 정리했다. 권한 정책 자체는 기존 작성자, 같은 회사 팀장, 관리자 예외를 유지한다.
- 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3107`에서 Playwright로 `/landing`, `/login`, `/signup`, `/privacy`를 1280px/390px에서 확인했다. 각 화면의 사업자정보 푸터 노출, 텍스트 일치, horizontal overflow 0건을 확인했다. `작성자/팀장/관리자만 가능` 문구는 `src`와 `.next` 산출물에서 미노출을 확인했다.
- 이번 공개 사업자정보/진행현황 권한 안내 문구 정리 범위의 신규 SQL은 없다.
- `/dashboard/franchise-leads/work-intake` 진행현황의 입점 요청/예비 창업자 등록에 삭제 기능을 추가했다. 수정과 삭제 권한은 실제 작성자, 같은 회사 팀장(`manager`), 관리자 예외로 제한하고, 팀장/관리자가 수정해도 기존 작성자/담당자 값이 바뀌지 않도록 전용 mutation API에서 기존 row의 `manager_id`를 보존한다.
- 진행현황 전용 mutation API(`/api/franchise-work-intake/[kind]/[id]`)를 추가하고, 기존 `properties`, `franchise_leads`, `franchise_lead_registration_requests` 직접 수정/삭제 API로 진행현황 레코드를 우회 변경하는 경로도 같은 권한 정책으로 막았다.
- 출점 검토 리포트의 수익분석표 프리셋 UI를 `목표매출` 입력 아래 보조 옵션처럼 보이지 않도록 `분석표 프리셋` 툴바로 분리했다. 회사 공용 성격은 배지로 표시하고, 목표매출 변화/목표매출 입력보다 앞에 배치했다.
- 검증: `npx tsx --test src/lib/work-intake-access.test.mts src/app/(main)/dashboard/franchise-leads/work-intake/requests.test.mts src/app/api/franchise-work-intake/route.test.mts src/lib/franchise-lead-access.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3108`에서 실제 보호 라우트는 Supabase 세션 없이 `/login`으로 리다이렉트되는 것을 확인했다. 대신 현재 CSS module과 JSX 상태를 반영한 Playwright harness로 진행현황 desktop/mobile의 수정/삭제/권한 안내 상태, 프리셋 desktop/mobile의 `분석표 프리셋` 선배치와 모바일 overflow 0건을 확인했다.
- 이번 진행현황 권한/삭제 및 프리셋 UI 정리 범위의 신규 SQL은 없다.
- 실서버 개인정보 수정에서 `수정 실패: 사용자 정보를 다시 불러오지 못했습니다.`가 표시되던 문제를 수정했다. 저장 API의 최종 프로필 재조회가 다른 인증/로그인 라우트와 달리 `company:companies(...)` 관계를 암묵 추론에 맡겨 production PostgREST에서 빈 재조회로 떨어질 수 있었고, 이를 `company:companies!company_id(...)`로 명시했다. 프로필 업데이트 실패도 무시하지 않고 즉시 오류로 처리하도록 보강했다.
- `/dashboard/franchise-leads/work-intake` 진행현황의 입점 요청 목록에서 회사명 옆에 작성자 표시를 추가했다. API는 `properties.manager_id`를 함께 조회해 회사 프로필 표시명으로 변환하고, 행 메타는 `회사명 / 작성자 이름 / 상태` 형태로 표시한다.
- 검증: `npx tsx --test src/app/api/user/update/route.test.mts src/lib/profile-contact.test.mts src/lib/user-role-policy.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 추가 단위 검증: `npx tsx --test src/lib/work-intake-display.test.mts src/app/api/franchise-work-intake/route.test.mts src/app/api/user/update/route.test.mts`를 통과했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3106`에서 Playwright auth/API mock으로 `/profile`을 열고 이메일 `manager-updated@mirae.test`, 휴대폰 `010-9999-8888` 저장 요청과 성공 모달 `회원정보가 수정되었습니다.`를 확인했다. 같은 세션에서 `/dashboard/franchise-leads/work-intake`를 열고 입점 요청 행의 `미래 / 작성자 김팀장 / 공실` 표시를 확인했다. console/page error 0건, 1440px body overflow 0건이었다.
- 이번 개인정보 저장 핫픽스 범위의 신규 SQL은 없다.
- 직원 관리에서 기존 회사 브랜드 임직원 가입자가 `sub_manager`(매니저)로 접수되는 정책과 화면 분류가 어긋나 직원 목록/승인 대기에서 누락될 수 있던 문제를 수정했다. `sub_manager`와 `staff`를 회사 직원 그룹으로 함께 표시하고, 팀장 승인/팀장 승격 대상에도 매니저를 포함했다.
- 개인정보 수정 화면에 등록 이메일과 휴대폰 번호 입력을 추가했다. 저장 API는 본인 인증 세션 기준으로만 수정되며, 이메일 변경 시 Supabase Auth 이메일과 `profiles.email`을 함께 갱신하고 휴대폰은 `profiles.phone`, `profiles.phone_normalized`에 저장한다. 회사 로고 등록/삭제 UI와 API는 팀장(`manager`)만 사용할 수 있도록 제한했다.
- 검증: `npx tsx --test src/lib/user-role-policy.test.mts src/lib/profile-contact.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3105`에서 Playwright auth/API mock으로 `/company/staff`와 `/profile`을 확인했다. 직원 관리에서 `sub_manager`와 `staff`가 `직원 (2)`로 표시되고 `sub_manager` 가입 요청이 `승인 대기 중인 가입 요청 (1)`에 표시되는 것을 확인했다. 프로필 화면에서는 팀장에게만 `로고 등록` 버튼이 보이고, 매니저 계정에서는 숨겨지며 이메일/휴대폰 값이 표시됐다. console/page error 0건이었다.
- 이번 직원 관리/개인정보 수정 범위의 신규 SQL은 없다.
- OAuth 심사 영상과 신규 도메인 공개 진입을 위해 `/landing` 상단 메뉴에 `로그인` 링크를 추가했다. 사용자는 랜딩 페이지에서 바로 `/login`으로 이동할 수 있다.
- 로그인 화면의 브랜드명을 `부동산 ERP`에서 `프랜차이즈 본부 ERP`로 변경하고, 부제도 `창업 및 부동산 전문가를 위한 통합 솔루션`으로 정리했다. `/signup`, `/privacy`, 앱 metadata도 `프랜차이즈 본부 ERP` 기준으로 맞췄다.
- 출점 검토 리포트의 `PDF 저장`/`인쇄`가 새 창에서 `about:blank`로 남는 문제를 수정했다. 보고서 새 창은 `document.write` 대신 Blob URL로 완성된 HTML을 열고, 로드 완료 후 브라우저 인쇄를 실행한다.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `http://localhost:3114`에서 Playwright로 1280px/390px `/landing` 로그인 링크 노출, 클릭 시 `/login` 이동, `/login`의 `프랜차이즈 본부 ERP` 노출과 `부동산 ERP` 미노출, `/signup`/`/privacy`의 `프랜차이즈 본부 ERP` 문구를 확인했다. console/page error는 없었다.
- 추가 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 7건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. Playwright 브라우저 스모크로 보고서 새 창이 `blob:` URL로 열리고 본문 `출점 검토 리포트`가 비어 있지 않게 로드되는 것을 확인했다.
- 이번 OAuth 공개 진입점/리포트 PDF·인쇄 blank 핫픽스 범위의 신규 SQL은 없다.

### 2026-06-29

- 회원가입 화면 입력 순서를 회사 찾기 우선 흐름으로 변경했다. 회사명 선택 후 아이디, 이메일, 비밀번호, 비밀번호 확인, 이름, 휴대폰 번호를 입력하도록 정리했다.
- 회원가입 클라이언트/서버 양쪽에 이메일 `@` 누락 안내와 비밀번호 확인 불일치 안내를 추가했다. 휴대폰 번호는 숫자 입력만으로 `010-1234-5678` 형태로 표시되며 서버 저장용 정규화는 기존처럼 숫자만 사용한다.
- 브랜드 임직원 가입 승인 정책을 백엔드 기준으로 보정했다. 기존 회사에 팀장이 없으면 팀장 권한으로 관리자 승인 대기, 팀장이 있으면 매니저 권한으로 팀장 승인 대기 상태가 된다.
- Solapi SDK 기반 회원가입 문자 알림을 추가했다. 회원가입 요청 시 관리자 수신 번호로 `[ERP] 회원가입 요청` 문자를 보내고, 승인 완료 시 신청자에게 `[ERP] 회원가입 승인` 문자를 보낸다. 문자 발송 실패는 가입/승인 트랜잭션을 실패시키지 않고 서버 로그로만 남긴다.
- `/demo`는 대시보드와 모객 DB 가이드 단계를 실제 설명 흐름에 맞춰 조정했다. 필터, 1차 유입 DB, 개별 상세, 승격, 가맹 희망자 단계와 상세 드로어가 안내 순서에 맞게 이어지며, `건너뛰기` 버튼은 `둘러보기`로 바꿨다.
- 어드민 관리 홈에서 회사별 전자계약 사용량 표와 회사별 메뉴 관리 패널을 분리했다. 관리 메뉴에 `전자계약 관리`와 `회사별 메뉴 관리` 전용 진입점을 추가하고, 각각 `/admin/electronic-contracts`, `/admin/company-access` 페이지로 이동한다.
- 회사별 전자계약 사용량 화면은 `새로고침` 버튼을 제거하고 회사명/회사 ID 검색, 사용 상태 필터, 사용량/회사명/최근 발송·완료 기준 정렬, 10/20/50개 페이지네이션을 추가했다.
- `회원 및 권한 관리`는 전체/승인대기 탭을 필터 바 안으로 통합하고, 이름/로그인 ID/이메일/회사명 검색, 상태/권한/회사 필터, 가입일/이름/로그인 ID/회사명/권한/상태 정렬, 페이지네이션을 추가했다.
- 검증: `npx tsx --test src/lib/signup-approval-policy.test.mts`, `npx tsx --test src/lib/solapi-notifications.test.mts`, `npx tsx --test src/app/demo/demoContent.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`를 통과했다. Playwright로 `/signup` 390px에서 필드 순서, 이메일 `@` 안내, 비밀번호 불일치 안내, 휴대폰 자동 하이픈을 확인했다.
- 추가 검증: `npx tsx --test src/app/admin/electronicContractUsageTableState.test.mts src/app/admin/users/adminUsersTableState.test.mts`로 전자계약 사용량/회원 관리 필터·정렬·페이지네이션 순수 로직을 확인했다. 로컬 production 서버 `127.0.0.1:3094`에서 Playwright API mock으로 `/admin`, `/admin/electronic-contracts`, `/admin/company-access`, `/admin/users`를 확인했고, 관리 홈의 전자계약 사용량 표 미노출, 새 관리 메뉴 2개, 전자계약 사용량 새로고침 버튼 미노출, 검색/필터/페이지네이션 조작, 회원 관리 검색/상태·권한 필터/페이지네이션 조작, console/page error 0건을 확인했다. 남은 QA: Solapi 실문자 발송은 운영 환경변수와 실제 수신 번호가 설정된 실서버에서 승인/가입 요청 흐름으로 확인한다. 이번 작업의 신규 SQL은 없다.

### 2026-06-09

- Meta Lead Ads는 계정/앱 설정 이슈 때문에 HOLD로 전환했다.
- 프랜차이즈 본사용 흐름을 `후보자 관리`, `출점 후보지 관리`, `현재 운영 점포 관리`, `브랜드 모니터링`으로 분리했다.
- 위치 마스터는 `franchise_locations` 기반으로 출점 후보지와 운영 점포를 같은 데이터 구조에서 관리하되 화면 목적을 분리했다.
- 브랜드 마스터는 회사 저장 브랜드와 정보공개서 기반 공용 브랜드를 분리하는 방향으로 구현했다.
- 브랜드 검색과 주소 검색은 점포 신규등록에서 쓰는 모달형 UX에 맞췄다.
- 정보공개서 브랜드 검색은 공공데이터포털 공식 API를 우선 사용하고, 공식 API 결과가 부족하면 로컬 캐시를 보조로 병합한다.
- 경쟁환경 패널은 목록 내부 펼침에서 모달 상세 보기로 변경했다.
- 경쟁사 정렬은 고정 1순위 없이 `100m 거리 구간 -> Naver 리뷰 총량 -> 실제 거리` 기준으로 정했다.
- Google Places는 비용 절감을 위해 Text Search의 평점/리뷰 수만 사용하고 리뷰 본문은 수집하지 않는다.
- Kakao Local 공식 API는 리뷰 수/본문을 제공하지 않으므로 Kakao맵 링크 연결만 제공한다.
- SearchAPI는 Naver 장소형 리뷰 수집 품질이 좋아 우선 provider로 설정했다.
- SerpApi는 fallback 후보로 유지하지만 현재 테스트 기준 Naver Place 리뷰 수집 품질이 낮다.
- `goaldeer/naver-place-rank-tracker`는 Naver Place 순위 POC 참고용으로만 검토했다.
- `chalkpe/naver-place`는 오래된 `store.naver.com` 기반이라 현재 수집 목적에는 부적합하다고 판단했다.
- Docs Steward 감사에서 README의 기본 Next.js 템플릿 안내를 ERP/web 실행, SQL, env, 문서 맵 중심으로 정리했다.
- Docs Steward 감사에서 `LocationCompetitionPanel`의 `Naver 미수집`/`수집오류` 계열 문구와 경쟁사 API 로직을 검색해 SearchAPI 429 보존/상태 분리 P0가 아직 완료되지 않았음을 확인했다.
- 네이버부동산/당근부동산 기반 외부 매물 수집 MVP를 상가 전용으로 축소했다.
- `realty_import_jobs`, `external_property_listings` 테이블과 수집 API를 추가하고, 외부 매물을 점포목록과 분리된 원본 목록으로 저장하도록 구현했다.
- 진입점은 물건지 상세가 아니라 `/dashboard/franchise-leads/market-insights?tab=realty-import`의 `외부 상가 수집` 탭으로 배치했다.
- 구 단위 당근 검색은 지역 API 후보를 동 단위로 확장해 수집하도록 보정했다.
- 당근 목록 호출은 `salesType=store`를 명시해 전체 매물 중 일부만 상가로 필터링되던 누락을 줄였다.
- 외부 수집 결과 표는 당근 요약 매물명 대신 주소를 기본 식별값으로 표시하고, 가격, 면적/층, 관리비, 사용승인일, 등록일, 채팅/관심 수, 사진 수, 설명 일부, 원문 링크를 노출한다.
- 화면 수집 요청은 2000건, import API 안전 상한은 3000건으로 조정했다. 저장 목록 API는 최대 2000건까지 조회한다.
- 중복 원본은 `company_id + source + source_listing_id` 기준으로 관리한다.
- 점포목록 자동 등록은 끄고, 향후 선택한 외부 매물만 ERP 물건지로 승격하는 방식으로 분리했다.
- `realty_import_jobs`가 schema cache에 없을 때 `Realty import failed` alert가 뜨던 문제를 확인하고, SQL 미적용 시 migration 적용 안내를 반환하도록 보정했다.
- 당근 지도 숫자는 지도 클러스터/필터/뷰포트 집계라 동별 공개 목록 응답 수집 건수와 1:1로 맞지 않을 수 있으며, 현재 MVP는 숫자 완전 일치보다 검토 가능한 후보 정리를 우선한다.
- 방향, 입주가능일, 화장실, 주차, 위반건축물, 건축물 용도, 세부 위치/특징은 상세 페이지 추가 호출이 필요하므로 상위 N건 선택 보강 대상으로 분리했다.
- 네이버부동산 POC는 단일 `articleList` 호출에서 모바일 `clusterList -> articleList` 흐름으로 보강했다.
- 당시 UI에서는 네이버를 보조 POC로 분리 표시했으나, 빈 응답/429/구조 변경 가능성이 있어 현재 MVP에서는 제거하고 당근 상가 수집만 유지한다.
- 네이버부동산 대안 조사를 진행했다. `single-markers/2.0` 계열 예시는 아파트/단지 마커 요약에 가까워 상가 목록 수집에는 바로 맞지 않고, `clusterList -> articleList` 계열은 서버 호출에서 빈 응답/429가 반복될 수 있어 MVP 완료 조건에서 제외했다.
- 네이버부동산은 향후 `사용자 URL/CSV import -> 로컬 Chrome 세션 기반 캡처 POC -> provider/proxy 어댑터` 순서로 재검토한다.
- 2026-06-10 외부 상가 수집 UI/API에서 네이버 보조 POC를 제거하고 Daangn 상가 단일 수집으로 정리했다.
- 2026-06-10 등록 회사명 입력을 제거했다. 회사 범위가 있으면 `company_id`, 회사 범위가 없으면 `requester_id` 기준 수집함에 저장하도록 realty migration/API를 보정했다.
- 2026-06-10 수집 지역 입력을 시도/시군구 선택 방식으로 변경하고, 하단 `저장된 상가` 목록과 `최신화` 버튼을 추가했다. 최신화는 같은 `sourceListingId`를 중복 추가하지 않고 신규 매물만 추가한다.
- 2026-06-10 저장 목록을 저장 시군구 칩, 동 단위 카드, 동 내부 페이지네이션 구조로 고도화했다. 전체 매물을 먼저 페이지로 자른 뒤 동을 나누지 않고, 모든 동 카드를 먼저 보여준다.
- 2026-06-10 저장 목록에 저장일 컬럼과 별표 토글을 추가했다. 별표는 `external_property_listings.data.favorite`에 저장하고 재수집 업데이트 시 보존한다.
- 2026-06-10 requester/company 스키마 drift 대응을 추가했다. `external_property_listings.requester_id`가 없는 구형 스키마에서는 명확한 migration 안내를 반환한다.
- 2026-06-10 저장 목록 1차 점수화를 추가했다. 추천점수 컬럼, 별표만/1층만/관리비 확인 필터, 추천점수/최근 저장/월세/면적/관심 정렬을 제공한다.
- 2026-06-10 저장 목록 1차 지도화를 추가했다. 열린 동 카드의 현재 페이지 주소를 대상으로 저장 좌표 또는 Kakao 브라우저 지오코딩 좌표를 지도에 표시한다.
- 2026-06-10 저장 목록 지도 우측 번호 목록을 제거하고, 하단 표의 `지도` 컬럼에 마커 번호를 매칭했다. 표의 지도 번호나 주소를 누르면 해당 지도 마커가 선택된다.
- 2026-06-10 외부 상가 수집은 Daangn 저장/지도/점수화 MVP까지 우선 완료하고, 신규 기능 개발은 모객 DB 업무 큐 강화와 점포·상권 매칭으로 전환했다.
- 2026-06-10 모객 DB `오늘 할 일`을 `업무 큐`로 확장했다. 최종 업무 큐는 전체 업무/연락 지연/오늘 연락/무응답 기준이며, 후보자별 다음 액션, 상담 결과, 이탈 사유, 자금/지역/브랜드 적합도 저장 흐름을 추가했다.
- 2026-06-10 후보자 상세 패널에 출점 후보지와 외부 상가 DB를 연결하는 점포·상권 매칭 영역을 추가했다. 자동 점수 추천보다 담당자 수동 연결과 상태/메모 관리를 우선한다.
- 2026-06-10 모객 DB에 `1차 유입 DB -> 후보자` 단계를 추가했다. Meta Lead Ads와 엑셀 업로드는 원천 DB로 저장하고, 의사가 확인된 DB만 `후보자 승격` 액션으로 파이프라인/업무 큐/점포·상권 매칭 대상이 된다.
- 2026-06-10 업무 큐를 `전체 업무`, `연락 지연`, `오늘 연락`, `무응답`으로 단순화했다. 계약 가능/즉시상담은 업무 큐에서 제외하고, 계약 상태는 별도 상태 관리로 본다.
- 2026-06-10 후보자 상세의 점포·상권 매칭을 자동추천 카드에서 담당자 수동 연결 패널로 전환했다. `출점 후보지`와 `외부 상가 DB`를 검색해 연결하고 상태/메모를 저장한다.
- 2026-06-10 후보지 연결은 같은 출점 후보지나 외부 상가를 여러 후보자에게 중복 연결할 수 있게 했다. 연결 기록은 `franchise_leads.data.locationLinks`에 배열로 저장한다.
- 2026-06-11 로그인 세션 기준 P0 QA를 완료했다. 관리자 테스트 세션(자격증명 마스킹)에서 QA 리드를 `1차 유입 DB`로 생성하고, UI의 `후보자 승격` 액션으로 후보자 레이어에 이동하는지 확인했다.
- 2026-06-11 업무 큐 QA에서 QA 리드 기준 `전체 업무 1`, `연락 지연 1`, `오늘 연락 0`, `무응답 1`이 실제 카드 목록과 일치했다. 연락 지연 리드는 오늘 연락보다 지연 분류가 우선 적용된다.
- 2026-06-11 후보자 상세의 업무 관리 필드(`nextAction`, `consultationResult`, `churnReason`, `budgetFit`, `regionFit`, `brandFit`)를 저장하고 새로고침 후 API와 화면 활동 이력에서 유지됨을 확인했다.
- 2026-06-11 후보자 상세 후보지 연결 QA 중 같은 후보자 안에서 동일 출점 후보지가 중복 연결되는 버그를 발견했다. `addUniqueLeadLocationLink` 유틸과 화면 guard를 추가해 동일 후보자 내 동일 대상 중복을 막고, 여러 후보자 간 동일 대상 연결은 계속 허용하는 정책으로 정리했다.
- 2026-06-11 후보자 상세에서 `출점 후보지` 연결, `외부 상가 DB` 연결, 외부 상가 중복 연결 차단, 연결 메모 저장, 연결 삭제를 Playwright로 확인했다.
- 2026-06-11 외부 상가 수집 실데이터 QA를 진행했다. `서울 광진구 화양동`, Daangn, 상가, limit 20으로 실행해 원본 237건 중 20건 저장, 신규 4건/업데이트 16건, 전체 저장 목록 773건 조회를 확인했다.
- 2026-06-11 외부 수집의 점포목록 자동 등록 금지를 확인했다. 수집 전후 `properties` 수 변화는 0이었고, `registerToProperties: true` 요청은 400과 “ERP 물건지 등록은 별도 선택 승격 플로우” 안내로 차단됐다.
- 2026-06-11 선택한 외부 상가를 ERP 물건지로 승격하는 흐름을 추가했다. `/api/realty/listings/promote`가 외부 원본 1건을 `properties.operation_type='external'`, `data.externalImportMode='manual-promoted'` 물건지로 생성하고 원본 `property_id/status/data.promotedToPropertyId`를 갱신한다.
- 2026-06-11 외부 상가 저장 목록 UI에 `승격` 열을 추가했다. 미승격 행은 `물건지 등록`, 승격 완료 행은 `승격됨`으로 표시하며, 저장 후 새로고침해도 `승격됨` 상태가 유지됨을 확인했다.
- 2026-06-11 외부 상가 승격 재호출은 `action='existing'`으로 같은 `propertyId`를 반환해 중복 ERP 물건지를 만들지 않음을 확인했다.
- 2026-06-11 외부 상가 저장 목록 시각 QA에서 승격 열 추가 후 가격/반응 열이 좁아져 글자가 세로로 쪼개지는 문제를 발견하고, 테이블 최소 폭과 핵심 열 너비를 보정했다.
- 2026-06-11 시각 QA 재확인: 데스크톱 저장 상가 표의 가격/저장일/세부/승격 열은 정상 폭으로 표시된다. 모바일 폭에서는 기존 앱의 고정 사이드바/데스크톱형 레이아웃 때문에 전체 페이지 가로 스크롤이 남아 있어 별도 모바일 레이아웃 과제로 분리한다.
- 2026-06-11 안정화 QA에서 `연락 완료` 저장 흐름을 API/DB 기준으로 재검증했다. `lastContactedAt` 저장, `nextContactAt=null`, `consultationResult='연락 성공'`, `nextAction='미정'`이 유지되고 업무 큐의 무응답/오늘/지연 조건에서 빠지는 것을 확인했다.
- 2026-06-11 후보자 상세의 출점 후보지 연결 상태/메모 저장을 재검증했다. QA 출점 후보지를 연결한 뒤 상태를 `우선검토`, 메모를 `QA 상태 변경 저장`으로 바꾸고 GET reload에서도 그대로 유지됐다.
- 2026-06-11 기존 단계값이 없는 legacy 모객 DB는 `leadStage='candidate'`로 정규화되어 후보자 레이어에 남는 것을 확인했다.
- 2026-06-11 `manual-promoted` 외부 상가 승격 물건지가 점포목록의 외부수집 필터/배지에서 빠지는 문제를 발견했다. `src/lib/property-external-status.ts` 헬퍼와 테스트를 추가하고 `/properties` 목록 필터가 `manual-promoted`를 외부수집으로 인식하도록 수정했다.
- 2026-06-11 외부 상가 수집 scale QA를 진행했다. `서울 마포구 합정동`, limit 5는 기존 저장 행 5건 업데이트로 처리됐고, 같은 조건 재수집도 5건 업데이트로 중복 생성 없이 동작했다.
- 2026-06-11 `서울 광진구`, limit 8 구 단위 수집은 화양동/자양동/구의동/광장동/군자동/중곡동/능동 확장 warning 9건을 반환했고, 기존 저장 행 8건 업데이트로 처리됐다. `registerToProperties: true` 요청은 400으로 차단됐으며 수집 전후 ERP `properties` 수 변화는 0건이었다.
- 2026-06-11 Playwright 로그인 세션에서 `/properties` 외부수집 필터를 클릭해 `manual-promoted` 외부 물건지가 1건 표시되고 배지가 유지되는 것을 확인했다. 새 콘솔 error는 0건이었다.
- 2026-06-11 안정화 QA용으로 만든 리드 3건, 출점 후보지 1건, 수동 QA 외부 원본 1건, 승격 물건지 1건, import job 3건은 검증 후 삭제했다. QA run id는 `QA_STAB_1781140739040`이다.
- 2026-06-11 권한/회사 범위 API QA를 임시 회사 A/B, 회사 없는 requester 2명으로 진행했다. 교차 회사 외부 상가 승격 403, 교차 회사 물건지 상세 403, 교차 회사 가맹 운영 목록 403을 확인했다. 회사 없는 requester는 본인 외부 원본만 조회 가능하고 다른 requester 원본은 숨겨지며, ERP 물건지 승격은 회사 범위 필요 400으로 차단되고 `properties` 자동 생성 0건을 확인했다.
- 2026-06-11 `manual-promoted` 운영 화면 워크플로를 정의하고 구현했다. 점포목록에서 수동 승격한 외부 상가는 `/dashboard/franchise-operations`의 `외부 승격 물건지 운영 전환` 패널에 표시되며, 사용자가 `운영점 등록`을 눌러야 `franchise_locations.source_property_id`가 연결된 `오픈준비` 운영점으로 등록된다. 자동 등록은 하지 않는다.
- 2026-06-11 Playwright 로그인 세션에서 운영 화면 워크플로를 확인했다. `오픈준비 등록 대기` 상태의 `manual-promoted` 물건지를 `운영점 등록`으로 전환하고, 새로고침 후 `운영점 ... 연결됨` 상태가 유지되는 것을 확인했다. 데스크톱 패널과 모바일 사이드바 접힘 상태에서 액션 버튼/배지 줄바꿈도 확인했다.
- 2026-06-11 오픈 준비 프로젝트 MVP를 추가했다. `supabase_franchise_opening_projects_migration.sql`, `/api/franchise-opening-projects`, `OpeningProjectPanel`을 추가해 `오픈준비` 운영점별 상태/목표 오픈일/메모/checklist를 전용 테이블에 저장하도록 했다.
- 2026-06-11 모바일 전역 레이아웃을 보정했다. `MainLayout`의 첫 진입 사이드바 상태를 viewport 기준 hook으로 분리해 390px에서는 기본 접힘, 1440px에서는 기본 열림으로 시작한다.
- 2026-06-11 QA runner를 추가했다. 엑셀 유입(`franchise-p0-lead-ingress-qa.mjs`), role matrix(`franchise-role-matrix-qa.mjs`), 오픈 준비 API(`franchise-opening-projects-api-qa.mjs`), 외부 상가 scale/raw(`franchise-realty-scale-raw-qa.mjs`)는 실제 QA requester/env가 준비되면 live 검증을 수행한다.
- 2026-06-11 신규 계획으로 본사별 정보공개서 문서함과 후보자별 발송 이력, 발송 후 14일 계약 잠금 요구사항을 추가했다. 후보자에게 정보공개서를 발송한 일시/채널/문서 버전/수신 연락처/메모를 남기고, 계약 생성과 가맹금 수령 단계는 계약 가능일 이후로 제한한다. 법령 기준은 국가법령정보센터 가맹사업법 제7조 제3항의 정보공개서 제공 후 14일 제한을 기준으로 한다.
- 2026-06-11 정보공개서 발송/계약 컴플라이언스 MVP를 구현했다. `supabase_franchise_disclosures_migration.sql`, `/api/franchise-disclosure-documents`, `/api/franchise-lead-disclosures`, 후보자 상세 `정보공개서` 섹션, `franchise-leads` 계약 상태 전환 서버 가드를 추가했다. 최신 발송 이력 기준 14일이 지나야 `계약예정`/`계약완료` 상태로 변경 가능하다.
- 2026-06-11 정보공개서 14일 계산/업로드 경로 유닛 테스트 통과: `npx tsx --test src/components/franchise/leadDisclosureFormUtils.test.mts src/lib/franchise-disclosure-deliveries.test.mts src/lib/franchise-leads.test.mts` 결과 10건 통과. `npx tsc --noEmit`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`도 통과했다.
- 2026-06-11 `supabase_franchise_disclosures_migration.sql` 적용 후 Playwright 로그인 세션에서 후보자 상세 정보공개서 live QA를 완료했다. `property-documents/franchise-disclosures/<company>/...` 업로드, 회사 문서함 저장, 후보자 발송 기록, 새로고침 후 문서/발송 이력 유지, 발송 직후 `계약예정` PUT 400 차단과 기존 상태 유지까지 확인했다. 발송 기록 UI에는 `증빙 URL` 입력/링크가 노출되지 않는다. 1440px/390px 시각 QA에서 정보공개서 섹션 내부 overflow 0건을 확인했다.
- 2026-06-11 정보공개서 2차 고도화 계획으로 이메일 자동발송 또는 카카오 알림톡 자동발송을 추가했다. provider 연동 시 발송 요청/성공/실패/수신자/템플릿/재시도 상태를 별도 로그로 남기고, 계약 가능일 계산은 동일한 발송 이력 기준을 유지한다.
- 2026-06-11 다음 P1 계획으로 개별 가맹 희망자 DB의 `계약 전 준비 체크리스트`를 추가했다. 후보자 상세에서 정보공개서 수령 확인, 브랜드/본사 사이트 확인, 예상 투자금 재확인, 희망지역/상권자료 확인, 인근가맹점 현황 확인, 계약 가능일 도래, 계약서/가맹금 안내 같은 스텝을 완료 여부/완료일/처리자/메모로 관리한다. 이 체크리스트는 운영 확인용이며, 14일 계약 잠금의 기준일은 기존 정보공개서 발송 이력 `sent_at`을 유지한다.
- 2026-06-12 계약 전 준비 체크리스트 MVP를 구현했다. `supabase_franchise_contract_checklist_migration.sql`, `/api/franchise-lead-contract-checklist`, 후보자 상세 `계약 전 체크` 섹션을 추가했고, 후보자별 7개 기본 스텝의 완료 여부/완료일/처리자/메모를 별도 테이블에 저장한다. 14일 계약 잠금 기준은 계속 정보공개서 발송 이력 `sent_at`을 사용한다.
- 2026-06-12 계약 전 체크리스트 순수 로직 테스트 통과: `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts` 결과 7건 통과. `npx tsc --noEmit --pretty false`도 통과했다. SQL 적용 후 상세 저장/새로고침 persistence와 교차 회사 차단 live QA가 남아 있다.
- 2026-06-12 계약 전 체크리스트 로컬 API/브라우저 경계 QA를 진행했다. dev 서버는 `/api/franchise-lead-contract-checklist`를 정상 라우팅하며, 초기 SQL 미적용 상태에서는 424와 `supabase_franchise_contract_checklist_migration.sql` 적용 안내를 반환했다. 앱 내 브라우저 1440x900/390x844에서는 `/dashboard/franchise-leads` 접근 시 인증 세션이 없어 `/login`으로 이동했으며, 저장/새로고침 유지 UI QA는 로그인 세션으로 재개한다.
- 2026-06-12 계약 전 체크리스트 목록 가시화와 `계약 점주` 탭을 구현했다. `/api/franchise-lead-contract-checklist/summaries`는 현재 페이지 리드 id 묶음의 7단계 진행률/미완료 라벨을 반환하고, 모객 DB 테이블에는 기본 표시 컬럼 `계약 전 체크`를 추가했다. 상단 `계약 점주` 탭은 `계약완료` 상태를 자동 적용하고, 일반 DB 테이블 대신 계약 전 체크 진행률과 미완료 항목만 보이는 전용 화면으로 정리했다.
- 2026-06-12 코드 리뷰 후 계약 전 체크리스트 보안을 보강했다. `franchise_lead_contract_checklist_steps`는 `lead_id + company_id` composite FK/RLS로 실제 리드 회사와 일치해야 하며, API도 상세/summary 조회에서 `lead_id` 단독 조회를 제거했다. `계약 점주` 탭의 `체크리스트 열기`는 일반 상세 패널이 아니라 체크리스트 전용 패널만 열고, 저장 후 목록 요약 refresh key를 갱신한다.
- 2026-06-12 모객 DB `page.tsx` 구조 분리를 진행했다. 후보자 등록 모달, 빠른 상담 이력 모달, 후보자 상세 패널, Meta 연동 설정 패널을 `src/components/franchise/leads` 하위 컴포넌트로 분리해 route page는 상태/데이터 액션과 화면 조립 역할에 더 가깝게 정리했다. 이어서 Meta 연동, 엑셀 업로드/샘플/실패행 다운로드, 고객 전환, 후보지/외부 상가 연결 action을 `useLeadMetaIntegration`, `useLeadExcelImport`, `useLeadCustomerConversion`, `useLeadLocationLinks` hook으로 분리했다. `page.tsx`는 2392줄에서 1361줄로 감소했다.
- 2026-06-12 구조 분리 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/components/franchise/leads/leadTaskScope.test.mts src/components/franchise/leads/leadTableConfig.test.mts src/components/franchise/leads/leadTableFilters.test.mts src/components/franchise/leads/leadFormFormatters.test.mts`, `git diff --check`, `npm run build` 통과. 빌드는 기존과 같은 `baseline-browser-mapping`, multiple lockfiles/root, Browserslist stale warning만 표시했다.
- 2026-06-11 `franchise-p0-lead-ingress-qa.mjs`가 `xlsx` ESM namespace import에서 `readFile`을 찾지 못해 실패했다. 실제 import shape 확인 결과 `readFile`은 default export에 있어 runner import를 default로 보정했고, 동일 명령 재실행으로 엑셀 fixture 기반 원천 DB 저장/후보자 승격/cleanup을 통과했다.
- 2026-06-11 `franchise-p0-lead-ingress-qa.mjs` 리뷰 개선을 반영했다. runId를 ms+UUID로 바꾸고, fixture를 OS 임시 폴더에 만들며, fetch 15초 timeout과 실패 경로 cleanup을 추가해 assertion 실패 시에도 생성 리드/fixture 정리를 시도한다.
- 2026-06-11 `supabase_franchise_opening_projects_migration.sql` 적용 후 오픈 준비 프로젝트 API live QA를 통과했다. `admin` requester와 `오픈준비` location id로 생성, location scoped 조회, checklist 수정, 삭제, 삭제 후 404를 확인했다.
- 2026-06-11 외부 상가 scale/raw runner를 live로 실행했다. `서울 광진구 화양동`, collect limit 3000, saved limit 2000에서 Daangn 원본 238건을 수집해 신규 1건/업데이트 237건, 저장 목록 350건, raw/data 샘플 10/10, `registerToProperties=false` 기준 ERP `properties` 생성 0건을 확인했다.
- 2026-06-11 모객 DB 화면 UI 정리를 진행했다. 상단 기간 필터를 `최근 7일/최근 30일/최근 3개월/전체`로 명확화하고, 필터 아이콘과 `내 담당만` 빠른 필터를 제거했으며, 등록일 기간에는 `~` 구분자를 추가했다.
- 2026-06-11 모객 대시보드 그래프를 정리했다. `유입 경로` 색상을 정보성 teal 톤으로 조정하고, `일별/주별/월별 DB 유입` 전환 그래프와 `담당자별 모객` 그래프를 추가했다. 그래프 값은 직접 라벨로 노출하고 중복 y축 숫자는 숨겼다.
- 2026-06-11 모바일 모객 DB 화면에서는 `Meta 연동`, `Meta 계정 연결`, `샘플 양식`, `엑셀 업로드` 보조 액션을 숨기고 `후보자 등록`만 노출한다. 모바일 파이프라인 단계 선택 카드는 숨겨 첫 화면 세로 점유를 줄였다.
- 2026-06-11 후보자 등록 폼 데이터 품질 개선을 반영했다. 연락처는 입력 중 `01012345678 -> 010-1234-5678`로 자동 포맷되고, 희망지역은 시도/시군구 선택 후 여러 지역을 칩으로 추가하며 같은 지역 중복 추가는 차단한다. 저장 값은 기존 `desiredRegion` 문자열 필드에 쉼표 구분 문자열로 정규화한다.
- 2026-06-11 모객 DB의 `DB 관리` 영역을 `LeadDbWorkspace`와 테이블 전용 설정/필터 유틸로 분리했다. 화면에서는 `표시 컬럼 N개`, 지역 OR 검색, 예산 범위 필터, 등록순/예산순/`중요 희망자만 보기` 정렬, 페이지당 표시 수, 가운데 페이지네이션을 제공한다.
- 2026-06-11 테이블의 핵심 고객 표현은 `중요`로 정리했다. 별표 토글은 `franchise_leads.grade`를 `HOT`/`WARM`으로 전환하며, 기존 `핵심` 값은 데이터 호환용 normalize만 유지하고 화면 문구에서는 노출하지 않는다.
- 2026-06-15 모객 DB/상세 화면 초기 출시 정리를 진행했다. 일반 가맹 희망자 목록에서 계약 전 체크 컬럼과 신규 고객 DB 연결 UI를 숨기고, 계약 관련 확인은 `계약 점주` 워크스페이스에 집중시켰다. 대시보드 연락 KPI는 제거하고, 연락 실무 처리는 `연락 관리` 탭으로 분리했다.
- 2026-06-15 후보자 상세 상담 이력은 기본 축약 상태로 두고, 수정/삭제/펼치기 기능을 추가했다. 업무관리 안에 다음 연락 입력과 `오늘 오후`/`내일 오전`/`3일 후`/`1주 후` 프리셋을 넣어 담당자가 후속 연락일을 입력하지 않는 문제를 줄이도록 했다.
- 2026-06-15 `/landing` 공개 랜딩 페이지를 추가하고 기능 섹션을 고도화했다. 구글시트 대비 ERP 전환 메시지, 모객 파이프라인/유입 경로/DB 유입 추이/담당자별 모객 그래프 목업, Meta Lead Ads 향후 연동 메시지를 반영했다. 사용자의 피드백에 따라 CTA 버튼과 하단 도입 문의 카드는 제거했다.
- 2026-06-15 랜딩 메시지 보강: 히어로, 제품 프리뷰, 운영 지표, 모객 DB 기능 설명에 `문의접수 -> 상담중 -> 입지검토 -> 계약예정` 상태별 파이프라인으로 모객 병목과 다음 액션을 한눈에 추적한다는 내용을 추가했다.
- 2026-06-15 관리자 회사별 메뉴 on/off와 슈퍼어드민 회사 조회 스코프를 추가했다. `/admin`은 회사별 메뉴 기능을 관리하고, 헤더 `조회 회사` 선택은 대시보드/모객 DB/출점 후보지/브랜드 모니터링/가맹 운영/고객/명함/점포/직원 화면의 회사 범위를 바꾼다.
- 2026-06-15 회사 메뉴 설정 저장용 `supabase_company_menu_features_migration.sql`, `/api/admin/company-access`, `/api/company-menu-features`, 전역 사이드바 메뉴 설정/비활성 안내 컴포넌트를 추가했다. SQL 미적용 환경에서는 메뉴를 기본 ON으로 두고 관리자 저장 API가 migration 필요 상태를 반환한다.
- 2026-06-15 가입 승인 프로세스를 신규 회사/기존 회사로 분리했다. 신규 회사는 최초 가입자가 무조건 팀장 권한 요청으로 접수되고, 플랫폼 관리자 승인 후 로그인할 수 있다. 기존 회사의 공개 가입은 직원 요청으로만 접수되며, 승인된 팀장이 `/company/staff`에서 직원 가입 요청을 승인한다. 기존 회사의 추가 팀장은 공개 가입이 아니라 직원 관리의 팀장 승격으로 처리한다.
- 2026-06-15 출점 후보지 화면의 상단 요약 카드 4개와 `출점 계획 · 경쟁스캔` 보조 칩을 제거해, 후보지 인사이트 본문과 지도/표 업무에 바로 진입하도록 간소화했다.
- 2026-06-15 전역 좌측 사이드바 상단 로고 텍스트는 고정 `내일사장` 대신 계정 회사명으로 표시한다. 일반 계정은 로그인 회사명, 관리자/슈퍼어드민은 `조회 회사` 선택 스코프를 우선하며, 긴 회사명은 한 줄 말줄임으로 처리한다.
- 2026-06-15 로그인/가입/관리자/공통 fallback의 하드코딩 브랜드 문구를 `부동산 ERP`로 맞추고, 공개 로그인 화면에서 `내일사장` 타이틀이 노출되지 않도록 정리했다.
- 2026-06-15 랜딩 기능 상세에서 `정보공개서/계약`, `가맹 운영` 카드에 `개발 진행중` 배지를 추가해 현재 개발 상태를 명확히 표시했다.
- 2026-06-15 첨부 요구사항 문서 `내일사장 ERP : 기능 요구사항 정의서 v2`를 학습해 로드맵에 반영했다. 사용자의 정정에 따라 기존 점포개발 업무의 `/properties` 점포목록/점포등록은 수정 대상에서 제외하고, 점포 DB 요구사항은 `/dashboard/franchise-leads/market-insights` 출점 후보지 마스터(`franchise_locations`) 개편 범위로 정리했다.
- 2026-06-16 출점 후보지 마스터 1차 개편을 구현했다. `/properties`는 그대로 두고 `/dashboard/franchise-leads/market-insights`에서 후보지 목록/등록/지역 인사이트를 분리했으며, 후보지 폼을 `기본 위치`, `면적·시설`, `입점비용`, `임차조건`, `임대인`, `종합메모` 중심으로 재구성했다.
- 2026-06-16 후보지 등록 폼의 담당자 선택은 같은 회사 직원만 이름으로 표시하도록 정리했다. 관리자/슈퍼어드민, 이메일, UUID는 드롭다운과 목록에서 노출하지 않는다.
- 2026-06-16 후보지 목록에 표시 수, 표시 컬럼, 정렬, 페이지네이션을 추가하고, 목록 액션은 `기록`, `수정`, `삭제` 중심으로 정리했다. 경쟁 컬럼과 경쟁스캔 버튼은 잠시 숨김 처리했으며, 기존 API와 저장 데이터는 유지한다.
- 2026-06-16 물건별 협업 기록 UI를 추가했다. `supabase_franchise_location_messages_migration.sql`, `/api/franchise-locations/messages`, `LocationMessagePanel`을 통해 회사 임직원이 후보지별 `정보`/`요청` 메시지를 남기고 요청을 `처리완료`로 닫을 수 있다. 완료 요청의 `다시 열기` 버튼은 제거했다.

## QA 결과

### 통과

- 2026-06-15 관리자 회사 스코프 QA 통과: 로그인 세션에서 `/dashboard/franchise-leads/market-insights`에 `조회 회사` selector가 노출되고 여러 회사 옵션을 선택할 수 있음을 확인했다. 프로필 표기는 기존 로그인 회사/역할을 유지하고, 선택 회사는 조회 스코프에만 사용한다.
- 2026-06-15 관리자 API QA 통과: `/api/admin/company-access?requesterId=admin`은 회사 목록을 반환했고, `/api/dashboard?userId=admin`은 관리자 전체 요약, `/api/dashboard?userId=admin&companyId=<company>`는 선택 회사 기준 요약을 반환했다. 관리자 아닌 사용자의 교차 회사 조회는 403 정책을 유지한다.
- 2026-06-15 관리자 회사 스코프 정적 검증 통과: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`를 통과했다. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다.
- 2026-06-15 가입 승인 정책 검증 통과: `npx tsx --test src/lib/signup-approval-policy.test.mts` 5건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했다. signup 화면은 1440px/390px 캡처에서 가입 승인 방식 카드가 잘리지 않고, 신규 회사 등록 선택 후 `관리자 승인 후 로그인` 안내가 표시됨을 확인했다.
- 2026-06-15 좌측 사이드바 회사명 표시 QA 통과: Playwright에서 `/dashboard` 인증 응답과 관리자 `조회 회사` 스코프를 모킹했을 때 좌측 상단이 `민티아 (DEV)`로 표시되고 하드코딩된 `내일사장` 문구가 남지 않는 것을 확인했다.
- 2026-06-15 모객 DB/랜딩 정리 검증 통과: `npx tsx --test src/lib/franchise-lead-workflow.test.mts src/components/franchise/leads/leadTableConfig.test.mts src/components/franchise/leads/leadActivityLog.test.mts src/components/franchise/leads/leadWorkspaceState.test.mts` 결과 22건 통과.
- 2026-06-15 최종 정적 검증 통과: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, 변경 TypeScript 20개 파일 no-excuse 규칙 검사, `npm run build` 통과. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다.
- 2026-06-15 브라우저 QA 통과: 로컬 `http://localhost:3000/landing`은 로그인 없이 열리고, 1440px에서 `scrollWidth=clientWidth=1425`, 390px에서 `scrollWidth=clientWidth=375`, overflow element 0건을 확인했다. 랜딩에서 공개 서비스명, 구글시트 비교 메시지, `Meta Lead Ads 유입 연동`, `Meta 광고` 문구는 보이고 `데모 문의`, `로그인`, `내일사장` 문구는 노출되지 않았다.
- 2026-06-15 랜딩 개발 진행중 배지 정적 검증 통과: `git diff --check`, `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npm run build`를 통과했다. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다.
- 2026-06-15 랜딩 개발 진행중 배지 QA 통과: 로컬 `http://localhost:3000/landing` 1440px/390px에서 `개발 진행중` 배지 2개가 노출되고, 각각 `정보공개서/계약`, `가맹 운영` 카드에 연결됨을 확인했다. 390px 기준 page overflow 0, overflow element 0건을 확인했다.
- 2026-06-15 기존 루트 동선 확인: `http://localhost:3000/` 접근 시 `http://localhost:3000/login`으로 이동하고 로그인 화면 문구가 표시됐다.
- 2026-06-15 로그인 브랜드 QA 통과: 로컬 `http://localhost:3000/login` 1080x1350/390x844에서 `부동산 ERP`가 표시되고 `내일사장` 타이틀은 노출되지 않았다. `/signup`도 `부동산 ERP 서비스 이용을 위한 가입` 문구와 page overflow 0을 확인했다.
- 2026-06-15 dev 배포 통합 완료: `codex/franchise-leads-20260608` 변경을 `dev`에 병합해 `9281017` `merge: deploy franchise lead workspace to dev`로 push했고, Vercel dev deployment가 READY 상태임을 확인했다. Preview URL은 Vercel Authentication 보호가 적용되어 본문 fetch는 401로 제한된다.
- 2026-06-15 production release branch 검증 통과: `origin/dev`를 release branch에 병합한 뒤 `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/franchise-lead-workflow.test.mts src/components/franchise/leads/leadTableConfig.test.mts src/components/franchise/leads/leadActivityLog.test.mts src/components/franchise/leads/leadWorkspaceState.test.mts src/app/api/franchise-leads/batch/route.ts` 23건, 변경 TS no-excuse 규칙, `npm run build`를 통과했다.
- 2026-06-16 출점 후보지 마스터/기록 UI 정적 검증 통과: `git diff --check`, `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npm run build`를 통과했다. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다.
- 2026-06-16 출점 후보지 협업 기록 API QA 통과: 같은 회사 후보지의 메시지 조회/정보 작성/요청 작성/처리완료 변경을 확인했고, 교차 회사 requester는 조회/작성/상태변경 모두 403으로 차단됐다. QA 메시지와 임시 후보지는 검증 후 삭제했다.
- 2026-06-16 Supabase migration 적용 확인: dev와 production Supabase에 `supabase_franchise_location_messages_migration.sql`을 적용했고, production에서 `public.franchise_location_messages`와 `franchise_location_messages_location_created_idx` 존재를 확인했다.
- 2026-06-16 브라우저 QA 통과: 로컬 `http://127.0.0.1:3000/dashboard/franchise-leads/market-insights`에서 물건 기록 패널이 열리고, 정보/요청 메시지 작성, 요청 처리완료, 완료 요청의 다시 열기 미노출, 작성자 이름만 표시, 1440px/390px overflow 없음, 경쟁스캔/경쟁 보기/키워드필요 미노출을 확인했다.
- 2026-06-16 지역 인사이트 고도화와 정보공개서 Gmail 발송 1차 구현을 완료했다. 추가 SQL은 `supabase_franchise_gmail_disclosures_migration.sql`이며, Gmail OAuth 토큰은 `profile_gmail_connections`, 발송/수신확인 감사값은 `franchise_lead_disclosure_deliveries`에 저장한다.
- 2026-06-16 지역 인사이트 유닛 테스트 통과: `npx tsx --test src/lib/franchise-market-insights.test.mts`에서 보유 후보지 수, 연결 완료 수, 연결 필요 수, 정렬 기준을 확인했다.
- 2026-06-16 Gmail/정보공개서 유닛 테스트 통과: `npx tsx --test src/lib/franchise-disclosure-deliveries.test.mts src/lib/franchise-lead-disclosure-records.test.mts src/lib/gmail-integration.test.mts src/lib/gmail-provider.test.mts src/components/franchise/leadDisclosureFormUtils.test.mts`에서 Gmail MIME 생성, 저장 리드명 미사용 메일 문구, 열람 추정 픽셀 URL, OAuth token 암복호화, 확인 token hash, 로컬 OAuth redirect URI, `pending`/`failed` 발송 제외, 정보공개서 기본값과 OAuth 결과 메시지를 확인했다.
- 2026-06-16 통합 정적 검증 통과: `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, 관련 `npx tsx --test ...`, `npm run build`를 통과했다. build는 기존 `baseline-browser-mapping`, multiple lockfiles/root, Browserslist stale 경고만 출력했다.
- 2026-06-16 브라우저 QA 통과: 관리자 테스트 세션(자격증명 마스킹)에서 `/dashboard/franchise-leads/market-insights?view=region-insight`의 삭제 대상 컬럼(`유입 채널`, `경쟁업체`, `마케팅`, `경쟁`, `추천 액션`, `다음 확장`, `평균예산`, `목록`)과 `후보지 보기` 버튼이 DOM에 없고, 새 컬럼(`지역`, `후보자 수`, `상담 우선`, `계약 진행`, `보유 후보지`, `연결 완료`, `연결 필요`)이 보임을 확인했다. 지역 인사이트는 `시도`/`시군구` 필터와 10개 단위 페이지네이션을 제공하며, `서울` 시도 선택 시 서울 지역만, `강남구` 시군구 선택 시 `서울 강남구`만 표시된다. 지역 행 클릭 후 후보지 목록으로 전환되고 지역 필터에 `서울 강남구`가 적용됐다. 1440px/390px page overflow는 0건이다.
- 2026-06-16 정보공개서 브라우저 QA 통과: `테스트_강태오` 상세 패널에서 `문서 저장`, `저장 문서`, `Gmail 발송`, `수동 발송 기록`, `발송 기록`이 노출됨을 확인했다. 로컬 `.env.local`에 Gmail OAuth env 3종이 추가된 뒤 `/api/integrations/gmail/status`는 `configReady: true`, `connected: false`를 반환했다. 연결 URL은 Google OAuth로 307 이동하며 `NEXT_PUBLIC_APP_URL=http://localhost:3000` 기준 redirect URI는 `http://localhost:3000/api/integrations/gmail/callback`이다. `127.0.0.1`만 등록했을 때는 Google `redirect_uri_mismatch`, redirect URI 보정/등록 후에는 Google 테스트 사용자 미등록으로 `403 access_denied`가 재현됐다. `gmail=error&reason=access_denied`로 돌아온 리드 상세에는 `Google OAuth 앱의 테스트 사용자에 이 Gmail 계정을 추가해야 연결할 수 있습니다.` 메시지가 표시된다. 390px 모바일에서 상태 select 높이는 40px로 정상 표시되고, 스크롤 하단에서도 Gmail/수동 발송 controls와 연결 후보지 영역이 가로 overflow 없이 표시됐다. 실제 Gmail 승인 완료와 외부 수신자 발송은 Google 테스트 사용자 등록 이후 재시도한다.
- 2026-06-16 정보공개서 메일 문구/열람 추정 업데이트: 메일 본문은 저장된 리드명을 인사말에 쓰지 않고 `안녕하세요. 가맹 상담 담당자입니다.`로 시작한다. HTML 본문에는 문서 열기/수령 확인 버튼과 보이지 않는 열람 추정 이미지가 포함되며, 이미지 로드 시 `/api/franchise-lead-disclosures/open?token=...`가 `opened_at`을 최초 1회 기록한다. 이 값은 영업 참고용 `열람 추정`으로만 표시하고, 법적/운영 확정 수령은 계속 `confirmed_at`으로 구분한다.
- 2026-06-16 정보공개서 문서 관리 UI를 단순화했다. 후보자 상세의 직접 `문서 저장` 블록은 제거하고, `Gmail 발송` 폼의 `문서 관리` 버튼으로 회사별 정보공개서 등록 팝업을 연다. 저장 문서가 없으면 같은 위치에서 `문서 등록` 팝업을 바로 열 수 있다. Gmail 폼은 저장 문서/수신 이메일/발송 메모만 받고, 발송일시와 발송 채널은 Gmail 발송 성공 시 자동 기록한다.
- 2026-06-16 정보공개서 문서 관리 브라우저 QA 통과: `내일` 회사의 `샘플_인스타폼_박서연` 상세에서 `문서 저장`, `발송일시`, `발송 채널` 미노출을 확인했고, `발송 메모` 아래 `연결 해제`/`Gmail 발송` 버튼이 노출된다. `문서 관리` 팝업은 `문서 등록` 폼과 저장 문서 목록/`발송 문서로 선택` 액션을 함께 표시한다. 1440px 기준 body overflow 0, dialog width 820px, mobile 390px 기준 body overflow 0, dialog width 342px로 확인했다.
- 2026-06-16 정보공개서 문서 삭제 QA 통과: `문서 관리` 저장 문서 목록에 삭제 아이콘을 추가했고, `QA 삭제 테스트 문서`를 UI에서 삭제하면 `franchise_disclosure_documents.status=archived`로 보관 처리되어 저장 문서/발송 선택 목록에서 빠짐을 확인했다. 삭제는 기존 발송 이력을 지우지 않는 soft archive 방식이다. QA 중 잘못 보관 처리된 `qa-info-disclosure.pdf` 문서는 즉시 `active`로 복구했고, 390px 모바일 문서관리 팝업에서 delete button 2개, body/dialog horizontal overflow 0을 확인했다.
- 2026-06-16 추가 개발 범위로 모객 DB 정보공개서 상태 컬럼/정렬, 요약 대시보드 A/B 타입, 어드민 사용자 직급 수정, 인앱 알림 MVP를 구현했다. 알림 적용 SQL은 `supabase_franchise_notifications_migration.sql`이고, `/api/franchise-notifications`는 정보공개서 D-3/D-1 외에도 미발송, 발송 실패, 계약 가능, 연락 지연, 오늘 연락, HOT 리드 후속 일정 미지정을 담당자 알림으로 만든다. 자동 알림 조건이 해소되면 동기화 시 stale 알림은 숨김 처리한다.
- 2026-06-16 추가 개발 검증 통과: `git diff --check`, `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npx tsx --test src/lib/franchise-lead-disclosure-summary.test.mts src/lib/franchise-notifications.test.mts src/components/franchise/leads/leadTableConfig.test.mts src/components/franchise/leads/leadTableFilters.test.mts src/components/franchise/leads/leadDashboardMetrics.test.mts` 19건, `npm run build` 통과. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다.
- 2026-06-16 추가 개발 브라우저/API QA 통과: 1440px에서 모객 DB `DB 관리` 탭의 `정보공개서` 컬럼과 정보공개서 필요순/최근 발송순/계약 가능일 빠른순 정렬을 확인했다. `A 타입` 대시보드는 정보공개서 운영 알림, D-3/D-1, 연락 알림, 알림톡 예정 문구를 표시했다. 헤더 알림 벨은 `supabase_franchise_notifications_migration.sql` 미적용 환경에서 `설정 필요`와 `알림 스키마 적용 후 사용할 수 있습니다.`를 표시했다. `/admin/users`는 `직급/권한` 컬럼과 관리자/팀장·매니저/담당자 select가 노출됐다. 역할 변경 API는 본인 관리자 권한 하향과 미지원 역할값을 차단했다. 390px에서 모객 DB와 어드민 페이지 body overflow 0, 최근 브라우저 console error 0건을 확인했다.
- 2026-06-16 회사별 대시보드 타입/직급 분리 업데이트: `/admin` 회사별 메뉴 관리에 `대시보드 타입` 설정을 추가하고 기본 A 타입을 선택 상태로 확인했다. `/dashboard`의 `대시보드 보기` 토글은 제거했고 저장된 회사 설정에 따라 A/B 타입을 렌더링한다. `/admin/users` 권한 드롭다운은 선택지에서 `관리자`와 `담당자`를 제거하고 `팀장`, `매니저`만 노출한다. 기존 `manager`는 팀장, 새 `sub_manager`는 매니저로 분리했다.
- 2026-06-16 회사별 대시보드 타입/직급 분리 검증 통과: `npx tsx --test src/lib/company-menu-features.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다. 브라우저 QA는 로그인 세션 기준 1440px `/dashboard`에서 A 타입 주요 건수 카드와 `대시보드 보기` 토글 미노출을 확인했고, `/admin`에서 A/B 타입 설정과 기본 A 선택, `/admin/users`에서 드롭다운 옵션이 `팀장`/`매니저`만 남은 것을 확인했다. 별도 headless 모바일 컨텍스트는 Supabase 세션을 재현하지 못해 `/dashboard` 모바일 렌더는 로그인 리다이렉트까지만 확인했다.
- 2026-06-16 모객 DB 내부 `요약 대시보드`의 A 타입과 A/B 전환 버튼을 제거했다. `/dashboard/franchise-leads`의 요약 화면은 기존 모객 흐름 분석형만 렌더링한다.
- 2026-06-16 모객 DB 테이블에서 정보공개서 `미발송` 상태의 `발송 필요` 보조문구를 제거했다. 상태 select는 92px, 담당자 select는 104px로 줄여 테이블 행의 가로 폭 부담을 낮췄다. 브라우저 QA에서 `A 타입`/`B 타입`/`발송 필요` 미노출과 `정보공개서` 컬럼 유지, 상태/담당자 select 폭 축소를 확인했다.
- `npm run lint -- --quiet`
- `npx tsc --noEmit`
- `npm run build`
- 2026-06-09 외부 상가 수집 MVP 구현 후 `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` 통과
- 2026-06-09 `realty_import_jobs` schema cache 오류 대응 후 `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` 재통과
- 2026-06-09 네이버부동산 보조 POC 요청으로 지역 코드 조회와 빈 매물 warning 반환을 확인한 이력이 있음
- 2026-06-10 외부 상가 수집 UI/API 정리 후 `npx tsc --noEmit` 통과
- 2026-06-10 저장 상가 점수/필터 유닛 테스트 통과: `utils.test.mts`, `scoring.test.mts`
- 2026-06-10 저장 상가 점수/필터 구현 후 `npx tsc --noEmit`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과
- 2026-06-10 저장 상가 지도 후보 유닛 테스트 통과: `map-utils.test.mts`
- 2026-06-10 저장 상가 동별 현재 페이지 지도화 후 `map-utils.test.mts`, `scoring.test.mts`, `utils.test.mts`, TypeScript LSP error diagnostics, `npx tsc --noEmit`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과
- 2026-06-10 저장 상가 표-지도 마커 번호 매칭 후 `map-utils.test.mts`, `scoring.test.mts`, `utils.test.mts`, TypeScript LSP error diagnostics, `npx tsc --noEmit`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과
- 2026-06-10 모객 DB 업무 큐 분류 유닛 테스트 통과: `franchise-lead-workflow.test.mts`
- 2026-06-10 모객 DB 업무 큐 구현 중 `npx tsc --noEmit` 통과
- 2026-06-10 점포·상권 매칭 유닛 테스트 통과: `franchise-lead-location-matching.test.mts`
- 2026-06-10 점포·상권 매칭 구현 중 `npx tsc --noEmit` 통과
- 2026-06-10 모객 DB 업무 큐 + 점포·상권 매칭 구현 후 `npm run lint -- --quiet`, `npx tsc --noEmit`, `franchise-lead-workflow.test.mts`, `franchise-lead-location-matching.test.mts`, `git diff --check`, `npm run build` 통과
- 2026-06-10 모객 DB 단계 분리 구현 후 `franchise-leads.test.mts`, `franchise-lead-workflow.test.mts`, `franchise-lead-location-matching.test.mts` 통합 유닛 테스트 10건 통과
- 2026-06-10 모객 DB 단계 분리 구현 후 TypeScript LSP error diagnostics, `npx tsc --noEmit`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과
- 2026-06-10 `/dashboard/franchise-leads` 로컬 HTTP 200 응답 확인
- 2026-06-10 외부 상가 수집을 출점 후보지 하위 `/dashboard/franchise-leads/market-insights?tab=realty-import`로 이동한 뒤 TypeScript LSP diagnostics, `npm run lint -- --quiet`, `npx tsc --noEmit`, `git diff --check`, `npm run build`, Playwright URL 로드 확인 통과
- 2026-06-10 후보지 수동 연결/중복 연결 허용 구현 후 `npx tsc --noEmit`, 관련 node 테스트 17건, `npm run lint -- --quiet`, `git diff --check`, `npm run build`, Playwright URL 로드 확인 통과
- 2026-06-11 후보지 연결 중복 방지 및 외부 상가 선택 승격 구현 중 `npx tsc --noEmit`, 관련 node 테스트 21건 통과
- 2026-06-11 후보지 연결 중복 방지 및 외부 상가 선택 승격 최종 검증으로 `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, 관련 `tsx --test`, `npm run build`, `git diff --check` 통과
- 2026-06-11 Playwright 브라우저에서 모객 DB P0 로그인 QA 통과: `1차 유입 DB -> 후보자` 승격, 업무 큐 필터별 목록/숫자 일치, 후보자 상세 업무 필드 저장/새로고침 유지, 출점 후보지/외부 상가 DB 연결/메모/삭제/중복 방지 확인
- 2026-06-11 Playwright/API로 외부 상가 P1 QA 통과: Daangn 화양동 상가 수집, 저장 목록 773건 조회, 점포목록 자동 등록 0건, `registerToProperties` 차단, 선택 외부 상가 ERP 물건지 승격/새로고침 유지/재호출 existing 확인
- 2026-06-11 안정화 API/DB QA 통과: `연락 완료` 필드 저장/업무 큐 조건 해제, 후보지 연결 상태/메모 reload 유지, no-stage legacy 리드 후보자 정규화, 수동 승격 물건지 상세/검색 표시, 합정동 재수집 update, 광진구 구 단위 확장 warning, `registerToProperties` 차단, 수집 전후 `properties` 자동 생성 0건 확인
- 2026-06-11 `/properties` 외부수집 필터 Playwright QA 통과: 로그인 세션에서 필터 클릭 후 외부 물건지 1건 표시, `외부수집` 배지 유지, 새 console error 0건
- 2026-06-11 안정화 테스트 통과: `npx tsx --test src/lib/property-external-status.test.mts src/lib/franchise-lead-workflow.test.mts src/lib/franchise-lead-location-links.test.mts src/lib/realty-listing-promotion.test.mts src/lib/realty-import-schema.test.mts src/components/franchise/realty-import/scoring.test.mts src/components/franchise/realty-import/utils.test.mts src/components/franchise/realty-import/map-utils.test.mts` 결과 31건 통과
- 2026-06-11 안정화 최종 검증 통과: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`
- 2026-06-11 운영 화면 `manual-promoted` 워크플로 테스트 통과: `npx tsx --test src/lib/manual-promoted-operations.test.mts src/lib/property-external-status.test.mts src/lib/realty-listing-promotion.test.mts src/lib/realty-import-schema.test.mts` 결과 12건 통과
- 2026-06-11 운영 화면 최종 검증 통과: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`
- 2026-06-11 권한/회사 범위 API QA 통과: 임시 회사 A/B 및 회사 없는 requester 기준 교차 회사 승격/조회 차단, no-company requester 소유 범위 조회, no-company 승격 400 및 `properties` 생성 0건 확인
- 2026-06-11 운영 화면 Playwright QA 통과: `manual-promoted` 물건지 패널 표시, `운영점 등록`, `sourcePropertyId` reload 유지, 데스크톱/모바일 접힘 상태 시각 확인
- 2026-06-11 오픈 준비 프로젝트/모바일 레이아웃 검증 통과: `npx tsx --test ...` targeted 36건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과
- 2026-06-11 Browser MCP route sweep 통과: `/dashboard/franchise-leads`, `/dashboard/franchise-leads/market-insights?tab=realty-import`, `/dashboard/franchise-operations`에서 390x844 모바일은 sidebar 0px/main 390px/가로 overflow 없음, 1440x900 데스크톱은 sidebar 240px/main 1200px/가로 overflow 없음
- 2026-06-11 운영 화면 오픈 준비 프로젝트 패널 렌더링 확인: local DB migration 미적용 상태에서도 blocking alert 대신 inline 안내를 표시하고 기존 `manual-promoted` 운영 전환 패널은 유지됨
- 2026-06-11 오픈 준비 프로젝트 API live QA 통과: `FRANCHISE_QA_REQUESTER_ID=admin FRANCHISE_QA_OPENING_LOCATION_ID=<오픈준비 location>`로 `scripts/franchise-opening-projects-api-qa.mjs` 실행, requester 없는 GET 401, POST 200, filtered GET 200, PUT 200, DELETE 200, 삭제 후 GET 404 확인
- 2026-06-11 엑셀 유입 runner live QA 통과: `FRANCHISE_QA_REQUESTER_ID=admin node --env-file=.env.local scripts/franchise-p0-lead-ingress-qa.mjs --base-url http://localhost:3000 --cleanup` 실행, 실제 `.xlsx` fixture 1건 생성, `raw_intake` 저장, `candidate` 승격, cleanup 확인. Meta는 `BLOCKED_META_ENV` 유지
- 2026-06-11 외부 상가 scale/raw runner live QA 통과: `FRANCHISE_QA_REQUESTER_ID=admin node --env-file=.env.local scripts/franchise-realty-scale-raw-qa.mjs --base-url http://localhost:3000 --region '서울 광진구 화양동' --saved-limit 2000 --collect-limit 3000 --live-collect` 실행, 원본 238건, 신규 1건/업데이트 237건, 저장 목록 350건, raw/data 샘플 10/10, ERP `properties` 생성 0건 확인
- 2026-06-11 후보자 등록 포맷/지역 정규화 유닛 테스트 통과: `npx tsc ... --outDir /tmp/franchise-lead-formatters-test ... && node --test /tmp/franchise-lead-formatters-test/leadFormFormatters.test.mjs` 결과 3건 통과
- 2026-06-11 모객 DB UI/등록 폼 최종 검증 통과: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run build` 통과. `npm run lint`는 기존 경고 981개, 0 errors 상태다.
- 2026-06-11 Playwright 모바일 QA 통과: 390px에서 보조 액션 4개는 실제 크기 0으로 숨겨지고 `후보자 등록`만 표시, 파이프라인 단계 카드 visible count 0, 가로 overflow 0, 후보자 등록 모달에서 연락처 자동 하이픈/지역 2개 칩 추가/중복 추가 비활성화를 확인했다.
- 2026-06-11 Playwright 데스크톱 QA 통과: 1440px에서 `Meta 연동`, `Meta 계정 연결`, `샘플 양식`, `엑셀 업로드`, `후보자 등록` 버튼이 모두 표시되고 파이프라인 단계 카드 7개가 유지되며 가로 overflow 0을 확인했다.
- 2026-06-11 모객 DB 테이블 유닛 테스트 통과: `leadTableConfig.test.mts`, `leadTableFilters.test.mts`, `franchise-leads.test.mts`를 컴파일 후 Node test로 실행해 총 11건 통과. 지역 필터는 `송파, 제주` 같은 쉼표 입력을 OR 조건으로 처리하고, 예산 필터는 희망 최소/최대 예산의 겹침 기준으로 동작한다.
- 2026-06-11 모객 DB 테이블 최종 검증 통과: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다.
- 2026-06-12 계약 전 체크리스트/계약 점주 화면 검증 통과: `npx tsc --noEmit --pretty false`, `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/components/franchise/leads/leadTableConfig.test.mts`, `git diff --check`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 `baseline-browser-mapping`, workspace root, Browserslist 경고만 출력했다. dev 서버 `/api/franchise-leads?status=계약완료&limit=all`은 1건, `/api/franchise-lead-contract-checklist/summaries`는 해당 계약완료 리드의 0/7 기본 요약을 HTTP 200으로 반환했다. 보호 라우트는 인증 세션 없이 `/login`으로 이동함을 브라우저에서 확인했다.
- 2026-06-12 리뷰 수정 검증 통과: `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/components/franchise/leads/leadTaskScope.test.mts src/components/franchise/leads/leadTableConfig.test.mts` 14건 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 앱 내 브라우저는 인증 세션이 없어 `/login` 이동까지만 확인했으며, 체크리스트 저장/새로고침 persistence live UI QA는 로그인 세션에서 재개한다.
- 2026-06-11 Playwright 데스크톱 DB 관리 QA 통과: `중요 희망자만 보기` 선택 시 7건만 표시되고 모든 행이 `중요 표시 해제` 상태였으며, 화면에서 `핵심` 문구가 보이지 않음을 확인했다. `송파, 제주` 지역 검색은 3건을 반환했고, 예산 높은순 정렬과 별표 off/on persistence도 확인했다.
- `npm run start -- -p 3000`
- `http://localhost:3000/login` HTTP 200 확인
- `http://localhost:3000/dashboard/franchise-leads/market-insights` 보호 라우트 로그인 이동 확인
- `http://localhost:3000/dashboard/franchise-operations` 보호 라우트 로그인 이동 확인
- 2026-06-10 Playwright 브라우저에서 `/dashboard/franchise-operations` 로그인 세션 화면을 확인했다. 저장 상가 동 카드 내부에 `구의동 지도`, `구의동 현재 페이지 1-50 / 109건` 범위 문구, 지도 마커, 우측 선택 상세, 하단 현재 페이지 표가 함께 표시되는지 확인했다.
- 2026-06-10 Playwright 브라우저에서 저장 상가 지도 우측 번호 목록 제거, 하단 표 `지도` 컬럼 표시, 표 주소 클릭 후 지도 선택 상세 변경, 선택 행 강조, `Maximum update depth` 에러 0건을 확인했다.
- 2026-06-10 Playwright 브라우저에서 `/dashboard/franchise-leads` 접근 시 로그인 화면으로 이동하는 보호 라우트 상태를 확인했다. 저장된 로그인 세션이 없어 업무 큐/점포·상권 매칭 상세 패널의 실제 클릭 QA는 미수행했다.
- Kakao JavaScript 지도는 `http://localhost:3000` 도메인 등록 후 지도 표시 확인
- Google Places API (New) `places:searchText` 응답 확인
- SearchAPI 정상 시점에 Naver 리뷰 예시 수집 확인
  - `푸라닭치킨 중곡점`: 방문 580, 블로그 54
  - `잘만든치킨굿킨 중곡역점`: 방문 73, 블로그 22
  - `레트리`: 방문 141, 블로그 13
  - `불스바베큐`: 방문 21, 블로그 1

### 미통과/차단

- SearchAPI 현재 키는 `monthly_allowance=0`, `remaining_credits=-3` 상태라 Naver 신규 수집이 429로 차단된다.
- SearchAPI 한도 초과 상태에서 기존 Naver 성공 값이 덮어쓰기되는 문제는 P0로 남아 있다.
- 출점 후보지 경쟁스캔 UI는 2026-06-16 기준 목록에서 임시 숨김 상태다. API와 저장 구조는 유지하므로 provider 비용/정책 정리 후 재노출할 때 경쟁스캔 모달과 캐시 정책을 다시 QA한다.
- Playwright MCP 스크린샷 확인은 Chrome 프로필 잠금 이슈로 완료하지 못한 이력이 있다.
- 실제 로그인 세션에서 모객 DB P0 핵심 플로우는 2026-06-11에 완료했다. `연락 완료` 저장 흐름도 API/DB 기준으로 재검증했다. 엑셀 유입 runner는 `admin` requester와 실제 `.xlsx` fixture로 통과했다. 남은 것은 실제 Meta 유입과 실운영 계정 권한 조합별 live 회귀 QA다.
- 모바일 전역 사이드바 기본 접힘은 2026-06-11 route sweep으로 통과했다. 다만 각 화면의 내부 대형 표/지도는 데이터가 많을 때 별도 모바일 정보 구조 개선 대상이다.
- 오픈 준비 프로젝트 API persistence QA는 SQL 적용 후 통과했다. 브라우저 UI에서 저장 후 새로고침 persistence는 추가 회귀로 남긴다.
- 이번 Docs Steward 감사에서는 새 브라우저/빌드 QA를 실행하지 않았고, 문서와 코드 검색 기준으로 최신성만 확인했다.
- 외부 상가 수집은 2026-06-11에 `서울 광진구 화양동`, `서울 마포구 합정동`, `서울 광진구` 구 단위 확장 QA와 회사 없는 requester API 범위 QA를 완료했다. `서울 광진구 화양동` collect limit 3000/saved limit 2000 runner도 통과했지만, 실제 응답은 238건이라 2000/3000에 근접한 대량 데이터셋 자체는 아직 별도 지역에서 확인이 필요하다.
- 네이버부동산 POC는 지역 코드 조회는 가능해도 목록 응답이 빈 값일 수 있어 운영 데이터 소스로 확정하지 않았다.
- 네이버부동산 보조 POC의 `clusterList -> articleList` 흐름은 빈 응답/429 가능성이 있어 현재 MVP QA에서 분리하고, 향후 과제 트랙에서 반복 QA한다.
- 네이버부동산은 향후 과제로 이관했으므로 현재 외부 상가 수집 MVP의 차단 이슈로 보지 않는다.
- API에는 `registerToProperties` 분기가 남아 있지만 2026-06-11 안정화 QA에서 400 차단과 자동 등록 0건을 재확인했다. 향후 import API 변경 시 회귀 QA 항목으로 유지한다.
- `salesType=store` 적용은 2026-06-11 화양동 실데이터 QA에서 원본 237건 중 상가 237건 응답과 limit 20 저장으로 확인했다.
- 주소 중심 결과 표가 실제 로그인 화면에서 가격/면적/층/관리비/승인일/등록일/반응수/사진 수/설명 일부/원문 링크를 기대대로 보여주는지 확인이 필요하다.
- `external_property_listings.raw/data` 저장은 2026-06-11 선택 승격 QA에서 QA 원본의 raw/data와 승격 메타데이터 보존으로 확인했다. 실제 Daangn 원본 raw 상세 샘플 감사는 추가로 남아 있다.

## 외부 API QA 메모

### Naver 공식 API

- 공식 API는 브랜드 모니터링용으로 사용한다.
- 플레이스 방문 리뷰, 블로그 리뷰, 플레이스 광고 배지는 공식 API만으로 충분히 확인하기 어렵다.

### SearchAPI / SerpApi

- SearchAPI는 Naver 리뷰/광고 POC의 현재 우선 provider다.
- 월 한도 초과 시 UI에서 `미수집`이 아니라 `SearchAPI 한도초과`로 보여야 한다.
- 한도 초과 응답이 들어와도 기존 성공 값을 덮어쓰면 안 된다.
- SerpApi는 env를 유지하되 현재는 SearchAPI fallback 후보로만 본다.

### Google Places

- 현재 UI에서는 리뷰 본문을 사용하지 않으므로 Place Details `reviews` 호출은 하지 않는다.
- Text Search 결과의 평점/리뷰 수/지도 URL만 사용한다.

### Kakao Local

- 경쟁사 검색, 주소 검색, 좌표 변환은 공식 API로 처리한다.
- 리뷰 수/본문은 공식 API 제공 범위 밖이다.
- UI는 Kakao맵 링크를 통해 직접 확인하도록 안내한다.

### Daangn / Naver Land Realty

- 당근은 공개 지역 API와 부동산 목록 `_data` 응답을 읽고 `STORE` 타입만 저장한다. 목록 호출 시 `salesType=store`를 명시한다.
- 네이버부동산은 현재 UI/API에서 제거했다. 운영 적용 전에는 URL/CSV import나 로컬 세션 캡처 방식부터 별도 검증한다.
- 외부 매물 수집은 읽기 전용이며 로그인, 문의, 채팅, 예약, 결제 자동화는 하지 않는다.

## 2026-06-16 메인 대시보드 A 타입 QA

- `/dashboard` 상단의 `B 타입`/`A 타입` 전환 버튼은 제거했다. 회사별 메뉴 관리에서 저장한 타입에 따라 렌더링하며, 기본값은 A 타입이다.
- A 타입 상단은 기존 메인 KPI 카드 톤에 맞춰 `모객 DB`, `계약 가능`, `출점 후보지`, `연결 필요` 주요 건수를 표시한다.
- A 타입 하단은 기존 사용감이 좋았던 `📅 예정된 일정`, `📢 공지사항`, `📌 간편 메모` 구성을 유지했다.
- 로컬 브라우저 QA: 1440px에서 실제 API 기준 `모객 DB 19명`, `계약 가능 0명`, `출점 후보지 1건`, `연결 필요 19건` 표시와 섹션 아이콘 노출, `대시보드 보기` 버튼 미노출을 확인했다. 390px 직접 대시보드 렌더는 별도 headless 컨텍스트에서 Supabase 세션을 재현하지 못해 로그인 리다이렉트까지만 확인했다.
- 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.
- 참고: 기존 `/api/dashboard/memo` 요청에서 로컬 사용자 매핑 조건에 따라 404가 1건 관측됐다. 이번 A 타입 UI 변경과 직접 관련 없는 기존 메모 API 동작이며 별도 개선 후보로 둔다.

## 2026-06-16 알림 개별 읽음 UX QA

- 알림 팝오버에서 전체 행 클릭 외에 미확인 알림별 `읽음` 버튼을 추가했다. 행 클릭은 기존처럼 관련 화면 이동 전 읽음 처리하고, `읽음` 버튼은 해당 알림만 읽음 처리하며 화면 이동하지 않는다.
- 알림 생성 조건은 정보공개서 미발송/발송 실패/D-3/D-1/계약 가능, 다음 연락일 지남/오늘 연락, HOT 리드 후속 관리 기준이다. `보류/이탈` 상태 리드는 자동 알림 대상에서 제외한다.
- 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/franchise-notifications.test.mts`, `npm run build` 통과.
- 로컬 브라우저 QA: 기존 로그인 세션이 남은 컨텍스트에서는 실제 알림 카운트 0건으로 확인되어 개별 버튼이 노출되지 않았다. 새 headless Chrome 컨텍스트에서는 Supabase `signInWithPassword` 요청이 `Failed to fetch`로 실패해 보호 라우트 렌더를 재현하지 못했다. 실제 로그인된 운영 브라우저에서 미확인 알림이 생기면 `읽음` 버튼 노출과 단건 카운트 감소만 추가 확인하면 된다.

## 2026-06-16 알림 상세 딥링크/날짜 QA

- 자동 알림 action URL을 `/dashboard/franchise-leads?tab=db&leadId=...`로 변경했다. 알림 클릭 시 모객 DB 목록까지만 이동하지 않고, `leadId`를 읽어 해당 가맹 희망자 상세 패널을 연다.
- 목록에 없는 리드 id로 진입한 경우 `/api/franchise-leads?id=...`로 단건을 조회해 상태에 병합한 뒤 상세 패널을 연다. 교차 회사/없는 리드는 기존 API 권한 가드와 오류 안내를 따른다.
- 알림 날짜는 `06. 11.` 같은 숫자 포맷 대신 `6월 11일`로 표시하고, 날짜 줄은 제목/본문 영역에 맞춰 정렬되도록 보정했다.
- `page.tsx` 대형 파일 검토 결과, 이번 변경 범위에서는 딥링크 파싱/리드 병합/상세 오픈 타깃 계산만 `leadDetailDeepLink.ts`와 `useLeadDetailDeepLink.ts`로 분리했다. `page.tsx`는 여전히 순수 LOC 약 1249줄이라, 다음 분리 후보는 `상세 패널 오픈 상태`, `일괄 액션`, `연락 관리 저장`, `고객/명함 연결` 훅이다.
- 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/components/franchise/leads/leadWorkspaceState.test.mts src/components/franchise/leads/leadDetailDeepLink.test.mts src/lib/franchise-notifications.test.mts`, `npm run build` 통과.
- 로컬 브라우저 QA: headless 브라우저에서 보호 라우트 진입용 Supabase 세션 재현이 실패해 `/login` 리다이렉트까지만 확인했다. API mock 기반 클릭 QA는 인증 가드 앞에서 중단됐으므로, 실제 로그인 세션에서 미확인 알림 클릭 시 URL의 `tab=db&leadId=...`, 상세 패널 제목, 날짜 `M월 D일` 표시를 추가 확인한다.

## 2026-06-16 Google OAuth 개인정보처리방침 페이지 QA

- 공개 개인정보처리방침 페이지를 `/privacy`에 추가했다. Google Cloud OAuth 동의 화면의 개인정보처리방침 URL에는 실서버 기준 `https://www.fcerp.co.kr/privacy`를 사용한다.
- Google Cloud 홈페이지 URL에는 실서버 기준 `https://www.fcerp.co.kr/landing`을 사용한다. 랜딩 푸터에서 `/privacy`로 이동하는 개인정보처리방침 링크를 제공한다.
- 본문에는 `gmail.send` 최소 범위 사용, Gmail 수신함 미조회, 토큰 암호화 저장, 정보공개서 이메일 발송과 발송 기록 외 목적 미사용을 명시했다.
- Google 공식 민감 범위 검증 문서 기준으로, 공개 개인정보처리방침과 별도로 비공개 YouTube 데모 영상 링크를 준비해야 한다. 영상에는 OAuth 동의 화면, 앱 이름, client ID가 보이는 주소창, Gmail 발송 기능 사용 장면을 포함한다.
- 검증: `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.
- 로컬 브라우저 QA: `http://127.0.0.1:3000/privacy` 1440px/390px 렌더를 확인했고, `http://127.0.0.1:3000/landing`은 200 응답과 푸터의 개인정보처리방침 링크 포함을 확인했다.

## 2026-06-17 알림 읽음 항목 숨김 QA

- 기존 알림 팝오버는 `0건 미확인` 상태에서도 `read_at`이 채워진 읽음 알림을 최근 목록에 계속 표시했다. 이는 삭제 지연이 아니라 DB 감사 기록과 헤더 표시 필터가 분리되지 않은 상태였다.
- 헤더 알림 요청 유틸에서 `readAt`이 있는 항목을 화면 목록에서 제외하도록 변경했다. DB의 `read_at` 기록은 유지하고, 담당자가 보는 헤더 팝오버에는 읽지 않은 알림만 남긴다.
- 검증: `npx tsx --test src/components/layout/notificationRequests.test.mts src/lib/franchise-notifications.test.mts src/components/franchise/leads/leadDetailDeepLink.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 로컬 브라우저 QA: Playwright 컨텍스트에 Supabase 로그인 세션이 없어 `/dashboard/franchise-leads` 접근 시 `/login` 리다이렉트까지만 확인했다. 로그인 세션에서는 읽음 클릭 후 헤더 목록에서 해당 알림이 사라지는지 운영 화면에서 추가 확인한다.

## 2026-06-17 입점 요청/예비 창업자 등록 QA

- 기존 `/properties/register` 점포 신규등록은 원본 화면으로 복구했다. 로그인 세션에서 본문이 `점포 신규등록`, `물건 개요`, 기존 업종 대/중/소분류 흐름을 보여주고, 새 `입점 요청` 본문은 섞이지 않음을 확인했다.
- 새 `/dashboard/franchise-leads/property-registration`은 프랜차이즈 인입용 입점 요청 전용 화면으로 분리했다. 본문에 `입점 요청`, `입점 희망 조건`, `임대 조건`, `임대인 지원 내용`, `사진 및 자료`가 표시되고, 1440px와 390px 모두 page overflow 0건이었다.
- 새 `/dashboard/franchise-leads/lead-registration`은 가맹 희망자 등록을 별도 인입 DB(`franchise_lead_registration_requests`)에 저장한다. route와 DB는 보존하지만 현재 운영 메뉴, 업무 목록 탭, 어드민 인입 탭에서는 숨김 처리했다.
- `/dashboard/franchise-leads/matching-request`는 확장된 예비 창업자/희망 업종/예산/보유 물건/내부 메모 컬럼을 유지한다. `희망 업종` 셀렉트는 새 물건 등록과 같은 업종 옵션 소스를 사용하며, 기본 fallback 기준 `요식업`, `카페`, `음식점`, `서비스업`, `유통업`, `부동산업` 등이 표시됨을 확인했다.
- `/dashboard/franchise-leads/work-intake`는 `업무` 상위 메뉴 아래 `진행현황`으로 노출하며, 입점 요청/예비 창업자 등록을 탭 목록으로 확인한다.
- `/admin/franchise-intake`는 `전체 회사` 선택, `입점 요청 리스트`, `예비 창업자 등록` 탭을 표시한다. 관리자 입점 요청 리스트는 새 입점 요청에서 저장한 `operation_type='물건등록'` 건을 대상으로 한다.
- 이미 밀어넣은 물건 원본을 수정하면 연결된 후보지를 즉시 덮어쓰지 않고 admin 목록에서 `수정` 상태로 표시한다. 관리자가 `업데이트`를 눌러야 promoted target에 반영된다.
- 업종 옵션은 `franchise_brands`의 `industry/businessType/categoryMajor/categoryMiddle/categorySmall`와 `custom_categories(category_type='industry_detail')`를 병합하고, 데이터가 없으면 기본 옵션으로 fallback 한다.
- 검증: `npx tsx --test src/lib/franchise-industry-options.test.mts src/lib/franchise-property-registration.test.mts src/lib/franchise-property-promotion.test.mts src/lib/franchise-matching-request.test.mts src/lib/franchise-leads.test.mts src/lib/company-menu-features.test.mts` 17건 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, Browserslist/baseline-browser-mapping 경고만 출력했다.
- 브라우저 QA: 관리자 테스트 세션(자격증명 마스킹)에서 기존 점포 신규등록, 새 물건 등록, 매칭 요청, 관리자 인입 페이지를 확인했다. 새 화면의 390px 모바일 overflow는 0건이었다.

## 2026-06-17 회사 로고 관리 QA

- `supabase_company_logo_migration.sql`을 추가해 `companies`에 `logo_url`, `logo_path`, 파일명/용량/MIME/변경시각 컬럼을 둔다. 파일은 기존 `property-images` 버킷의 `company-logos/<company_id>/...` 경로에 저장한다.
- `/api/company-logo`는 로그인 사용자 기준으로 회사 스코프를 확인한다. 일반 사용자는 자기 회사만 수정할 수 있고, admin은 선택 회사 `companyId`를 지정해 수정할 수 있다.
- `/profile`에는 회사 로고 관리 블록을 추가했다. 어드민 회사별 메뉴 관리의 선택 회사 정보 패널에서도 같은 로고 관리 컴포넌트를 사용한다.
- 로고 정책은 PNG/JPG/WebP, 1MB 이하, 권장 512x512px 정사각형이다. 사이드바는 40x40 박스 안에 테두리/흰 배경/확대 보정으로 표시한다.
- 로고 migration 적용 전 DB에서는 `logo_url` 조회가 실패할 수 있어 `/api/auth/me`, 프로필 저장 응답, 어드민 회사 목록 조회가 회사명-only 조회로 fallback 된다. 미로그인/만료 토큰 401/403은 예상 가능한 인증 실패로 처리하고 Next 개발 오버레이가 뜨지 않도록 오류 로그 대상에서 제외했다.
- 회사 로고 API는 Supabase bearer 인증과 legacy `x-user-id` requester 인증을 모두 허용한다. 프로필/어드민 로고 컴포넌트는 기존 localStorage 로그인 세션에서도 `x-user-id`를 붙여 조회/등록/삭제 요청을 보낸다.
- 검증: `npx tsx --test src/utils/userUtils.test.mts src/lib/company-logo.test.mts src/lib/company-menu-features.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 브라우저 QA: 관리자 테스트 세션(자격증명 마스킹)으로 `/profile`에서 회사 로고 관리 블록, 정책 문구, `로고 등록` 버튼을 확인했다. `/admin` 회사별 메뉴 관리 선택 회사 패널에서도 같은 로고 관리 블록이 표시됐다. 390px 모바일 폭 기준 `/profile`, `/admin` 모두 page overflow 0건이고 `[AuthCheck] /api/auth/me failed` 오버레이는 표시되지 않았다.
- 추가 브라우저 QA: 조회 회사를 `민티아`로 변경한 뒤 사이드바 로고 이미지가 약 42.6px 정사각형으로 표시되고, `/api/company-logo?companyId=...`는 legacy `x-user-id` 헤더 기준 HTTP 200으로 로고 URL/파일명/크기를 반환했다. 파일 없는 POST는 401이 아니라 `로고 파일이 필요합니다.` 400 검증 오류로 진입해 업로드 인증 경로가 통과함을 확인했다.

## 2026-06-17 모객 DB 표시 문구 QA

- 모객 DB 내부 상단 `요약 대시보드 / 기존 모객 흐름 분석` 설명 박스를 제거했다.
- 저장 호환성 때문에 DB source 값 `프랜차이즈 매칭 요청`은 유지하되, 화면 필터/차트/상세/테이블 배지는 `예비 창업자 등록`으로 표시한다.
- 브라우저 QA: `/dashboard/franchise-leads`에서 `요약 대시보드`, `기존 모객 흐름 분석`, `프랜차이즈 매칭 요청` 문구가 보이지 않고 `계약 완료`, `예비 창업자 등록`이 표시됨을 확인했다. 1440px와 390px 모두 page overflow 0건이었다.

## 2026-06-17 출점 후보지 첨부 연동 QA

- `/dashboard/franchise-leads/market-insights`의 출점 후보지 등록 폼에 `사진 및 자료` 첨부 메타데이터 등록을 추가했다. 정책은 물건 등록과 동일하게 PDF/JPG/PNG/WebP/HEIC, 파일당 10MB, 최대 10개, 총 50MB다.
- 첨부 메타데이터는 `franchise_locations.data.fileAttachments/fileNames`에 저장된다. 물건 등록에서 프랜차이즈 DB로 밀어넣을 때 `properties.data.fileAttachments/fileNames`를 후보지 데이터와 `sourcePropertySnapshot`에 함께 복사한다.
- 검증: `npx tsx --test src/lib/franchise-file-attachments.test.mts src/lib/franchise-location-master.test.mts src/lib/franchise-property-promotion.test.mts` 12건 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. LSP diagnostics는 변경 TS/TSX 파일 기준 오류/경고 없음.
- 브라우저 QA: `http://127.0.0.1:3000/dashboard/franchise-leads/market-insights?view=location-list&qa=location-files`에서 등록 탭 진입 후 첨부 섹션, 용량 정책 문구, multiple file input을 확인했다. Playwright로 `후보지도면.pdf` 선택 이벤트를 발생시켜 파일명이 화면에 표시됨을 확인했고, 1440px/390px 모두 page overflow 0건이었다.

## 2026-06-17 관리자 회원 승인 UUID QA

- 증상: `/admin/users` 승인 대기에서 `remax@naver.com` 승인 버튼을 누르면 `User not found` 알림이 뜨고 승인되지 않았다.
- 원인: `/api/users/userRouteHelpers.ts`의 UUID 정규식이 `8-4-4-12` 형식으로 되어 있어 실제 UUID `8-4-4-4-12`를 UUID로 인식하지 못했다. 그 결과 정상 profile id가 레거시 짧은 ID처럼 이메일 후보로 변환되어 조회가 실패했다.
- 수정: UUID 정규식을 `8-4-4-4-12`로 바로잡고, 승인/직급 변경 요청은 `uuid`와 표시 이메일을 함께 보내도록 보강했다. PUT 라우트는 UUID 후보를 먼저 찾고, 없으면 이메일 후보로 fallback 한다.
- 검증: `npx tsx --test src/app/api/users/userRouteHelpers.test.mts` 6건 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과.
- 브라우저 QA: `http://localhost:3000/admin/users`에서 기존 로그인 세션으로 `remax@naver.com` 승인을 실행했다. `승인되었습니다.` 알림이 표시됐고 행 상태가 `활성`으로 변경됐다. Supabase profile 조회에서도 `remax@naver.com` status가 `active`임을 확인했다.

## 2026-06-17 글로벌 메뉴 구조 QA

- `/dashboard`는 기존 `대시보드 > 요약` 하위 메뉴에서 상위 단독 메뉴 `대시보드`로 정리했다.
- 기존 `대시보드` 묶음은 `프랜차이즈`로 변경하고, 하위에 `모객 DB`, `출점 후보지`, `가맹 운영`만 배치했다.
- 헤더 breadcrumb와 회사별 메뉴 관리의 카테고리도 같은 구조로 맞췄다.
- 검증: `npx tsx --test src/lib/company-menu-features.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 브라우저 QA: 관리자 테스트 세션(자격증명 마스킹)으로 `/dashboard`에서 사이드바가 상위 단독 `대시보드`와 `프랜차이즈` 묶음으로 표시되는지 확인했다. `/dashboard/franchise-leads`는 `프랜차이즈 > 모객 DB`, `/dashboard/franchise-leads/market-insights`는 `프랜차이즈 > 출점 후보지` breadcrumb로 표시됐고, 1440px/390px 모두 문서 기준 가로 overflow 0건이었다.

## 2026-06-17 인입 관리/로고 배포 전 QA

- `/dashboard/franchise-leads/matching-request` 상단의 중복 `예비 창업자 등록` 제목 카드를 제거했다. 폼 내부 `예비 창업자 정보` legend는 유지했고, 1440px/390px Playwright 확인에서 heading 0건, legend 1건, page overflow 0건을 확인했다.
- `/admin/franchise-intake`의 예비 창업자 등록 탭에 `밀어넣기`, `반영 완료`, `수정`, `업데이트` 상태를 추가했다. 밀어넣기는 `/api/admin/franchise-intake/matching-requests/promote`를 통해 회사별 1차 유입 `franchise_leads`를 만들고, 매칭 요청 전용 필드는 메모/snapshot에 보존한다. 원본 수정 후에는 `/api/admin/franchise-intake/matching-requests/update-promoted`를 눌러야 대상 모객 DB에 반영된다.
- 브라우저 QA 중 밀어넣기 성공 메시지가 데이터 재조회에 의해 사라지는 문제를 확인해, 재조회 후 성공 메시지가 유지되도록 수정했다. 390px에서는 어드민 사이드바가 모달 버튼 클릭을 가로막지 않도록 모달 레이어를 사이드바보다 위로 올렸다.
- 실서버 회사 로고 업로드 실패 대응으로 `/api/company-logo`가 업로드 전 기존 `property-images` storage bucket 준비를 시도하도록 보강했다. dev에서 업로드가 되고 production에서만 실패하면 production Supabase storage policy/env를 우선 확인한다.
- 출점 후보지 목록의 `종합메모`는 내용 자체를 요약하지 않고 한 줄만 노출한 뒤 말줄임 처리한다. 컬럼 선택 dropdown은 긴 목록이 잘리지 않도록 레이어 높이/스크롤을 조정했다.
- 등록/수정 폼 QA를 위해 로컬 앱 devDependency에 `playwright`를 명시했다.
- 검증: `git diff --check`, `npx tsx --test src/lib/franchise-matching-request-promotion.test.mts src/lib/franchise-property-promotion.test.mts src/lib/company-logo.test.mts` 12건, `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npm run build` 통과.
- 브라우저 QA: Playwright mock 세션으로 1440px/390px에서 `/dashboard/franchise-leads/matching-request`의 상단 중복 제목 미노출과 `예비 창업자 정보` legend 유지, `/admin/franchise-intake`의 예비 창업자 등록 탭 `밀어넣기 -> 모객 DB 등록 -> 성공 메시지` 흐름, POST payload(`leadId`, `targetCompanyId`, `managerId`, `requesterId`)와 page overflow 0건을 확인했다.

## 2026-06-18 인입 밀어넣기 매핑/상담 이력 QA

- 입점 요청 -> 출점 후보지 밀어넣기 매핑을 보강했다. 전용면적, 보증금, 권리금, 월세, 관리비, 상세주소, 주차 가능 여부는 target 컬럼 또는 해당 메모 섹션에 직접 반영하고, `requesterId` 같은 내부 추적값은 종합메모에 노출하지 않는다.
- 입점 요청 수정 모달은 등록 화면과 같은 첨부 정책을 사용해 기존 등록 파일을 확인하고 새 파일 메타데이터를 수정 저장할 수 있다.
- 예비 창업자 등록 -> 모객 DB 밀어넣기는 회사별 중복 반영을 지원한다. 이미 반영된 회사 DB는 `반영 완료` 또는 `수정` 상태로 표시하고, 원본 수정 후에는 `업데이트`를 눌러 해당 회사의 target lead를 갱신한다.
- 밀어넣기 성공 시 target lead에 `어드민 인입 관리에서 ... 밀어넣기` 상담 이력을 자동 생성하지 않도록 변경했다. 상담 이력 영역에는 담당자가 직접 입력한 기록만 남긴다.
- 검증: `npx tsx --test src/lib/franchise-property-promotion.test.mts src/lib/franchise-matching-request-promotion.test.mts src/lib/franchise-lead-registration.test.mts src/lib/franchise-property-registration.test.mts src/lib/franchise-admin-intake-view.test.mts src/lib/franchise-lead-workflow.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 브라우저 QA: Playwright mock 세션으로 `/dashboard/franchise-leads` 대상 lead 상세를 열어 밀어넣기 자동 상담 이력이 표시되지 않고 빈 상담 이력 상태가 유지되는 것을 확인했다.

## 2026-06-18 회원가입 휴대폰/협력업체 권한 QA

- 회원가입 API는 신규 가입 시 휴대폰 번호를 필수로 받고 `profiles.phone`, `profiles.phone_normalized` 저장값을 함께 업데이트한다. `/signup` 기존 회사 가입은 `브랜드 임직원`과 `협력업체`를 선택할 수 있고, 신규 회사 가입은 기존처럼 팀장 승인 요청만 허용한다.
- `partner_vendor` 역할을 화면에서는 `협력업체`로 표시한다. 회사 직원 관리에서 팀장은 담당자와 협력업체 승인 대기 요청을 승인할 수 있고, 팀장 승격/강등 대상은 내부 담당자/팀장으로 유지했다.
- 출점 후보지에는 `created_by`를 저장한다. 브랜드 임직원은 같은 회사 후보지를 모두 볼 수 있고, 협력업체는 같은 회사 안에서도 본인이 등록한 후보지만 조회/수정/삭제할 수 있도록 `/api/franchise-locations`, 후보지 기록, 경쟁스캔, 오픈 준비 프로젝트 접근 헬퍼를 통일했다.
- 모객 DB도 `created_by` 기준 접근을 추가했다. 브랜드 임직원은 같은 회사 모객 DB를 모두 볼 수 있고, 협력업체는 같은 회사 안에서도 본인이 작성한 모객 DB만 조회/수정/삭제할 수 있다. 정보공개서 발송/이력, Gmail 발송, 계약 체크리스트, 알림, 진행현황의 매칭 요청 목록도 같은 접근 규칙을 사용한다.
- 진행현황의 입점 요청/예비 창업자/매칭 요청 목록도 협력업체에게는 본인 작성 건만 보이게 했다. 예비 창업자 등록 요청 테이블은 `created_by`를 추가하고 같은 RLS 규칙을 적용한다.
- 담당자 표시에서는 `partner_vendor` 사용자를 `협력업체-이름` 형식으로 노출한다.
- 서브에이전트 코드리뷰에서 발견된 `franchise_opening_projects` 레거시 `requesterId` fallback 회귀를 수정해 가맹 운영 API가 기존 클라이언트 요청 방식도 계속 허용하게 했다.
- 신규 SQL: `supabase_partner_vendor_access_migration.sql`. 이 SQL은 `profiles` 휴대폰 컬럼, `franchise_locations.created_by`, 후보지/기록/오픈프로젝트 RLS를 추가한다. 실제 Supabase 적용은 사용자가 직접 진행해야 한다.
- 검증: `npx tsx --test src/lib/user-role-policy.test.mts src/lib/signup-approval-policy.test.mts src/lib/franchise-location-access.test.mts src/lib/franchise-lead-access.test.mts src/lib/franchise-manager-display.test.mts src/components/franchise/leads/leadWorkspaceState.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 브라우저 QA: 기존 로컬 dev 서버 `http://localhost:3000/signup`에서 회사 검색 API를 mock 처리해 1440px/390px 모두 휴대폰 필수 입력, 기존 회사 선택 후 `브랜드 임직원`/`협력업체` 가입 유형, 협력업체 승인 안내 문구, 가로 overflow 0건을 확인했다. 실계정 role matrix와 RLS 차단은 `supabase_partner_vendor_access_migration.sql` 적용 후 운영 DB에서 재확인한다.

## 2026-06-18 프랜차이즈 DB export QA

- 모객 DB, 출점 후보지, 가맹 운영 목록 상단에 `엑셀`, `PDF`, `인쇄` 버튼 묶음을 추가했다. 엑셀은 현재 필터/정렬 전체 결과를 `.xlsx`로 저장하고, PDF/인쇄는 공통 전용 인쇄 화면에서 브라우저 `PDF로 저장` 또는 인쇄를 사용한다.
- 모객 DB export는 `1차 유입 DB`/`가맹 희망자` 선택 탭, 표시 컬럼, 검색/상태/유입/담당자/날짜/희망지역/예산 필터, 정렬을 반영한다. 화면 페이지네이션이 있어도 export 시 `limit=all` 조회로 필터 전체 결과를 다시 구성한다.
- 출점 후보지 export는 후보지 필터, 정렬, 표시 컬럼을 반영하고, 화면에서 한 줄 말줄임 처리되는 종합메모는 파일/인쇄용 일반 텍스트로 내보낸다. 가맹 운영 export는 운영 가맹점 기준 고정 컬럼으로 내보낸다.
- 검증: `npx tsx --test src/components/franchise/franchiseDbExport.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.
- 브라우저 QA: 로컬 서버 `http://localhost:3000`의 보호 라우트 HEAD 응답은 200을 확인했다. 로그인 세션 없는 Playwright 보호 화면 렌더는 Supabase auth 세션 검증/로그아웃 흐름에 막혀 export 버튼 실클릭까지는 제한됐다. 실제 담당자 계정 세션에서 1440px/390px 버튼 배치, 엑셀 다운로드, PDF/인쇄 팝업은 후속 live QA로 재확인한다.

## 2026-06-18 권리금 전자계약 v2 개발 QA

- 기존 `/contracts`, `/contracts/create`, `/contracts/builder` 개인별 유캔싸인/계약 기능은 그대로 두고, 새 `/contracts/electronic`와 `/contracts/electronic/create` 흐름을 추가했다.
- 새 흐름은 내일사장 공용 UCanSign API KEY 1개로 access token을 발급받아 발송하고, ERP `electronic_contracts.company_id`와 `sent_by_profile_id`로 `내가 발송`, `회사 문서`, 관리자 `전체 문서`를 분리한다.
- 권리금계약서 입력값은 ERP 양식에서 받고, 금액은 `...Amount` 숫자/콤마 필드와 `...Text` 한글 금액 필드로 분리해 유캔싸인 payload를 만든다. 주민등록번호, 실제 서명값, 민감 인증값은 ERP 스냅샷에 저장하지 않는다.
- 인허가번호 조회는 SafetyData `인허가업소정보` 전체 import 후 내부 `license_business_records`에서 검색한다. 결과 카드는 `SALS_UNQ_SE_NO_LCPMT_NO`, `BUES_NM`, `ADDR`를 각각 영업허가번호, 상호명, 주소로 표시하고 도로명/지번 유사 배지를 붙인다.
- 신규 SQL: `supabase_electronic_contracts_platform_migration.sql`. 실제 Supabase 적용은 사용자가 직접 진행해야 한다.
- 검증: `npx tsx --test src/lib/electronic-contracts/*.test.mts src/lib/company-menu-features.test.mts` 13건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, `baseline-browser-mapping`, Browserslist 경고만 출력했다.
- 브라우저 QA: 기존 로컬 dev 서버 `http://localhost:3000`에서 Supabase/auth/API mock 세션으로 `/contracts/electronic`와 `/contracts/electronic/create`를 1440px/390px에서 확인했다. 목록/작성 화면 모두 page overflow 0건, console error 0건이고, 작성 화면에서 인허가번호 조회 결과 카드가 표시됐다. 실제 공용 유캔싸인 연결, SafetyData import, 발송 성공은 `supabase_electronic_contracts_platform_migration.sql` 및 env 적용 후 운영 세션에서 추가 확인한다.

## 2026-06-19 권리금 전자계약 v2 코드리뷰 보완

- 코드리뷰 결과에 따라 신규 전자계약/공용 유캔싸인/인허가 API는 legacy `requesterId` 단독 인증 대신 Supabase bearer 세션을 요구하도록 보강했다.
- 유캔싸인 webhook은 `UCANSIGN_WEBHOOK_SECRET` 검증, ERP 계약 ID와 저장된 유캔싸인 문서 ID 동시 매칭, 허용 상태값 정규화를 통과한 경우에만 계약 상태를 갱신한다.
- 발송 실패 후 초안 재편집/재발송을 허용하고, 유캔싸인 문서 생성 이벤트가 먼저 기록된 경우 중복 발송 대신 ERP 상태 복구를 우선 시도한다.
- SafetyData import는 새 batch를 먼저 비활성 삽입한 뒤 활성 batch를 교체해, 삽입 실패 시 기존 active 검색 데이터가 비는 위험을 줄였다.
- 검증: `npx tsc --noEmit --pretty false`, `npx tsx --test src/lib/electronic-contracts/*.test.mts src/lib/ucansign/*.test.mts src/lib/api-auth.test.mts` 17건 통과.

## 2026-06-19 공개 데모/사용 가이드 v1 개발 QA

- `/landing`에 공개 데모 진입 CTA를 추가하고 현재 기능 기준으로 핵심 설명을 갱신했다.
- `/demo`, `/demo/admin`, `/demo/manager`, `/demo/partner` 공개 라우트를 추가했다. 모든 데모는 샘플 데이터와 로컬 상태만 사용하며 실제 ERP API, Gmail, 유캔싸인, 저장/삭제 API를 호출하지 않는다.
- 역할별 데모는 딤드 오버레이로 주요 기능을 5~6단계로 설명한다. 데스크톱은 강조 영역 옆 설명 카드, 모바일은 하단 설명 카드로 표시한다.
- 향후 기능 개발 시 `/landing`과 `/demo` 영향 여부를 릴리즈 체크리스트에 포함한다. 변경 영향이 없으면 QA 로그에 `데모 영향 없음`으로 기록한다.
- 검증: `npx tsx --test src/app/demo/demoContent.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.
- 브라우저 QA: production build를 `http://localhost:3002`에서 실행해 `/landing`, `/demo`, `/demo/admin`, `/demo/manager`, `/demo/partner`를 1440px/390px에서 확인했다. console error 0건, page error 0건, page-level horizontal overflow 0건. 담당자 데모에서 `샘플 발송 처리`, `샘플 계약 저장` 클릭 시 `/api/` 요청 0건이고 로컬 완료 메시지만 갱신되는 것을 확인했다.

## 2026-06-19 실제 ERP UI 기반 공개 데모 v2 QA

- `/demo/admin`, `/demo/manager`, `/demo/partner`를 실제 `MainLayout` 계열의 사이드바, 상단 헤더, breadcrumb, 탭, 필터, 표, 폼 밀도에 가깝게 재구성했다. 실제 인증/알림/API를 호출하는 보호 레이아웃은 직접 마운트하지 않고, 데모 전용 `DemoErpShell`과 프랜차이즈 workspace 어댑터로 분리했다.
- 데모 범위는 프랜차이즈 우선으로 축소했다. 사이드바에는 상위 단독 `대시보드`와 `프랜차이즈` 하위 `모객 DB`, `출점 후보지`, `가맹 운영`만 노출하고 `업무`, `정보공개서`, `전자계약`, `인입 관리` 데모 목업은 제거했다.
- `대시보드`와 `모객 DB`는 실제 `LeadDashboard`, `LeadDbWorkspace`, `LeadToolbar`, `LeadWorkspaceTabs`를 샘플 데이터로 구동한다. `출점 후보지`는 실제 `LocationMasterSection`, `MarketInsightWorkspaceTabs`, `MarketInsightViewTabs`를 사용하고, `가맹 운영`은 실제 `OperationsSummary`, `FranchiseLocationList`를 사용한다.
- `/demo/**`에서 `/api/**` fetch가 발생하면 차단하는 데모 전용 guard를 유지했다. 데모 버튼은 후보지 연결, 후보지 반영, 운영 상태 변경처럼 로컬 완료 메시지만 갱신한다.
- 검증: `npx tsx --test src/app/demo/demoContent.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.
- 브라우저 QA: 기존 로컬 서버 `http://localhost:3000`에서 `/demo`, `/demo/admin`, `/demo/manager`, `/demo/partner`를 1440px/390px로 확인했다. console error 0건, page error 0건, `/api/**` 요청 0건, page-level horizontal overflow 0건이다. 데모 사이드바에서 `업무` 메뉴는 노출되지 않고 `대시보드`와 프랜차이즈 메뉴만 표시되는 것을 확인했다.

## 2026-06-19 공개 데모 직접 진입/탭 이동 QA

- `/demo`의 역할 선택 화면을 제거하고 담당자 기준 프랜차이즈 데모가 바로 열리도록 변경했다. 랜딩 CTA도 단일 `데모 시작하기` 진입으로 정리했다.
- `LeadWorkspaceTabs`의 `대시보드`, `DB 관리`, `계약 완료`를 모두 실제 데모 화면 전환에 연결했다. `계약 완료`는 샘플 체크리스트 요약을 주입해 운영 API 호출 없이 실제 체크리스트 UI를 표시한다.
- `/demo` 첫 진입 시 대시보드 핵심 숫자부터 딤드 오버레이가 자동 표시되도록 변경했다. 우측에는 `사용 방법` 패널을 고정해 상단 숫자, 파이프라인, DB 관리, 계약 완료 확인 순서를 안내한다.
- 데모 사이드바 로고와 담당자 회사 표기는 실회사명 대신 `데모` 기준으로 표시한다.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/app/demo/demoContent.test.mts`, `npm run build` 통과. Playwright로 `/demo` 1440px/390px에서 자동 투어, 우측 설명 패널, 로고 `데모`, `/api/**` 요청 0건, page-level horizontal overflow 0건을 확인했다.

## 2026-06-19 회사 업로드 전자계약 템플릿 v2 QA

- `/contracts/electronic`에 `템플릿 관리` 탭을 추가했다. 사용자 화면은 ERP에서 이름/PDF를 중복 입력하지 않고 `UCanSign에서 만들기`로 템플릿 설정 화면을 열어 이름, PDF, 입력칸, 서명칸을 UCanSign에서 저장하는 흐름으로 정리했다.
- UCanSign 콜백이 돌아오면 ERP가 회사 템플릿 버전을 자동 연결/사용중 처리한다. 콜백 또는 상세 조회 응답에서 템플릿명이 확인되면 ERP 목록명도 UCanSign 저장명으로 동기화한다.
- 보관 템플릿은 사용 템플릿 표와 분리해 노출한다. 사용 템플릿 삭제 시 발송 이력이 있으면 보관으로 이동하고, 보관 템플릿은 복원하거나 목록에서 완전 삭제할 수 있다. 삭제 확인은 브라우저 기본 confirm 대신 앱 시스템 다이얼로그로 표시한다.
- 신규 API는 `GET/POST /api/electronic-contract-templates`, 상세/수정/삭제, PDF 업로드, 버전 저장, 자동 연결 콜백, `POST /api/electronic-contracts/send-company-template`로 분리했다. 기존 권리금 고정 템플릿 발송 API와 기존 계약 기능은 유지했다.
- 공개 확인 가능한 유캔싸인 문서는 direct raw PDF 좌표 발송보다 템플릿/임베드 흐름이 명확하므로, 회사 업로드 템플릿 발송은 활성 버전에 `ucansign_template_id`가 연결된 경우에만 진행한다. 미연결 상태는 발송 차단 메시지를 보여준다.
- 검증: `npx tsx --test src/lib/electronic-contracts/company-template.test.mts src/lib/electronic-contracts/template-field-layout.test.mts src/lib/ucansign/platform-config.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/template-link-state.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.
- 브라우저 QA: 로컬 로그인 세션에서 `/contracts/electronic` -> `템플릿 관리` 진입 후 API KEY 상태줄 미노출, 상단 설명 문구 제거, `문서/설정` 컬럼 대신 `생성자/생성일` 컬럼 노출, 사용/보관 템플릿 분리, `수정`/`복원`/`삭제` 버튼, 시스템 삭제 다이얼로그, 하단 중복 안내 패널 제거를 확인했다. 스크린샷: `.omo/evidence/electronic-contract-template-ui-20260619.png`.
- 전자계약 헤더의 독립 `권리금계약 작성` 버튼을 제거하고, `템플릿 관리` 안에 `공통 템플릿` 섹션을 추가했다. 현재 기본 제공 양식은 `권리금계약서`이며, 회사가 만든 양식은 `회사 템플릿` 섹션에서 별도로 관리한다.

## 2026-06-19 UCanSign API KEY 발송 전환 QA

- 새 전자계약 v2 공용 발송을 OAuth 연결/refresh token 저장 방식에서 UCanSign API KEY 토큰 발급 방식으로 전환했다. 서버는 `UCANSIGN_API_KEY`로 30분 access token을 발급받아 캐시하고, 401 응답 시 1회 재발급 후 재시도한다.
- ERP 문서 소유권 구조는 유지한다. 내일사장 제공 공통 권리금계약서와 회사별 업로드 템플릿은 모두 공용 API KEY로 발송하되, 문서함과 템플릿 관리는 `company_id`, `sent_by_profile_id`, 회사 템플릿 버전 기준으로 분리한다.
- 관리자 상태 API는 DB 연결 상태가 아니라 `UCANSIGN_API_KEY`, 공통 권리금 템플릿 ID, webhook secret 누락 여부를 알려준다. 사용자 화면에는 재연동 흐름이 노출되지 않는다.
- 검증: `npx tsx --test src/lib/ucansign/platform-config.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/template-link-state.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과.

## 2026-06-22 전자계약 문서 다운로드 QA

- 사용자가 받은 완료 문서 `[내일] ㅋㅋㅋzzzz.pdf`가 Chrome PDF viewer에서 열리지 않는 문제를 확인했다. 원인은 UCanSign 완료 문서 `full-file`이 실제 PDF 단일 파일이 아니라 서명 PDF, 감사추적인증서 PDF, 페이지 이미지가 들어있는 ZIP 묶음을 반환했는데, ERP가 이를 `.pdf`로 저장한 것이었다.
- `normalizePlatformDocumentFile()`을 추가해 응답 첫 바이트가 `%PDF-`이면 PDF로 유지하고, ZIP이면 내부 PDF 중 가장 큰 파일을 주 문서로 추출해 `application/pdf`로 내려주게 했다. ZIP 안에 유효한 PDF가 없을 때만 `.zip`으로 저장한다.
- 전자계약 문서함 다운로드 버튼도 서버 응답 `Content-Type`에 따라 `.pdf` 또는 `.zip` 확장자를 붙이도록 맞췄다.
- 검증: `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npx tsx --test src/lib/ucansign/platform-client.test.mts`, `npm run build` 통과. 추가 관련 테스트 묶음 `npx tsx --test src/lib/electronic-contracts/company-template.test.mts src/lib/electronic-contracts/template-field-layout.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/electronic-contracts/common-templates.test.mts src/lib/ucansign/platform-config.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/template-link-state.test.mts src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts`는 34건 통과했다.

## 2026-06-22 회사 템플릿 직접 작성 임베딩 QA

- 회사 업로드 템플릿에서 `템플릿에서 직접 작성`을 선택했을 때 UCanSign 범용 문서 선택 화면이 뜨는 문제를 수정했다.
- 원인은 ERP가 활성 템플릿 버전의 `ucansign_template_id`를 사용하지 않고 범용 `/embedding/sign-creating` 임베딩을 열던 것이었다. UCanSign 공식 임베딩 API의 범용 `sign-creating`은 문서 선택 화면부터 시작하며, `POST /openapi/embedding/sign-creating/{templateId}`는 404로 확인됐다.
- 이제 저장된 템플릿 ID가 있는 경우 `https://app.ucansign.com/signCreating/progress/{ucansign_template_id}` 진행 화면을 열어 해당 템플릿의 참여자 설정/서명 요청 화면으로 바로 진입하고, 연결 ID가 없으면 `UCanSign 템플릿 연결이 필요합니다.`로 차단한다.
- 이 변경은 실제 저장/발송 API 구조를 바꾸지 않으며, 회사/발송자 기준 문서 분리와 UCanSign API KEY 공용 발송 정책은 유지한다. 신규 SQL은 없다.
- 검증: `npx tsx --test src/lib/ucansign/platform-client.test.mts src/lib/ucansign/template-link-state.test.mts src/lib/electronic-contracts/ucansign-webhook.test.mts src/app/(main)/contracts/electronic/_components/signerParticipantModel.test.mts src/lib/electronic-contracts/signer-participant-validation.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.

## 2026-06-22 회사 템플릿 작성 방식 단순화 QA

- 회사 업로드 템플릿 계약 작성 화면에서 `작성 방식` 선택 카드와 `템플릿에서 직접 작성` 임베딩 진입을 제거했다. 사용자 화면은 `필드명` 입력, 서명자 정보, 임시저장, 전자계약 발송만 남긴다.
- 임시저장/발송 payload는 항상 `inputMode='erp'`와 ERP 입력값을 기준으로 저장한다. 기존 공통 템플릿/회사 템플릿 분리, 회사/발송자 기준 문서함 분리는 유지한다.
- UCanSign Postman 컬렉션을 확인한 결과 템플릿 기반 서명문서 생성, 문서 세부정보/이력, 문서 파일, 종합 파일 다운로드, 템플릿 생성/수정 임베딩 endpoint는 있으나, 저장된 템플릿에 ERP 입력값을 넣은 PDF를 발송 전에 렌더링하는 preview endpoint는 확인되지 않았다.
- 다음 고도화 후보는 발송 전 입력값/서명자 확인 모달, 템플릿 연결 상태 진단, webhook 누락 시 상태 새로고침, 완료 문서 다운로드/이력 재조회 강화다.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.

## 2026-06-22 회사별 아이디 로그인 QA

- 회원가입 화면을 `아이디`, `이메일`, `비밀번호`, `비밀번호 확인`, `이름`, `휴대폰 번호`, `회사` 입력 흐름으로 정리했다. 비밀번호 확인 불일치, 휴대폰 누락, 아이디 규칙 위반은 가입 전에 차단한다.
- 로그인은 기본적으로 `회사 + 아이디 + 비밀번호`를 서버에 전달하고, 서버가 `profiles.company_id + login_id_normalized`로 실제 Supabase Auth 이메일을 찾아 세션을 발급한다. 전환 안정성을 위해 이메일 입력 로그인은 임시 fallback으로 유지한다.
- 신규 SQL: `supabase_login_id_migration.sql`. 이 SQL은 `profiles.login_id`, `profiles.login_id_normalized`를 추가하고 기존 계정을 이메일 `@` 앞부분으로 backfill한다. 같은 회사 안에 중복 local-part가 있으면 SQL이 실패하므로 사용자가 Supabase SQL Editor에서 중복 정리 후 직접 적용해야 한다.
- 검증: `npx tsx --test src/lib/login-id.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, Browserslist/baseline-browser-mapping 경고만 출력했다.
- 브라우저 QA: 기존 로컬 서버 `http://localhost:3000`에서 `/signup`, `/login`을 1440px 기준으로 확인했다. 회원가입 라벨은 아이디/이메일/비밀번호/비밀번호 확인/이름/휴대폰 번호/회사명/가입 승인 방식으로 표시됐고, 로그인 라벨은 회사/아이디/비밀번호/아이디 저장으로 표시됐다. 두 화면 모두 page-level horizontal overflow 0건이었다.
- 데모 영향 없음: 공개 `/demo`는 인증 없는 샘플 데이터 화면이므로 이번 로그인 방식 변경에 따른 데모 UI 수정은 없다.

## 2026-06-22 로그인 화면 저장 UX QA

- 로그인 화면을 `LoginForm` 프레젠테이션 컴포넌트와 `loginStorage` helper로 분리했다. 회사는 최초 1회 검색해 저장하고, 다음 로그인부터 저장된 회사가 자동 선택되도록 했다.
- `아이디 저장`은 아이디만 선택적으로 저장하고, 회사 선택값은 로그인 성공 또는 회사 선택 시 별도로 저장한다. 이메일 로그인 fallback은 유지하되 UI 기본 안내는 아이디 로그인 기준으로 정리했다.
- 검증: `npx tsx --test src/app/login/loginStorage.test.mts src/lib/login-id.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 신규 SQL은 없다. 기존 회사별 아이디 로그인 SQL 적용 상태에 따라 실제 아이디 로그인 schema가 활성화된다.

## 2026-06-22 전자계약/어드민 후속 작업 기록

- 지금까지 반영된 흐름: 기존 계약 기능은 유지하고, 새 `/contracts/electronic` 전자계약 v2에서 공통 템플릿/회사 템플릿, UCanSign API KEY 발송, 문서함 scope, 문서 다운로드, 회사별 아이디 로그인을 분리했다.
- 남은 UI 정리: `권리금 전자계약` 메뉴명을 `전자계약`으로 바꾸고 프랜차이즈 하위 메뉴 하단에 배치한다. 개인정보 수정 화면의 개인 UCanSign 서비스 연동 영역은 삭제한다.
- 남은 UCanSign 검토: `내용 확인 후 서명`과 `서명취소`는 UCanSign API/문서별 URL 지원 여부 확인이 필요하다. 지원되면 ERP 문서함 액션으로 연결하고, 취소는 ERP 상태와 webhook idempotency까지 검증한다.
- 남은 어드민 작업: 회사별 전자계약 사용량 집계와 사용자별 `login_id` 노출을 추가한다. 우선 기존 테이블 조회 기반으로 구현하고, 별도 집계 테이블이 필요하면 SQL 작성 후 사용자가 직접 등록한다.
- 운영 설정 체크: production UCanSign은 `UCANSIGN_API_KEY`, webhook secret, UCanSign 개발자센터 webhook URL `https://www.fcerp.co.kr/api/electronic-contracts/webhooks/ucansign?secret=...` 등록 상태를 확인해야 한다.
- 다음 QA 포인트: 메뉴 위치, 개인정보 수정 화면 노출 여부, 어드민 사용량/아이디 표, 문서함 상태 동기화, webhook 수신 후 완료 상태 반영, 권한별 문서 조회 범위를 확인한다.

## 2026-06-23 전자계약/어드민 후속 구현 QA

- 메뉴 정리: 사이드바와 회사별 메뉴 권한 정의에서 `전자계약`을 프랜차이즈 하위 메뉴 가장 하단으로 이동했다. `/contracts/electronic` breadcrumb도 `프랜차이즈 > 전자계약`으로 맞췄다.
- 개인 UCanSign 정리: 개인정보 수정의 개인 UCanSign 연동 컴포넌트를 제거하고, 로그아웃 시 `/api/ucansign/disconnect`를 호출하던 개인 연동 해제 흐름도 제거했다. 대시보드 전자계약 클릭은 개인 연동 상태 확인 없이 `/contracts/electronic`로 이동한다.
- UCanSign 액션: 공식 Postman 문서 기준 `POST /embedding/view/:documentId`로 `내용 확인 후 서명` 접근 URL을 만들고, `POST /documents/:documentId/request/cancellation`로 `서명 요청 취소`를 호출한다. 취소 요청은 발송 중/서명 대기 문서와 발송자 또는 관리자만 가능하며, 성공 시 ERP 상태를 `canceled`로 갱신한다.
- 어드민: `/api/admin/electronic-contract-usage`를 추가해 회사별 전체/초안/진행/완료/실패·취소/최근 발송/최근 완료 사용량을 표시한다. 회원 및 권한 관리 표에는 `login_id`를 `로그인 ID` 줄로 노출한다.
- UI 문구: 전자계약 문서함 상태를 `서명 대기`, `요청 취소` 등 실무 상태 중심으로 정리했고, 회사 템플릿 상태와 버튼도 `발송 가능`, `UCanSign 연결 필요`, `문서 작성`, `연결 후 작성`, `수정/연결하기`로 정리했다.
- 관리자 모바일 보정: 기존 어드민 레이아웃의 고정 사이드바/고정 3열 grid로 본문이 좁아지는 문제를 함께 보정했다. 모바일에서 어드민 사이드바는 상단 가로 메뉴가 되고 대시보드 grid는 `auto-fit`으로 정렬된다.
- 검증: `npx tsx --test src/lib/company-menu-features.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/electronic-contracts/usage-summary.test.mts src/lib/ucansign/platform-client.test.mts src/lib/ucansign/platform-document-actions.test.mts` 25건 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 기존 `http://localhost:3000` dev 서버에 Playwright auth/API mock을 주입해 `/contracts/electronic`, `/profile`, `/admin`, `/admin/users`를 확인했다. 전자계약 메뉴는 `가맹 운영` 다음, 문서함에는 `내용 확인 후 서명`과 `서명 요청 취소`가 표시됐고 취소 후 상태가 `요청 취소`로 바뀌었다. `/profile`에는 `서비스 연동`/`유캔싸인` 문구가 없었고, `/admin` 사용량 패널과 `/admin/users`의 `로그인 ID: manager01` 표시를 확인했다. 모바일 page-level horizontal overflow는 `/contracts/electronic`, `/admin`, `/admin/users` 모두 0건이었다. 전자계약 모바일 표의 `내일사장`, `양도인` 같은 한글 단어가 음절 단위로 쪼개지지 않도록 표 셀 nowrap도 확인했다.
- 신규 SQL은 없다. 기존 `electronic_contracts`, `contract_events`, `companies`, `profiles.login_id` 기준으로 동작한다.
- 남은 운영 확인: 실제 UCanSign 운영 키로 문서 접근 URL이 서명자별 기대 화면을 여는지, 취소 API 성공 후 UCanSign webhook `signing_canceled`가 ERP `canceled` 상태와 idempotent하게 맞물리는지 운영 샘플로 확인한다.

## 2026-06-23 전자계약 사이드바/템플릿 버튼 후속 QA

- 사이드바 프랜차이즈 하단의 `전자계약` 항목에 `FileSignature` 아이콘을 추가했다. 회사별 메뉴 권한 테스트에는 전자계약 메뉴가 프랜차이즈 하단에 있고 `fileSignature` 아이콘을 갖는지 회귀 assertion을 추가했다.
- 회사 템플릿 관리 테이블의 UCanSign 편집 액션 버튼 라벨은 화면 밀도를 위해 `UCanSign 수정`에서 `수정`으로 줄였다. 버튼 아이콘과 동작은 기존 UCanSign 수정 진입 흐름을 유지한다.
- 검증: `npx tsx --test src/lib/company-menu-features.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check` 통과.
- 브라우저 QA: 기존 `http://localhost:3000` dev 서버에 Playwright auth/API mock을 주입해 `/contracts/electronic`를 확인했다. `aside a[href="/contracts/electronic"]` 안에 SVG 아이콘이 있고, 템플릿 관리 탭에는 `수정` 버튼 1개가 표시되며 `UCanSign 수정` 라벨은 남아 있지 않았다. 증거 스크린샷: `ERP/web/.omo/evidence/electronic-contract-sidebar-icon-and-template-edit-label.png`.
- 신규 SQL은 없다.

## 2026-06-23 회사 템플릿 UCanSign 연결 문구 QA

- 회사 템플릿 관리 테이블의 `설정 필요` 문구가 의미를 바로 알기 어려워, 연결 전 템플릿 상태를 `UCanSign 연결 필요`로 바꾸고 작성 버튼은 `연결 후 작성`, UCanSign 설정 진입 버튼은 `연결하기`로 분리했다. 이미 연결된 템플릿은 기존처럼 `발송 가능`, `문서 작성`, `수정`을 표시한다.
- 상태/버튼 문구는 `getCompanyTemplateUsageState()`로 분리하고 `companyTemplateTableState.test.mts`에서 연결/미연결 템플릿 문구를 회귀 검증한다.
- 검증: `npx tsx --test src/lib/company-menu-features.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateTableState.test.mts"`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과.
- 브라우저 QA: 기존 `http://localhost:3000` dev 서버에 Playwright auth/API mock을 주입해 `/contracts/electronic` 템플릿 관리 탭을 확인했다. 화면에 `UCanSign 연결 필요`, `연결 후 작성`, `연결하기`가 표시되고 `설정 필요`는 남아 있지 않았다. 증거 스크린샷: `ERP/web/.omo/evidence/electronic-contract-template-ucansign-connection-copy.png`.
- 신규 SQL은 없다.

## 2026-06-23 회사 템플릿 미연결 초안 분리 QA

- 미연결 템플릿이 존재하는 이유: 현재 회사 템플릿 만들기 흐름은 UCanSign 콜백 state를 검증하기 위해 ERP 템플릿/버전 row를 먼저 만들고 외부 UCanSign 설정 화면으로 이동한다. 사용자가 UCanSign 설정을 끝내지 않고 이탈하거나 콜백 저장이 실패하면 `ucansign_template_id`가 비어 있는 초안 row가 남는다.
- 미연결 초안이 `회사 발송 템플릿`에 섞이면 실제 발송 가능한 템플릿처럼 보이므로, 목록을 `회사 발송 템플릿`, `연결 필요 템플릿`, `보관 템플릿`으로 분리했다. 발송 목록에는 `status='active'`이고 UCanSign 템플릿 ID가 있는 항목만 표시한다.
- 분리 기준은 `getCompanyTemplateSections()`로 고정하고 `companyTemplateSections.test.mts`에서 연결 완료/미연결/보관 템플릿 분류를 회귀 검증한다.
- 검증: `npx tsx --test "src/app/(main)/contracts/electronic/_components/companyTemplateSections.test.mts" "src/app/(main)/contracts/electronic/_components/companyTemplateTableState.test.mts" src/lib/company-menu-features.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과.
- 브라우저 QA: 기존 `http://localhost:3000` dev 서버에 Playwright auth/API mock을 주입해 `/contracts/electronic` 템플릿 관리 탭을 확인했다. `회사 발송 템플릿`에는 연결 완료 템플릿만, `연결 필요 템플릿`에는 미연결 초안만 표시됐다. 증거 스크린샷: `ERP/web/.omo/evidence/electronic-contract-template-sectioned-connection-required.png`.
- 신규 SQL은 없다.

## 2026-06-23 회사 템플릿 미연결 초안 숨김 QA

- 사용자 피드백에 따라 `연결 필요 템플릿` 섹션도 기본 업무 화면에서는 노출하지 않도록 변경했다. 이제 템플릿 관리 탭의 `회사 발송 템플릿`에는 UCanSign 연결이 완료되어 실제 문서 작성이 가능한 회사 템플릿만 표시한다.
- 미연결 초안 row는 UCanSign 외부 설정 이탈/콜백 실패 때문에 DB에는 남을 수 있지만, 운영자가 쓰는 기본 목록에는 보이지 않는다. 삭제/정리 정책은 별도 운영 도구가 필요해질 때 다룬다.
- 검증: `npx tsx --test "src/app/(main)/contracts/electronic/_components/companyTemplateSections.test.mts" "src/app/(main)/contracts/electronic/_components/companyTemplateTableState.test.mts" src/lib/company-menu-features.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과.
- 브라우저 QA: 기존 `http://localhost:3000` dev 서버에 Playwright auth/API mock을 주입해 `/contracts/electronic` 템플릿 관리 탭을 확인했다. 연결 완료 템플릿은 표시되고, 미연결 템플릿 이름, `연결 필요 템플릿` 섹션, `UCanSign 연결 필요`/`연결 후 작성`/`연결하기` 문구는 화면에 없었다. 증거 스크린샷: `ERP/web/.omo/evidence/electronic-contract-template-unlinked-hidden.png`.
- 신규 SQL은 없다.

## 2026-06-23 전자계약 발송 후 이동/다운로드 상태 QA

- 운영 증상: `서명 대기` 문서에서 다운로드를 누르면 UCanSign `full-file` API가 500을 반환했고, `내용 확인 후 서명`으로 만든 UCanSign read URL은 실서버에서 빈 화면, `reason=1docError`, 또는 UCanSign 로그인 페이지를 보였다.
- 조치: ERP 문서함에서 `내용 확인 후 서명` 액션과 `/api/electronic-contracts/[id]/view-link` route를 제거했다. 서명자는 UCanSign이 발송한 이메일/카카오톡 링크로 서명하고, ERP 문서함은 문서 상태 확인, 서명 요청 취소, 삭제, 완료 문서 다운로드만 제공한다.
- 다운로드 노출 기준은 `completed` 상태로 제한했다. 직접 다운로드 API를 호출해도 완료 전 문서는 UCanSign까지 호출하지 않고 `서명 완료 후 다운로드할 수 있습니다.` validation error를 반환한다.
- 공통 권리금 작성과 회사 템플릿 작성 모두 발송 성공 후 작성 화면에 머물지 않고 `/contracts/electronic` 문서함으로 즉시 이동한다.
- 아직 완성 전인 기본 제공 `권리금계약서`도 공통 템플릿 목록에서 숨겼다. 숨김 상태에서는 `공통 템플릿` 섹션 자체가 렌더되지 않고, 회사 템플릿 목록만 표시된다.
- 검증: `npx tsx --test src/lib/electronic-contracts/common-templates.test.mts src/lib/electronic-contracts/document-permissions.test.mts src/lib/ucansign/platform-document-actions.test.mts`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 기존 `http://127.0.0.1:3000` dev 서버에 Playwright auth/API mock을 주입해 `/contracts/electronic`를 1280px/390px에서 확인했다. `내용 확인 후 서명`은 0건, 다운로드 버튼은 완료 문서 1건에만 표시, 서명 대기 문서는 취소/삭제만 표시, 템플릿 관리 탭에는 `권리금계약서`와 `공통 템플릿` 섹션이 없었다. 두 viewport 모두 page-level horizontal overflow 0건이었다. 증거 스크린샷: `ERP/web/.omo/evidence/electronic-contract-actions-template-hidden-desktop.png`, `ERP/web/.omo/evidence/electronic-contract-actions-template-hidden-mobile.png`.
- 신규 SQL은 없다.

## 2026-06-23 계약 전 체크 v2 및 점주 문서함 연동 QA

- 계약 전 체크를 기존 7개 운영 확인에서 문서 기반 17개 항목으로 전환했다. 각 항목은 `필수/내부보고/선택`, `가맹사업법상/개인정보/운영필수`, 자료근거, 제출담당, 해당 여부, 연결 문서 요약을 분리해 표시한다.
- 기본 계약 가능 게이트는 `필수` 그룹만 본다. `내부보고`는 경고성 진행률, `선택`은 관리 편의 진행률로 별도 집계한다. `예상매출액 산정서`는 조건부 법정 항목으로 기본 `해당없음` 처리된다.
- `해당없음` 저장은 체크 메모 없이도 가능하다. 필수 항목도 `해당없음`으로 저장하고 해결 처리하되, 완료 체크와는 분리된다. 체크리스트 행에서는 체크 메모를 제거하고 문서 메모만 문서 관리 모달/문서함에서 확인한다.
- 점주 문서함 API `/api/franchise-lead-documents`를 추가했다. 리드 회사 접근 검증 후 문서 등록/수정/삭제와 체크리스트 항목 링크를 관리한다. 후보자 상세의 계약 전 체크 전용 패널에 `점주 문서함` 섹션을 추가해 파일 업로드 문서를 개별 체크 항목에 연결할 수 있게 했다.
- 회사 템플릿 전자계약 작성 URL/API가 `leadId`를 받을 수 있게 했다. 초안 저장과 발송 성공 시 `electronic_contracts.lead_id`를 저장하고, 점주 문서함에 `전자계약` 문서 레코드를 자동 생성/갱신한 뒤 `가맹계약서` 체크 항목에 연결한다.
- 신규 SQL: `supabase_franchise_lead_documents_migration.sql` 추가. `franchise_lead_contract_checklist_steps` v2 컬럼, `electronic_contracts.lead_id`, `franchise_lead_documents`, `franchise_lead_document_checklist_links`, 인덱스/RLS를 포함한다. **SQL 등록 필요**.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, 임시 빌드 후 `node --test /tmp/erp-contract-check-tests/franchise-lead-contract-checklist.test.mjs /tmp/erp-contract-check-tests/franchise-lead-documents.test.mjs` 14개 테스트 통과, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: `npm run start -- --hostname 127.0.0.1 --port 3000`로 production build를 띄운 뒤 Playwright로 `/demo/manager` 계약 완료 흐름을 1280px/390px에서 확인했다. 계약 전 체크 리스트 요약은 두 viewport 모두 page-level horizontal overflow 0건이었다. 실 대시보드 `/dashboard/franchise-leads`는 로컬 인증/데이터 조건 때문에 본문을 확인하지 못했고, 실제 후보자 상세의 체크리스트 저장/문서 업로드/전자계약 자동 연결은 SQL 적용 후 로그인 세션에서 live QA가 필요하다. 증거 스크린샷: `ERP/web/.omo/evidence/contract-check-v2-workflow-desktop.png`, `ERP/web/.omo/evidence/contract-check-v2-workflow-mobile.png`.
- UI 보정: 체크리스트 상세에서 `필수/보고/선택`을 행 배지가 아니라 섹션 단위로 분리하고, 상단 요약 카드와 섹션 좌측 컬러 라인으로 구분한다. 행에서는 `구분` 컬럼을 제거해 제출서류, 해당 여부, 근거, 제출담당, 연결 문서, 메모에 집중하도록 정리했다.
- UI 재검증: production build에 Playwright auth/API mock을 주입해 `/dashboard/franchise-leads` 계약 완료 탭에서 상세 체크리스트를 1280px/390px로 확인했다. 두 viewport 모두 page-level horizontal overflow 0건이고, 메모 저장 아이콘 버튼 17개가 모두 패널 안쪽에 들어왔다. 증거 스크린샷: `ERP/web/.omo/evidence/contract-checklist-grouped-desktop-v2.png`, `ERP/web/.omo/evidence/contract-checklist-grouped-mobile-v2.png`.
- 계약 완료 점주 상세 패널을 `구비서류 / 점주 문서함 / 가맹점 정보` 탭으로 분리했다. `가맹점 정보` 탭은 계약완료 상태에서만 노출되고, 연결 후보지가 있으면 원본 후보지를 보존한 채 `가맹점`, `오픈준비` 가맹점 마스터 레코드를 새로 생성한다. 생성 후에는 같은 탭에서 이름, 브랜드, 상태, 지역, 주소, 오픈예정일/오픈일, 운영 이관 메모를 수정하고, 운영 화면 deep link로 이동할 수 있다.
- 신규 API: `POST /api/franchise-leads/contract-store` 추가. 계약완료 lead와 후보지/외부 상가/직접 입력을 받아 `franchise_locations`에 운영 가맹점 레코드를 생성한다. 기존 `/api/franchise-locations`에는 `contractLeadId` 필터와 계약 연동 컬럼 응답을 추가했다. 운영 화면 `/dashboard/franchise-operations?locationId=...` 진입 시 해당 가맹점 폼이 자동 선택된다.
- 신규 SQL: `supabase_franchise_contract_store_linkage_migration.sql` 추가. `franchise_locations.contract_lead_id`, `source_location_id`, `source_external_listing_id`, `contracted_at`, 중복 생성 방지 unique index와 조회 index를 포함한다. **SQL 등록 필요**.
- 검증: `npx tsx --test src/lib/franchise-contract-store.test.mts` 3개 테스트 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: `npm run start -- -p 3063` production build에 Playwright auth/API mock을 주입해 `/dashboard/franchise-leads` 계약 완료 탭 상세의 `가맹점 정보` 생성 흐름을 1280px/390px에서 확인했다. 생성 전 후보지 선택, `후보지로 생성`, 생성 후 `운영 화면`/`가맹점 수정` 노출을 확인했고 두 viewport 모두 page-level/dialog horizontal overflow 0건이었다. 증거 스크린샷: `ERP/web/.omo/evidence/contract-store-link-desktop-before.png`, `ERP/web/.omo/evidence/contract-store-link-desktop-after.png`, `ERP/web/.omo/evidence/contract-store-link-mobile-before.png`, `ERP/web/.omo/evidence/contract-store-link-mobile-after.png`.
- 후속 UI 보정: 체크리스트 행을 큰 `완료 처리` 버튼 중심의 카드형 행으로 재배치하고, 완료 시간은 `06.23 19:30` 형식으로 줄바꿈 없이 표시한다. `보고` 사용자 표기는 `내부보고`로 변경하되 내부 enum `report`는 유지한다.
- 점주 문서함 보정: 파일 없는 `수기 등록`은 제거하고, `수기 등록`은 파일 업로드 문서 등록으로 통일했다. `전자계약 연결`은 새 작성 CTA가 아니라 해당 lead의 `서명 완료` 전자계약 문서를 불러와 선택 연결한다.
- 연결 해제: 체크리스트 행과 점주 문서함 문서 목록에서 체크 항목 링크를 해제할 수 있게 했다. 문서 자체는 보관 처리하지 않고 `franchise_lead_document_checklist_links` 연결만 삭제한다.
- 체크리스트 카드 폭 보정: 그룹 내부 체크 항목을 전체 폭 행이 아니라 390~460px 카드 그리드로 배치했다. 단일 항목도 `auto-fill` 트랙 안에 머물게 해 과도하게 길어지지 않도록 했고, 카드 안은 `완료 처리/완료됨` 버튼, 제출서류 정보, 연결 문서/메모 액션 순서로 세로 정리했다. 900px 이하에서는 1열로 전환된다.
- 후속 검증: `./node_modules/.bin/eslint src/components/franchise/LeadContractChecklistSection.tsx src/components/franchise/LeadDocumentBoxSection.tsx src/app/api/franchise-lead-documents/route.ts src/app/api/electronic-contracts/route.ts` 에러/경고 없이 통과. 추가 CSS 보정과 `PropertyCard` Recharts formatter/purity 정리 후 `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/lib/franchise-lead-documents.test.mts src/lib/franchise-contract-store.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts"` 20개 테스트, `git diff --check`, `npm run build` 통과. Playwright로 `http://localhost:3023/demo/manager` 계약 완료 요약을 1280px/390px에서 확인했고 page-level horizontal overflow 0건이었다. 데모의 `체크리스트 열기`는 실제 상세 모달이 아니라 샘플 토스트 동작이라, 실제 카드형 체크리스트 조작 QA는 SQL/로그인 세션에서 추가 확인이 필요하다.
- 실데이터 QA 샘플: Supabase service role로 내일 회사 관리자 테스트 범위(회사/계정 식별자 마스킹)에 `contract_check_14day_seed_20260623` 샘플을 생성/갱신했다. `QA_14일경과_문채원`, `QA_14일경과_강태오`, `QA_14일경과_이서준` 3건은 모두 `계약완료`, `leadStage=candidate`, 연결 후보지 1건, 정보공개서 발송 이력 `sent_at=2026-06-01 01:00:00+00`, `send_status=recorded`를 가진다. 2026-06-23 기준 21일 경과로 14일 계약 게이트 통과를 DB 재조회로 확인했다. 이번 seed용 신규 SQL은 없다.
- 가맹점 정보 탭 보정: 연결 후보지 선택 후 기존 가맹점 조회가 끝나면서 폼이 기본값으로 덮여 후보지 주소가 비는 문제를 수정했다. 후보지 선택 주소/지역/좌표는 가맹 운영 마스터 생성 폼에 유지되고, 직접 입력 주소도 자유입력이 아니라 Kakao 주소 검색 컴포넌트로 선택하도록 바꿨다. 주소 없이 가맹 운영점을 생성하지 못하도록 API와 폼 검증을 막고, 생성 버튼 문구는 `후보지로 생성`에서 `가맹 운영에 생성`으로 변경했다.
- 가맹점 정보 보정 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/franchise-contract-store.test.mts`, `git diff --check`, `npm run build` 통과. `npm run start -- --hostname 127.0.0.1 --port 3067` production build에 Playwright auth/API mock을 주입해 `/dashboard/franchise-leads` 계약 완료 상세의 `가맹점 정보` 탭을 1280px/390px에서 확인했다. 후보지 주소 `서울 광진구 능동로50길 8`이 주소 필드에 유지되고, 지역 `서울 광진구`, `가맹 운영에 생성` 버튼, 후보지 주소 표시를 확인했다. 모바일 page-level overflow는 0건이었다. 증거 스크린샷: `ERP/web/.omo/evidence/contract-store-address-copy-desktop.png`, `ERP/web/.omo/evidence/contract-store-address-copy-mobile.png`.
- 배포: `9322175 feat(franchise): refine contract readiness workflows`를 Vercel `naeilsajang` production에 CLI 직접 배포했다. `dpl_7b4n3rGnyENexpdjaS43X3gdVzxT`가 READY이고 `https://naeilsajang.vercel.app`에 alias 처리되었다. main/dev 브랜치 merge 또는 push는 하지 않았다.
- 코드 리뷰 보정: 후보지 선택으로 가맹 운영 마스터를 만들 때 선택 후보지의 주소는 복사되지만 지역이 lead 희망지역으로 남을 수 있는 문제를 수정했다. 후보지/외부 상가 source의 `region`을 폼 초기값에 포함하고, 순수 helper `franchise-contract-store-form` 테스트로 후보지 지역/주소/좌표 복사를 고정했다. 점주 문서함의 `문서 삭제` 액션은 더 이상 `status='archived'` soft-delete가 아니라 `franchise_lead_documents` 레코드를 실제 삭제하며, 체크 항목 링크는 FK cascade에 맡겨 중간 실패로 문서만 미연결되는 상태를 피한다. 업로드 문서는 `/api/upload` 응답의 Storage path를 문서 `data`에 저장하고, 삭제 시 해당 Storage 파일도 best-effort로 정리한다.
- 코드 리뷰 보정 검증: `npx tsx --test src/lib/franchise-lead-contract-checklist.test.mts src/lib/franchise-lead-documents.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-contract-store.test.mts src/lib/franchise-contract-store-form.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts"` 27건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. production build `http://127.0.0.1:3069`에 Playwright auth/API mock을 주입해 계약 완료 탭 상세의 `구비서류`, `업로드`, `1건 연결` 표시를 확인했다. 가맹점 정보 탭의 후보지 주소/지역 복사는 순수 helper/API 테스트와 기존 Playwright 주소 복사 QA로 회귀 고정했다.
- 가맹 운영 마스터 UI 보정: `/dashboard/franchise-operations`의 가맹점 마스터를 `대시보드 / 가맹점 목록 / 가맹점 등록` 탭으로 분리했다. 대시보드에는 운영 상태 그래프와 지역 분포 패널을 추가했고, 목록과 등록 폼은 한 화면에서 섞이지 않게 했다. 경쟁스캔 입력/요약/버튼과 가맹 운영 내 `외부 승격 물건지 운영 전환`, `오픈 준비 프로젝트` 패널은 임시 숨김 처리했다. 오픈 준비 프로젝트는 계약완료 점주 상세의 가맹점 정보/인계 흐름으로 고도화하는 방향을 로드맵에 기록했다. 이번 변경의 신규 SQL은 없다.
- 가맹 운영 마스터 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. production build `http://127.0.0.1:3071`에 Playwright auth/API mock을 주입해 `/dashboard/franchise-operations`를 1280px/390px에서 확인했다. `대시보드 / 가맹점 목록 / 가맹점 등록` 탭, 운영 상태 그래프, 지역 분포, 목록/등록 전환이 보이고 `경쟁스캔`, `키워드필요`, `외부 승격 물건지 운영 전환`, `오픈 준비 프로젝트` 문구는 노출되지 않았다. 두 viewport 모두 page-level horizontal overflow 0건, console error 0건이었다. 증거 스크린샷: `ERP/web/.omo/evidence/franchise-operations-master-desktop-dashboard.png`, `ERP/web/.omo/evidence/franchise-operations-master-mobile-dashboard.png`.
- 문서 정리: 프랜차이즈 하위에 `물건지 지도` 서비스 축을 두고 `가맹 운영점 / 출점 후보지 / 외부 상가 수집`을 탭처럼 묶는 방향을 로드맵에 추가했다. 브랜드가 `애플치킨`처럼 정해졌을 때 검색량, 블로그/뉴스/카페/웹 언급, Threads 공개 글, 위험 키워드, 경쟁 브랜드 비교를 브랜드 인사이트 고도화 후보로 기록했고, 각 가맹점별 네이버/카카오맵/배달앱 리뷰 최신화는 매장 평판 모니터링 고도화 범위로 기록했다. 이번 작업은 문서 정리만 수행했으며 신규 SQL은 없다.
- 물건지 지도 v1 구현: `/dashboard/franchise-locations`를 추가하고 프랜차이즈 사이드바의 `가맹 운영` 하위에 `물건지 지도` 메뉴를 배치했다. 기존 `franchise_locations` 조회 API를 재사용해 `전체 / 가맹 운영점 / 출점 후보지` 탭, 상태 필터, 검색, Kakao 지도 마커, 선택 물건지 상세 패널을 제공한다. 설명 문구는 `내일의 가맹 운영점과 출점 후보지를 지도에서 확인합니다.`로 줄이고, 외부 상가 수집/새로고침 버튼은 노출하지 않는다. 좌표가 저장된 항목은 저장 좌표를 쓰고, 주소만 있는 항목은 브라우저 Kakao geocoder로 임시 좌표를 조회한다. 신규 SQL은 없다.
- 물건지 지도 v1 정적 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과. `mapUtils.test.mts`로 운영점/후보지 분류, 필터, 미좌표 count 계산을 고정했다. 브라우저 QA와 production build 검증은 이어서 진행한다.
- 물건지 지도 흰 화면 보정: 기존 `점포개발 업무 > 물건지도`는 정상 동작하므로 전역 Kakao 설정은 건드리지 않고, 새 `/dashboard/franchise-locations` 지도만 보정했다. 새 지도에서 저장 좌표가 숫자이면 한국 범위 검증 없이 바로 사용해, 위도/경도가 반전된 샘플도 `좌표 있음`으로 처리되며 Kakao 지도 객체는 뜨지만 타일/마커가 보이지 않을 수 있었다. 저장 좌표는 한국 범위로 검증하고, 반전 좌표는 자동 교정하며, 범위 밖 좌표는 주소 geocoder fallback을 타도록 수정했다. 또한 지오코딩 상한은 주소 조회에만 적용하고 저장 좌표가 있는 물건지는 상한과 무관하게 모두 지도 표시 대상으로 유지한다. 지도 캔버스에는 명시 높이와 `ResizeObserver` 기반 `relayout()`도 유지했다. `npx tsx --test src/components/franchise/location-map/mapUtils.test.mts src/lib/company-menu-features.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-contract-store-form.test.mts src/lib/franchise-contract-store.test.mts` 23건, `git diff --check`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. 로컬 production 서버 `127.0.0.1:3073`에서는 Kakao JavaScript 키 도메인 제한으로 지도 fallback 안내가 표시됨을 확인했고, 메뉴 `가맹 운영 > 물건지 지도` depth 표시, 설명 문구, 외부 상가 수집/새로고침 미노출, 검색 필터 한 줄 배치, 1440px/390px overflow 0건을 확인했다. 모바일에서는 사이드바가 숨겨지므로 메뉴 depth 검증은 데스크톱 기준으로 수행했고, 설명 문구가 `다.` 단독 줄로 떨어지지 않도록 `word-break: keep-all`을 적용했다. 실제 지도 타일/마커는 Vercel 실서버 도메인에서 배포 후 확인한다. 이번 변경의 신규 SQL은 없다.
- 공용 업로드/점주 문서함 storage 보안 보정: `/api/upload`가 브라우저에서 받은 bucket/path를 곧바로 admin Storage에 쓰지 않도록 업로드 전 경계 검증을 추가했다. 허용 bucket은 `property-images`, `property-documents`로 제한하고, path는 매물 이미지, 매물 문서, 정보공개서, 점주 문서함 prefix만 허용한다. 점주 문서함은 `franchise-lead-documents/{companyId}/{leadId}/`, 정보공개서는 `franchise-disclosures/{companyId}/`, 매물 파일은 대상 매물 ID를 기준으로 bearer 세션 requester 권한을 확인한 뒤에만 업로드한다. 잘못된 버킷, 다른 회사/후보자 path, `..` traversal path와 form `requesterId` spoofing은 Storage 쓰기 전에 거절하며, 삭제 대상도 같은 회사/후보자 prefix 안의 파일만 허용한다. 체크리스트 업로드도 같은 회사/후보자 prefix로 저장되게 바꿨고, `.omo/evidence` 산출물은 git staging에서 제외되도록 root `.gitignore`에 무시 규칙을 추가했다. 검증: `npx tsx --test src/app/api/upload/route.test.mts src/lib/upload-storage-access.test.mts src/lib/upload-storage-policy.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-lead-documents.test.mts src/lib/franchise-lead-contract-checklist.test.mts src/lib/franchise-contract-store-form.test.mts src/lib/franchise-contract-store.test.mts src/lib/company-menu-features.test.mts src/components/franchise/location-map/mapUtils.test.mts` 50건, `git diff --check`, `git check-ignore -v .omo/evidence/foo ERP/web/.omo/evidence/foo`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과.

## 2026-06-24 물건지 지도 반경분석/측정 도구 QA

- 사용자 확인: `supabase_franchise_lead_documents_migration.sql`, `supabase_franchise_contract_store_linkage_migration.sql`은 실서버 Supabase에 등록 완료. 이번 물건지 지도 고도화에는 신규 SQL이 없다.
- 물건지 지도 우측 목록 클릭과 지도 마커 클릭이 같은 선택 로직을 쓰게 했다. 선택 시 상세 카드가 갱신되고, 지도는 해당 좌표로 `panTo` 이동한다.
- `지도 분석` 패널로 `반경분석`, `거리재기`, `면적재기`를 통합했다. 기존처럼 반경분석과 지도 도구가 떨어져 보이지 않게 하고, 모바일에서는 한 패널 안에서 탭으로 전환한다.
- 반경분석은 선택 물건지 또는 직접 찍은 지도 기준점으로 500m/1km/2km를 분석한다. Kakao 지도에는 반경 원을 표시하고, 반경 내 `가맹 운영점`, `출점 후보지`, `운영중`, `오픈준비`, `검토중` 개수와 최대 12개 주변 물건지 목록을 가까운 순으로 보여준다.
- 거리재기는 지도 클릭 지점들을 polyline으로 연결해 누적 거리를 계산한다. 면적재기는 3점 이상을 polygon으로 표시하고 면적(`㎡`, `평`)과 둘레를 계산한다. 두 도구 모두 되돌리기/초기화를 제공한다.
- 실데이터 목록 확인용으로 내일 회사(회사 식별자 마스킹)에 `지도QA_20260624_01`부터 `지도QA_20260624_30`까지 30개 샘플 가맹 운영점/출점 후보지를 기존 `/api/franchise-locations` API로 생성했다. 신규 SQL은 없고, 샘플은 이름 prefix와 `location_map_sample_20260624` 메모 태그로 식별할 수 있다.
- 사이드바의 `물건지 지도`는 `가맹 운영` 바로 아래 같은 레벨 메뉴로 표시한다. 하위 메뉴용 가로 선이 아이콘 왼쪽에 보이는 문제를 제거했고, 메뉴명과 아이콘만 표시된다.
- 검증: `npx tsx --test src/components/franchise/location-map/mapUtils.test.mts src/lib/company-menu-features.test.mts` 19건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: `http://localhost:3000/dashboard/franchise-locations`에 내일 회사 관리자 테스트 세션(자격증명 마스킹)으로 로그인해 확인했다. 데스크톱에서 `물건지 지도` 메뉴의 `::before` content가 `none`이고, 모바일 390px에서 `지도 분석` 패널이 `반경분석/거리재기/면적재기` 탭으로 전환되며 console error 0건이었다. 증거 스크린샷: `franchise-location-map-nav-same-level.png`, `franchise-location-map-mobile-analysis-same-level-final.png`.

## 2026-06-24 가맹 운영 대시보드 지역 분포 개선 QA

- `/dashboard/franchise-operations` 대시보드의 시도별 한국 지도 SVG를 제거했다. 기존 지도는 실제 행정구역 라벨이 작게 겹쳐 운영자가 지역별 분포를 읽기 어려웠으므로, 운영 상태 그래프 옆에 `지역별 운영 분포` 분석 패널을 배치했다.
- 새 패널은 저장된 `franchise_locations`의 `region`, `address`, `status`를 기반으로 시도별 점포 수, 전체 비중, 상태별 건수를 보여준다. 데이터 품질/주소 등록 카드는 운영 판단에서 우선순위가 낮아 제거했고, 상단 요약의 빈 칸은 `운영 안정률`로 대체했다. `기타` 합산과 `시도 미분류` 행은 의미가 모호해 지역 분포 본문에서 제거하고, 실제 시도명으로 분류된 지역만 보여준다. 기본 화면은 상위 5개 지역만 노출하며 나머지는 중앙 정렬된 긴 `더보기` 버튼으로 확장한다. 지역명 하단의 `지역 등록 점포` 보조 문구도 제거했다.
- 이번 변경은 기존 `franchise_locations` 데이터만 사용하며 신규 SQL은 없다.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. Playwright production QA에서 mock 지역 7개 기준 기본 5개만 노출, `더보기 2개` 클릭 후 7개 노출, `접기` 버튼, 더보기 버튼 360px 중앙 정렬, `지역 등록 점포`/`기타`/`시도 미분류`/`데이터 품질`/`주소 등록` 미노출, 390px overflow 0, console error 0건을 확인했다. 증거 스크린샷: `franchise-operations-region-top5-centered-more.png`, `franchise-operations-region-expanded-no-helper.png`, `franchise-operations-region-mobile-top5.png`.

## 2026-06-24 문서함/업로드 보안 핫픽스 QA

- `/api/franchise-lead-documents` GET/POST/PATCH/DELETE는 bearer 세션의 `getAuthenticatedRequesterProfile`만 신뢰하도록 보정했다. `requesterId`, `userId`, `managerId` body/query fallback은 제거했고, 인증이 없으면 `401 AUTH_REQUIRED`로 실패한다.
- 점주 문서함과 구비서류의 문서 등록/삭제 요청은 `getApiAuthHeaders()`를 사용한다. 업로드 결과는 Storage `path` 중심으로 저장하며, 점주 문서함 업로드 문서는 공개 URL을 저장하지 않는다.
- 업로드 문서 열람은 `/api/franchise-lead-documents?action=open&documentId=...`에서 lead/company 권한을 확인한 뒤 Supabase Storage signed URL을 발급한다. 기존 과거 업로드 문서의 public URL은 Storage path 추론용 fallback으로만 사용하고, 신규 점주 문서함 업로드는 `data.storageBucket/storagePath`를 우선한다.
- `/api/upload`는 20MB 초과 파일을 차단하고, `property-images`는 JPEG/PNG/WebP만, `property-documents`는 PDF/이미지/doc/docx/xls/xlsx만 허용한다. PDF/JPEG/PNG/WebP는 매직바이트를 확인하고, Office 계열은 확장자/MIME/시그니처 조합을 확인한다.
- 코드리뷰 재검토에서 `/api/franchise-lead-documents` 라우트 직접 테스트 부족과 대용량 파일 선검사 위치가 지적되어 추가 보정했다. 라우트 핸들러에 테스트용 dependency injection을 얇게 열고, `requesterId` query 사칭 401, 업로드 문서 Storage path 필수/public URL suppression, 전자계약 `sourceId` lead scope 403, signed URL 발급을 직접 테스트한다. `/api/upload`는 권한 확인 후 `file.arrayBuffer()` 호출 전에 `file.size` 20MB 초과를 먼저 거절한다.
- 전자계약 문서함 연결은 `sourceType='electronic_contract'`일 때 `sourceId`가 현재 lead/company의 전자계약인지 검증한다. 범위가 다르면 등록을 차단한다.
- 회사 템플릿 발송은 UCanSign 발송과 `electronic_contracts.status='sent'` 저장이 성공한 뒤 문서함 링크 저장만 실패하면 계약 상태를 `send_failed`로 되돌리지 않는다. 링크 실패는 서버 로그와 응답 `warning='DOCUMENT_LINK_FAILED'`로만 남긴다.
- 기존 매물 이미지/문서 및 정보공개서 업로드는 기존 UI가 공개 URL을 소비하므로 public URL 반환을 유지했다. 이번 보안 기준에서 공개 URL 제거 대상은 점주 문서함 업로드 문서다.
- 검증: `npx tsx --test src/app/api/franchise-lead-documents/route.test.mts src/lib/upload-file-validation.test.mts src/app/api/upload/route.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-lead-documents.test.mts` 25건 통과. 확장 회귀로 `npx tsx --test src/app/api/franchise-lead-documents/route.test.mts src/lib/upload-file-validation.test.mts src/app/api/upload/route.test.mts src/lib/franchise-lead-document-storage.test.mts src/lib/franchise-lead-documents.test.mts src/lib/api-auth.test.mts src/lib/franchise-lead-access.test.mts src/lib/upload-storage-access.test.mts src/lib/upload-storage-policy.test.mts src/lib/franchise-lead-contract-checklist.test.mts "src/app/(main)/contracts/electronic/_components/companyTemplateRoutes.test.mts"` 51건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과.
- Dev 배포: `58363c9 fix(franchise): harden lead document uploads`를 dev worktree에 cherry-pick해 `0e4ad3f`로 반영했다. Dev worktree에서 같은 51건 확장 회귀, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 재통과했고, Vercel Dev deployment `dpl_GkjHTqcgdaP8ARfUXBvS6An4X4yd`가 `READY`이며 `0e4ad3f`와 매칭됨을 확인했다. Dev 도메인은 Vercel SSO 보호로 외부 `curl -I -L /login`이 SSO 로그인으로 리다이렉트된다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3079`에 Playwright auth/API mock을 주입해 `/dashboard/franchise-locations`, `/contracts/electronic`를 1280px/390px에서 smoke 확인했다. 두 화면 모두 page-level overflow 0건, console/page error 0건이었다. 로컬 도메인은 Kakao JavaScript 키 제한으로 지도 타일 대신 도메인 설정 안내가 표시됐다.
- 신규 SQL은 없다.

## 2026-06-24 계약완료 상세 오픈 준비 탭 QA

- 계약완료 점주 상세 탭을 `오픈 준비 / 구비서류 / 점주 문서함 / 가맹점 정보`로 확장했다. `오픈 준비` 탭은 `lead.status === '계약완료'`일 때만 노출하며, 기존 `franchise_opening_projects` 테이블과 `/api/franchise-opening-projects` API를 재사용한다. 신규 SQL은 없다.
- 오픈 준비 프로젝트는 lead id가 아니라 해당 lead에서 생성된 `franchise_locations.id`에 연결한다. 탭 진입 시 `/api/franchise-locations?contractLeadId=...`로 연결 가맹 운영점을 찾고, 연결 가맹점이 없으면 `가맹점 정보` 탭 이동 CTA를 보여준다. 연결 가맹점이 `오픈준비`이면 프로젝트 상태/목표 오픈일/메모와 `계약 / 인테리어 / 교육 / 초도물류 / 홍보 / 오픈일` 체크리스트를 시작/저장할 수 있다. `운영중/휴점/폐점` 상태에서는 읽기 중심 안내로 제한한다.
- UI 보정: 오픈 준비 섹션 우측 상단의 별도 `오픈준비` 상태 배지를 제거했다. 프로젝트 요약의 `막힘` 표기는 사용자 화면에서 `진행 이슈`/`이슈`로 바꾸고, 내부 저장 상태값은 기존 `막힘`을 유지한다. 구비서류 필수 그룹 헤더는 `필수 / 계약 전 필수 서류 / 미완료 또는 문서 누락 시 계약 진행을 막습니다.`가 데스크톱에서 한 줄로 보이도록 압축했다.
- 검증: `npx tsx --test src/components/franchise/leads/LeadOpeningProjectSection.utils.test.mts src/lib/franchise-opening-projects.test.mts src/lib/franchise-contract-store.test.mts` 13건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3081`에서 내일 회사 관리자 세션으로 `/dashboard/franchise-leads` 계약완료 상세를 열고 `오픈 준비` 탭을 확인했다. 1280px/390px 모두 `오픈 준비` 탭과 프로젝트 체크리스트가 표시되고 page-level horizontal overflow 0건, console/page error 0건이었다. 추가 QA에서 탭 첫 항목이 `오픈 준비`인 것, 오픈 준비 섹션 상단 배지가 제거된 것, 화면 본문에 `막힘` 문구가 남지 않은 것, 체크리스트 필수 그룹 설명이 데스크톱에서 한 줄로 압축된 것을 확인했다. 증거 스크린샷: `ERP/web/.omo/evidence/contract-owner-opening-tab-final-desktop.png`, `ERP/web/.omo/evidence/contract-owner-opening-tab-final-mobile.png`, `ERP/web/.omo/evidence/contract-owner-opening-checklist-compact-desktop.png`.

## 2026-06-24 오픈 준비 체크리스트 1차 고도화 QA

- 기존 6개 오픈 준비 항목을 `계약/행정`, `인테리어`, `교육`, `초도물류`, `홍보`, `오픈일` 6단계 25개 하위 체크로 확장했다. 기존 저장 데이터는 task `id` 기준으로 병합하며, 과거 `contract`, `interior`, `training`, `initial-stock`, `promotion`, `open-date` 상태는 각 단계의 대표 항목에 이어받는다.
- 상태값은 기존 내부 `막힘`을 유지하고 화면 표기는 `이슈`로 유지한다. 새 상태 `확인요청`을 추가해 점주/본사 확인이 필요한 항목을 이슈보다 낮은 강도로 구분한다.
- 계약완료 상세 `오픈 준비` 상단 요약은 `오늘 처리`, `기한 임박`, `진행 이슈`, `오픈 가능도`로 바꿨다. 체크리스트 본문은 단계별 접힘 섹션으로 정리하고 각 하위 항목에 설명, 필수 배지, 상태, 담당, 기한, 메모를 표시한다.
- 검증: `npx tsx --test src/lib/franchise-opening-projects.test.mts src/components/franchise/leads/LeadOpeningProjectSection.utils.test.mts src/lib/franchise-contract-store.test.mts` 15건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 기존 dev 서버 `localhost:3000`에서 내일 회사 관리자 세션으로 `/dashboard/franchise-leads` 계약완료 상세를 열고 1280px/390px를 확인했다. 탭은 `오픈 준비 / 구비서류 / 점주 문서함 / 가맹점 정보`로 표시되고, `체크리스트 열기` 문구가 남지 않으며 page-level horizontal overflow 0건이었다. 증거 스크린샷: `ERP/web/.omo/evidence/contract-owner-supplies-label-desktop.png`, `ERP/web/.omo/evidence/contract-owner-supplies-label-mobile.png`.
- Dev 배포: 선행 오픈 준비 탭 커밋과 1차 고도화 커밋을 dev worktree에 각각 `6859dca`, `e4ad21d`로 cherry-pick했다. dev worktree에서 같은 15건 테스트, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 재통과했고, Vercel Dev deployment `dpl_7cvvF2ttQNnoPDu1Vdv9gEomFozX`가 `READY`이며 `e4ad21d`와 매칭됨을 확인했다. Dev alias는 `https://naeilsajang-dev.vercel.app`이다.
- 신규 SQL은 없다.

## 2026-06-24 /demo 전용 접근 게이트 QA

- `/demo`와 `/demo/[role]` 샘플 데이터 화면에 Supabase 로그인과 분리된 데모 전용 접근 게이트를 추가했다. `DEMO_ACCESS_ID`, `DEMO_ACCESS_PASSWORD`, `DEMO_ACCESS_COOKIE_SECRET`가 모두 설정되어야 진입할 수 있고, 환경변수가 없으면 fail-closed 상태로 `데모 접근 설정이 필요합니다.`를 표시한다.
- `POST /api/demo/access`는 ID/PW 검증 후 8시간짜리 httpOnly `demo_access` 쿠키를 `/demo` 경로로 발급한다. `DELETE /api/demo/access`는 같은 쿠키를 삭제한다. 쿠키는 `sameSite=lax`, production에서 `secure`로 설정된다.
- 기존 데모 API guard는 유지하되 `/api/demo/access`만 허용했다. 데모 화면 내부의 실제 ERP `/api/**` 호출 차단 정책은 그대로 유지한다.
- 데모 헤더에 `데모 로그아웃` 액션을 추가했다. 모바일에서도 로그아웃 버튼은 노출하고, 설명 다시 보기와 샘플 배지는 작은 화면에서 숨긴다.
- `ERP/web/README.md`에 데모 접근 환경변수와 운영 주의사항을 추가했다.
- 검증: `npx tsx --test src/lib/demo-access.test.mts src/app/api/demo/access/route.test.mts src/app/demo/demoContent.test.mts` 12건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했고 `/demo`, `/demo/[role]`는 dynamic route로 확인했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3047`에서 임시 데모 env를 주입해 `/demo`, `/demo/manager`, `/demo/partner`를 확인했다. 로그인 전 접근 게이트, 잘못된 비밀번호 오류, 정상 로그인, 딥링크 유지, 로그아웃 후 로그인 화면 복귀, 모바일 390px 로그인 화면 horizontal overflow 0건을 확인했다.
- 신규 SQL은 없다.

## 2026-06-29 점포개발 미팅 도구 1차 QA

- `/dashboard/franchise-leads/market-insights`의 출점 후보지 목록 액션에 `리포트` 버튼을 추가했다. 후보지별 `출점 검토 리포트` 다이얼로그에서 목표매출과 재료비/인건비/월세·관리비/로열티/기타비용 금액·비율을 입력하고 세전수익/세전 수익률을 즉시 계산한다.
- 후보지별 리포트는 신규 테이블 없이 기존 `franchise_locations.data.meetingTool`에 저장한다. 저장 API는 `/api/franchise-locations/meeting-tool` PATCH로 분리해 기존 후보지 수정 API와 충돌하지 않게 했다. 신규 SQL은 없다.
- PDF 저장과 인쇄는 브라우저 인쇄 화면을 사용한다. 보고서에는 후보지 요약, 수익분석표, 보고 메모, 내부 검토용 면책 문구가 포함된다.
- 순수 계산 유틸 `franchise-location-meeting-tool`을 추가해 목표매출 변경 시 비율 재계산, 비율 입력 시 금액 역산, 월세·관리비 기본값 보강을 테스트로 고정했다.
- 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 4건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `127.0.0.1:3098`에서 Playwright auth/API mock을 주입해 `/dashboard/franchise-leads/market-insights?view=location-list`를 1365px/390px에서 확인했다. 후보지 `리포트` 버튼 클릭, `출점 검토 리포트` 다이얼로그 열림, 목표매출/재료비 입력, 저장 성공 메시지 유지, page-level horizontal overflow 0건, console/page error 0건을 확인했다. 증거 스크린샷: `ERP/web/.omo/evidence/location-meeting-tool-dialog.png`, `ERP/web/.omo/evidence/location-meeting-tool-dialog-mobile.png`.

## 2026-06-29 점포개발 미팅 도구 보강 QA

- 간단 수익분석표 입력 단위를 화면과 출력물에서 모두 `만원` 기준으로 명시했다. 목표매출 placeholder는 `4500`으로 정리하고, 비용 금액 컬럼은 `금액(만원)`으로 표시한다.
- 레퍼런스 양식에 맞춰 기본 비용 항목을 `재료비 / 인건비 / 관리비·공과금 / 기타잡비 / 로열티` 순서로 정리했다.
- 목표매출 변화 `1차 / 2차 / 3차` 전환을 추가했다. 각 차수별 목표매출을 `meetingTool.targetScenarios`에 저장하고, 전환 시 현재 비용 항목 기준으로 비율을 다시 계산한다.
- `배달수수료·광고비`처럼 미팅 중 필요한 자유 비용 항목을 추가/삭제할 수 있게 했다. 추가 항목은 해당 후보지 리포트의 `meetingTool.costRows`에 저장한다.
- 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 6건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 기존 dev 서버 3000과 production 서버 3099에서 Playwright auth/API mock으로 `/dashboard/franchise-leads/market-insights?view=location-list` 접근을 시도했으나, headless mock 세션에서는 본문이 빈 상태로 남아 다이얼로그 캡처를 확보하지 못했다. 실제 로그인 세션 또는 기존 사용자 브라우저에서 리포트 버튼, `목표매출(만원)`, `1차/2차/3차`, `금액(만원)`, 자유 항목 추가를 추가 확인한다.
- 신규 SQL은 없다.

## 2026-06-30 점포개발 미팅 도구 회사 공용 프리셋 QA

- 출점 검토 리포트의 `간단 수익분석표`에 회사 공용 프리셋을 추가했다. 프리셋은 목표매출 변화 `1차/2차/3차`와 비용 항목 금액·비율·메모만 저장하고, 후보지별 `보고 메모`는 적용 시 덮어쓰지 않는다.
- 프리셋은 `/api/franchise-locations/meeting-tool-presets`에서 회사 범위로 조회/저장/삭제한다. 일반 브랜드 구성원은 자기 회사 범위만 접근하고, admin은 선택 후보지의 `companyId` 범위를 사용할 수 있다.
- 같은 회사에서 같은 프리셋명으로 다시 저장하면 기존 프리셋을 갱신한다. UI에서는 `불러오기`, `프리셋명`, `적용`, `프리셋 저장`, `삭제`를 제공한다.
- 프리셋 행은 제목이 세로 중앙에 오도록 정렬하고 보조 문구가 잘리지 않게 했다. 목표매출과 비용 금액 입력은 `4,500`, `2,100`처럼 콤마가 표시된다.
- 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts` 7건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: Playwright로 실제 CSS 모듈을 주입한 프리셋 행 스모크를 확인했다. `목표매출(만원)`은 `4,500`, `재료비`는 `2,100`으로 표시됐고, 보조 문구는 컨테이너 내부에 정상 노출됐다. 로컬 headless 인증 세션에서는 메인 앱 본문이 빈 화면으로 남아 실제 로그인 세션에서 저장/불러오기/삭제 UX는 배포 후 추가 확인한다.
- 신규 SQL: `supabase_franchise_location_meeting_tool_presets_migration.sql`은 사용자 확인 기준 실서버 등록 완료.

## 2026-06-30 점포개발 미팅 도구 코드리뷰 보강 QA

- 전체 코드리뷰 후 프리셋 API의 빈 `meetingTool` 저장, 잘못된 UUID 입력, 누락된 프리셋 테이블 응답, 교차 회사 삭제 응답 노출 가능성을 보강했다. `meetingTool`은 객체만 허용하고, 프리셋 테이블 미적용 시 424와 SQL 적용 안내를 반환하며, 교차 회사 삭제는 존재 여부를 드러내지 않도록 404로 응답한다.
- 라우트 단위 테스트를 추가해 인증 없음 401, malformed body 400, 정상 upsert의 `reportMemo` 제외 저장, missing table 424, 교차 회사 삭제 404, malformed UUID 400을 고정했다.
- UI는 후보지/회사 전환 시 이전 프리셋 목록을 즉시 비우고, 프리셋 삭제 전 확인창을 추가했다. 목표매출과 비용 금액은 콤마 표시를 유지하되, 비율 입력은 편집 중 문자열 상태를 별도로 두어 `4` -> `4.` -> `4.5` 순차 입력이 끊기지 않도록 분리했다.
- 검증: `npx tsx --test src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool.test.mts` 14건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `http://localhost:3126`의 `/demo`에서 데모 게이트 로그인, `출점 후보지`, `리포트` 모달 진입을 1280px/390px으로 확인했다. 목표매출 `4500` 입력은 `4,500`으로 표시되고, 비율은 실제 키 입력 순서로 `4` 입력 후 `4`, `.` 입력 후 `4.`, `5` 입력 후 `4.5`, blur 후 `4.5`가 유지됐으며 금액은 `203`으로 계산됐다. dialog overflow와 console/page error는 없었다.
- 신규 SQL: 이번 보강의 신규 SQL은 없다. 기존 `supabase_franchise_location_meeting_tool_presets_migration.sql`은 사용자 확인 기준 실서버 등록 완료 상태다.

## 2026-06-30 점포개발 미팅 도구 2차-1/2차-4 QA

- 2차-1 출력물 고도화: 출점 검토 리포트 PDF/인쇄 HTML을 다이얼로그에서 분리한 순수 유틸로 옮기고, 후보지 요약, 목표매출 1차/2차/3차 비교표, 현재 선택안 비용 구조, 검토 의견, 내부 검토 안내가 보이는 미팅 자료형 레이아웃으로 정리했다. 기존 Blob URL 기반 인쇄 방식은 유지한다.
- 2차-4 후보지별 버전 이력: 신규 `/api/franchise-locations/meeting-tool-versions` GET/POST와 `franchise_location_meeting_tool_versions` 테이블 migration을 추가했다. 현재안 저장은 기존 `franchise_locations.data.meetingTool` PATCH를 유지하고, 버전 이력은 후보지별 snapshot으로 별도 저장한다.
- 권한 정책: 버전 이력 API는 `getAuthenticatedRequesterProfile`과 `canAccessFranchiseLocation`을 사용한다. 관리자 예외, 브랜드 직원 회사 범위, 협력업체 작성자 전용 접근 규칙을 기존 후보지 접근 정책과 동일하게 적용한다.
- UI: 리포트 다이얼로그에 `리포트 버전 이력` 영역을 추가했다. 담당자는 버전명을 입력해 `현재안 버전 저장`을 누르고, 목록에서 목표매출/수익률이 표시된 이전안을 `불러오기`로 되돌릴 수 있다. 이전안을 불러온 뒤 후보지 현재안에 반영하려면 기존 `저장` 버튼을 누른다.
- 구조 정리: 기존 대형 다이얼로그에서 프리셋/버전 이력 상태 훅과 계산표/프리셋/결과/액션 렌더 섹션을 분리했다. `LocationMeetingToolDialog.tsx`는 217 pure LOC로 낮추고, 신규 기능/API/테스트 지원 파일은 모두 250 pure LOC 이하로 유지했다.
- 데모 모드: 데모 가드가 신규 버전 이력 API를 차단할 때 원문 `Demo mode blocked real API request`가 사용자 화면에 노출되지 않게 했다. 데모에서는 빈 버전 이력으로 보이고, 저장류 액션은 데모 비활성화 안내 문구로 처리한다.
- 코드리뷰 후 보강: 기본 버전명이 목록에서 `v2 v2 검토안`처럼 중복 표시되지 않도록 display title 유틸과 테스트를 추가했다. 동시 저장으로 DB unique 제약 `23505`가 발생하면 500 대신 409 재시도 안내를 반환하도록 보강했고, 중복키 메시지를 테이블 미적용 424로 오인하지 않게 missing-table 판별을 `42P01`/`PGRST205`로 좁혔다.
- 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool-versions.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts` 28건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과. 기존 local dev 서버 `http://localhost:3000`의 `/demo`에서 출점 후보지 `리포트` 다이얼로그를 desktop/mobile로 확인했고, `분석표 프리셋`과 `리포트 버전 이력` 노출, dialog horizontal overflow 0, console/page error 없음, 데모 API 차단 원문 미노출을 확인했다.
- 신규 SQL: `supabase_franchise_location_meeting_tool_versions_migration.sql`은 사용자 확인 기준 실서버 등록 완료. SQL 등록 전 버전 이력 API는 424와 SQL 적용 안내를 반환하도록 구현되어 있으며, 적용 완료 환경에서는 실계정 버전 저장/불러오기 live QA를 진행한다.

## 2026-06-30 출점 검토 리포트 인쇄/PDF 헤더 QA

- 요청 반영: PDF 저장 및 인쇄용 출점 검토 리포트 상단에서 `내부 검토 자료` 배지를 제거했다. 우측 메타 영역의 `생성일` 라벨도 제거하고, 날짜는 시간 없이 `YYYY. MM. DD.` 형식으로만 표시한다.
- 검증: `npx tsx --test src/components/franchise/market-insights/locationMeetingToolReport.test.mts` 2건 통과. 관련 회귀 묶음 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool-versions.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts` 28건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build` 통과했다.
- 브라우저 QA: Playwright print media 렌더에서 헤더 텍스트가 `하남 미사 후보지 출점 검토 리포트 / 경기 하남시 조정대로45 / 2026. 06. 30. / 담당 김팀장`으로 표시되는 것을 확인했다. 헤더에 `내부 검토 자료`, `생성일`, `오전/오후`, `hh:mm` 시간 표기, PDF 안내 문구가 노출되지 않았다.

## 2026-06-30 점포개발 미팅 도구 2차-5 QA

- 2차-5 상권분석·목표매출 보고서 형태 고도화: 출점 검토 리포트 다이얼로그에 `상권분석·목표매출 근거` 섹션을 추가했다. 입력 필드는 `상권 요약`, `수요 근거`, `목표매출 산정 근거`, `리스크/확인사항` 4개이며 후보지별 `meetingTool.marketReport`에 저장된다.
- 프리셋 분리: `marketReport`는 후보지 전용 보고서 근거이므로 회사 공용 프리셋 저장 데이터에서는 제외한다. 프리셋 적용 시 기존 후보지의 `marketReport`와 `reportMemo`는 유지된다.
- 출력물 반영: PDF/인쇄 HTML의 목표매출 시나리오 비교표 아래에 `상권분석·목표매출 근거` 섹션을 추가했다. HTML escape와 줄바꿈 표시를 테스트로 고정했다.
- 버전 이력 연동: 후보지별 버전 이력은 `MeetingToolDraft` snapshot을 저장하므로, `marketReport`도 버전 저장/불러오기 대상에 자연스럽게 포함된다. 별도 SQL은 추가하지 않았다.
- 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts` 12건 통과. 관련 회귀 묶음 `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/app/api/franchise-locations/meeting-tool-presets/route.test.mts src/lib/franchise-location-meeting-tool-versions.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts src/app/api/franchise-locations/meeting-tool-versions/route.test.mts` 30건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build` 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 기존 local dev 서버 `http://localhost:3000`의 `/demo`에서 데모 게이트 로그인 후 `출점 후보지` -> `리포트` 다이얼로그를 1280px/390px로 확인했다. `상권분석·목표매출 근거` 섹션 노출, `목표매출 산정 근거` 입력 유지, textarea 5개 노출, page horizontal overflow 0, textarea clipping 0을 확인했다. console page error는 없고, 기존 Supabase GoTrue 다중 인스턴스 warning만 관찰했다.
- 코드리뷰: 새 subagent 1차 요구사항 리뷰는 PASS였으나, 후속 gate/code review에서 `franchise-location-meeting-tool.ts` 비대화와 `page.module.css` 미팅 도구 스타일 누적이 blocker로 확인됐다. 보강으로 미팅 도구 모델/정규화/계산/상권분석 근거 정의를 작은 lib 모듈로 분리했고, `meetingTool*` 스타일은 `LocationMeetingTool.module.css`로 이동했다.
- 후속 QA evidence: 코드리뷰/QA artifact를 `.omo/evidence/2cha-5-report-dialog-review-fix/code-review.md`, `.omo/evidence/2cha-5-report-dialog-review-fix/manualQa.json`에 남겼다. fresh local dev QA는 `.omo/evidence/2cha-5-report-dialog-review-fix/fresh-qa-result.json`에 남겼다. `/demo`에서 출점 후보지 `리포트` 다이얼로그를 열고 4개 상권분석 입력값 유지, PDF/인쇄 출력물의 섹션 포함 및 HTML escape, 1280px/390px horizontal overflow 0, page error 0을 확인했다.
- 신규 SQL: 이번 2차-5 범위의 신규 SQL은 없다. 기존 후보지별 리포트 버전 이력용 `supabase_franchise_location_meeting_tool_versions_migration.sql`은 사용자 확인 기준 실서버 등록 완료 상태다.

## 2026-07-01 플랫폼 코드리뷰 보안 하드닝 QA

- 범위: 플랫폼 전체 코드리뷰에서 서비스-role API와 legacy requester 신뢰 경로를 우선 점검했다. 새 subagent 2개를 병렬로 사용해 프론트 호출부 인증 헤더 누락과 mutating route 권한 누락 후보를 교차 확인했다.
- 인증 공통화: `api-auth`의 요청자 해석은 Supabase access token이 확인된 경우에만 허용하도록 정리했다. query/header의 `requesterId`, `userId`, `x-user-id`는 토큰 사용자와 일치할 때만 보조 검증값으로 사용하며, literal `admin` alias/legacy fallback은 제거했다.
- UCanSign/계약 legacy API: `/api/contracts`, `/api/contracts/templates`, `/api/points`, `/api/folders`, `/api/embedding`, `/api/ucansign/*`, `/api/user/status` 계열을 `requireAuthenticatedUcansignUser` 중심으로 통일했다. UCanSign OAuth callback은 unsigned base64 `state.uid`를 신뢰하지 않고, httpOnly pending cookie와 sanitised return path만 사용한다.
- 관리자/운영자 API: `system/settings`, debug route는 admin 세션을 요구한다. 고객/물건지 batch/sync와 명함 DB sync는 admin 또는 팀장만 실행 가능하며, 팀장은 자기 회사 범위에서만 실행된다.
- 명함/대시보드 메모: `/api/business-cards`는 자체 legacy requester 해석기를 제거하고 공통 인증 헬퍼를 사용한다. 관련 명함 목록/상세/매물카드/선택 모달/프랜차이즈 리드 연동 호출부에 auth headers를 붙였다. `/api/dashboard/memo`는 더 이상 `userId` 파라미터로 대상 사용자를 고르지 않고, 인증된 본인 메모만 읽고 저장한다.
- 공지/프로젝트/템플릿/내보내기: 공지 작성/수정/삭제는 인증된 작성자, 같은 회사 팀장, admin 권한으로 제한했다. 프로젝트/템플릿 API는 legacy `admin` fallback을 제거했다. 관리자 설정의 JSON 내보내기는 새 탭 raw API open 대신 auth header가 붙는 fetch 후 blob 다운로드 방식으로 변경했다.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npx tsx --test src/lib/api-auth.test.mts src/app/api/users/userRouteHelpers.test.mts` 10건, `git diff --check`, `npm run build` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 검색 검증: `rg "admin%|legacyId === 'admin'|legacyUser === 'admin'" ERP/web/src -n` 결과 없음. UCanSign auth 검색에 남는 2건은 직접 `window.location` 이동이 아니라 auth header를 붙이는 `response=json` redirect 요청이다.
- 신규 SQL: 없음.
- 남은 후속 감사: 공개 회원가입, webhook/외부 callback, 도메인별 custom guard를 쓰는 일부 franchise/integration route는 의도된 공개/도메인 정책을 확인하며 별도 정규화한다.

## 2026-07-01 서비스 화면 세션 헤더/Node 24 전환 QA

- 범위: 운영 preview QA 중 `고객 DB 조회 실패: requesterId is required`와 명함 신규입력 client-side exception이 확인되어, 모객 DB/고객/명함/점포개발 화면의 legacy service route 호출부에 Supabase 세션 auth header를 붙였다.
- 보강: 고객 목록/상세, 명함 목록/상세, 모객 DB, 고객/명함 -> 모객 DB 전환, 점포 목록/상세/신규등록/선택 모달/물건지도 fetch 호출에 `getApiAuthHeaders()`를 적용했다. `/api/users` 응답이 오류 payload일 때 `.forEach`가 터지지 않도록 배열 guard를 추가했다. `BusinessCard`와 `PropertyCard`의 정적 순환 import는 `next/dynamic`으로 끊어 명함 신규입력 client-side exception 재발 가능성을 낮췄다.
- Node 24 전환: `ERP/web/package.json`에 `"engines": { "node": "24.x" }`를 추가했고, 로컬 검증은 `node@24`로 실행했다.
- 검증: `npx -p node@24 -c 'node ./node_modules/typescript/bin/tsc --noEmit --pretty false'`, `npx -p node@24 -c 'npm run lint -- --quiet'`, `npx -p node@24 -c 'npm run build'`, `npx -p node@24 -p tsx -c 'tsx --test src/lib/api-auth.test.mts src/app/api/users/userRouteHelpers.test.mts'` 10건, `git diff --check` 통과.
- 브라우저 QA: 로컬 production 서버에서 `/dashboard/franchise-leads`, `/business-cards/register`, `/properties`, `/properties/map`의 client-side exception/pageerror가 없는 것을 확인했다. preview 배포 `https://naeilsajang-g9878xa3f-jaehyuns-projects-b4d20c6f.vercel.app`에서 사용자 Chrome 로그인 세션으로 `모객 DB`, `명함관리 > 신규입력`, `점포 목록`을 실제 클릭 확인했고, `requesterId is required` 모달과 명함 신규입력 client-side exception은 재현되지 않았다.
- 제외: preview `물건지도`의 지도 타일 공백은 Kakao JavaScript 키 허용 도메인에 preview host가 없어 `domain mismatched`가 발생한 것이므로 이번 수정 범위에서 제외했다. 운영 도메인 `www.fcerp.co.kr` 기준 SDK 응답은 정상이다.
- 신규 SQL: 없음.

## 2026-07-01 출점 검토 리포트 Kakao 상권 지도

- 기능 커밋: `a98c692 feat(franchise): add meeting report market map`
- 2차-5 후속으로 출점 검토 리포트 다이얼로그에 `상권 지도` 섹션을 추가했다. 후보지 좌표가 있으면 Kakao 지도에 마커와 상권 반경을 표시하고, 좌표가 없으면 후보지 주소로 Kakao 지오코딩을 시도한다.
- 반경은 300m/500m/1km 중 선택하며 후보지별 `franchise_locations.data.meetingTool.marketMap.radiusMeters`에 저장한다. 후보지 전용 기준이므로 회사 공용 프리셋 저장 데이터에서는 제외하고, 프리셋 적용 시 기존 반경 설정은 유지한다. 후보지별 리포트 버전 이력은 `MeetingToolDraft` snapshot을 저장하므로 반경 기준도 버전 저장/불러오기 대상에 포함된다.
- 지도에는 확대/축소, 일반/스카이뷰/지적편집도 전환, 거리재기, 면적재기 도구를 추가했다. 거리/면적은 지도 클릭 지점을 기준으로 물건지 지도와 같은 계산 유틸을 사용하며, 되돌리기/초기화를 제공한다. 측정 모드와 클릭 점은 후보지 `meetingTool.marketMap`에 저장해 저장/버전 불러오기 후에도 유지한다. PDF/인쇄 출력물은 새 출력창에서 Kakao SDK를 다시 로드하고, 좌표 또는 주소 지오코딩 결과로 지도 타일, 마커, 반경 원, 측정 선·면·점을 렌더링한 뒤 인쇄창을 열도록 보강했다. 별도 표시 반경/주소/좌표 기준 박스는 출력하지 않는다. 출력물의 `상권분석·목표매출 근거`는 `현재 선택안 비용 구조` 아래로 이동했고, 카드가 페이지 경계에서 반으로 잘리지 않도록 카드 단위 page break를 보강했다.
- 실서버 인쇄 미리보기에서 저장 좌표가 없는 후보지가 `지도에 표시할 주소나 좌표가 없습니다.`로 떨어지는 사례를 확인해, 리포트 다이얼로그의 Kakao 지도 섹션에서 이미 지오코딩된 중심 좌표를 PDF/인쇄 HTML에 함께 전달하도록 보강했다. 출력 HTML은 저장 좌표보다 전달받은 중심 좌표를 우선 사용한다.
- 검증: `npx tsx --test src/lib/franchise-location-meeting-tool.test.mts src/components/franchise/market-insights/locationMeetingToolReport.test.mts` 17건 통과, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 브라우저 QA: 로컬 dev 서버 `http://localhost:3000/demo` 접근과 데모 로그인은 확인했다. MCP Playwright에서는 데모 투어 레이어가 닫힘 클릭 후에도 pointer를 계속 가로채 출점 후보지 리포트 다이얼로그까지 실클릭 확인이 제한됐다. 실제 로그인 세션에서 Kakao 도메인 허용 기준 지도 로딩과 반경 저장을 live QA한다.
- 신규 SQL: 없음.

## 2026-07-01 업체 계약함 MVP QA

- 범위: 프랜차이즈 메뉴에 `/contracts/vendor` 업체 계약함을 추가했다. 물류, 식자재, 인테리어, 마케팅, 임대차, 기타 업체 계약을 회사 범위로 등록하고, 계약 담당자, 시작일/만료일, 상태, 메모, 기존 전자계약 연결 또는 업로드 파일을 관리한다.
- 신규 SQL: `supabase_franchise_vendor_contracts_migration.sql`을 추가했다. SQL 미적용 상태에서는 목록 API가 `schemaReady:false`를 반환해 화면에 적용 안내를 표시하고, 저장 API는 migration-required 안내를 반환한다.
- 업로드 보안: 업체 계약 파일은 기존 `property-documents` bucket의 `franchise-vendor-contracts/<companyId>/<contractId>/...` prefix만 허용한다. 열람은 public URL이 아니라 `/api/franchise-vendor-contracts?action=open`에서 권한 확인 후 5분 signed URL을 발급한다.
- 알림 연동: 계약 만료 D-30/D-7은 기존 `franchise_notifications`에 `vendor-contract-due` source type으로 동기화한다. 수신자는 계약 담당자와 회사 팀장이고, 종료/갱신/보관 상태는 자동 알림에서 제외한다.
- UI: 사이드바 프랜차이즈 그룹과 헤더 breadcrumb에 `업체 계약함`을 추가했다. 화면은 필터, 요약, 계약 등록/수정 패널, 계약 목록을 제공한다. 증거 묶음 PDF 출력은 이번 범위에서 제외했다.
- 검증: `npx tsx --test src/lib/franchise-vendor-contracts.test.mts src/lib/franchise-notifications.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts src/lib/company-menu-features.test.mts` 28건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. `npm run build`는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. 병렬 검증 중 build 전 `.next/types`를 읽은 `tsc` 1회가 새 라우트 타입을 못 보고 실패했으나, build 완료 후 순차 재실행한 `npx tsc --noEmit --pretty false`는 통과했다.
- 남은 live QA: SQL 적용 후 실계정으로 업체 계약 신규 등록, 업로드 문서 열람 signed URL, 전자계약 연결, 수정/삭제, D-30/D-7 알림 생성과 헤더 알림 표시를 확인한다.

## 다음 QA 체크리스트

### P0

- Meta 실제 유입은 계정/env 준비 전까지 HOLD. 엑셀 업로드 runner 기준 `1차 유입 DB` 저장과 후보자 승격은 2026-06-11 통과했으며, 실제 운영 엑셀 샘플 파일이 생기면 같은 runner로 추가 회귀한다.
- 실운영 계정 role matrix 기준으로 모객 DB, 후보지 연결, 외부 상가 수집 범위 회귀 QA
- 계약 가능 상태 리드가 업무 큐에서 별도 `계약 가능` 필터로 노출되지 않는지 확인
- 계약완료 상세 `오픈 준비` 탭에서 프로젝트 저장 후 새로고침 persistence를 실운영 세션으로 한 번 더 확인
- Gmail OAuth 운영 env(`GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `GMAIL_TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`) 준비 후 dev 서버 재시작, Google Cloud OAuth client에 `localhost`/`127.0.0.1` callback URI 모두 등록, 테스트 모드라면 실제 담당자 Gmail을 테스트 사용자에 추가, 실제 담당자 계정 연결, 저장 문서 발송, 고객 확인 링크 클릭, 중복 클릭 idempotency, 14일 잠금 기준 유지 확인
- `supabase_franchise_gmail_disclosures_migration.sql`을 대상 Supabase 환경에 적용한 뒤 `profile_gmail_connections`와 확장된 `franchise_lead_disclosure_deliveries` schema cache가 반영됐는지 확인

### P1

- SearchAPI 유료 결제 후 SearchAPI 429 발생 시 기존 Naver 리뷰/광고 값이 유지되는지 확인
- SearchAPI 유료 결제 후 UI에서 `SearchAPI 한도초과`, `provider 미설정`, `결과 없음`이 구분 표시되는지 확인
- SearchAPI 유료 결제 후 경쟁스캔 재실행 시 외부 provider 호출 남발을 막는지 확인
- 기존 스캔 캐시가 있을 때 상세 모달이 정상 렌더링되는지 확인
- `supabase_realty_import_migration.sql` 적용 후 `/dashboard/franchise-leads/market-insights?tab=realty-import`의 `외부 상가 수집` 탭에서 당근 상가 수집을 확인
- 실제 2000/3000 상한에 가까운 대량 데이터셋에서 화면 요청 상한, import API 안전 상한, 저장 목록 API 2000건 상한이 적용되는지 추가 확인
- `franchise-realty-scale-raw-qa.mjs --live-collect`는 2026-06-11 통과했다. 향후 import API 변경 시 Daangn raw/data 샘플과 `registerToProperties=false` 자동 등록 0건을 다시 확인
- 회사 범위가 없는 계정의 `requester_id` 기준 저장 목록 조회와 승격 차단은 2026-06-11 API QA를 통과했다. 향후 실운영 계정으로 UI 회귀만 확인
- 하단 `저장된 상가` 목록, 저장 지역 칩, 동 카드, 동 내부 페이지네이션, 최신화 버튼이 동작하고, 최신화 시 기존 매물이 중복 표시되지 않는지 확인
- 저장일 컬럼과 별표 토글이 동작하고, 재수집 후에도 별표가 유지되는지 확인
- 추천점수 컬럼, 별표만/1층만/관리비 확인 필터, 정렬이 저장 지역 칩과 동 카드 페이지네이션을 깨지 않는지 확인
- 동 카드 안의 저장 상가 지도 패널이 로그인 세션에서 Kakao 지도 도메인 설정, 주소 지오코딩, 마커 선택, 표의 지도 번호/주소 클릭 선택, 원문 링크를 정상 처리하는지 확인
- 기존 물건지와 주소가 같은 외부 매물이 `duplicate_candidate`로 표시되는지 확인
- import API 변경 후에도 외부 수집 결과가 점포목록에 자동 등록되지 않는지 회귀 확인
- `external_property_listings`에 원본 raw/data가 저장되는지 확인
- 선택 외부 상가 승격 후 운영 화면에서 `operation_type=external`, `manual-promoted` 물건지가 운영 전환 패널에 표시되고, 명시 등록 후 `sourcePropertyId`가 유지되는지 2026-06-11 확인
- 결과 표가 주소 중심으로 표시되고, 저장일/별표/가격/세부/반응/승격/원문 링크가 깨지지 않는지 회귀 확인
- 네이버부동산 향후 트랙은 URL/CSV import부터 별도 POC로 검증하고, 현재 당근 상가 수집 QA와 분리
- API `registerToProperties` 분기가 실수로 켜지지 않는지 향후 변경 때마다 회귀 확인
- 실제 로그인 계정에서 출점 후보지 등록 -> 브랜드 선택 -> 주소 선택 -> 경쟁스캔 -> 상세 모달 확인
- 가맹 운영 화면에서도 같은 `LocationCompetitionPanel`이 깨지지 않는지 확인
- 정보공개서 브랜드 검색이 공식 API 지연/실패 시 로컬 캐시로 fallback 되는지 확인
- 계약 전 준비 체크리스트 MVP와 목록 진행률, `계약 점주` 탭은 2026-06-12 구현했다. 남은 live QA는 로그인 세션에서 후보자별 체크 저장/새로고침 유지, 완료일/처리자/메모 저장, 다른 담당자/회사 범위 접근 차단, 14일 계약 잠금 기준이 수령 체크가 아니라 발송 이력 기준으로 유지되는지 확인하는 것이다.
- 계약 전 준비 체크리스트의 미완료 필수 스텝 필터와 계약 준비 완료 필터는 후속 UI 범위로 남김
- 브랜드 모니터링에서 Naver 공식 API 키 설정 후 스냅샷 저장/조회 확인

### P2

- Google Places 비용이 예상 범위 안에 있는지 실제 호출 로그 기준으로 점검
- SearchAPI/SerpApi provider별 결과 품질을 같은 키워드로 비교
- Naver Place 광고 배지 자동 수집 가능성은 별도 POC로 분리 검토

## QA 기록 방식

- 검증한 명령은 명령어와 결과를 함께 남긴다.
- 외부 API는 키/토큰을 절대 기록하지 않고, 응답 상태와 사용량 숫자만 기록한다.
- 화면 QA는 가능하면 URL, 계정 권한, 테스트 데이터, 기대 결과, 실제 결과를 남긴다.
- 버그를 발견하면 `재현 조건`, `원인`, `수정 파일`, `재검증 결과` 순서로 추가한다.
- Docs Steward는 QA 결과가 바뀌면 이 문서를 직접 갱신하고 `Doc Update Brief`에 변경 이유를 남긴다.
- Docs Steward는 `ERP/web/handoff.md`, 코드, SQL migration, env, package 파일을 수정하지 않는다.

## 2026-07-01 업체 계약함 2차-2A 갱신/종료 이력 QA

- 범위: `/contracts/vendor` 업체 계약함에 만료 업무 큐, 계약 상세 패널, 갱신/종료 처리, 처리 이력 조회를 추가했다. 갱신은 기존 계약을 `renewed`로 닫고 새 active 계약을 복사 생성하며, 종료는 사유를 필수로 받아 `terminated` 상태와 이벤트를 남긴다.
- 신규 SQL: `supabase_franchise_vendor_contract_events_migration.sql`을 추가했다. 이벤트 테이블은 회사 범위, 원본 계약, 연결 신규 계약, 이벤트 타입, 이전/이후 상태, 사유, 생성자를 저장한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다.
- API: `/api/franchise-vendor-contracts/actions`를 추가했다. `GET`은 선택 계약의 lifecycle 이벤트를 최신순으로 조회하고, `POST`는 `renew`/`terminate` 액션을 처리한다. 이벤트 SQL 미적용 상태에서는 424 SQL 적용 안내를 반환한다.
- UI: 목록 상단에 `전체`, `갱신 필요`, `만료`, `담당자 미지정`, `종료/보관` 큐를 추가하고, 행의 `상세` 버튼에서 계약 상세와 처리 이력을 확인한다. 상세 패널에서 새 계약명/시작일/만료일/사유로 갱신 처리하고, 별도 종료 사유로 해지 처리한다.
- 검증: `npx tsx --test src/lib/franchise-vendor-contracts.test.mts src/app/(main)/contracts/vendor/vendorContractsModel.test.mts` 11건 통과. 확장 회귀 `npx tsx --test src/lib/franchise-vendor-contracts.test.mts src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/lib/franchise-notifications.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts` 24건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3108`에서 `/login`, `/contracts/vendor` HTTP 200 응답을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 남은 live QA: SQL 적용 후 실계정으로 신규 등록, 상세 이력 조회, 갱신 처리 후 새 계약 생성, 종료/해지 처리, 큐 카운트/필터, 기존 D-30/D-7 알림 제외 상태를 확인한다.

## 2026-07-01 업체 관리 별도 메뉴 QA

- 범위: 프랜차이즈 메뉴에 `/dashboard/franchise-vendors` 업체 관리를 별도 메뉴로 추가했다. 새 업체 마스터 테이블은 만들지 않고 기존 업체 계약함 데이터를 업체명 기준으로 집계한다.
- UI: 업체별 계약 수, 진행 계약 수, 만료/갱신 필요 건수, 다음 계약/만료일, 상태 배지, 최근 메모를 목록으로 보여준다. 상단 요약은 등록 업체, 전체 계약, 진행 계약, 관리 필요 업체를 표시한다. `계약 보기`는 `/contracts/vendor?q=<업체명>`으로 이동하고 계약함은 query string을 초기 검색어로 사용한다.
- 샘플 데이터: 사용자가 SQL 적용 완료를 알렸으나, 현재 `.env.local`의 Supabase URL이 localhost가 아닌 hosted `supabase.co` 프로젝트라 실데이터 오염 가능성이 있다. 사용자가 hosted DB 샘플 주입을 명시 확인하기 전까지 샘플 주입은 보류한다.
- 검증: `npx tsx --test src/lib/company-menu-features.test.mts src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/lib/franchise-vendor-contracts.test.mts src/lib/franchise-notifications.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts` 39건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. production 서버 `http://localhost:3110/dashboard/franchise-vendors`에서 Playwright mock 데이터로 desktop 1280px/mobile 390px 렌더링을 확인했고, 업체 관리 본문 텍스트, 샘플 업체 3개, 관리 필요 업체 요약, horizontal overflow 0, console/page error 0건을 확인했다.

## 2026-07-01 업체 마스터 등록 및 계약 상세 배치 QA

- 범위: `/dashboard/franchise-vendors` 업체 목록 안에 `업체 생성` 버튼을 추가하고, 버튼을 눌렀을 때 같은 목록 섹션 안에서 업체 생성/수정 폼이 열리도록 변경했다. 업체 마스터는 `franchise_vendors`에 저장하고, 기존 계약함 집계와 업체명 기준으로 병합해 계약이 없는 업체도 목록에 표시한다.
- UI: 업체 목록에는 업체명/구분/거래상태, 담당자 연락처, 계약 수, 진행 계약, 관리 필요 건수, 다음 계약, 최근 메모, `수정`, `계약 보기`를 표시한다. 계약함의 계약 상세 패널은 기존처럼 화면 하단 전체 폭으로 떨어지지 않고, 상단 작업영역의 우측에 표시되도록 배치했다.
- 신규 SQL: `supabase_franchise_vendors_migration.sql`을 추가했다. 이 SQL은 회사 범위 업체 마스터, 담당자/연락처/이메일/사업자번호/거래상태/메모, 회사별 업체명 unique index, RLS를 포함한다. 사용자 확인 기준 Supabase SQL Editor 등록 완료.
- 검증: `npx tsx --test src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts` 5건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet` 통과. 파일별 pure LOC는 신규/수정 TSX/CSS 모두 250줄 이하로 확인했다.

## 2026-07-01 업체 계약함 목록 배치 및 업체 마스터 연동 QA

- 범위: `/contracts/vendor`에서 상단 `신규 계약` 버튼을 제거하고, 항상 보이는 좌측 `계약 등록` 폼만 등록 진입점으로 남겼다. 계약 목록은 폼 아래 전체 폭이 아니라 폼 우측 상단에 표시되며, 계약 상세는 행의 `상세` 클릭 시 같은 우측 컬럼에서 목록 아래에 열린다.
- 연동: 계약 등록 폼에 `업체 선택`을 추가했다. `/api/franchise-vendors`의 active 업체 마스터를 불러오고, 업체 관리에서 등록한 업체를 선택하면 계약 구분과 업체명이 자동 입력되며 계약에는 `vendor_id`가 함께 저장된다. 업체 관리 집계는 `vendor_id`를 우선 사용하고 기존 직접입력 계약은 업체명 fallback으로 병합한다. 계약함에만 있는 업체는 기존처럼 `직접 입력`으로 등록할 수 있다.
- 코드리뷰 보정: 파일 input이 공통 `.formGrid input` 스타일을 받아 페이지 전체 가로 overflow를 만드는 문제를 `input:not([type="file"])`로 수정했다. 업체 관리 SQL 미적용 시 계약함 업체 선택이 조용히 빈 목록이 되지 않도록 별도 안내를 추가했다. 계약 저장 API는 `vendor_id`가 있을 때 해당 업체가 같은 회사인지 확인한다.
- 신규 SQL: `supabase_franchise_vendor_contracts_migration.sql`에 `vendor_id` 컬럼, 인덱스, `franchise_vendors` FK를 추가했다. `supabase_seed_franchise_vendor_contract_samples.sql`은 샘플 업체 마스터를 먼저 생성하고 계약 샘플에 `vendor_id`를 연결하도록 보강했다. 사용자 확인 기준 Supabase SQL Editor 등록 완료.
- 검증: `npx tsx --test src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts src/lib/franchise-vendor-contracts.test.mts` 17건 통과. `npx tsc --noEmit --pretty false` 통과. 남은 검증은 lint/build/브라우저 QA다.

## 2026-07-02 업체 계약 등록 페이지 분리 QA

- 범위: `/contracts/vendor`의 좌측 상시 계약 등록 폼을 제거하고, 헤더 `계약 등록` 버튼을 통해 `/contracts/vendor/register` 전용 페이지에서 신규 계약을 등록하도록 변경했다. 계약 목록의 `수정`은 같은 등록 페이지에 `contractId` query로 진입해 기존 값을 불러온다.
- UI: 업체 계약함 목록 화면은 검색, 구분/상태 필터, 만료 업무 큐, 계약 목록, 상세 패널 중심으로 정리했다. 등록/수정 폼은 별도 페이지에서 업체 마스터 선택, 직접 입력, 전자계약 연결, 파일 업로드, 담당자/상태/메모 입력을 그대로 제공한다.
- 신규 SQL: 없음.
- 검증: `npx tsx --test src/app/(main)/contracts/vendor/vendorContractsModel.test.mts src/app/(main)/dashboard/franchise-vendors/vendorManagementModel.test.mts src/lib/franchise-vendor-contracts.test.mts` 17건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3120`에서 Playwright mock 세션으로 `/contracts/vendor` 목록 화면에 상시 등록 폼이 남지 않는 것, `계약 등록` 버튼의 `/contracts/vendor/register` 이동, `목록으로` 복귀, 목록 `수정`의 `contractId` 기반 수정 페이지 이동과 기존 계약명 로딩, desktop horizontal overflow 0건을 확인했다.

## 2026-07-02 Vercel Node 24 운영 설정 정렬 QA

- 범위: 운영 도메인이 연결된 Vercel `naeilsajang` 프로젝트의 Node.js Version이 20.x로 남아 있어, 앱 `package.json`의 `engines.node=24.x`와 맞도록 프로젝트 설정을 24.x로 변경했다.
- 배포: 설정 변경은 다음 빌드부터 적용되므로 production 재배포를 진행했다. 배포 ID는 `dpl_CfPurRkjSkWModDNQ9KzAbSyYLVZ`이고, source URL은 `https://naeilsajang-nqdt3v6sc-jaehyuns-projects-b4d20c6f.vercel.app`이다.
- 검증: `npx vercel project inspect naeilsajang --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `Node.js Version=24.x`를 확인했다. `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/contracts/vendor`, `curl -I -L https://www.fcerp.co.kr/contracts/vendor/register`는 200 응답이었다.

## 2026-07-02 알림톡 운영 관리 QA

- 범위: 어드민에 `/admin/alimtalk` 알림톡 운영 관리 페이지를 추가했다. 페이지는 회사별 발송량, 템플릿 관리, 시나리오 관리, 발송 로그 탭으로 구성한다. 1차 신청 대상은 회원가입 승인 요청/완료, 정보공개서 이메일 발송 안내, 정보공개서 수령 확인 완료, 가맹계약 가능일 도래, 업체계약 만료 D-30/D-7 총 6개다.
- 신규 SQL: `supabase_franchise_alimtalk_operations_migration.sql`을 추가했다. `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`와 6개 기본 템플릿/시나리오 seed를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다.
- API/UI: `/api/admin/alimtalk-operations`는 admin 세션만 허용한다. SQL 미적용 상태에서는 `schemaReady:false`를 반환해 화면에 SQL 적용 안내를 표시한다. 템플릿은 검수 상태, template/channel ID, 사용 여부를 저장하고, 시나리오는 ON/OFF와 SMS fallback을 저장한다. 시나리오 관리는 전체 발송 플로우 보드와 개별 시나리오 카드로 구성한다. 회사별 설정은 발송 사용 여부, 월 한도, 주의 기준을 저장한다.
- 후속 계획: 알림톡 2차는 승인 템플릿을 실제 업무 이벤트 발송 훅에 연결하고 `alimtalk_send_logs`에 요청/성공/실패/fallback을 남기는 범위로 둔다. 알림톡 3차는 사용량 대시보드, 실패 분석, 수동 재발송, provider 상태 점검, 공용 달력/업체계약 만료 큐, 비용 리포트로 분리한다.
- 검증: `npx tsx --test src/lib/alimtalk-operations.test.mts src/app/admin/alimtalk/alimtalkOperationsTableState.test.mts` 5건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://localhost:3126/admin/alimtalk`에서 Playwright mock API로 desktop 1280px/mobile 390px 렌더링, 회사별 발송량/템플릿/시나리오/발송 로그 탭 전환, 전체 발송 플로우 보드, 개별 시나리오 카드, 수신자 로그 표시, horizontal overflow 0건, console/page error 0건을 확인했다.

## 2026-07-02 가맹 운영 슈퍼바이징 MVP QA

- 범위: `/dashboard/franchise-operations`의 가맹 운영 탭을 `대시보드 / 슈퍼바이징 / 가맹점 목록 / 가맹점 등록`으로 확장했다. 슈퍼바이징 탭은 요약 KPI, SV 배정, 방문 일정, 점검 보고서 저장/제출, 관리자 승인/반려, 시정요청 상태 변경을 한 화면에서 처리한다.
## 2026-07-03 슈퍼바이징 2차 고도화 QA

- 범위: `/dashboard/franchise-operations`의 `슈퍼바이징` 탭을 `운영 리포트 / 배정 관리 / 방문 일정 / 점검 보고서 / 승인·시정요청` 내부 탭으로 재구성했다. 상단 KPI 카드는 클릭 시 오늘 방문, 이번주 예정, 미제출 보고서, 승인 대기, 진행 중 시정요청 큐로 이동하고 목록을 필터링한다.
- 보고서: 기본 점검 항목을 `매출/객수`, `청결`, `서비스`, `품질`, `재고/물류`, `본사 지원`, `교육/공지 이행`, `기타`로 확장했다. 팀장/admin은 현재 점검 항목을 회사 공용 템플릿으로 저장할 수 있고, 보고서 작성 화면에서 사진 첨부 메타와 특이사항을 함께 저장한다. 보고서 PDF/인쇄 출력은 운영점, SV, 방문일, 상태, 점검 항목, 특이사항, 첨부 이미지 URL이 있는 사진을 포함한다.
- 이력/동기화: 보고서 임시저장/제출/승인/반려는 `franchise_supervision_report_events`에, 시정요청 생성/상태변경/메모변경은 `franchise_corrective_action_events`에 남긴다. 보고서 제출/승인/반려에 따라 방문 일정 상태를 `승인대기 / 완료 / 보고서대기`로 동기화하고, 임시저장은 방문 상태를 바꾸지 않는다. 방문 수정/취소 시 연결된 `schedules` 일정의 날짜/상태/담당자를 갱신한다.
- 운영 큐: `/api/franchise-supervision` 초기 조회 응답에 `operationQueue`를 추가했다. 기존 방문/보고서/시정요청 행만 계산해 오늘 방문, 내일 방문 준비, 점검 보고서 미제출, 보고서 승인 대기, 시정요청 기한 초과 항목을 우선순위로 내려준다. `운영 리포트`의 `오늘 처리 큐`에서 항목을 누르면 기존 방문 일정/점검 보고서/승인·시정요청 탭과 필터로 이동한다. 신규 SQL은 없다.
- 보고서/승인 UI: 점검 보고서 탭에 방문 기준 보고서 목록 리스트를 추가했다. 미작성/임시저장/제출/승인/반려 상태, 방문 목적, SV, 개선필요 수, 사진 수, 특이사항을 표로 비교하고 `확인/작성`을 누르면 같은 탭의 보고서 작성 폼으로 이어진다. 승인·시정요청 탭은 카드 목록 대신 승인 큐와 시정요청 큐 테이블로 정리해 반려 사유 입력, 제출/검토일, 담당자, 기한, 상태 변경을 한 화면에서 처리한다. 신규 SQL은 없다.
- 배정관리 UI: 담당지역 입력/표시를 제거하고 `SV 배정 저장`/`배정 수정 저장` 버튼으로 신규와 수정 상태를 구분했다. 운영점별 보기에서는 전체/SV/배정상태/검색 필터와 페이지네이션으로 운영점별 현재 담당자를 먼저 확인하고, `수정`/`배정` 클릭 시 선택 행 바로 아래에 인라인 편집 폼을 연다. SV별 보기에서는 슈퍼바이저별 담당 운영점 목록과 배정 수를 확인한다. `배정됨`/`미배정` 배지는 셀 폭으로 늘어나지 않고 내용 폭만 차지하도록 보정했다. 기존 `franchise_supervisor_assignments` PATCH API를 사용하므로 신규 SQL은 없다.
- 알림톡: 내부 운영 알림용 `supervision_visit_due`, `supervision_report_missing`, `supervision_report_reviewed`, `supervision_corrective_action_due` 템플릿/시나리오 seed를 추가했다. 2차-2 범위에서는 방문 생성, 보고서 승인/반려, 시정요청 생성 시 내부 담당자/SV에게 발송 훅을 연결했다. `supervision_report_missing` 자동 발송은 방문 D-1/D-day와 함께 스케줄러/운영 큐 연결 범위로 남긴다. 시나리오나 템플릿이 미승인/비활성 상태이면 본 업무 저장은 성공하고 알림톡 로그에 blocked/skipped 상태가 남는다.
- 신규 SQL: `supabase_franchise_supervision_v2_migration.sql`을 추가했다. 회사별 점검 템플릿, 보고서 이벤트, 시정요청 이벤트, 보고서 `template_id`, 내부 알림톡 seed를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 코드리뷰 보정: 보고서 저장/조회 시 `template_id` 기준으로 회사 점검 템플릿 항목을 실제 병합하도록 수정했다. 승인/반려는 실제 `제출` 상태에서만 처리하고, 임시저장은 방문 상태·미제출 알림을 만들지 않게 했다. 방문 생성의 `assignment_id`, 시정요청 생성의 `report_id`, 내부 알림톡 수신자 조회는 회사 범위를 다시 검증한다. 보고서 첨부는 저장 경로만 신뢰하고 조회 시 `property-documents/franchise-supervision/...` 경로에서 public URL을 재생성한다. v2 이벤트 테이블 RLS는 참조 보고서/시정요청 회사와 `actor_profile_id = auth.uid()`를 확인하는 insert-only 정책으로 보강했다. 보고서 라우트와 슈퍼바이징 패널은 지원 파일/섹션 파일로 분리해 유지보수 리스크를 낮췄다. 추가 코드리뷰에서 나온 미제출 보고서 필터 불일치를 보정해 미래 예정 방문은 미제출 목록에 뜨지 않게 했고, 같은 방문에 보고서 row가 여러 개 있으면 최신 업데이트/제출/검토 시각 기준으로 선택한다. 승인 큐의 반려 사유 입력도 행별 상태로 분리했다.
- 검증: `npx tsx --test src/lib/franchise-supervision.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright mock 세션에서 `/dashboard/franchise-operations` 슈퍼바이징 탭을 1280px/390px로 확인했고, 운영 리포트/점검 보고서 화면 모두 page-level horizontal overflow 0건이었다. 추가 운영 큐 QA에서는 1280px/390px 모두 `오늘 처리 큐` 렌더, `점검 보고서 미제출` 큐 클릭 후 점검 보고서 탭 이동, console/page error 0건을 확인했다. 이번 보고서 목록/승인·시정요청 큐 고도화 QA에서는 Chrome mock 세션으로 1280px/390px에서 점검 보고서 `확인/작성`, `미작성` 상태, 승인 대기 보고서, 시정요청 메모 렌더링을 확인했고 page-level horizontal overflow 0건, console/page error 0건이었다.
- 당시 남은 live QA: v2 SQL 적용 후 실계정으로 템플릿 저장/재조회, 방문 생성/수정/취소와 공용 일정 파일럿 동기화, 보고서 제출/승인/반려 이력, 시정요청 상태 변경 이력, 보고서 인쇄 미리보기, `오늘 처리 큐` 항목 이동, 알림톡 발송 로그를 확인한다. 현재 2단계 기준에서는 이 공용 일정 파일럿 대신 `franchise_schedules`와 `/dashboard/franchise-operations/schedule`만 검증한다. 방문 D-1/D-day 및 보고서 미제출 자동 발송은 스케줄러 범위로 남긴다.

- 신규 SQL: `supabase_franchise_supervision_migration.sql`을 추가했다. `franchise_supervisor_assignments`, `franchise_store_visits`, `franchise_inspection_reports`, `franchise_corrective_actions`, 상태 제약, 인덱스, RLS를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- API/UI: `/api/franchise-supervision` 초기 조회와 `/assignments`, `/visits`, `/reports`, `/actions` mutation 라우트를 추가했다. `admin`/`manager`는 회사 전체를 관리하고, 일반 직원/SV는 본인 배정·방문·보고서 중심으로 제한한다. 방문 생성 시 기존 `schedules`에 회사 일정 1건을 같이 만들며, 보고서 사진은 기존 `property-documents` 버킷의 `franchise-supervision/<company_id>/<report_id>/...` 경로 메타데이터로 저장한다.
- 후속 계획: 2차는 알림톡/문자/이메일 자동 발송 훅, 공용 달력 양방향 동기화, 점검 보고서 PDF 출력, 보고서 템플릿 빌더, 대표 대시보드 KPI 연결로 둔다. 1차에서는 발송 이벤트와 PDF 자동 출력은 직접 실행하지 않는다.
- 검증: `npx tsx --test src/lib/franchise-supervision.test.mts src/lib/upload-storage-policy.test.mts src/lib/upload-storage-access.test.mts` 14건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 production 서버 `http://127.0.0.1:3130`에서 Playwright mock 세션/API로 `/dashboard/franchise-operations` 슈퍼바이징 탭을 1280px/390px에서 확인했고, 필수 문구 누락 0건, page-level horizontal overflow 0건, console/page error 0건이었다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. 남은 live QA는 SQL 적용 후 실계정으로 SV 배정, 방문 일정, 보고서 저장/제출, 승인/반려, 시정요청 생성/상태 변경 persistence 확인이다.

## 2026-07-02 진행현황 확인/수정 첨부 열람 QA

- 범위: 입점요청 등록 폼에 `현재 상태=영업중`일 때 `현재 영업중 상호/매장명` 입력을 추가하고, 진행현황의 입점요청/예비 창업자 등록 액션을 `확인/수정`으로 통일했다. 모달 상단에는 등록 요약과 첨부 자료 영역을 두고, 하단에는 기존 수정 폼을 유지한다. 버튼 노출과 수정/삭제 권한은 기존 작성자, 회사 팀장, admin 정책을 그대로 유지한다.
- 첨부: 신규 입점요청 첨부는 row 생성 후 `/api/upload`를 통해 이미지 파일은 `property-images`, PDF/문서는 `property-documents`에 저장하고 `storageBucket`, `storagePath`, `publicUrl` 메타를 `properties.data.fileAttachments`에 반영한다. 이미지 파일은 썸네일/열기/다운로드를 제공하고, PDF/문서는 다운로드 버튼을 제공한다. 과거처럼 URL 없이 파일명/용량/타입만 남은 첨부는 원본 파일을 복원할 수 없으므로 `재첨부 필요`로 안내한다.
- 코드리뷰 보정: 진행현황 표시는 불완전한 API 데이터에서도 crash가 나지 않도록 표시 helper를 null-safe하게 보강했다. 파일 선택 직후 저장 전에도 브라우저 `blob:` URL로 파일명 링크와 다운로드 버튼이 보이도록 pending file URL을 관리한다. HEIC는 현재 업로드 route에서 허용하지 않으므로 UI 허용 문구에서 제외했다.
- 신규 SQL: 없음. 기존 `properties.data` JSON과 Storage 업로드 경로를 사용한다.
- 검증: `npx tsx --test src/lib/work-intake-display.test.mts src/lib/franchise-property-registration-uploads.test.mts src/lib/franchise-property-registration.test.mts src/lib/franchise-file-attachments.test.mts 'src/app/(main)/dashboard/franchise-leads/work-intake/requests.test.mts'` 14건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. Playwright mock 세션에서 `/dashboard/franchise-leads/work-intake` 확인/수정 모달을 열고 새로 선택한 PDF의 `다운로드` 버튼이 visible 상태이며 `blob:` 링크와 파일명 download 속성을 갖는 것을 확인했다.
- 남은 live QA: 운영 배포 후 실계정으로 입점요청 `영업중` 매장명 저장/재조회, 신규 이미지 썸네일, PDF 다운로드, URL 없는 과거 첨부의 `재첨부 필요` 안내, 예비 창업자 등록 `확인/수정` 제목과 기존 권한 정책 유지 여부를 확인한다.

## 2026-07-02 입점요청/예비 창업자 등록 Solapi 문자 알림 QA

- 범위: 입점요청 저장 성공 후 `[ERP] 입점요청 등록` 문자를, 예비 창업자 등록 저장 성공 후 `[ERP] 예비창업자 등록` 문자를 Solapi로 발송한다. 예비 창업자 등록은 동일 연락처 dedupe로 기존 모객 DB가 업데이트되는 경우에도 등록 시도 알림을 보낸다.
- 운영 env: `SOLAPI_SMS_ENABLED=true`, `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_PHONE`이 필요하다. 인입 알림 전용 수신 번호는 `FRANCHISE_INTAKE_ALERT_PHONES`에 쉼표 구분으로 등록한다. 이 값이 비어 있으면 기존 `SIGNUP_ADMIN_ALERT_PHONES`로 fallback 한다.
- 안정성: 문자 발송은 DB 저장 성공 후 별도 `try/catch`에서 처리하며, Solapi 설정 누락/실패는 서버 로그만 남기고 입점요청/예비 창업자 등록 응답을 실패시키지 않는다.
- 신규 SQL: 없음.
- 검증: `npx tsx --test src/lib/solapi-notifications.test.mts` 9건 통과. Solapi 전화번호 정규화, 회원가입 문구, 입점요청/예비 창업자 등록 문구, `FRANCHISE_INTAKE_ALERT_PHONES` 파싱을 확인했다. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 남은 live QA: 운영 Vercel Production env에 `FRANCHISE_INTAKE_ALERT_PHONES`와 Solapi 필수 키 이름이 존재함을 확인했다. 배포 후 실서버에서 입점요청/예비 창업자 등록을 1건씩 생성해 실제 수신 번호 문자 도착을 확인한다.

## 2026-07-02 입점요청/예비 창업자 등록 진행현황 이동 QA

- 범위: 입점요청과 예비 창업자 등록 저장 성공 후 작성 폼에 남지 않고 진행현황 화면으로 이동한다. 입점요청은 `?tab=properties`, 예비 창업자 등록은 `?tab=matchingRequests`를 붙여 방금 등록한 유형의 탭이 바로 열리게 했다.
- 신규 SQL: 없음.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. 로컬 dev 서버 `http://127.0.0.1:3000`에서 Playwright mock 세션으로 입점요청 등록 후 `진행현황 > 입점 요청` 탭 이동, 예비 창업자 등록 후 `진행현황 > 예비 창업자 등록` 탭 이동을 확인했다.

## 2026-07-02 알림톡 승인 템플릿 발송 훅 QA

- 범위: 승인된 Kakao/SOLAPI 알림톡 템플릿을 실제 업무 이벤트에 연결했다. 연결 대상은 회원가입 승인 요청, 회원가입 승인 완료, 정보공개서 수령 확인 완료, 가맹계약 가능 상태, 업체 계약 만료 D-30/D-7이다. 검수중인 정보공개서 확인 안내 템플릿은 승인 전까지 실제 발송 훅에서 제외한다.
- 동작: 각 훅은 `alimtalk_scenarios.enabled`, 템플릿 `approved/enabled`, template/channel ID, 회사별 발송 사용 여부와 월 한도, Solapi env를 확인한 뒤 발송한다. 발송 성공/실패/차단 결과는 `alimtalk_send_logs`에 남기고, 알림톡 실패는 본 업무 저장/승인/확인 흐름을 실패시키지 않는다.
- 신규 SQL: 없음. 기존 `supabase_franchise_alimtalk_operations_migration.sql`의 `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`를 사용한다.
- 검증: `npx tsx --test src/lib/alimtalk-send-support.test.mts src/lib/alimtalk-operations.test.mts src/lib/solapi-notifications.test.mts src/lib/franchise-notifications.test.mts` 19건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다. 남은 live QA는 운영 admin에서 승인 템플릿 ID, channel ID, 시나리오 ON, 회사 설정을 저장한 뒤 각 이벤트별 실발송/로그 확인이다.

## 2026-07-02 업체 계약 만료 알림톡 변수 정합성 QA

- 범위: 정보공개서 알림톡은 Google OAuth 인증 완료 이후로 미루고, 우선 Gmail 의존성이 없는 `vendor_contract_due` 업체 계약 만료 안내를 테스트 대상으로 분리했다.
- 보정: 승인 템플릿의 `D-#{남은일수}` 형식과 담당자 표시를 지원하도록 업체 계약 만료 후보 변수에 `남은일수`를 추가하고, 기존 seed 호환을 위해 `남은기간`도 `D-7`/`D-30` 형태로 함께 보낸다. 수신자별 프로필 이름은 `담당자명` 변수로 발송 직전에 주입한다.
- 테스트 조건: 계약 상태가 `terminated`, `renewed`, `archived`가 아니고 만료일이 실행일 기준 정확히 D-30 또는 D-7인 계약만 대상이다. 수신자는 계약 담당자와 회사 팀장이고, 중복 발송 방지를 위해 `contractId:vendor-contract-due:남은일수` source 기준으로 로그가 남는다.
- 신규 SQL: 없음. 운영에서는 `/admin/alimtalk`에서 `vendor_contract_due` 템플릿을 `approved/enabled`로 저장하고 template ID, channel ID, 시나리오 ON, 회사별 발송 사용 여부를 확인한다.
- 검증: `npx tsx --test src/lib/franchise-notifications.test.mts` 6건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.

## 2026-07-02 업체 계약 만료 알림톡 수신자 스코프 QA

- 범위: admin 전역 알림 조회가 회사 스코프 없이 모든 회사 업체계약 후보를 실제 알림톡 발송까지 시도하지 않도록 차단했다. 회사가 특정된 요청 또는 일반 회사 계정 요청에서는 기존처럼 발송한다.
- 보정: 업체계약 담당자(`owner_profile_id`)는 해당 계약 회사의 활성 수신자 목록에 있을 때만 후보에 추가한다. 과거 테스트 계약이나 잘못된 담당자 참조가 남아 있어도 다른 프로필로 알림톡이 재생성되지 않게 했다.
- 신규 SQL: 없음. 운영 테스트 데이터 정리는 사용자가 Supabase SQL Editor에서 직접 실행한다. **SQL 등록 필요**.
- 검증: `npx tsx --test src/lib/franchise-notification-alimtalk-scope.test.mts src/lib/franchise-notifications.test.mts` 9건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.

## 2026-07-03 알림톡 운영 UI 단순화 QA

- 범위: `/admin/alimtalk` 템플릿 관리에서 별도 `사용` 체크와 템플릿 본문 미리보기를 제거했다. 템플릿은 `상태=승인완료`로 저장하면 기존처럼 자동 사용 처리된다.
- 시나리오 관리: 전체 발송 플로우 보드와 `시나리오 사용` 체크를 제거했다. 각 시나리오 카드의 `템플릿` 노드를 클릭하면 카카오 알림톡 미리보기 형태로 템플릿 본문과 변수 칩을 확인할 수 있게 했다. 대체 발송 저장은 기존 시나리오 enabled 상태를 보존하고 fallback 설정만 저장한다.
- 신규 SQL: 없음.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 dev 서버 `http://127.0.0.1:3010/admin/alimtalk`에서 Playwright mock API로 템플릿 관리 본문 미노출, 시나리오 관리 전체 플로우/사용 체크 미노출, 템플릿 노드 클릭 시 알림톡 미리보기와 변수 칩 노출을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.

## 2026-07-03 어드민 메뉴 순서 및 정보공개서 확인 안내 알림톡 QA

- 범위: 어드민 관리 홈의 관리 메뉴 카드 순서를 `회원 및 권한 관리`, `회사별 메뉴 관리`, `프랜차이즈 인입 관리`, `전자계약 관리`, `알림톡 운영 관리`, `시스템 설정`으로 조정했다. 정보공개서 Gmail 발송 폼에는 필수 `후보자명` 입력과 발송 전 `정보공개서 확인 안내` 알림톡 미리보기를 추가했다.
- 알림톡 연동: Gmail 발송 성공 시 `recipientName`을 발송 이력의 `recipient_name`에 저장하고, 후보자 휴대폰이 있으면 `disclosure_email_sent` 시나리오로 `#{후보자명}`, `#{브랜드명}` 변수를 채워 알림톡을 발송한다. 수령 확인 클릭 시에는 기존 `disclosure_confirmed` 시나리오를 유지하며, 발송 당시 저장된 브랜드명을 우선 사용한다.
- 신규 SQL: 없음. 기존 `supabase_franchise_alimtalk_operations_migration.sql`의 `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`를 사용한다.
- 검증: `npx tsx --test src/lib/franchise-notifications.test.mts` 9건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 스모크로 후보자명 미입력 시 발송 요청 차단, 알림톡 목업 변수 노출, `disclosure_email_sent`/`disclosure_confirmed` 변수 매핑을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 남은 live QA: 운영 Google OAuth 승인/연결 계정으로 실제 Gmail 발송을 1건 실행해 `정보공개서 확인 안내` 알림톡 도착, 발송 로그 성공, 수령 확인 버튼 클릭 후 `정보공개서 수령 확인 완료` 알림톡과 계약 가능일 표시를 확인한다.

## 2026-07-03 정보공개서 수령 확인 알림톡 변수 및 미확인 큐 QA

- 범위: 운영 테스트에서 `정보공개서 수령 확인 완료` 알림톡은 도착했지만 승인 템플릿의 `확인일`/`계약가능일` 계열 변수가 비어 보이는 문제를 보정했다. `disclosure_confirmed` 변수 생성은 `확인일`, `수령확인일`, `수령일`, `계약가능일`을 모두 채우며, 계약 가능일은 기존 14일 숙고기간 계산 유틸을 사용한다.
- 미확인 큐: 메일 열람 추정은 Gmail/메일 클라이언트 프록시 때문에 법적 수령 신호로 쓰지 않는다. 대신 정보공개서가 `sent` 또는 `opened` 상태이고 `confirmed_at`이 없으며 발송 후 1일 이상 지난 경우 내부 `정보공개서 수령 미확인` 업무 큐를 생성한다. 이 큐는 외부 알림톡 자동 발송이 아니라 담당자 follow-up용 내부 알림이다.
- 신규 SQL: 없음. 기존 정보공개서 발송 이력, 알림 후보 생성 로직, 알림톡 운영 테이블을 사용한다.
- 검증: `npx tsx --test src/lib/franchise-notifications.test.mts src/lib/alimtalk-send-support.test.mts src/lib/alimtalk-operations.test.mts` 15건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 스모크로 `opened` 상태이지만 수령확인이 없는 발송 이력이 `disclosure-unconfirmed` 후보로 생성되고, `disclosure_confirmed` 변수가 `계약가능일: 2026. 07. 17.`, `확인일/수령확인일/수령일: 2026. 07. 03.` 형태로 채워지는 것을 확인했다.
- 남은 live QA: 운영에서 실제 수령 확인 버튼 클릭 후 `alimtalk_send_logs`의 변수 payload와 카카오 알림톡 표시가 일치하는지 확인한다. Gmail 열람 추정은 환경별 차이가 크므로 `opened_at`은 참고값으로만 확인하고, 미확인 큐 생성 여부는 발송 후 1일 경과 데이터로 점검한다.

## 2026-07-03 가맹계약 가능 상태 알림톡 변수 QA

- 범위: 운영 테스트에서 `가맹계약 가능 상태 안내` 알림톡은 도착했지만 승인 템플릿의 `후보자명`, `수령확인일`, `계약가능일` 계열 변수가 비어 보이는 문제를 보정했다. 계약 가능 알림 후보 생성 시 `confirmedAt`, `latestSentAt`을 함께 전달하고, 알림톡 변수 빌더는 `후보자명`, `예비창업자명`, `확인일`, `수령확인일`, `수령일`, `계약가능일`, `계약가능예정일`, `가능일`을 모두 채운다.
- 신규 SQL: 없음. 기존 정보공개서 발송 이력, 알림 후보 생성 로직, 알림톡 운영 테이블을 사용한다.
- 검증: `npx tsx --test src/lib/franchise-notifications.test.mts` 11건 통과. `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 새 회귀 테스트로 `disclosure-eligible` 후보의 `franchise_contract_eligible` 변수 별칭이 모두 채워지는 것을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 남은 live QA: 운영 배포 후 내일 회사 admin 계정 테스트 데이터로 `가맹계약 가능 상태 안내` 알림톡을 다시 발송해 카카오 메시지와 `alimtalk_send_logs.variables`에 후보자명, 수령확인일, 계약가능일이 표시되는지 확인한다.

## 2026-07-03 슈퍼바이징 역할별 운영 UX QA

- 범위: 슈퍼바이징 탭을 팀장/관리자 관점과 SV 관점으로 분리했다. `admin`/`manager`에게만 `배정 관리` 내부 탭을 노출하고, 일반 SV는 운영 리포트/방문 일정/점검 보고서/승인·시정요청 중심으로 사용한다. 운영 리포트 문구는 팀장에게 회사 전체 현황, SV에게 내 담당 운영점 현황으로 보이게 정리했다.
- 방문 점검: 방문 일정은 목록을 먼저 보여주고, `새 방문` 또는 `수정`을 눌렀을 때 하단 등록/수정 폼에서 처리한다. 폼은 SV 선택을 먼저 두고, 선택한 SV에게 활성 배정된 운영점만 표시한다. 방문 목록에는 검색, SV 필터, 상태 필터, 페이지네이션, 수정/삭제 액션을 추가했다. 삭제는 이력 보존을 위해 방문을 `취소` 상태로 바꾸고 연결된 공용 일정도 `cancelled`로 동기화한다.
- 점검 보고서: `보고서 목록`과 `보고서 작성`을 분리해 목록에서 미작성/임시저장/제출/승인/반려 상태를 먼저 비교하고, 선택한 방문만 작성 화면으로 이동한다. `오늘 처리 큐` 문구는 `운영 우선순위`로 바꿔 방문/보고서/승인/시정요청을 처리 순서대로 보는 영역으로 정리했다.
- 신규 SQL: 없음. 기존 `supabase_franchise_supervision_migration.sql` 및 `supabase_franchise_supervision_v2_migration.sql` 적용 환경을 그대로 사용한다.
- 검증: `npx tsx --test src/lib/franchise-supervision.test.mts src/lib/franchise-supervision-assignments.test.mts` 13건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet` 통과. 브라우저 QA는 로그인 가드가 있으면 사용자 제공 테스트 계정(`내일` 회사 `admin`, 비밀번호는 문서화하지 않음)으로 Playwright 로그인 후 확인한다.
- 남은 live QA: 실계정에서 팀장에게만 `배정 관리`가 보이는지, SV 선택 후 배정 운영점만 표시되는지, 방문 수정/삭제 후 목록과 공용 일정 상태가 갱신되는지, 보고서 목록/작성 전환과 운영 우선순위 이동이 끊기지 않는지 확인한다.

## 2026-07-07 보안 감사 후속 및 인증 헤더 회귀 QA

- 범위: 외부 보안 감사 후속으로 남은 SQL-only 항목을 별도 SQL로 정리하고, 세션 기반 인증 전환 후 모객 DB 화면에서 남아 있던 `requesterId is required` 콘솔 오류를 보정했다. Meta 연동 조회/저장/동기화/연결해제와 후보지 연결용 외부 매물 목록 조회가 `getApiAuthHeaders()`를 사용한다.
- 전자계약 권한: 감사 후속 중 잘못 옮겨진 존재하지 않는 `super_manager` 역할을 유효 역할인 `sub_manager`로 정정했다. 같은 회사 `sub_manager`는 전자계약 문서 조회와 회사 템플릿 관리를 기존 정책대로 사용할 수 있다.
- UCanSign: UCanSign 미연결 계정이 대시보드에 들어올 때 계약 목록 조회는 빈 상태로 유지하되, 서버 콘솔에는 예상 가능한 미연결 error 로그를 반복 출력하지 않게 정리했다.
- 신규 SQL: `supabase_platform_audit_required_sql_2026_07_07.sql`을 추가했다. `share_links.revoked_at`, `system_settings`, 중복 방지 unique index를 포함하며 사용자가 Supabase SQL Editor에서 직접 적용한다. **SQL 등록 필요**.
- 검증: `npx tsx --test src/lib/electronic-contracts/document-permissions.test.mts` 11건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `git diff --check` 통과.
- 남은 live QA: 운영 배포 후 모객 DB에서 Meta 연동 패널과 후보지 연결 패널 진입 시 `requesterId is required` 콘솔 오류가 재발하지 않는지, UCanSign 미연결 계정의 대시보드 진입 로그가 조용한지, 같은 회사 `sub_manager` 계정의 전자계약 접근이 유지되는지 확인한다.

## 2026-07-07 슈퍼바이징 NVIDIA NIM AI 요약 설정 QA

- 범위: `가맹 운영 > 슈퍼바이징 > 점검 보고서`의 AI 회의록 정리 호출을 버튼 클릭 동기 UX에 맞게 재정리했다. 실 API 스모크에서 `mistralai/mistral-medium-3.5-128b`는 짧은 프롬프트 호출은 성공했지만 실제 SV 점검 프롬프트는 20초 내 완료되지 않았다. 기본 모델은 빠른 `nvidia/nemotron-3-nano-30b-a3b`, fallback은 `meta/llama-3.1-8b-instruct`로 둔다.
- env: 로컬 `.env.local`에는 `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `NVIDIA_FALLBACK_MODEL`, `NVIDIA_REQUEST_TIMEOUT_MS`, `NVIDIA_FORCE_JSON`를 설정한다. 실제 키 값은 문서/커밋에 남기지 않는다.
- 보정: 모델 alias(`mistral-medium-3.5-128b`, `nemotron-3-nano-30b-a3b`, `llama-3.1-8b-instruct`)를 정식 NVIDIA 모델 ID로 정규화한다. 기본 동기 호출은 10초, fallback은 8초 안에 끊어 UI가 장시간 멈추지 않게 하고, 실패 시 로컬 초안을 반환한다. Mistral Medium은 2차에서 비동기 고품질 재정리 작업으로 분리하는 것이 적합하다.
- 신규 SQL: 없음.
- 검증: 실 API 스모크 기준 모델 목록 조회 200, Mistral 짧은 JSON 응답 200, Mistral 실제 SV 프롬프트 timeout, Nemotron Nano 실제 SV 프롬프트 약 3초 응답, Llama 8B 실제 SV 프롬프트 약 2초 응답을 확인했다. `npx tsx --test src/lib/franchise-supervision.test.mts`에서 NVIDIA 모델 정규화, JSON forcing opt-in, Nemotron thinking 비활성화, Mistral light reasoning, boolean env 정규화 회귀 테스트를 확인한다. 운영 Vercel에는 동일 env 키를 별도로 등록한 뒤 실계정에서 AI 정리 응답과 local fallback 메시지를 확인한다.

## 2026-07-07 슈퍼바이징 AI 회의록 검토 UI QA

- 범위: `가맹 운영 > 슈퍼바이징 > 점검 보고서 > 보고서 작성`의 AI 회의록 정리 결과를 바로 적용하지 않고 검토 단계로 분리했다. 결과 미리보기에서 요약/특이사항을 직접 수정하고, 체크리스트 항목별로 적용 여부, 판정, 메모, 원문 근거를 확인·수정한 뒤 보고서에 반영한다.
- 보정: AI helper를 parser/prompt/fallback/apply/text/types 파일로 분리하고, AI/NVIDIA 회귀 테스트를 `franchise-supervision-ai-summary.test.mts`로 분리했다. 품질 경고는 대화체·존댓말 표현, 짧은 주의/개선필요 기록, 후속조치 부재, 원문 근거 부재를 적용 전 확인하도록 표시한다. 화면에는 `NVIDIA NIM`, `사용 모델` 문구를 노출하지 않는다.
- 신규 SQL: 없음.
- 검증: `npx tsx --test src/lib/franchise-supervision.test.mts src/lib/franchise-supervision-ai-summary.test.mts` 30건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 dev 서버 `http://localhost:3000`에서 Playwright로 `내일 / admin` 로그인 후 슈퍼바이징 점검 보고서 AI 패널 노출, 모델명 미노출, mock AI 응답 기반 항목별 적용/원문 근거/검토 UI 렌더링, 390px 모바일 가로 overflow 없음, console error 0건을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.

## 2026-07-07 슈퍼바이징 AI 보고서 출력 중복 제거 QA

- 범위: 운영 PDF 확인 결과 `조치 필요 항목` 카드와 `전체 점검 내역` 표에 동일한 긴 메모가 반복되어 보고서가 장황하게 보이는 문제를 보정했다.
- 보정: AI 프롬프트와 응답 정규화에서 `점주 의견 기준`, `직원 진술 기준` 같은 출처 접두어가 항목마다 반복되지 않게 했다. AI 종합 요약은 보고서 특이사항에 `종합 요약`으로 남기고, 후속 확인 사항은 별도 줄로 유지한다. PDF/인쇄의 `조치 필요 항목`은 상태와 항목명만 요약하고, 상세 메모는 `전체 점검 내역` 표에서만 확인하게 했다.
- 신규 SQL: 없음.
- 검증: `npx tsx --test src/lib/franchise-supervision-ai-summary.test.mts src/lib/franchise-supervision.test.mts` 30건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 dev 서버 `http://localhost:3000`에서 Playwright로 `내일 / admin` 로그인 후 `가맹 운영 > 슈퍼바이징 > 점검 보고서 > 보고서 작성`에 진입했고, AI 패널에서 모델명/엔비디아 문구 미노출, PDF/인쇄 팝업에서 `조치 필요 항목`과 `전체 점검 내역`이 중복 메모 없이 분리되는 것을 확인했다.

## 2026-07-07 가맹 운영 인력 세팅 계산기 QA

- 범위: `/dashboard/franchise-operations`의 상단 탭을 `대시보드 / 슈퍼바이징 / 인력 세팅 / 가맹점 목록 / 가맹점 등록`으로 확장하고, `인력 세팅` 탭을 추가했다. 운영점, 월 목표매출, 영업일/영업시간, 목표 인건비율, 점장/직원/알바 급여 기준을 입력하면 권장 인력 구성, 월 인건비, 매출 대비 인건비율, 주간 근무표를 계산한다. 2026-07-07 추가 고도화로 입력 화면을 `빠른 계산`과 `상세 조건`으로 분리하고, 상세 조건에는 `점주/본인 근무 포함`, 기본 브레이크타임 15:00-17:00, 급여 기준을 배치했다. 본인 근무를 켜면 유급 점장 필요 인원을 우선 줄이고, 브레이크타임은 유효 운영시간과 근무표에 반영한다.
- 저장/기준값: 신규 `supabase_franchise_labor_planning_migration.sql`을 추가했다. SQL 적용 전에도 임시 계산은 가능하지만 운영점별 인력 세팅안 저장/불러오기는 비활성화된다. 회사별 노무 기준값은 `franchise_labor_settings`에서 불러오며, 저장 시 `settings_snapshot`으로 남긴다. **SQL 등록 필요**.
- 부속 도구: 급여 실수령 참고, 3.3% 원천징수, 일당 계산기, 노무 서식함 전자계약 진입점을 추가했다. 화면 안내는 “운영 예산 산정용 참고값”으로 고정해 법률/급여 신고 확정 판단처럼 보이지 않게 했다.
- 검증: `npx tsx --test src/lib/franchise-labor-planning.test.mts` 11건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright mock 세션으로 `/dashboard/franchise-operations`의 `인력 세팅` 탭 진입, `매출별 인력 계산`, `추천 인력 구성`, `주간 근무표`, `부속 계산기`, `노무 서식함` 노출, 계산 버튼 동작, 1280px/390px 가로 overflow 0을 확인했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- UI 보정: 한 화면에 계산 입력, 결과, 근무표, 부속 계산기, 서식함, 저장안이 모두 펼쳐져 보이던 구조를 `계산 입력 / 결과·근무표 / 부속 도구 / 저장안` 내부 탭으로 분리했다. 기본 진입 화면은 계산 입력만 보여주고, 계산 후 결과 탭으로 이동한다. Playwright mock 세션에서 기본 화면의 `추천 인력 구성`/`부속 계산기` 미노출, 결과/도구/저장안 탭 전환, 1280px/390px 가로 overflow 0을 확인했다.
- UI 보정: `주간 근무표`를 요일별 카드 나열에서 시간축 기반 일정표로 변경했다. 요일별 점장/직원/알바 근무 시간이 막대로 표시되고, 휴무일은 별도 상태로 표시된다. Playwright로 1280px에서는 표 전체가 맞고, 390px에서는 근무표 영역만 가로 스크롤되며 페이지 전체 가로 overflow는 0인 것을 확인했다.
- UI 보정: `주간 근무표` 상단에 운영일, 주간 총 시간, 주간 인건비, 가장 긴 운영일 요약을 추가하고, 점장/직원/알바/브레이크 역할 범례와 요일별 근무 칩을 더해 긴 시간표를 한 번에 해석할 수 있게 했다. Playwright로 `내일 / admin / 1234` 로그인 후 `인력 세팅 > 결과·근무표`에서 1280px 페이지 overflow 0, 모바일 390px 페이지 overflow 0 및 근무표 내부 스크롤, 근무 막대 30개/근무 칩 24개 렌더링, 콘솔 오류 0건을 확인했다.
- UI 보정: 추천 결과에 `보수형 / 표준형 / 공격형` 3개 인력 시나리오 비교 카드를 추가했다. 표준형은 현재 입력값 기준, 보수형은 초기 비용 절감, 공격형은 피크 대응 여유를 보여주며 각 카드에서 월 인건비, 인건비율, 총 인원, 역할별 인원 구성을 비교한다. 2026-07-07 추가 보정으로 각 카드를 선택 가능한 버튼으로 바꾸고, 선택한 시나리오 기준으로 구성 상세와 주간 근무표 숫자가 함께 바뀌게 했다. Playwright로 표준형 976만원/5명, 보수형 880만원/4명, 공격형 1,072만원/6명 전환과 1280px/390px 가로 overflow 0을 확인했다.
- UI 보정: 프리랜서는 실제 지정 인력 대상이 아니므로 권장 인력 구성과 시나리오 비교에서 제거했다. 결과 역할은 점장/직원/알바만 생성하며, 과거 저장안에 프리랜서 역할이 남아 있어도 plans API에서 legacy 역할을 걸러내도록 보강했다. Playwright로 `인력 세팅` 계산 후 본문에 `프리랜서` 문구가 없고, 결과 카드가 점장/직원/알바만 표시되며 1280px/390px 가로 overflow 0인 것을 확인했다.
- 기능 보정: 저장된 인력 세팅안 목록에 `수정`과 `삭제` 액션을 추가했다. 수정은 저장안을 계산 입력 화면으로 불러온 뒤 기존 저장안 ID로 갱신하고, 삭제는 확인창 후 저장안과 역할 행을 제거한다. Playwright로 `내일 / admin / 1234` 로그인 후 저장안 3건에 수정/삭제 버튼이 표시되고, 수정 배너와 삭제 확인창이 동작하며 1280px/390px 가로 overflow 0인 것을 확인했다.
- 부속 도구 고도화: `부속 계산기`를 월 급여 실수령, 3.3% 지급액, 일당 계산, 주휴·주간 근무 계산으로 분리했다. 월 급여는 비과세 금액과 회사 부담 포함액을 함께 보여주고, 일당은 시급/기본/연장/야간 시간을 직접 조정하며, 주휴는 주간 시간과 근무일수 기준으로 주간 지급 참고액과 월 환산액을 계산한다. Playwright로 `내일 / admin / 1234` 로그인 후 부속 도구 탭에서 1280px/390px 가로 overflow 0, 콘솔 오류 0, `프리랜서` 문구 미노출을 확인했다. 이번 보강은 기존 인력 세팅 SQL을 변경하지 않는다.
- 출력 보정: `결과·근무표` 탭에 `보고서 저장/인쇄` 버튼을 추가하고, A4 출력용 `인력 세팅 근무표 보고서`를 새 창으로 열어 브라우저 인쇄 또는 PDF 저장이 가능하게 했다. 보고서에는 운영점, 세팅안, 목표매출, 본인 근무 여부, 추천 인력 구성, 주간 근무표, 운영 예산 참고 안내가 포함된다. Playwright로 `내일 / admin / 1234` 로그인 후 출력 창 본문, 1280px/390px 가로 overflow 0, 콘솔 오류 0을 확인했다.
- 연결 보정: `노무 서식함`의 `전자계약 관리` 링크가 존재하지 않는 `/dashboard/electronic-contracts`로 이동하던 문제를 `/contracts/electronic?mode=templates` 진입으로 수정했다. 전자계약 화면은 URL의 `mode=templates`를 읽어 템플릿 관리 탭을 바로 활성화한다. Playwright로 `내일 / admin / 1234` 로그인 후 `인력 세팅 > 부속 도구 > 노무 서식함 > 전자계약 관리` 클릭 시 전자계약 템플릿 관리 화면이 열리는 것을 확인했다. 이번 보강은 SQL 변경이 없다.
- 남은 live QA: SQL 적용 후 실계정으로 월 매출 3,000만/6,000만/1억 이상 샘플 계산, 저장 후 새로고침 persistence, 저장안 불러오기, 부속 계산기 기준값 일치 여부를 확인한다.

## 2026-07-08 점주 포털 분리 로그인 MVP QA

- 범위: 점주 화면을 기존 본사 `/login`/`profiles` 권한 체계와 분리해 `/owner/login`, `/owner/dashboard`로 추가했다. 점주 API는 `requesterId`를 받지 않고 `fc_owner_session` HttpOnly 쿠키로만 인증한다.
- 본사 연동: `가맹 운영 > 점주 소통`에서 운영점별 점주 계정 생성, 임시 비밀번호 재발급, 활성/중지, 공지 발행, 제출 처리/보관을 제공한다. 가맹점 목록 행에는 `점주 계정 설정` 진입 버튼을 추가했다.
- 점주 기능: 내 매장 기본 정보 제출, 공지 읽음 처리, 오픈 체크리스트 완료 요청, 시설/고장 문의, 최근 제출 이력을 제공한다. 체크리스트 완료 요청은 본사 승인 전에는 오픈 준비 프로젝트 task를 완료로 바꾸지 않는다.
- 신규 SQL: `supabase_franchise_owner_portal_migration.sql`을 추가했다. 점주 계정, 점주 세션, 공지/읽음, 제출 이력, 업로드 파일 메타 테이블과 RLS 정책을 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 검증: `npx tsx --test src/lib/franchise-owner-auth.test.mts src/lib/franchise-owner-portal.test.mts` 7건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Production build를 `next start -p 3142`로 띄워 `/owner/login`, `/owner/dashboard`가 200으로 렌더링되는 것을 확인했다.
- 남은 live QA: SQL 적용 후 `내일 / admin / 1234`로 본사 로그인, 가맹점 목록의 `점주 계정 설정` 또는 `점주 소통` 탭에서 계정 생성, `/owner/login/{companyId}` 점주 로그인, 공지 읽음, 매장 정보 제출, 체크리스트 완료 요청, 시설 문의 등록, 본사 제출 처리 persistence를 확인한다.

## 2026-07-08 점주 포털 회사별 로그인 및 운영 체크리스트 리뷰 QA

- 범위: 전체 코드리뷰 후 점주 포털 로그인과 본사 점주 소통 흐름을 보정했다. 점주 로그인은 `회사명 + 아이디 + 비밀번호`로 회사를 먼저 확정한 뒤 해당 회사의 점주 계정만 조회한다. 기존 전역 `login_id_normalized` unique 제약은 회사 범위 unique 제약으로 전환한다.
- 체크리스트: 점주용 체크리스트는 오픈 준비 프로젝트가 아니라 `franchise_locations.data.ownerPortalChecklist`에 저장하는 운영 체크리스트로 분리했다. 본사 `점주 소통`에는 공지/공문, 체크리스트, 제출 처리, 점주 계정 설정을 분리해 노출하고, 점주 화면에서는 이미 완료 요청한 체크리스트 항목을 다시 요청하지 못하게 막는다.
- 구비서류 회귀: 계약 완료 구비서류 목록과 상세 저장/조회 호출에 세션 인증 헤더를 붙여 `requesterId is required` 오류가 재발하지 않게 했다.
- 신규 SQL: 기존 점주 포털 SQL 적용 DB에는 `supabase_franchise_owner_company_login_scope.sql`을 추가 적용해야 한다. 이 SQL은 기존 전역 점주 로그인 ID unique 제약을 제거하고 회사별 unique 제약을 추가한다. **SQL 등록 필요**.
- 검증: `npx tsx --test src/lib/franchise-owner-auth.test.mts src/lib/franchise-owner-portal.test.mts src/lib/franchise-lead-contract-checklist.test.mts` 20건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. Playwright로 `http://localhost:3137/owner/login` 모바일 390px에서 회사명/아이디/비밀번호 입력 구조와 console error 0건을 확인했고, `내일 / admin` 본사 세션으로 `/dashboard/franchise-operations/owner-portal`에서 `공지/공문`, `체크리스트`, `제출 처리`, `점주 계정 설정` 탭 노출을 확인했다.
- 남은 live QA: 운영 SQL 적용 후 서로 다른 회사에서 같은 점주 아이디를 발급할 수 있는지, `/owner/login`에서 회사명을 잘못 입력하면 다른 회사 점주 계정으로 로그인되지 않는지, 운영 체크리스트 저장/완료 요청/보관 처리가 새로고침 후 유지되는지 확인한다.

## 2026-07-09 점주 포털 단축 링크 및 체크리스트 배포 QA

- 범위: 점주 포털 회사별 로그인 링크를 `/owner/login/{companyId}` 단축 경로로 추가하고, 전용 링크로 접근한 점주 로그인 화면에서는 회사명 입력 필드를 숨겼다. 기존 `/owner/login?companyId=...` 쿼리 링크는 호환용으로 유지한다.
- 본사 연동: `가맹 운영 > 점주 소통 > 점주 계정 설정`에서 회사별 점주 포털 링크를 복사할 수 있다. 운영 체크리스트는 전체 가맹점 또는 선택한 복수 운영점에 한 번에 저장할 수 있게 정리했다.
- 신규 SQL: 없음. 기존 점주 포털 SQL과 회사별 로그인 ID scope SQL을 사용한다.
- 검증: 기능 브랜치와 release worktree에서 `git diff --check`, `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build` 통과. 운영 배포 후 `npx vercel inspect https://www.fcerp.co.kr --scope team_NcWNRifDHvr7GdFW0rcpR3ym`에서 `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. `curl -I -L https://www.fcerp.co.kr/owner/login/92924bd6-b2a1-49bb-844b-05eabcc51bbf`와 `curl -I -L https://www.fcerp.co.kr/login`는 200 응답이었다.
- 남은 live QA: 운영 실계정으로 `점주 계정 설정` 링크 복사, 전용 링크 로그인, 운영 체크리스트 전체/복수 운영점 저장과 점주 화면 완료 요청까지 확인한다.

## 2026-07-09 점주 포털 운영 체크리스트 발송형 전환 QA

- 범위: 본사 `가맹 운영 > 점주 소통 > 체크리스트`를 운영점별 기존 세팅 수정 목록이 아니라 공지/공문처럼 발송하는 흐름으로 전환했다.
- 본사 연동: `체크리스트 발송`에서 전체 가맹점 또는 선택 운영점에 항목을 발행하고, `발송 현황`에서 발송 건별 완료/미완료 운영점과 항목 상세를 확인한다. 점주의 체크리스트 완료 요청은 일반 `제출 처리` 승인/반려 대상에서 제외하고 체크리스트 발송 현황에 집계한다.
- 신규 SQL: 없음. 기존 `franchise_locations.data.ownerPortalChecklist`와 점주 제출 이력을 사용한다.
- 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 기존 dev 서버 `127.0.0.1:3000`에서 `내일 / admin / 1234`로 로그인해 `/dashboard/franchise-operations/owner-portal`의 `체크리스트` 탭을 확인했다. `체크리스트 발송`, 전체/개별 가맹점 선택, `발송 현황`, 완료/미완료 표시가 노출되고 console error 0건이었다.
- 남은 live QA: 운영 실계정으로 체크리스트 전체/개별 발송, 점주 포털 완료 요청, 본사 발송 현황의 완료/미완료 운영점 집계 persistence를 확인한다.

## 2026-07-09 점주 체크리스트 목록화 및 상태 배지 QA

- 범위: 점주 포털 `운영 체크리스트` 항목을 카드 그리드에서 공지처럼 세로 목록형 행으로 정리했다. 본사 `체크리스트 발송` 탭의 `6개 항목` 노출과 요약 카드의 `발송 항목` 카운트를 제거했다.
- 본사 현황: `발송 현황`은 발송 건을 목록처럼 보여주고, 상세의 가맹점별 완료 요청 상태는 `auto-fit` 그리드로 한 줄에 여러 가맹점이 표시되게 보정했다. `완료`, `미완료`, `진행 중` 상태 배지는 `.locationItem` 공용 텍스트 규칙에 덮이지 않도록 중앙 정렬을 고정했다.
- 신규 SQL: 없음.
- 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. `next start -p 3155` production build에서 Playwright mock 세션으로 `/owner/opening-tasks` 1280px/390px, `/dashboard/franchise-operations/owner-portal` 1440px/768px/390px를 확인했다. 본사 현황 상세는 데스크톱에서 가맹점 카드 9개가 5열 그리드로 표시되고, `체크리스트 발송 6개 항목`/`발송 항목 6개` 문구는 미노출이며, 상태 배지 계산 스타일은 `display:flex`, `centerOffset:0`, console error 0건이었다. QA 증거: `/tmp/fcerp-owner-checklist-qa-20260709-pass/result.json`.

## 2026-07-09 점주 체크리스트 공지형 발송 목록 재보정 QA

- 범위: 점주 포털 `운영 체크리스트` 기본 화면을 공지/공문처럼 `운영 체크리스트` 발송 1건 목록 카드와 `총 1건` 하단 바 형태로 재구성했다. 6개 세부 항목은 기본 화면에 바로 나열하지 않고 `항목별 완료 요청 보기`를 펼쳤을 때만 완료 요청 행으로 표시한다.
- 문구: 점주 완료 요청은 승인/반려 흐름이 아니므로 `본사 승인 요청` 표현을 `본사 진행 현황`으로 정리했다.
- 코드리뷰 보정: 점주 목록 카드 안 진행률 영역이 별도 중첩 카드처럼 보이지 않도록 진행률 박스의 테두리/배경을 제거하고, 발송 현황 상태 배지의 세로 정렬을 computed style 기준으로 재확인했다.
- 신규 SQL: 없음.
- 검증: `npx tsx --test src/lib/franchise-owner-portal.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build` 통과. `next start -p 3160` production build에서 Playwright mock 세션으로 `/owner/opening-tasks`와 `/dashboard/franchise-operations/owner-portal`을 확인했다. 접힌 기본 화면은 `총 1건`, `1 / 1`, `총 6개 항목 · 6/6 완료 요청`, `항목별 완료 요청 보기`를 표시하고 세부 항목은 숨김 상태였으며, 펼친 뒤에는 6개 완료 요청 행이 표시됐다. 본사 `발송 현황` 상세는 가맹점 카드 9개가 데스크톱 5열로 줄바꿈되고, 상태 배지는 `display:flex`, `align-items:center`, `height:30px`로 중앙 정렬되며, desktop horizontal overflow 0건과 console error 0건이었다. QA 증거: `/tmp/fcerp-owner-checklist-release-qa-20260709/result.json`.

## 2026-07-09 점주 포털 알림톡 3종 연동 QA

- 범위: 검수 통과된 점주 포털 알림톡 템플릿 3종을 실제 이벤트에 연결했다. 본사 공지/공문 발행 시 점주에게 `공지/공문 안내`, 점주가 시설/고장 문의를 등록하거나 반려 건을 재제출하면 본사 담당자에게 `시설/고장 문의 접수 안내`, 본사가 점주 계정을 신규 발급하면 점주에게 `점주 포털 계정 발급 안내`를 발송 후보로 기록한다.
- 보안/재시도: 점주 계정 발급 알림톡의 실제 발송 변수에는 임시 비밀번호가 포함되지만, `alimtalk_send_logs.variables`에는 임시 비밀번호를 `[마스킹]`으로 저장한다. 계정 발급 알림톡은 휴대폰 번호 수신자만 허용하고, 실패/차단 로그는 같은 이벤트 재시도를 막지 않도록 성공 또는 대체 SMS 로그만 중복 발송 방지 기준으로 사용한다. 같은 이벤트의 기존 성공 또는 대체 SMS 로그는 이후 차단/실패 재시도로 덮어쓰지 않는다.
- 신규 SQL: `supabase_franchise_owner_portal_alimtalk_templates_migration.sql`을 추가했다. 기존 `supabase_franchise_alimtalk_operations_migration.sql` 적용 후 실행하는 seed이며, 사용자 확인 기준 SQL 등록은 완료했다. `/admin/alimtalk`에서 승인된 SOLAPI template ID와 Kakao channel ID를 저장해야 실제 발송된다. **SQL 등록 완료 확인**.
- 검증: `npx tsx --test src/lib/alimtalk-send.test.mts src/lib/alimtalk-owner-portal-notifications.test.mts src/lib/alimtalk-send-support.test.mts src/lib/franchise-owner-portal.test.mts` 32건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. `next start -p 3158` production build에서 비로그인 POST 스모크로 `/api/franchise-owner-portal/notices`, `/api/franchise-owner-portal/accounts`, `/api/owner/requests`가 각각 401 인증 차단되는 것을 확인했다.
- 남은 live QA: `/admin/alimtalk` provider ID 저장 후 실계정으로 공지/공문 발행, 시설/고장 문의 등록/재제출, 점주 계정 신규 발급을 실행해 `alimtalk_send_logs`의 성공/차단/실패 상태, masked 임시 비밀번호 로그, 실제 카카오 메시지 변수 치환을 확인한다.

## 2026-07-09 공통 일정/결재 MVP 및 슈퍼바이징 파일럿 QA

- 후속 기준: 이 절의 SV-`schedules` 연결은 2026-07-09 당시 공통 일정 파일럿 기록이다. 현재 2단계 가맹운영 원천 일정은 `franchise_schedules`와 `/dashboard/franchise-operations/schedule`만 사용하며, 이 파일럿은 2단계 완료 구현으로 인정하지 않는다.
- 범위: 보고·결재 통합과 전사 일정/알림 PRD의 1차 기반을 구현했다. `schedules`는 source 기반 업무 허브로 확장하고, 신규 `approval_templates`, `approval_documents`, `approval_document_events`로 공통 결재 문서와 이벤트를 저장한다. `/api/schedules`는 기존 CRUD를 유지하면서 source 필터, source 기반 upsert, 완료 처리 액션을 지원한다.
- API: `/api/franchise-approvals/templates`, `/api/franchise-approvals/documents`, `/api/franchise-approvals/actions`를 추가했다. 결재 문서는 `임시저장`, `제출`, `승인`, `반려`, `완료처리` 상태 전이를 서버에서 검증하고, 반려 사유 누락을 차단한다. SQL 미적용 시 `supabase_franchise_approval_calendar_migration.sql` 적용 안내를 반환한다.
- 슈퍼바이징 파일럿: SV 방문 일정은 기존 `schedule_id`를 유지하면서 `source_type=supervision-visit`로 확장한다. SV 점검 보고서 제출은 `supervision-report` 결재 문서와 `approval-document` 승인 대기 일정에 연결하고, 관리자에게 인앱 알림을 만든다. 승인/반려 시 작성자 인앱 알림을 만들고 승인 대기 일정을 완료 처리한다. 기존 알림톡 훅은 유지한다.
- 화면: `/schedule`에 `점포개발 일정`과 `전사 업무·결재` 탭을 추가했다. 기존 월간 달력과 사이드 패널은 `점포개발 일정` 탭에 그대로 두고, 새 탭에 `오늘 처리`, `승인 대기`, `지연 업무`, `이번주 일정` KPI와 업무 큐를 표시한다. 일정 카드에는 source badge, 날짜, 완료 버튼을 표시한다.
- 코드리뷰 보정: 결재 알림 딥링크(`/schedule?approvalDocumentId=...`)는 전사 업무·결재 탭을 자동으로 열고 해당 결재 일정을 강조한다. 결재 문서 API는 수동 문서 source ID를 서버에서 생성하고, 원천 연결 문서는 내부 연동 전용으로 막았다. 결재자 지정과 승인/반려는 관리자/팀장 권한으로 제한하고, 작성자와 결재자를 분리했다. `approval-document` 일정은 `/api/schedules` 직접 수정/삭제/완료로 숨길 수 없고, source-linked 일정의 일반 편집은 관리자/팀장으로 제한했다. workflow source upsert는 client schedule ID를 신뢰하지 않고 company/source 범위 unique 충돌 시 기존 row update로 회복하며, 슈퍼바이징 저장 API는 공통 일정/결재 SQL 미적용 또는 workflow side-effect 실패가 있어도 기존 보고서/방문 저장 흐름을 실패시키지 않는다. 신규 결재 테이블의 document/event write RLS는 서버 API 경유만 허용하도록 닫았다.
- 신규 SQL: `supabase_franchise_approval_calendar_migration.sql`을 추가했다. 기존 `schedules` 확장, 결재 템플릿/문서/이벤트 테이블, source 중복 방지 인덱스, 회사 범위 RLS를 포함한다. 사용자 확인 기준 2026-07-10 운영 DB 적용을 완료했다. **SQL 등록 완료 확인**.
- 검증: `npx tsx --test src/lib/franchise-workflow.test.mts src/lib/franchise-supervision.test.mts` 19건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. `next start -p 3168` production build에서 Playwright로 `/schedule` 미로그인 진입이 console error 0으로 조용히 처리되고, `/login` 1440px/390px 렌더링과 page-level horizontal overflow 0을 확인했다. `/schedule` 탭 클릭 QA는 Supabase 세션이 필요한 화면이라 SQL 적용 후 실계정 live QA에서 확인한다.
- 남은 live QA: SQL 적용 후 실계정으로 `/schedule`의 기존 `점포개발 일정` 탭 보존, 새 `전사 업무·결재` 탭 KPI/업무 큐 표시, SV 방문 일정 source badge, SV 점검 보고서 제출 후 관리자 승인 대기 일정/인앱 알림 생성, 승인/반려 후 작성자 알림과 승인 대기 일정 완료 처리, source 기반 중복 방지를 확인한다.

## 2026-07-13 가맹운영 일정 공유/개인 구분 QA

- 범위: 가맹운영 일정관리의 수동 일정을 `공유 일정`과 `개인 일정`으로 구분했다. 자동 생성 일정은 공유로 고정하고, 개인 일정은 생성자 본인에게만 반환되며 관리자도 다른 사용자의 개인 일정을 조회·수정·삭제할 수 없다.
- 화면: 수동 일정 등록/수정 모달에 일정 구분 선택을 추가했다. 개인 일정은 로그인한 본인을 담당자로 고정하며, 일정 목록과 필터에서 공유/개인 여부를 확인할 수 있다.
- 신규 SQL: `supabase_franchise_schedule_visibility_migration.sql`은 기존 데이터를 공유로 보존하고 `visibility` 제약, 조회 인덱스, 개인 일정 RLS를 추가한다. 전자결재 보안 리뷰 후 비활성 프로필의 직접 접근 차단 조건을 추가했으므로 최신 파일을 다시 적용해야 한다. **SQL 재등록 필요**.
- 로컬 QA: `/dashboard/franchise-operations/schedule`에서 SQL 안내가 사라진 것을 확인했다. 개인 일정 등록 시 로그인 사용자로 담당자가 고정되고, `개인` 배지와 개인 일정 필터에 노출되는 것을 확인한 뒤 QA 일정을 삭제했다. 브라우저 console error는 0건이었다.

## 2026-07-13 전사 전자결재·보고 v2 개발 QA

- 데이터: 조직, 소속, 결재 역할, 위임, template/document version·step·reader·attachment 테이블과 회사 범위 RLS를 추가했다. `perform_approval_document_action` RPC가 제출, 승인, 합의, 반려, 회수, 수신 확인, 완료 처리와 감사 이벤트를 한 트랜잭션에서 처리한다.
- API: `/api/approvals/templates`, `/documents`, `/inbox`, `/organization`, `/delegations`를 추가했다. 문서 상세는 현재 단계와 위임 스냅샷을 기준으로 가능한 액션을 계산하고 회사 구성원·소속·양식명을 표시한다.
- UI: `/approvals` 전용 shell과 역할별 문서함, 공통 작성/검토 renderer, 기본 접힘 처리 이력, 조직·결재 설정, 구조화 양식 빌더, A4 미리보기, 결재선 편집을 추가했다. UUID 직접 입력 대신 활성 회사 구성원 선택 목록을 사용한다.
- 파일/PDF: 최대 5개, 파일당 10MB의 이미지·PDF·업무 문서를 전용 비공개 `approval-documents` Storage에 업로드한다. 접근 권한과 보존 기한을 재검증한 뒤 signed URL로 다운로드하며 pdfme와 Noto Sans KR OFL 글꼴로 PDF 내려받기를 제공한다.
- 일정/알림: 현재 결재 단계 대상자에게 중복 방지 인앱 알림과 결재 일정을 upsert하고 최종 승인·반려·회수·완료 시 일정을 완료한다. 병렬 단계 일정은 특정 1명에게 잘못 귀속하지 않고 대상자 목록을 metadata에 보관하며, 단계 이동 시 이전 단계 알림을 닫는다. 참조자와 수신 부서에도 문서 알림을 생성한다.
- 코드리뷰 보정: 필드 타입·배치·편집 권한 metadata 보존, 필수값 API/RPC 이중 검증, 반려/비합의 사유 RPC 강제, 자기결재·비활성·파트너 대상 차단, `parallel_any` 부정 응답 즉시 종료, 기존 단일 결재 문서의 v2 version/step 변환, workflow 알림 자동정리 제외를 반영했다. 후속 보안 검토로 기존 결재 액션과 슈퍼바이징 보고서도 동일 RPC를 사용하게 통합하고, 보고서 직접 쓰기 RLS를 닫았다. 보고서 조회 RLS는 작성자·담당 SV·같은 회사 관리자만 허용하며 이벤트도 조회 가능한 보고서에 종속시켰다. 사진은 작성자가 임시저장/반려 상태에서만 전용 비공개 `franchise-supervision-private` 버킷에 올릴 수 있고 회사·보고서 경로 검증 후 서버가 signed URL을 발급한다. 레거시 공용 버킷 첨부 메타데이터는 응답에서 제거하고 기존 객체는 비공개 대체본 확인 후 별도 삭제 대상으로 기록했다. 재상신은 현재 version 단계만 표시하고, 병렬 처리 완료자의 원결재자·대결자 알림을 함께 닫는다. 공개 문서 수정 API에서는 원천 식별자 변경을 차단하고, version이 없는 초안은 단계 조회 없이 상세를 반환한다. PDF는 제출 version 값과 pdfme의 다중 A4 base PDF를 사용한다. 추가 비밀정보 점검에서 추적 파일의 Supabase service-role 및 UCanSign 토큰을 제거했고, 데이터 이전 스크립트는 환경변수 키와 사용자별 무작위 임시 비밀번호만 사용하도록 변경했다. 과거 Git 이력에 남은 키는 별도 폐기·재발급과 이력 정리가 필요하다.
- 검증: 결재 도메인/API 테스트 29건, 실제 3개 본문 청크 PDF 생성 결과 3페이지 확인, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 최신 프로덕션 빌드에서 `/approvals` 7개 화면을 1440px/390px로 확인했고 페이지 가로 넘침과 최신 탭 console error는 0건이었다. SQL 미적용 상태에서는 중앙 알림과 화면 내 안내로 적용 파일명을 명확히 표시한다.
- 신규 SQL: `supabase_company_approvals_v2_migration.sql`. 리뷰 보정에서 감독 보고서 저장과 결재 전이를 원자화하고 결재 문서/RLS의 역할·활성 상태 검증, 보고서 쓰기 차단, 전용 비공개 사진 버킷을 추가했다. **SQL 등록 필요**.

## 2026-07-14 플랫폼 통합 코드리뷰 보정 QA

- 전자결재: 문서·PDF·첨부 다운로드 권한을 같은 정책으로 통일하고, 제출 버전 고정 조회, 필수 첨부의 실제 업로드 검증, 첨부 삭제·재시도, 조직 설정 권한, 소속 유효기간 판정을 보강했다. 결재 액션은 요청 중복과 오래된 문서 버전·단계를 차단하며 다중 순차 결재자를 각각의 단계로 분리한다.
- API 보안: 고객·물건 일괄 처리와 동기화 API의 회사 범위를 서버 세션으로 고정했다. UCanSign OAuth는 서명된 state와 회사·사용자 일치를 검증하고 callback 응답에서 토큰을 노출하지 않는다.
- 가맹 운영: 수동 일정의 잘못된 공개 범위 입력을 차단하고 12월 조회 기간 계산을 보정했다. 업무 접수 수정은 실제 입력값과 필수값을 검증하며 첨부 업로드 실패를 사용자에게 명확히 알린다.
- UI 안정성: 결재 확인창과 결재선 선택창에 포커스 트랩을 적용하고, A4 미리보기의 페이지 분할과 반쪽 너비 필드 정렬을 보정했다.
- 신규 SQL: 기존 전자결재 SQL 적용 후 `supabase_company_approvals_security_review_migration.sql`을 마지막에 적용한다. **SQL 등록 필요**.
- 검증: 관련 자동 테스트 96건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. Next.js는 16.2.10, jsPDF는 4.2.1로 갱신했다.
- 모바일 보정: `/dashboard/franchise-leads/work-intake`의 데스크톱 표를 모바일에서 카드형 행으로 표시해 제목, 등록자, 상태, 날짜와 `확인/수정`, `삭제` 액션을 한 화면에서 사용할 수 있게 했다. 헤더 설명과 카드 텍스트의 한글 단어 중간 줄바꿈을 방지했다.
- 브라우저 QA: production build에서 `/approvals`, `/approvals/write`, `/approvals/templates`, `/approvals/settings`, `/dashboard/franchise-operations/schedule`, `/dashboard/franchise-leads/work-intake`를 1440x900과 390x844로 확인했다. page-level horizontal overflow 0건, console error 0건이었고 모바일 업무 접수 카드는 모든 관리 버튼이 화면 안에 표시됐다. 최종 독립 시각 QA 결과는 PASS다.
- 릴리스 검증: PR #4, #6, #7, #8의 Vercel 체크 통과 후 `dev -> main` PR #5를 병합했다. main `7306723`을 `naeilsajang` production deployment `dpl_45fnu8CDmTTJpFhi6Jk2uVnX84sL`로 배포했고 `READY`, 운영 도메인 2개 alias, `/login`, `/approvals`, `/dashboard/franchise-operations/schedule` 200 응답을 확인했다.
- SQL 순서: `supabase_company_approvals_v2_migration.sql`, `supabase_company_approvals_organization_delete_safety_migration.sql`, `supabase_company_approvals_document_line_override_migration.sql`, `supabase_company_approvals_security_review_migration.sql` 순으로 적용한다. `supabase_franchise_schedule_visibility_migration.sql`은 최신 파일 재적용이 필요하다. **SQL 등록 필요**.
- 사이드바 최상위 `전자결재` 메뉴에 18px Lucide `FileCheck2` 아이콘을 추가했다. 루트 `대시보드`는 정확히 `/dashboard`에서만 활성화되도록 경로 판정을 분리해 프랜차이즈 하위 메뉴와 동시에 선택되지 않게 했다.
- 모객 DB 후보지 연결 대상 조회 cleanup의 AbortError는 일반 오류로 기록하지 않는다. dev의 기존 명시적 abort reason과 allSettled 취소 분기를 유지하고 회귀 테스트를 추가했다.
- 추가 검증: `npx tsx --test src/components/franchise/leads/useLeadLocationLinks.test.mts src/components/layout/sidebarPathState.test.mts src/components/approvals/approvalsNavigation.test.mts`, TypeScript, lint, production build, `git diff --check`를 통과했다. 신규 SQL은 없다.

## 2026-07-14 전자결재 문서함 전체 검색·필터 QA

- 범위: `/approvals/pending`, `/approvals/mine`, `/approvals/department` 문서함에 전체 문서 기준 검색, 상태 필터, 제출·수정 기간 필터, 조건 초기화를 추가했다.
- 검색 정확도: API가 접근 가능한 문서를 권한 기준으로 확정한 뒤 제목, 기안자, 소속 부서, 양식명, 문서번호를 검색하고 그 결과를 페이지네이션한다. 기존처럼 현재 페이지의 20건만 검색하지 않는다.
- 날짜 기준: 제출 문서는 제출일, 임시저장 문서는 최종 수정일을 사용하며 날짜 경계는 KST로 판정한다.
- 요청 안정성: 검색어 입력은 300ms 후 적용하고 필터 변경 시 1페이지로 이동한다. 이전 요청이 늦게 완료돼도 최신 요청 결과만 화면에 반영한다.
- 신규 SQL: 없음.
- 검증: 전체 `npx tsx --test` 699건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build는 기존 workspace root, Browserslist 경고만 출력했다.
- 남은 live QA: 로그인된 실계정으로 1440px와 390px에서 검색·상태·기간 조합, 결과 0건, 검색 초기화, 2페이지 이상 이동을 확인한다. 로컬 자동 브라우저는 인증 세션이 없어 로그인 화면까지만 확인했다.

## 2026-07-14 전자결재 알림·일정 수신자 보정 QA

- 원인: 결재 일정 metadata가 현재 단계의 전체 원 결재자 ID를 계속 보관해 병렬 결재 처리자에게 승인 대기 일정이 남았고, 알림 수신 대상에는 포함된 대결자는 일정 대상에서 빠졌다.
- 수정: workflow 동기화 함수가 미응답 원 결재자와 각 대상의 대결자를 중복 없이 다시 계산해 알림과 일정에 같은 대상 목록을 사용한다. 대상이 1명일 때만 일정 담당자를 단일 지정하고, 여러 명이면 `metadata.targetProfileIds`로 접근을 제한한다.
- 대결 권한: 대결 등록 API와 DB trigger가 같은 회사의 활성 임직원인지 확인하고, 제출 시 결재선 스냅샷과 일정 동기화에서도 비활성 계정·협력업체 계정을 제외한다. 원 결재자나 대결자의 역할이 나중에 협력업체로 변경돼도 일정·결재 알림 API와 RLS에서 기존 대상을 차단한다.
- 화면: 공용 일정의 결재 이벤트 클릭은 편집 모달 대신 결재 문서 상세로 이동한다. 가맹운영 일정은 별도 사용자·저장소 요구에 따라 전사 결재 일정과 연결하지 않는다.
- 자동 검증: 일정 딥링크, 대결자 적격성, 병렬 처리자 제외, 역할 변경 후 stale 접근 차단, 가맹운영 일정 방어 필터를 포함한 관련 테스트 26건과 표준 자동 탐색 명령 `npx tsx --test` 전체 716건이 통과했다. TypeScript, lint, production build, `git diff --check`도 통과했고 기본 설치 SQL과 후속 migration의 workflow·대결 적격성 함수 본문이 동일한지 비교했다.
- 브라우저 QA: mock-session production 서버에서 공용 일정을 1440px/390px로 열어 결재 문서 상세 이동과 `7월 지출 품의` 렌더링을 확인했다. 390px에서 `scrollWidth=innerWidth=390`이었고 최신 화면 console error는 0건이었다.
- 보안 리뷰: 가맹운영 일정은 별도 저장소이므로 결재 일정 연동 주장을 제거했다. 다만 외부 연동 등으로 `approval-document` 행이 들어온 경우를 방어하기 위해 API와 최신 visibility RLS에서 현재 대상자와 관리자만 읽도록 제한했고 최신 SQL 적용을 완료했다. **SQL 등록 완료 확인**.
- SQL 적용 확인: 사용자 재적용 후 `perform_approval_document_action_idempotent` RPC를 직접 호출해 제출 상태와 첫 결재 단계 생성까지 확인했다. `approval_delegations`, `approval_document_steps`, `schedules`, `franchise_notifications`, `franchise_schedules`도 읽기 가능 상태다. **SQL 등록 완료 확인**.
- 실계정 브라우저 QA: QA 회사와 기안자, 1·2차 결재자, 합의자 2명, 대결자 계정을 별도로 생성했다. 2명 순차 결재는 1차 처리 후 일정 담당자와 알림이 2차 결재자로 교체되고 최종 승인 후 일정이 완료됐다. 병렬 전원 합의는 첫 응답 후 진행 상태를 유지하고 두 번째 응답에서 승인됐으며, 병렬 1인 합의는 첫 응답 즉시 승인되고 다른 합의자의 stale 알림이 종료됐다. 대결자는 결재 대기 문서를 조회·승인했고 이벤트에는 실제 처리자와 원 결재자가 각각 기록됐다. 기안자 완료 처리까지 정상 동작했다.
- 운영 데이터 검증: 결재 일정 4건은 모두 완료됐고 단계 알림은 모두 `dismissed_at`이 기록됐다. 기안자 결과 알림만 활성 상태로 남았으며 일정 ID와 `수신자 + source_id` 기준 중복은 각각 0건이었다. 병렬 결재선 상세가 첫 대상자만 표시하던 UI를 전체 대상자 이름 표시로 수정하고 390px에서 `scrollWidth=innerWidth=390`, console error 0건을 확인했다.
- 추가 자동 검증: 결재 문서 adapter 회귀 테스트를 추가했고 결재 관련 자동 테스트 65건, TypeScript, lint, production build가 통과했다. 신규 SQL은 없다.
- QA 데이터 정리: 제출본 불변성 trigger가 제출된 문서 버전 삭제를 정상 차단해 감사 데이터를 강제 삭제하지 않았다. 대신 QA 회사와 프로필 6개를 비활성화하고 Auth 계정 로그인을 차단했으며, 일정 4건, 알림 13건, 위임·역할·조직 소속·조직 단위는 제거했다.

## 2026-07-14 전자결재 위임 권한 후속 보안 QA

- 보안 리뷰에서 idempotent 결재 RPC가 동일 요청의 캐시를 반환할 때 실제 로그인 사용자와 `p_actor_profile_id` 일치를 먼저 확인하지 않는 문제를 발견했다. 최신 migration은 캐시 조회 전에 인증 사용자와 활성 회사 임직원 여부를 확인한다.
- 제출 시 저장된 `delegate_profile_ids`는 감사 스냅샷으로만 사용한다. 결재 대기, 상세 액션, 문서/PDF/첨부 열람, 전사·가맹운영 일정은 현재 활성 기간과 action scope가 일치하는 위임을 추가 확인하며, 만료·해제된 대결자의 단계 알림은 헤더 조회 시 종료한다.
- RLS도 동일 기준으로 `can_access_approval_document`, `can_act_on_approval_document`, 결재 일정과 단계 알림 조회를 제한한다. `can_act_on_approval_document`를 인증 사용자가 직접 호출해도 본인 ID만 확인할 수 있고, 서비스 역할 외 호출자가 다른 사용자의 결재 대상 여부를 추측할 수 없게 했다. 가맹운영 일정 visibility RLS는 저장 metadata 대신 현재 결재 가능 여부를 사용한다.
- 실패 테스트에서 캐시 선반환, 현재 위임 없는 대결자 접근, stale 일정·알림 노출을 재현한 뒤 보정했다. 보안 집중 테스트 35건과 표준 자동 탐색 명령 `npx tsx --test` 전체 716건, TypeScript, lint, production build, `git diff --check`가 통과했다.
- 적용 순서: 최신 `supabase_company_approvals_security_review_migration.sql`을 다시 실행한 뒤 최신 `supabase_franchise_schedule_visibility_migration.sql`을 실행한다. 이후 다른 로그인 사용자의 캐시 재호출 거절과 위임 해제 직후 결재함·일정·알림 미노출을 실호출로 확인한다. **SQL 재등록 필요**.

## 2026-07-14 대시보드 일정·전자결재 알림 분리 QA

- 분류 기준: 전자결재 요청은 날짜가 있더라도 업무 알림과 결재 대기 대상이며, 루트 대시보드 `예정된 일정`과 D+2 일정 건수에는 포함하지 않는다. 결재 알림과 `/approvals/pending` 목록은 유지한다.
- 구현: 대시보드 일정 응답에서 `source_type=approval-document`만 제외하는 순수 selector를 추가했다. 공유 일정, 로그인 사용자의 개인 일정, 회의·방문·마감 등 일반 일정의 기존 노출 규칙은 유지한다.
- 보안 보정: 알림 PATCH도 조회와 동일하게 현재 결재 가능 대상을 재확인하고, 만료·해제된 대결자의 단계 알림을 먼저 종료한 뒤 활성 알림만 읽음 처리한다.
- SQL 순서: `supabase_franchise_schedule_visibility_migration.sql`의 정책이 보안 migration의 `can_act_on_approval_document`를 사용하므로 최신 `supabase_company_approvals_security_review_migration.sql`과 workflow 일정 보정 SQL 뒤에 적용하도록 README 순서를 수정했다. **SQL 재등록 필요**.
- 검증: 대시보드 분류와 위임 알림 집중 테스트 9건, 전체 `npx tsx --test` 720건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`를 통과했다. 화면 구조와 스타일은 변경하지 않았다.
- 로그인 QA: 결재 일정 25건과 일반 일정 1건을 함께 등록한 상태에서 루트 대시보드 `예정된 일정`에는 일반 일정만 표시되고 헤더 알림에는 결재 결과 알림이 유지되는 것을 확인했다. `모두 읽음` 처리 시 유효한 결과 알림은 읽음으로 바뀌고 만료된 단계 알림은 읽음 처리 전에 종료됐다. 브라우저 console error는 0건이었다.
- 회귀 가설 검증: 결재 일정이 일반 일정을 밀어내는 문제는 DB 조회의 20건 제한 전에 `approval-document`를 제외해 방지했다. 이전 DB 스키마의 `source_type` 누락은 기존 조회로 안전하게 폴백한다. 결재 알림 접근은 문서 ID뿐 아니라 현재 단계 번호와 활성 위임을 함께 확인해 이전 단계 알림의 재노출을 차단한다.

## 2026-07-14 전자결재 PDF 저장 복구 QA

- 재현: 로그인된 문서 작성자가 `/approvals/documents/[id]`에서 `PDF 내려받기`를 실행하면 로컬 응답은 200이지만 생성 파일이 약 5.4MB였고, 같은 응답은 Vercel Function의 4.5MB buffered request/response 제한을 넘는다. 기존 WOFF2 파일로 만든 PDF는 텍스트 추출은 가능하지만 Poppler 렌더 결과가 빈 페이지였다.
- 보정: PDF 응답을 64KB 단위 `ReadableStream`으로 전환해 `Content-Length` 없이 전달한다. PDF 글꼴은 공식 Google Fonts Noto Sans KR TrueType 파일로 교체하고, 기존 PDF 비호환 WOFF2 파일은 제거했다.
- 자동 검증: PDF 전용 테스트 7건에서 5,000,000바이트 응답의 스트리밍, Content-Length 미설정, PDF 시그니처 보존, 번들 폰트의 TrueType 시그니처, 특수문자 포함 파일명의 RFC 8187 인코딩을 확인했다. 전체 `npx tsx --test` 725건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다.
- 브라우저·파일 QA: 로컬 실계정 임시저장 문서에서 `PDF 내려받기`를 실행해 다운로드 이벤트와 파일명 `전자결재 PDF 저장 QA.pdf`를 확인했다. 내려받은 파일은 A4 1페이지, 약 7.6KB이며 한글 제목·본문·푸터가 표시되고 비백색 픽셀이 존재해 빈 페이지가 아님을 확인했다. 브라우저 console error는 0건이었다.
- SQL 상태: PDF 저장 보정 자체의 신규 SQL은 없다. 같은 릴리즈에서 문서·하위 테이블 RLS와 알림 조회·읽음 처리가 현재 유효한 위임 및 결재 단계만 허용하도록 보강됐으므로 최신 `supabase_company_approvals_security_review_migration.sql` -> `supabase_company_approvals_workflow_schedule_fix_migration.sql` -> `supabase_franchise_schedule_visibility_migration.sql` 순서로 다시 적용해야 한다. **SQL 재등록 필요**.

## 2026-07-15 2단계 알림·일정 분리 및 커스텀 알럿 1차 QA

- 알림 분류: 헤더 알림 응답의 `sourceType`을 보존하고 `workflow-approval`은 `전자결재`, 가맹운영 원천은 `가맹운영`, 알 수 없는 원천은 `시스템`으로 표시한다. 알림 패널에 `전체/전자결재/가맹운영` 필터를 추가했으며 선택한 구분을 서버에서 다시 조회해 다른 구분의 상위 8건에 밀리지 않게 했다. 알림 상세 이동은 앱 내부 루트 경로만 허용하고 외부 URL, 프로토콜 상대 URL, `javascript:` 실행 스킴을 차단한다.
- 일정 분리: 가맹운영 일정관리의 목록, 달력, KPI, 선택 날짜 상세에서 `approval-document`를 제외했다. 기존 `승인 대기` KPI는 가맹운영 업무 기준의 `진행 중`으로 교체하고, 전자결재 요청은 헤더 알림과 `/approvals`에서 확인하도록 안내 문구를 정리했다. 기존 일정 URL의 `approvalDocumentId`는 결재 문서 상세로 바로 전환한다.
- 커스텀 알럿: 메인 대시보드와 가맹점 관리, 인력 세팅, 슈퍼바이징, 오픈 준비, 모객 업무 접수의 주요 저장·삭제·상태 변경 흐름을 공용 중앙 알럿/확인창으로 전환했다. 동시 요청은 FIFO 큐에서 순서대로 표시하며 확인 버튼의 이중 callback이 다음 요청을 취소하지 않도록 결과를 한 번만 소비한다. 상담 이력 삭제, Meta 연결 해제, 공시서류 삭제, 모객 DB 추출, 외부 상가 수집·ERP 등록, 출점 후보지·경쟁스캔·메시지·분석표 프리셋, 보고서/표 인쇄 팝업 차단 안내에 남은 브라우저 기본 팝업은 별도 UI 운영 고도화로 추적한다. 다운로드·인쇄 목적의 새 창 자체는 유지한다.
- 자동 검증: 다이얼로그 큐, 내부 링크 검증, 알림 분류와 일정 방어 필터 집중 테스트 30건과 전체 `npx tsx --test` 731건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. build는 기존 workspace root와 Browserslist 데이터 경고만 출력했다.
- 브라우저 QA: mock-session 개발 서버에서 1200px와 390px로 가맹운영 일정 및 헤더 알림을 확인했다. 전자결재 일정은 가맹운영 달력과 KPI에서 숨겨지고, 알림의 `전자결재/가맹운영` 필터는 각각 `결재 요청`과 `업체 계약 D-7`만 표시했다. 모바일 필터 높이 44px, horizontal overflow 0, 일정 화면 console error 0건을 확인했다. 메인 대시보드의 빈 공지 등록은 브라우저 기본 팝업 대신 중앙 `오류` 커스텀 알럿으로 표시됐다. 화면 증적은 `/tmp/fcerp-phase2-notification-alert-qa-20260715/notification-mobile-final.png`, `/tmp/fcerp-phase2-notification-alert-qa-20260715/custom-alert-desktop-final.png`에 저장했다.
- 런타임 가설 점검: (1) 구분별 요청이 상위 8건 제한 때문에 비어 보일 가능성은 서버 category 조회와 모바일에서 각 구분 제목 1건을 확인해 기각했다. (2) 외부 연동의 `approval-document`가 가맹운영 일정에 다시 노출될 가능성은 같은 날짜 fixture를 주입하고 일정 root에서 결재 제목이 0건, console error가 0건인 것으로 기각했다. (3) 공용 Provider에서 확인 callback이 다음 대기창까지 닫을 가능성은 두 요청을 연속 enqueue한 회귀 테스트에서 첫 요청 승인 후 두 번째 요청이 active로 유지되고 각 resolver가 한 번씩 실행되는 것으로 기각했다.
- SQL 상태: 기존 알림의 `source_type`을 재사용하므로 신규 SQL은 없다. 1단계 문서함 검색·필터 실계정 QA는 dev 또는 production 승격 전 필수 잔여 항목으로 유지한다.

## 2026-07-15 가맹 운영 원천 일정 1차 QA

- 저장소 분리: 업체 계약 갱신과 정보공개서 계약 가능일은 기존 `upsert_franchise_schedule_from_payload` RPC로 `franchise_schedules`에만 저장한다. 새 동기화 경로는 전사·점포개발 일정의 `schedules`, `/api/schedules`, `upsertWorkflowSchedule`을 참조하지 않는다.
- 일정 규칙: 업체 계약은 계약 ID를 원천 키로 사용하며 만료 전 `예정`, 만료 후 `지연`, 갱신 완료 `완료`, 종료·보관 `취소`로 동기화한다. 정보공개서는 후보자 ID를 원천 키로 사용해 계약 가능일 전 `예정`, 가능일 도래 `완료`로 동기화한다. 반복 조회와 저장에도 같은 원천 일정 한 건을 갱신한다.
- 화면: `/dashboard/franchise-operations/schedule`의 유형 필터와 선택 날짜 상세에 `업체 계약`, `정보공개서`를 별도 표시한다. 자동 생성 일정은 수동 일정의 수정·완료·삭제 액션을 노출하지 않는다.
- 실패 격리: 원천 일정 동기화 오류는 업체 계약 저장·알림 생성의 본 처리를 막지 않고 서버 경고로 남긴다. 일반 알림 조회는 일정을 쓰지 않으며, 다음 원천 변경 또는 스케줄 실행에서 같은 원천 키로 다시 동기화한다.
- 저장 보강: `upsert_franchise_schedule_from_payload`는 `supabase_franchise_source_schedule_upsert_migration.sql`에서 `service_role`만 실행할 수 있게 제한하고, 연결 프로필의 회사 일치 여부와 원천 키를 검증한다. 같은 원천을 다시 동기화해도 최초 `completed_at`을 유지한다. 회사가 선택되지 않은 플랫폼 관리자 알림 조회에서는 원천 일정 동기화를 실행하지 않는다.
- 자동 검증: 저장 RPC 호출·오류 전파·권한 SQL, 원천 ID, 계약·정보공개서 상태 규칙, 화면 파서·한글 유형명을 포함한 집중 테스트 22건과 전체 `npx tsx --test` 743건이 통과했다. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`도 통과했다.
- 브라우저 QA: 1440px와 390px 가맹 운영 일정 화면에 두 원천 일정과 유형 필터가 표시되고, 화면 root에는 `점포개발 업무` 문구가 없으며 두 viewport 모두 `scrollWidth=innerWidth`, console error 0건을 확인했다. 390px 상단 경로명은 한 줄로 유지하고 긴 계정명은 말줄임 처리했다.
- 런타임 가설 점검: (1) 전사 일정 저장소로 잘못 기록될 가능성은 새 동기화 경로의 `schedules`, `/api/schedules`, `upsertWorkflowSchedule` 참조 0건과 전용 RPC payload 테스트로 기각했다. (2) 새 원천 유형이 `수동 등록`으로 표시될 가능성은 파서 테스트와 브라우저의 `업체 계약`·`정보공개서` 배지/필터 확인으로 기각했다. (3) 일정 동기화 실패가 계약 저장이나 알림 조회를 막을 가능성은 선택 동기화 경계를 별도 함수의 예외 처리로 격리하고, 같은 원천 키의 재시도 payload가 결정적인 ID를 쓰는 것으로 확인했다.
- SQL 상태: `supabase_franchise_source_schedule_upsert_migration.sql`은 사용자 확인 기준 대상 DB 적용 완료다. 이 확인은 SQL 적용 상태만 뜻하며, 적용 후 실계정 업체 계약·정보공개서 원천 데이터 동기화 QA는 아직 수행하지 않았다. **SQL 등록 완료 확인**.

## 2026-07-15 가맹 운영 원천 일정 2차 QA 및 Phase 2 운영 마감 준비

- 단계 상태: 전자결재 1단계는 문서함 검색·상태·기간·페이지네이션 실계정 QA가 남은 `검증 중`이다. 가맹운영 2단계는 사용자 승인 예외로 원천 연결 기능, 상태·담당자 수명주기, 저장소 경계, 자동/mock-session QA와 코드 보안 보정을 완료했다. 신규 프로필 보안 SQL 적용 확인 전까지 `코드 완료·SQL 적용 대기`다.
- 연결 원천: 기존 업체 계약·정보공개서에 더해 SV 방문, 점검 보고서, 시정요청, 오픈 준비 프로젝트, 점주 시설 문의, 점주 체크리스트 완료 요청을 `franchise_schedules`에 연결했다. 원천별 결정적 `source_type + source_id`를 사용해 반복 저장 시 같은 일정 한 건을 갱신한다.
- 상태·담당자 수명주기: 방문·보고서·시정요청의 완료/취소, 오픈 예정일 제거, 체크리스트 반려, 보고서 반려 후 재작성, 담당자 재배정을 일정과 알림에 반영한다. 점주 원천은 운영점 `manager_id`를 우선 사용하고, 새로 지정하는 SV·오픈 준비 담당자는 같은 회사의 활성 프로필만 인정한다. 보고서 재상신은 기존 시정조치를 다시 생성하거나 완료 상태·기한을 덮어쓰지 않고 일정만 재동기화하며, 재배정된 이전 수신자의 알림은 종료 상태를 유지한다. 업체 계약 종료일 제거는 원래 날짜의 갱신 일정을 취소한다.
- 상세 이동·경계: SV 방문/보고서/시정요청은 레코드 ID를 포함한 슈퍼바이징 상세 URL, 오픈 준비는 가맹 희망자 상세의 오픈 준비 화면, 점주 시설 문의는 선택 제출 건이 펼쳐진 제출 처리 URL을 제공한다. 표시 URL은 정규화 후 `/dashboard/` 내부 경로만 허용한다. 정적 경계 테스트로 새 동기화 경로에 점포개발·전사 업무용 `schedules`, `/api/schedules`, `/schedule`, `upsertWorkflowSchedule` 참조가 없음을 확인했다. 실제 DB 저장 경계는 후속 프로필 보안 SQL 적용 뒤 실계정 통합 QA에서 최종 확인한다.
- 자동 검증: 원천 상태 빌더, 담당자 재배정, 비활성 담당자·협력업체 차단, 점주 담당자 우선순위, 오픈 예정일·계약 종료일 제거, 반려 보고서 재작성, 기존 시정조치 상태 보존, 알림 종료, URL traversal 차단, 레거시 전사 일정 격리, 알림 조회와 예약 실행 분리를 포함한 집중 테스트 66건을 통과했다. 전체 `npx tsx --test`는 774건을 통과했다. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`도 통과했다.
- 브라우저 QA: mock-session 개발 서버에서 1440px와 390px 가맹운영 일정 화면, 원천 유형/공개 범위 필터, 선택 날짜 목록, 점주 시설 문의 카드의 제출 처리 상세 이동·선택 제출 자동 펼침, 체크리스트 완료 기록의 `발송 현황` 탭 직접 이동, 완료된 시정조치의 슈퍼바이징 상세 이동·대상 행 강조, 수동 일정 등록과 중앙 `처리 완료` 알럿을 확인했다. 화면 증적은 `ERP/web/.omo/evidence/task-7-franchise-independent-schedule/desktop.png`, `mobile.png`에 저장했다. 두 화면에서 기능을 막는 겹침이나 가로 넘침은 없었다. mock auth fixture에서 Supabase 클라이언트 중복 생성 경고가 출력됐으나 이번 일정 동작 오류는 아니며 테스트 harness 정리 대상으로 분리한다.
- SQL 상태: 기존 `supabase_franchise_source_schedule_upsert_migration.sql`은 사용자 확인 기준 대상 DB 적용 완료다. 후속 `supabase_franchise_source_schedule_profile_security_migration.sql`은 전용 RPC에서 비활성 계정·협력업체 담당자와 일반 직원의 관리자 연결을 거부한다. **SQL 등록 필요**.
- 런타임 가설 점검: (1) 새 원천이 점포개발·전사 일정 경계로 새어 나갈 가능성은 정적 경계 테스트와 변경 경로 검색에서 금지 참조 0건으로 기각했다. (2) 담당자 재배정 시 이전 수신자 알림이 다시 활성화될 가능성은 이전 수신자 종료 상태 유지 테스트로 기각했다. (3) 모바일 QA가 API 응답 전 로딩 화면을 정상 화면으로 오인할 가능성은 실제 재현됐고, 원천 필터 option 렌더링을 기다리도록 QA 스크립트를 보정한 뒤 KPI `오늘 7건/진행 2건`이 표시된 390px 증적을 다시 생성해 해결했다.
- 최종 게이트 가설 점검: (1) 같은 회사의 비활성 프로필이 SV 방문 담당자로 지정될 수 있다는 가설은 `resolveProfileInCompany`의 활성 상태 검증과 활성/비활성 프로필 회귀 테스트로 차단했다. (2) 이미 생성된 시정조치를 재상신할 때 기존 일정의 기한·담당자가 남는다는 가설은 신규 행뿐 아니라 upsert된 전체 시정조치 행을 일정 동기화 대상으로 바꾸고 기존 행 RPC 호출 테스트로 기각했다. (3) 점주 제출 일정의 상세 링크가 제출 ID를 소비하지 못해 목록 첫 화면에만 머문다는 가설은 mock-session 브라우저에서 해당 시설 문의 링크를 열어 `submissionId`가 선택되고 상세가 자동으로 펼쳐지는 흐름으로 기각했다.
- 최종 게이트 추가 보정: 저장된 운영점/SV 담당자가 비활성화된 경우 공통 동기화 계층에서 일정·알림 수신자에서 제외하고, 점주 업무는 활성 회사 관리자로 대체한다. 체크리스트 완료 기록은 소비되지 않는 제출 ID 없이 체크리스트 현황으로 이동하고, 시정조치는 `actionId`로 완료 건까지 포함한 목록에서 해당 행을 강조한다. 과거 `schedules`에 남은 가맹운영 source 행은 점포개발·전사 일정 대시보드 집계에서 제외해 저장소 이관 전에도 두 일정 화면이 섞이지 않게 했다.
- 보안·수명주기 재검토: (1) 활성 협력업체가 서비스 역할 API를 통해 가맹운영 일정을 읽을 가능성은 모든 HTTP method 403 회귀 테스트와 RPC 역할 검증 SQL로 차단했다. (2) 일반 알림 조회가 이전 계약 상태로 일정을 되돌릴 가능성은 GET handler의 일정 쓰기 부재 경계 테스트와 계약 종료일 제거 시 기존 일정 취소 테스트로 기각했다. (3) 보고서 재상신이 완료 시정조치를 새 요청으로 되돌릴 가능성은 기존 행 upsert 0회, 완료 상태·원래 기한 payload 유지 테스트로 기각했다.
- 예약 실행 경계: 알림 목록 `GET /api/franchise-notifications`에서 Cron 분기를 제거했다. Vercel Cron은 `GET /api/franchise-notifications/cron` 전용 진입점이 인증 헤더를 보존해 `POST /api/franchise-notifications` 명령을 호출하며, 일정·알림 생성은 이 예약 명령에서만 실행한다. 로컬 production 서버에서 인증 없는 Cron 진입과 일반 목록 조회가 각각 401을 반환하고 DB 쓰기 전에 차단되는 것을 확인했다.
- 마감 판정: 대표 원천이 `franchise_schedules`에 결정적 원천 키로 중복 없이 연결되고, 완료·취소·반려·재배정 수명주기와 KST 지연 경계가 테스트되며, 가맹운영 일정 화면과 점포개발·전사 일정 저장소의 분리가 mock-session QA로 확인돼 Phase 2 코드 완료 기준을 충족한다. 운영 마감은 프로필 보안 SQL 적용 확인 후 확정한다.
- 후속 운영 고도화·검증: 과거 SV 파일럿 `schedules` 행의 이관·종료, 원천 저장 후 일정 동기화 실패를 영속 재처리할 outbox/reconciliation, 원천 변경 없이 KST 자정에 지연 상태를 재평가하는 실행기, 적용 DB 실계정 원천 회귀가 남아 있다. 잔여 기본 팝업 제거는 별도 UI 운영 고도화이고 1단계 문서함 실계정 QA는 dev/production 승격 전 별도 게이트다. 이 항목들은 Phase 2 코드 완료 판정을 되돌리지 않는다.

# 2026-07-20 가맹운영 일정 2단계 내구성 최종 리뷰

- 범위: 원천 저장 뒤 일정·알림 동기화를 최신 payload 우선 재처리 구조로 보강하고, 업체 계약 담당자 및 슈퍼바이징 원천의 회사 범위와 저장 응답 정합성을 재검토했다.
- 실패 가설과 재현: (1) 이전 worker가 늦게 끝나 최신 payload를 덮어쓸 수 있다는 가설은 큐보다 RPC가 먼저 실행되는 실패 테스트로 재현했다. (2) 재시도 대기 중 수신자가 비활성화돼도 과거 수신자가 유지된다는 가설은 reconciliation 테스트로 재현했다. (3) 다른 회사 업체 계약 담당자와 SV 방문 원천에 대한 범위 검사가 부족하다는 가설은 helper 및 route 경계 테스트로 재현했다.
- 수정: 모든 동기화는 최신 payload를 큐에 먼저 upsert하고 UUID lease와 갱신 시각을 RPC에 전달한다. SQL RPC는 advisory lock 안에서 현재 lease를 다시 확인해 오래된 worker를 no-op 처리하고, 성공한 동일 lease 작업만 트랜잭션에서 삭제한다. 재시도 직전 프로필 회사·활성 상태·역할을 다시 확인하며, 업체 계약 담당자와 SV 방문 삭제에도 회사 범위 검사를 적용했다.
- 응답 정합성: 업체 계약과 슈퍼바이징 보고서의 원본 저장이 완료된 뒤 일정 동기화가 지연되면 원본 저장 자체를 500으로 오인하지 않도록 `scheduleSync` 또는 `scheduleSyncRequired`를 응답한다. 큐 저장까지 실패한 경우에는 실패 상태를 명시해 운영에서 재처리 필요 여부를 확인할 수 있다.
- 자동 검증: 집중 테스트 56건, 전체 테스트 797건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 빌드에는 기존 workspace root와 오래된 Browserslist 데이터 경고만 남고 실패는 없다.
- SQL 상태: `supabase_franchise_schedule_durable_sync_migration.sql`은 사용자 확인 기준 적용 완료다. 기존 적용 환경에는 lease 컬럼·RPC·claim 함수·profile helper 권한을 최신 상태로 맞추는 `supabase_franchise_schedule_durable_sync_review_fix_migration.sql`을 추가 적용해야 한다. **SQL 등록 필요**.

# 2026-07-20 점주 포털 업무 자동화 3단계 1차 QA

- 범위: 점주 일반 문의·시설/고장 문의의 24시간 처리 SLA, 본사 처리 현황 4종, 접수 건별 마감/초과 배지, 가맹운영 전용 일정 `due_at`을 연결했다. 점주 체크리스트 완료 요청은 승인 대상이 아니므로 SLA 집계에서 제외했다.
- 회귀 보정: 재제출 건에 과거 `reviewed_at`이 남은 비정상 데이터가 있어도 `submitted`를 처리 완료 수·평균 처리시간에 포함하지 않도록 완료 상태를 명시적으로 판정한다.
- 게이트 보정: 반려 후 재제출 시 일정만 재제출 시각을 쓰고 포털 통계는 최초 생성 시각을 쓰던 불일치를 `submitted_at`으로 통일했다. 날짜 단위로 하루 한 번 실행하던 지연 승격은 Supabase Cron 전용 작업으로 매시간 실행하고, 정확히 24시간인 경계부터 초과로 판정한다. 운영 Vercel 프로젝트가 Hobby 플랜인 것을 읽기 전용 API로 확인해 시간당 Vercel Cron은 사용하지 않는다.
- 리뷰 보정: 일정 API의 정확한 `dueAt`을 화면 모델까지 유지해 날짜가 전날이어도 실제 24시간 마감 전에는 조기 지연으로 집계하지 않는다. migration은 기존 반려 후 재제출의 `submitted_at`을 `updated_at`으로 복원하고 일반·시설 문의 일정의 `due_at`을 일괄 보정한다. 이전 날짜 기준 판정으로 너무 일찍 지연된 일정은 정상 상태로 복구하고 이미 초과된 알림도 정확한 24시간 마감과 지연 표시로 갱신한다. 완료·취소된 일정에 남아 있던 지연 알림은 일반 제목으로 정리하고 닫는다. migration은 worker와 동일한 source advisory lock을 정렬 순서로 먼저 획득하고 제출 원본에서 일정·동기화 큐 상태와 마감을 계산한다. 일정이 아직 없는 큐를 누락하거나 lease 검증을 마친 worker가 보정값을 되돌리는 경쟁 조건도 함께 차단한다. 매시간 실행은 이미 확인한 알림을 반복해서 미확인으로 되돌리지 않도록 새로 지연된 일정 ID만 처리한다. 본사 활동 KPI는 전체 이력을 브라우저로 읽지 않고 회사별 DB 집계 함수로 계산하며, 목록은 `submitted_at DESC, id DESC`로 안정 정렬한다.
- 자동 검증: 점주 SLA·일정·migration 집중 테스트 31건과 `src/lib` 및 일정 화면 모델 전체 테스트 467건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 빌드의 기존 workspace root·Browserslist 경고만 남았다.
- 브라우저 QA: 1440px에서 가맹운영 일정의 점주 시설 문의 링크로 제출 처리 상세를 열고 24시간 초과 KPI·평균 처리시간·처리 기한 초과 배지를 확인했다. 390px에서는 KPI 2열 배치, 상태 탭·필터·선택 제출 상세와 가로 넘침 0을 확인했다. 증적은 `.omo/evidence/task-7-franchise-independent-schedule/`에 생성했다.
- 실행 가설: (1) 제출 시각으로부터 24시간이 지났지만 DB 일정이 다음 KST 날짜까지 `진행중`으로 남을 수 있는 가설은 기존 날짜 비교와 일 1회 실행으로 확인했고 `due_at <= now()` 비교와 Supabase 시간당 maintenance로 보정했다. (2) 재제출 건의 과거 `reviewed_at`과 최초 `created_at`이 완료 집계·새 SLA에 섞일 수 있는 가설은 회귀 테스트에서 재현한 뒤 상태 판정과 `submitted_at`으로 해소했다. (3) 모바일 KPI가 너무 길어 실제 접수 목록을 밀어낼 수 있는 가설은 390px 캡처에서 확인한 뒤 2열로 보정하고 재캡처해 해소했다.
- SQL 상태: `supabase_franchise_owner_submission_sla_migration.sql` 적용을 확인했다. **SQL 등록 완료 확인**.
- 단계 판정: 3단계 전체 완료가 아닌 1차 자동화 범위 검증 완료다. 교육자료·정산·증빙·리마인드·문서 수령 확인은 후속 범위다.

# 2026-07-21 입점 요청 사진 업로드 긴급 QA

- 운영 증거: Vercel runtime log에서 신고 시각과 일치하는 `/api/upload` 413 응답 2건을 확인했다. DB 등록 뒤 첨부 업로드를 실행하고 JSON이 아닌 413 본문을 `response.json()`으로 읽던 흐름이 사용자 오류 문구와 사진 URL 누락을 함께 만들었다.
- 수정: 파일 본문은 signed URL로 Supabase Storage에 직접 업로드하고, Next.js API에는 작은 JSON 메타데이터만 전달한다. 최종 확정 API는 Storage 객체를 다시 읽어 실제 파일 시그니처와 선언 크기를 검증하며 위조 파일은 즉시 제거한다.
- 용량 안내: 11MB JPG를 선택해 파일명·실제 용량·10MB 제한이 중앙 `첨부파일 확인` 알럿에 표시되는 것을 확인했다. 전체 선택 용량이 50MB를 넘는 경우에도 현재 총 용량과 허용 한도를 같은 방식으로 안내한다.
- 자동 검증: signed upload·파일 바이트 검증 집중 테스트 8건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 빌드는 기존 workspace root와 오래된 Browserslist 데이터 경고만 남았다.
- 실행 가설: (1) 허용 확장자 오류 가능성은 동일 JPG가 작은 파일에서는 성공해 기각했다. (2) 저장 URL 권한 문제 가능성은 413 시 최종 URL 생성 단계에 도달하지 않은 운영 로그로 기각했다. (3) Vercel 요청 본문 한도 가능성은 신고 시각의 413 응답과 6MB 파일이 Next API 본문을 우회하는 회귀 테스트로 확인하고 해소했다.
- 남은 live QA: 기존 실패 건은 Storage URL이 없으므로 배포 후 사진을 재첨부해야 한다. 신규 SQL은 없다.

# 2026-07-22 점주 포털 업무 자동화 3단계 1차 재검증

- 적용 DB QA: SLA 스키마 준비 상태와 회사별 활동 집계 RPC를 읽기 전용으로 확인했다. 일반·시설 문의 3건 표본에서 처리 필요 0건, 24시간 초과 0건, 최근 7일 처리 0건, 평균 처리시간 0.2시간이 원본 제출 직접 집계와 일치했다. 기존 일정의 `due_at` 불일치와 누락 일정은 각각 0건이었다.
- 자동 검증: 점주 SLA, 원천 일정, 일정 경계, migration, reconciliation, 알림 동기화 집중 테스트 36건과 `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 빌드는 기존 workspace root와 오래된 Browserslist 데이터 경고만 남았다.
- 브라우저 QA: 로컬 로그인 세션에서 실제 제출 집계와 화면 KPI가 일치함을 확인했다. 25시간 경과 시설 문의 fixture에서는 처리 필요 1건, 24시간 초과 1건, `처리 기한 초과` 배지와 처리 버튼이 표시됐다. 390x844 화면의 가로 넘침은 0px였다.
- 일정 연결 QA: 가맹운영 일정관리에서 `점주 시설 문의` 원천 일정과 지연 상태를 표시하고, `업무 열기`가 `/dashboard/franchise-operations/owner-portal?view=submissions&submissionId=...`로 이동함을 확인했다. 점포개발 업무 일정 경로로 이동하지 않는다.
- 제한 사항: 적용 DB 표본에는 현재 처리 대기 중인 일반·시설 문의가 없어, 실제 대기 행을 대상으로 한 시간당 maintenance 실행 결과는 읽기 전용 QA에서 재현하지 않았다. 신규 운영 데이터를 만들지 않고 RPC·일정 정합성 및 브라우저 fixture로 대체 검증했다.

# 2026-07-22 점주 포털 업무 자동화 3단계 통합 구현 QA

- 범위: 기존 후속 범위였던 체크리스트·자료 미확인 리마인드, 공지·공문·시정요청·계약 자료 수령 확인, 교육자료·운영 매뉴얼 버전·열람 관리, 정산·영수증·증빙 제출을 하나의 공통 데이터 모델과 private Storage 계약으로 구현했다.
- 게이트 A: 본사는 운영점 대상 리마인드를 발송하고 전달·확인 현황을 집계하며, 점주는 자기 운영점 리마인드와 자료를 확인한다. 요청 idempotency key, 대상 운영점 스냅샷과 fingerprint ledger를 트랜잭션 안에서 잠가 중복 발송과 다른 payload 재사용을 차단한다. PostgreSQL `INSERT ... RETURNING` 충돌 시 `NULL`이 되는 분기까지 명시적으로 처리해 같은 키 재시도는 이후 계정 상태가 바뀌어도 최초 발송 결과를 반환한다. 게시 후 보관된 자료의 기존 리마인드는 불변 버전 스냅샷을 기준으로 확인 처리한다.
- 게이트 B: 자료의 현재 버전과 불변 버전 스냅샷, 버전별 첨부, 열람·수령 시각을 분리했다. 초안 수정·게시·보관·첨부 추가·삭제도 매번 잠금 버전을 올려 동시 변경의 덮어쓰기를 막고, 첨부 등록은 경로 생성 시점과 DB 잠금 시점의 운영점이 같을 때만 허용한다. migration 재실행은 기존 수령 이력과 과거 버전을 삭제하거나 현재 버전으로 다시 기록하지 않는다. 과거 버전에 참조된 첨부 삭제는 현재 목록에서만 제외하고 Storage 원본과 이력 스냅샷은 보존한다.
- 게이트 C: 본사는 정산 기간과 제출 기한을 멱등 요청으로 만들고, 점주는 임시저장·증빙 업로드·제출·반려 후 재제출을 처리한다. 저장 시 PostgreSQL `updated_at` 원문을 낙관적 잠금 토큰으로 사용하며, 저장 뒤 첨부가 실패해도 응답받은 최신 토큰과 선택 파일 키를 유지한다. 닫힌 요청의 신규 파일 예약·활성화와 제출을 차단하고, 같은 파일 재시도는 SHA-256과 메타데이터를 모두 비교해 기존 객체를 덮어쓰지 않는다. 중단된 예약 파일과 추적되지 않은 Storage 객체는 24시간 후 deletion outbox로 보내고 cron에서 재처리한다. 제출·확정·반려 상태는 가맹운영 일정 `owner-settlement-review`에 동기화하며, cron은 모든 제출 건을 페이지 순회해 일정 누락·상태 불일치 건만 복구한다.
- 권한·Storage: 본사 API는 회사 범위, 점주 API는 전용 세션의 회사·운영점·계정 범위를 검증한다. 자료와 정산 파일은 `franchise-owner-private` bucket의 company/location 범위 경로와 signed URL로만 접근하며, immutable version snapshot의 update/delete 권한을 service role에서도 제거한다.
- 자동 검증: 최신 `dev` 병합 후 전체 `npx tsx --test` 919건 통과, 점주 3단계 집중 테스트 63건 통과. `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 빌드는 기존 workspace root 추론과 오래된 Browserslist 데이터 경고만 남았다.
- HTTP·화면 경계 QA: 로컬 `http://localhost:3137`에서 인증 없는 `/owner/resources`가 `/owner/login`으로 이동하고, `/api/owner/reminders`, `/api/owner/content`, `/api/owner/settlements`, `/api/franchise-owner-portal/reminders`가 한국어 `401 AUTH_REQUIRED`로 차단되는 것을 확인했다. 390x844 로그인 화면의 문서 가로 넘침은 0이었다.
- 실행 가설: (1) migration 재실행 또는 현재 첨부 삭제가 기존 receipt/version 파일을 훼손할 가능성은 one-time backfill flag, parent delete 제한과 snapshot 참조 검사로 차단했다. (2) 동시 리마인드·정산 요청과 정산 저장이 중복 또는 last-write-wins가 될 가능성은 요청 ledger 잠금, 대상 운영점 fingerprint와 PostgreSQL `updated_at` 원문 비교로 차단했다. (3) 브라우저가 upload 응답 전에 종료되거나 같은 키에 다른 파일을 재사용할 가능성은 SHA-256 reservation, 비덮어쓰기 업로드, 사후 reconciliation, deletion outbox와 stale cleanup RPC로 회수·거부 경로를 만들었다.
- 제한 사항: 로컬 Docker/Postgres가 없어 `supabase db lint --local`은 연결 단계에서 실행하지 못했다. 신규 migration은 아직 Supabase에 적용하지 않았으므로 SQL 파싱·RLS·private bucket·signed URL의 실제 DB 검증과 본사/점주 실계정 1440px·390px 완료 흐름은 dev 적용 후 게이트 D에서 진행한다.
- SQL 상태: `supabase_franchise_owner_submission_sla_migration.sql` 다음 `supabase_franchise_owner_phase3_migration.sql`을 dev DB에 적용하고 schema cache를 갱신해야 한다. **SQL 등록 필요**.

# 2026-07-22 정보공개서 Gmail OAuth 연결 회귀 수정

- 재현: 로그인된 정보공개서 발송 화면에서 `Gmail 연결`을 누르면 URL에 `requesterId`가 있어도 `/api/integrations/gmail/connect`가 401 `requesterId is required`를 반환했다.
- 원인: 브라우저 전체 이동은 일반 Gmail 상태·해제·발송 요청과 달리 Supabase bearer 인증 헤더를 전달할 수 없었다. 서버의 `getRequesterProfile()`은 query의 `requesterId`를 인증값이 아니라 로그인 사용자 일치 확인값으로만 사용한다.
- 수정: 화면이 `getApiAuthHeaders()`를 포함한 same-origin 요청으로 Google 승인 URL을 먼저 받고, 서버가 nonce 쿠키를 설정한 응답을 완료한 뒤 Google OAuth 화면으로 이동한다. 연결 준비 실패는 원시 JSON 페이지 대신 기존 화면 오류 영역에 표시한다.
- 회귀 테스트: 인증된 JSON handoff 요청이 `requesterId`, 회사, 복귀 경로, `response=json`, JSON Accept 헤더를 포함하고 Google 승인 URL을 반환하는지 검증한다. 실패 테스트를 먼저 확인한 뒤 구현 후 관련 테스트 3건을 통과했다.
- 자동 검증: `npx tsx --test src/components/franchise/leadDisclosureWorkflowRequests.test.mts`, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. build에는 기존 workspace root와 오래된 브라우저 데이터 경고만 남았다.
- 실계정 QA: 분리 서버 `localhost:3017`에서 최초 Google `redirect_uri_mismatch`를 확인하고 정확한 callback URI를 OAuth 클라이언트에 등록했다. 재시도 후 사용자가 Gmail 로컬 연결 완료를 확인했다. 운영 callback `https://www.fcerp.co.kr/api/integrations/gmail/callback` 등록도 확인했다.
- 기능 커밋: `60ee429`. 신규 SQL 없음. 공개 데모 흐름 영향 없음.

## 2026-07-22 Gmail OAuth 팝업 연결 QA

- 재현: 정보공개서 상세에서 `Gmail 연결`을 누르면 Google 인증이 현재 탭을 대체하고, 완료 후 모객 DB 목록으로 이동해 열어 둔 상세와 입력 상태가 사라졌다.
- 수정: 인증 URL을 별도 팝업에 열고 callback 완료 페이지가 same-origin `postMessage`로 결과를 원래 창에 전달한 뒤 닫히도록 변경했다. 기존 redirect 방식은 호환 경로로 유지한다.
- 자동 검증: Gmail 요청·결과 계약과 기존 정보공개서 유틸 테스트 10건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.
- 브라우저 QA: 로컬 분리 서버에서 원래 창과 완료 팝업을 열어 연결 결과 이메일 전달, 팝업 자동 종료, 원래 창 유지, console error 0건을 확인했다. 실제 Google 계정 선택·동의 화면은 운영 배포 후 실계정으로 최종 확인한다.
- SQL 및 데모 영향: 신규 SQL 없음. `/landing`과 `/demo`의 공개 설명에는 영향 없음.

## 2026-07-22 Gmail OAuth callback 세션 후속 보정

- 재현: 운영에서 Google 계정 선택과 `gmail.send` 동의까지 완료해도 정보공개서 화면이 `로그인 정보가 만료되었습니다. 다시 로그인한 뒤 Gmail을 연결해주세요.`를 표시하고 Gmail 상태가 `미연결`로 유지됐다.
- 원인: Google callback은 ERP bearer 헤더가 없는 브라우저 이동인데, callback route가 일반 보호 API용 `getRequesterProfile()`을 다시 호출해 유효한 OAuth 반환을 `auth_required`로 판정했다.
- 수정: 연결 시작 시 전체 OAuth state를 HttpOnly 쿠키에도 저장하고 callback query의 state와 정확히 일치하는지 검사한다. 검증된 state의 사용자 ID로 활성 profile을 서버에서 조회하고 회사 범위를 다시 확인한 뒤 토큰 교환과 연결 저장을 진행한다. 성공·거부·오류 시 OAuth 임시 쿠키를 모두 정리한다.
- 보안: nonce만 비교할 때 남아 있던 state 내부 사용자·회사 ID 변경 가능성을 전체 state 일치 검증으로 차단했다. query의 사용자 ID만으로 callback 사용자를 신뢰하지 않는다.
- 검증: 실패 테스트에서 state helper 부재를 확인한 뒤 state 원문 변경·nonce 누락/불일치·bearer 없는 활성 callback 사용자 조회를 포함한 Gmail/인증 테스트 15건, TypeScript, lint, production build, `git diff --check`를 통과했다. 로컬 브라우저 callback은 `auth_required`와 `invalid_state`를 지나 Google 토큰 교환 단계까지 도달했다.
- 신규 SQL 없음. 운영 실계정의 최종 `연결됨` 표시는 dev/main 승격과 production 배포 후 다시 확인한다.
## 2026-07-23 플랫폼 안정화 4단계 1차

- 관리자 사이드바와 관리 홈에 `운영센터` 진입점을 추가했다.
- `/api/admin/platform-operations`는 일정 동기화 큐, 점주 포털 파일 삭제 outbox, 알림톡 실패·차단 로그, 공통 감사 이력을 관리자 범위에서 조회한다.
- 일정 동기화 실패와 파일 정리 실패는 확인창을 거쳐 처리 대기로 되돌리며, `platform_audit_events`에 request ID, 관리자, 작업 대상, 처리 전후 값을 저장한다.
- 알림톡 로그는 재발송 payload가 완전하지 않아 확인 전용으로 유지했다.
- 자동 검증: 전체 `src/lib/*.test.mts` 530건, TypeScript, lint, production build, `git diff --check`를 통과했다.
- production mock 브라우저 QA: 1440px·390px에서 문서 가로 넘침 0, console error 0, 탭 방향키 이동과 실제 포커스 이전, 모바일 조작 영역 44px 이상, 작업별 전체 필드 표시를 확인했다. 재처리 버튼은 `작업 재처리` 확인창을 먼저 열고 취소 버튼에 초기 포커스를 두며, 취소 후 요청 없이 닫히는 흐름까지 검증했다.
- SQL 상태: 사용자 확인 기준 `supabase_platform_operations_phase4_migration.sql`을 대상 DB에 적용했다. **SQL 등록 완료 확인**.
- 남은 QA: 실패 작업 샘플 재처리, worker 완료, 감사 이력 생성을 적용 DB 실데이터로 확인한다.
- 최종 UI 게이트: `DESIGN.md` 공용 토큰 정렬, 한국어 줄바꿈, 탭·확인창 포커스, 모바일 44px 조작 영역을 재검증했고 디자인 충실도 리뷰와 최종 게이트 리뷰가 모두 `PASS`했다.

## 2026-07-27 Meta OAuth 연결 인증 handoff 보정

- 재현: 로그인된 모객 DB에서 `Meta 계정 연결`을 누르면 `/api/integrations/meta/connect`가 401을 반환하고 Meta 승인 화면으로 이동하지 않았다.
- 원인: 브라우저 전체 이동은 Supabase bearer 인증 헤더를 전달하지 못하지만, connect route는 보호 API와 동일하게 인증된 requester profile을 요구했다.
- 수정: 화면이 `getApiAuthHeaders()`를 포함한 same-origin JSON 요청으로 Meta 승인 URL을 먼저 받고, 서버가 nonce 쿠키를 설정한 뒤 Meta OAuth 화면으로 이동한다. 기존 서버 redirect 응답은 호환 경로로 유지한다.
- 검증: 실패 테스트를 먼저 확인한 뒤 Meta/Gmail OAuth·기간 설정·API 인증 관련 테스트 14건과 전체 `npx tsx --test` 949건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 로컬 실계정 브라우저에서 connect JSON 요청 200과 Facebook OAuth 로그인 화면 이동을 확인했다.
- 남은 QA: 수정 코드를 dev에 반영한 뒤 Meta 계정 선택·권한 승인·callback 저장·Page/Form 표시를 실계정으로 확인한다. 신규 SQL 없음.

## 2026-07-27 Meta OAuth callback 세션 후속 보정

- 재현: dev에서 Meta 권한 승인까지 완료했지만 callback이 307 응답 후 모객 DB의 `meta=error&reason=forbidden`으로 복귀하고 연결 Page/Form이 0건으로 유지됐다.
- 원인: Meta callback은 ERP bearer 헤더가 없는 브라우저 이동인데, callback route가 일반 보호 API용 `getRequesterProfile()`을 다시 호출해 승인된 반환도 `forbidden`으로 판정했다.
- 수정: 연결 시작 시 nonce와 함께 전체 Meta OAuth state를 HttpOnly 쿠키에 저장하고 callback query의 state와 정확히 일치하는지 검사한다. 검증된 state의 사용자 ID로 활성 profile을 서버에서 조회하고 Meta 관리 권한과 회사 범위를 다시 확인한 뒤 토큰 교환과 Page/Form 저장을 진행한다. 성공·거부·오류 시 임시 쿠키를 모두 정리한다.
- 보안: nonce만 비교할 때 가능했던 state 내부 사용자·회사 ID 변경을 전체 state 원문 일치 검증으로 차단했다.
- 검증: requester 변경 회귀 테스트가 실제 변경된 ID를 허용하며 실패하는 것을 먼저 확인했다. 수정 후 Meta/Gmail OAuth·API 인증 관련 테스트 15건과 전체 `npx tsx --test` 953건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. 빌드는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 남았다.
- 남은 QA: dev 배포 후 실계정에서 Meta 승인 재시도, callback의 `meta=connected`, 연결 Page/Form 수, 콘솔·런타임 오류를 확인한다. 신규 SQL 없음.

## 2026-07-27 Meta Lead Ads OAuth 권한 후속 보정

- 재현: callback 세션 보정 배포 후 Meta 승인은 `meta=connected&pages=0&forms=0`으로 성공했지만 모객 DB는 연결 Page 0건을 표시해 다시 `Meta 계정 연결`을 안내했다.
- 확인: Facebook 비즈니스 통합의 `fcerp`에는 `내일사장` Page가 `leads_retrieval`, `pages_manage_metadata`, `pages_read_engagement`, `pages_show_list` 대상으로 선택되어 있었고, Vercel callback 런타임 오류도 없었다. Meta 개발자 앱의 Lead Ads 이용 사례에는 `ads_management`와 `pages_manage_ads`가 모두 `테스트 준비 완료` 상태였다.
- 원인: ERP의 OAuth scope는 Page 목록·읽기·Webhook·리드 권한 4개만 요청하고, Meta Lead Ads 검색 공식 요구 권한인 `ads_management`와 `pages_manage_ads`를 요청하지 않았다.
- 수정: Meta OAuth scope에 `ads_management`, `pages_manage_ads`를 추가했다. 필수 Lead Ads/Webhook 권한 6개가 모두 포함되는지 정적 회귀 테스트로 고정했다.
- 검증: 누락 권한 테스트가 `ads_management`, `pages_manage_ads`를 정확히 보고하며 실패하는 것을 먼저 확인했다. 수정 후 관련 테스트 6건과 전체 `npx tsx --test` 954건, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`, TypeScript no-excuse 검사를 통과했다. 빌드는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 남았다.
- 남은 QA: dev 배포 후 Meta 계정을 다시 승인해 callback의 연결 Page/Form 수와 Page `leadgen` 구독 상태를 실계정으로 확인한다. 신규 SQL 없음.

## 2026-07-27 Meta Business Login Page/Form 연결 완료 QA

- 추가 재현: Lead Ads 필수 권한 6개와 `public_profile`이 모두 `granted`여도 표준 OAuth 토큰의 `/me/accounts`가 빈 배열을 반환해 `meta=connected&pages=0&forms=0`이 유지됐다. Facebook Business Login 동의 화면에서는 `내일사장` Page ID `600785779791577`가 선택 가능한 자산으로 확인됐다.
- Business Login 적용: Vercel Preview에 서버 전용 `META_BUSINESS_LOGIN_CONFIG_ID`를 등록하고, 구성 ID가 있는 환경의 OAuth 요청은 `config_id`, `response_type=code`, `override_default_response_type=true`를 사용한다. 이 경로에서는 구성과 충돌할 수 있는 기존 `scope`, `auth_type`을 보내지 않으며, 환경변수가 없는 환경은 기존 scope 요청을 유지한다.
- Page 발견 보정: `/me/accounts`가 비어 있을 때 같은 앱의 `/debug_token`에서 Page 관련 `granular_scopes.target_ids`만 추출해 Page를 직접 조회한다. `ads_management`의 광고 계정 대상은 제외하며 기존 `/me/accounts` 결과가 있는 환경은 fallback을 실행하지 않는다.
- 런타임 원인: 최초 fallback 배포에서 `내일사장` target ID 발견 후 직접 Page 조회가 `(#100) Tried accessing nonexisting field (tasks)`로 두 번 동일하게 실패했다. `/me/accounts`에서만 요청할 `tasks`와 직접 Page 조회 필드를 분리해 직접 조회는 `id,name,access_token,category`만 사용하도록 보정했다.
- 자동 검증: 실패 테스트를 먼저 확인한 뒤 Business Login URL, Page target 추출·fallback, 직접 조회 필드 회귀 테스트를 포함한 전체 `npx tsx --test` 962건, `npx tsc --noEmit --pretty false --incremental false`, 대상 ESLint, `npm run build`, `git diff --check`를 통과했다. 새 discovery 모듈과 테스트의 no-excuse 위반은 없고, 기존 `meta-leads.ts`의 편집 구간 밖 `any` 9건만 기존 부채로 남았다.
- dev 실계정 QA: 최종 callback 로그에서 `discoveredPageCount=1`, `savedConnectionCount=1`, `savedFormCount=19`, Page `내일사장`, `hasAccessToken=true`를 확인했다. 모객 DB 상태 새로고침 후에도 연결 Page 1, 오류/주의 0이 유지되고 Page ID `600785779791577`가 표시됐다.
- 오류 확인: 최종 dev 배포의 callback·화면 요청에서 Vercel error 로그와 Next.js 오류 오버레이는 없었다. 브라우저 제어 계층의 `fontoxpath` 주입 오류와 기존 Supabase 다중 GoTrueClient 경고는 관찰됐으나 Meta callback 또는 화면 기능 오류는 아니었다.
- 운영 상태: 19개 Form은 저장됐지만 현재 활성 Form은 0개이므로 Webhook/백필 자동 수집은 시작되지 않았다. 실제 수집 대상 Form을 사용자가 선택해 `수집 활성화`한 뒤 동기화와 신규 리드 수신을 별도 QA한다.
- SQL 상태: 신규 SQL 없음. **SQL 등록 불필요**.
## 2026-07-27 Meta Lead Ads 설정 UI·보안 경계 QA

- 코드 커밋: `fa7c611 fix(franchise): Meta 연동 설정과 수집 경계 보정`.
- Meta Business Login에서 회사 관리 페이지 1개와 신청 양식 19개를 발견했고 수집 양식 1개를 활성화했다. Meta Lead Ads Testing Tool에서 Page Webhook 전달 `Success`를 확인했으며, 테스트 신청 정보가 모객 DB `1차 유입 DB`에 저장되는 것을 화면으로 확인했다. 실제 유료 광고 캠페인 리드와 장시간 Webhook·백필은 아직 확인하지 않았다.
- 모객 DB 상단의 중복 `Meta 계정 연결`을 없애고 `Meta 연동 설정` 내부로 이동했다. 설정 열림/닫힘, 양식 자동 수집 상태, 질문 이름 별칭, 전체·최소·최대 예산의 차이를 운영 문구로 설명하고 여러 양식과 최근 수집 내역을 접이식으로 정리했다.
- Meta 테스트 도구 dummy 값은 저장 원본을 바꾸지 않고 표에서만 `Meta 테스트 신청자` 또는 `-`로 표시한다. 전화번호·희망지역·관심브랜드·메모 셀에는 전체 개인정보를 복제하는 native tooltip을 두지 않는다.
- 보안 리뷰에서 확인된 protocol-relative OAuth open redirect, provider 원문 오류 노출, 수동 동기화 회사 범위 누락을 각각 exact-path allowlist, 안정 오류 코드, `company_id` 선조회 필터로 보정했다.
- 검증: Meta/기간 관련 회귀 32건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. production build는 113개 페이지를 생성했다. 1280px·390px 실브라우저에서 패널 열기/닫기, 내부 계정 연결 1개, 모바일 44px 버튼, 2×2 요약, 수평 overflow 0, console error 0을 확인했다. 기존 Supabase 다중 client warning은 이번 변경 범위 밖의 비차단 경고다.
- 5개 관점 리뷰 결과 목표/제약, 보안, 프로젝트 맥락은 PASS, 수동 QA는 외부 OAuth 미실행 한계를 명시한 PASS, 최종 코드 품질 재검토는 PASS다. 신규 SQL과 공개 `/landing`·`/demo` 변경은 없다.

## 2026-07-28 Meta 신청 항목 연결·작업 버튼 후속 QA

- 화면 보정: 자동 수집 설명과 기본 담당자 영역의 시작선을 맞추고, 신청 항목 연결 제목·설명과 우측 작업 영역은 하단 기준으로 정렬했다. 1180px 이하에서는 제목과 작업을 위아래로 늘려 배치하고 720px 이하에서는 긴 한국어 도움말이 줄바꿈되도록 했다.
- 작업 정리: Form마다 반복되던 `신청 내역 가져오기`를 제거하고 패널 상단의 `전체 신청 가져오기` 한 곳으로 통합했다. `연결 상태 확인`은 `연결 확인`, `항목 새로고침`은 `질문 다시 불러오기`로 바꾸고 상태 확인·다운로드 아이콘을 구분했다.
- 자동 검증: Meta Graph 요청, 질문 매핑, API 응답 정규화, Webhook 회사 경계를 포함한 집중 테스트 22건, `npx tsc --noEmit --pretty false --incremental false`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`를 통과했다. production build는 113개 페이지를 생성했고 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 남았다.
- 브라우저 QA: 로컬 Codex 브라우저 1280px에서 `Meta 계정 연결`, `연결 확인`, `전체 신청 가져오기`가 역할별로 구분되고 연결된 Form이 없을 때 전체 가져오기가 비활성화되는 것을 확인했다. Next.js 오류 오버레이와 console error는 없었다. 반응형 CSS 게이트에서 1180px 이하 제목·작업 적층과 720px 이하 한국어 도움말 줄바꿈을 확인했다.
- 신청 항목 매칭 검증 절차: 연결을 저장한 뒤 Meta Lead Ads Testing Tool에서 같은 Page/Form의 기존 테스트 신청을 삭제하고 새 테스트 신청을 만든다. ERP에서 `전체 신청 가져오기`를 실행한 뒤 새 이름을 검색해 이름·연락처·희망 지역·예산·관심 브랜드·메모를 확인한다. 이미 가져온 신청은 매핑 변경만으로 다시 변환되지 않으므로 반드시 새 신청으로 검증한다.
- 기능 커밋: `ed3240a fix(franchise): Meta 연동 작업 버튼 정리`. 신규 SQL과 `/landing`·`/demo` 변경은 없다. Dev 배포 후 실제 연결 회사에서 질문 매핑 저장·복원과 새 테스트 신청의 컬럼별 저장 결과를 최종 확인한다.

## 2026-07-30 모객 DB 유입경로 항목 관리·필터 QA

- 기능 범위: 회사별 유입경로 표시 이름·사용 여부 관리, 자동 수집/DB 승격 고정 항목 보호, 비활성 기존값 보존, 필터·대시보드·엑셀·고객 전환 표시 이름 연동, `정보공개서 필요순` 제거, 예산 필터 단위 명시.
- 권한·데이터 경계: GET/POST/PATCH API가 활성 로그인 profile과 회사 범위를 다시 확인한다. 관리자·부관리자만 변경 가능하고, API와 DB trigger가 고정 항목 변경과 실제 삭제를 차단한다. 수정 가능한 항목은 회사별 안정 코드를 유지하고 삭제 대신 사용 중지한다.
- SQL 정적 검증: 기본 항목 seed, 기존 리드 source backfill, 신규 source 자동 등록, 회사별 RLS, 고정 항목 insert/update/delete 보호를 migration 테스트로 확인했다. 실제 Supabase 적용 및 저장 API live QA는 사용자 SQL 적용 후 진행한다. **SQL 등록 필요**.
- 자동 검증: `npx tsx --test` 관련 35건, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했다. production build는 113개 페이지를 생성했고 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 남았다.
- 리뷰: 독립 디자인 리뷰와 한국어 UI/접근성 리뷰가 최종 `PASS`했다. 버튼 40px/모바일 44px, 키보드 포커스, 로딩·오류·SQL 미적용 상태 분리, select label 연결을 소스 기준으로 확인했다.
- 브라우저 제한: Codex Browser가 localhost URL 보안 정책으로 동일 리비전 화면을 열지 못해 최종 렌더 캡처는 남기지 못했다. dev/운영 배포 후 가맹 희망자 수정의 `유입경로 > 항목 관리`, 이름 변경·사용 중지·재사용, 필터 표시, console error와 수평 overflow를 smoke로 확인한다.
- 기능 커밋: `ca9e4dd fix(franchise): 모객 DB 필터 옵션 정리`, `8ac62d8 feat(franchise): 회사별 유입경로 항목 관리`. 공개 `/landing`·`/demo` 영향 없음.
- SQL 적용: 사용자 확인 기준 2026-07-30 `supabase_franchise_lead_source_options_migration.sql`을 대상 DB에 적용했다. 코드 변경 없이 문서의 적용 상태를 갱신하고 Supabase CLI가 생성하는 `supabase/.temp/` 로컬 연결 정보는 버전 관리에서 제외한다. **SQL 등록 완료 확인**.
- 적용 후 남은 live QA: 관리자·부관리자의 항목 추가·이름 변경·사용 중지·재사용, 새로고침 후 복원, 일반 직원 변경 차단, 다른 회사 설정 격리, 기존 비활성 유입경로의 표시 보존을 확인한다.
