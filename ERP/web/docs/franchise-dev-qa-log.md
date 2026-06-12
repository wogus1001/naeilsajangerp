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
- 2026-06-11 로그인 세션 기준 P0 QA를 완료했다. `admin / 1234` 세션에서 QA 리드를 `1차 유입 DB`로 생성하고, UI의 `후보자 승격` 액션으로 후보자 레이어에 이동하는지 확인했다.
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
- 2026-06-12 모객 DB `page.tsx` 구조 분리를 진행했다. 후보자 등록 모달, 빠른 상담 이력 모달, 후보자 상세 패널, Meta 연동 설정 패널을 `src/components/franchise/leads` 하위 컴포넌트로 분리해 route page는 상태/데이터 액션과 화면 조립 역할에 더 가깝게 정리했다. `page.tsx`는 2392줄에서 1878줄로 감소했으며, 다음 구조 개선은 Meta/엑셀/전환/후보지 연결 action hook 분리다.
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

## QA 결과

### 통과

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

## 다음 QA 체크리스트

### P0

- Meta 실제 유입은 계정/env 준비 전까지 HOLD. 엑셀 업로드 runner 기준 `1차 유입 DB` 저장과 후보자 승격은 2026-06-11 통과했으며, 실제 운영 엑셀 샘플 파일이 생기면 같은 runner로 추가 회귀한다.
- 실운영 계정 role matrix 기준으로 모객 DB, 후보지 연결, 외부 상가 수집 범위 회귀 QA
- 계약 가능 상태 리드가 업무 큐에서 별도 `계약 가능` 필터로 노출되지 않는지 확인
- 오픈 준비 프로젝트 브라우저 UI 저장과 새로고침 persistence 확인

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
- 계약 전 준비 체크리스트의 미완료 필수 스텝 필터, 계약 준비 완료 필터, 계약 점주 상세 오픈 준비 체크리스트 통합은 후속 UI 범위로 남김
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
