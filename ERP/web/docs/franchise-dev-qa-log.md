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

## 개발 과정 로그

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
- 로그인 화면의 브랜드명을 `부동산 ERP`에서 `FC ERP`로 변경하고, 부제도 `창업 및 부동산 전문가를 위한 통합 솔루션`으로 정리했다. `/signup`, `/privacy`, 앱 metadata도 `FC ERP` 기준으로 맞췄다.
- 출점 검토 리포트의 `PDF 저장`/`인쇄`가 새 창에서 `about:blank`로 남는 문제를 수정했다. 보고서 새 창은 `document.write` 대신 Blob URL로 완성된 HTML을 열고, 로드 완료 후 브라우저 인쇄를 실행한다.
- 검증: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `git diff --check`, `npm run build`를 통과했다. build는 기존 workspace root, baseline-browser-mapping, Browserslist 경고만 출력했다.
- 브라우저 QA: 로컬 production 서버 `http://localhost:3114`에서 Playwright로 1280px/390px `/landing` 로그인 링크 노출, 클릭 시 `/login` 이동, `/login`의 `FC ERP` 노출과 `부동산 ERP` 미노출, `/signup`/`/privacy`의 `FC ERP` 문구를 확인했다. console/page error는 없었다.
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
