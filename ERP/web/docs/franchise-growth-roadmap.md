# Franchise Growth Roadmap

## 목적

프랜차이즈 본사용 고도화 작업의 우선순위, 현재 구현 상태, 외부 API 한계, 다음 작업 기준을 한곳에서 관리한다. 세션 인수인계는 `MAC_CONTEXT.md`를 우선으로 보되, 기능별 의사결정과 제품 방향은 이 문서를 기준으로 삼는다.

## 문서 운영 원칙

- `ERP/web/handoff.md`는 단일 작성자 규칙 때문에 Codex가 수정하지 않는다. 내용이 오래되어도 검토 참고만 하고 변경하지 않는다.
- `MAC_CONTEXT.md`는 다음 세션이 바로 이어서 작업할 수 있도록 현재 상태와 로컬 운영 규칙을 짧게 갱신한다.
- `ERP/web/README.md`는 실행, 환경변수, SQL 적용 순서처럼 개발자가 바로 따라야 하는 설정 정보를 관리한다.
- `ERP/web/docs/franchise-growth-roadmap.md`는 프랜차이즈 고도화 계획, API 정책, 다음 작업 목록을 관리한다.
- `ERP/web/docs/franchise-dev-qa-log.md`는 개발 과정, 검증 결과, 미검증 리스크, 다음 QA 체크리스트를 관리한다.
- `ERP/web/docs/franchise-product-direction.md`는 프랜차이즈 본사 임직원용 통합 운영 OS의 거시 제품 방향과 장기 모듈 구조를 관리한다.
- `ERP/web/docs/documentation-agent.md`는 Docs Steward의 문서 직접 반영 권한, 금지 범위, 보고 형식을 관리한다.
- `ERP/web/docs/fdam-reference.md`는 외부 ERP 레퍼런스 분석 문서로 유지하고, 현재 구현 상태 문서로 사용하지 않는다.
- Docs Steward는 approved docs를 직접 수정할 수 있지만, `ERP/web/handoff.md`, 코드, SQL migration, env, package 파일은 수정하지 않는다.

## 현재 우선순위

제품의 장기 방향은 `ERP/web/docs/franchise-product-direction.md`를 기준으로 한다. 이 로드맵은 그 방향을 현재 구현 순서와 QA 상태로 쪼개 관리한다.

1. 모객 DB 업무 큐 강화
2. 점포·상권 매칭
3. 정보공개서 발송/계약 컴플라이언스
4. SearchAPI 유료 결제 후 provider 보호/상권 추천/외부 상가 고도화 묶음 개발
5. 본사 운영관리
6. 가맹 운영 외부 상가 매물 수집 MVP 유지보수
7. Meta Lead Ads는 계정/앱 설정 문제가 풀릴 때까지 HOLD

## 현재 완료/진행 상태

### 모객 DB 단계/업무 큐 강화

- `/dashboard/franchise-leads`에 `1차 유입 DB`와 `후보자` 레이어를 분리한다.
- Meta Lead Ads, 엑셀 업로드 같은 원천 유입은 기본적으로 `1차 유입 DB`에 저장한다.
- 의사가 확인된 원천 DB만 `후보자 승격` 액션으로 파이프라인/업무 큐에 올린다.
- 수동 등록 후보자는 바로 `후보자` 단계로 저장한다.
- `/dashboard/franchise-leads`의 `오늘 할 일` 뷰를 `업무 큐`로 확장한다.
- 업무 큐 기준은 전체 업무, 연락 지연, 오늘 연락, 무응답이다.
- 계약 가능 리드는 업무 큐에서 제외하고, 계약/상태 관리 영역에서 별도 처리한다.
- 후보자별 업무 필드는 `franchise_leads.data` JSON에 저장한다.
- 관리 필드는 `nextAction`, `consultationResult`, `churnReason`, `budgetFit`, `regionFit`, `brandFit`이다.
- 이 필드는 담당자가 후보지 연결을 판단할 때 후보자 상태, 예산, 지역, 브랜드 적합도를 확인하는 입력값으로 사용한다.
- 2026-06-11 안정화 QA에서 `연락 완료` 저장 흐름, 기존 단계값 없는 리드의 후보자 정규화, 후보지 연결 상태/메모 reload 유지를 재확인했다.
- 2026-06-11 모객 DB 화면을 본사 실무자용으로 간결화했다. 상단 보조 액션은 데스크톱에서는 유지하되 모바일에서는 `후보자 등록`만 남기고, 모바일 파이프라인 단계 선택 카드는 숨겨 첫 화면 점유를 줄였다.
- 2026-06-11 모객 대시보드 그래프를 업무 흐름 기준으로 재정리했다. `최근 유입`을 `일별/주별/월별 DB 유입`으로 전환 가능하게 만들고, `담당자별 모객` 그래프를 추가해 직원별 담당 수를 볼 수 있게 했다.
- 2026-06-11 후보자 등록 폼에서 연락처 입력 시 자동 하이픈 포맷을 적용했다. 희망지역은 외부 상가 수집의 시도/시군구 옵션을 재사용해 다중 선택 칩으로 저장하며, 기존 DB 스키마와 API 호환을 위해 `서울 강남구, 경기 성남시` 같은 단일 문자열로 정규화한다.

### 점포·상권 매칭

- 후보자 상세 패널에서 담당자가 출점 후보지와 외부 상가 DB를 직접 연결한다.
- 연결 대상은 `franchise_locations` 출점 후보지와 `external_property_listings` 외부 상가 원본이다.
- 연결 상태와 메모는 `franchise_leads.data.locationLinks`에 저장한다.
- 같은 출점 후보지나 외부 상가는 여러 후보자에게 연결할 수 있다. 단, 같은 후보자 안에서는 동일 대상 중복 연결을 막는다.
- 초기 구현은 기존 ERP 위치 DB와 저장된 외부 상가 DB만 사용한다. SearchAPI 유료 결제 전까지 외부 검색 API 의존성 없이 담당자 수동 매칭을 우선한다.
- 다음 단계는 연결된 후보지에서 출점 후보지 인사이트/경쟁스캔 상세로 이동하는 흐름이다. 선택 외부 매물을 ERP 물건지로 승격하는 1차 흐름은 완료했다.

### 본사 운영관리

- `/dashboard/franchise-operations`는 운영 가맹점 마스터, 수동 승격 외부 상가 운영 전환, 오픈 준비 프로젝트를 본사 운영 화면으로 묶는다.
- 2026-06-11 `franchise_opening_projects` 전용 테이블/API/UI MVP를 추가했다. 프로젝트는 `오픈준비` 상태의 `franchise_locations`에만 연결하고, 상태/목표 오픈일/메모/계약-인테리어-교육-초도물류-홍보-오픈일 checklist를 별도 저장한다.
- 오픈 준비 프로젝트는 회사 범위가 확인된 requester만 생성/수정/삭제할 수 있다. 회사 없는 requester나 교차 회사 requester는 mutation을 차단한다.
- 로컬 브라우저 QA에서 `/dashboard/franchise-leads`, `/dashboard/franchise-leads/market-insights?tab=realty-import`, `/dashboard/franchise-operations` 390px 모바일 진입 시 전역 사이드바가 기본 접힘 상태로 시작하고, 1440px 데스크톱에서는 기본 열림 상태를 유지함을 확인했다.
- 2026-06-11 로컬 DB에 `supabase_franchise_opening_projects_migration.sql` 적용 후 `scripts/franchise-opening-projects-api-qa.mjs`로 생성/조회/수정/삭제와 삭제 후 404를 확인했다.

### Naver 공식 API MVP

- `/api/franchise-market-monitoring`와 `/dashboard/franchise-leads/brand-monitoring` 기반 구조를 추가했다.
- 공식 Naver 검색 API는 블로그/뉴스/지역검색 TOP 결과와 위험 키워드 언급량 저장에 사용한다.
- DataLab 검색어 트렌드는 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정 후 수집 가능하다.
- 공식 Naver API만으로는 네이버 플레이스 방문 리뷰/블로그 리뷰/플레이스 광고 배지를 안정적으로 제공받을 수 없다.

### SERP Provider POC

- `SERP_PROVIDER=searchapi` 또는 `SERP_PROVIDER=serpapi`로 분기한다.
- SearchAPI는 Naver 장소형 결과에서 방문 리뷰/블로그 리뷰를 더 잘 반환해 현재 우선 provider로 둔다.
- SerpApi는 fallback 후보로 유지하지만, 현재 테스트 기준 Naver Place 리뷰 수집 품질은 SearchAPI보다 낮다.
- 2026-06-09 확인: 현재 SearchAPI 키는 `monthly_allowance=0`, `remaining_credits=-3` 상태라 신규 Naver SERP 수집이 429로 막힌다.
- 한도 초과는 "네이버 데이터 없음"이 아니라 "provider quota exceeded" 상태로 취급해야 한다.

### 브랜드 모니터링 대시보드

- 브랜드 감시목록, 최근 스냅샷 KPI, 네이버 지역검색 TOP5, 위험 키워드 감지, 수집 이력 테이블 구조를 만들었다.
- Naver 공식 API 키가 없으면 감시목록 저장과 설정 상태 표시만 가능하다.
- 실수집 검증은 Naver 공식 API env 준비 후 진행한다.

### 정보공개서/브랜드 마스터

- `franchise_brands` 테이블과 저장 브랜드/공용 정보공개서 브랜드 검색 구조를 추가했다.
- 브랜드 검색은 점포 신규등록과 같은 모달 방식으로 맞췄다.
- 공공데이터포털 `공정거래위원회_가맹정보_브랜드 목록 정보 제공 서비스`를 실시간 조회 우선으로 사용한다.
- 공식 API는 브랜드명 검색 파라미터가 없어 기준년도 데이터를 페이지 단위로 받아 서버에서 필터링한다.

### 정보공개서 발송/계약 컴플라이언스

- 2026-06-11 본사별 정보공개서 문서함과 후보자별 발송 이력 MVP를 구현했다.
- 적용 SQL은 `supabase_franchise_disclosures_migration.sql`이다. 기준 스키마 `supabase_schema.sql`에도 `franchise_disclosure_documents`, `franchise_lead_disclosure_deliveries`를 반영했다.
- 후보자 상세에서 담당자가 정보공개서 파일을 업로드하면 기존 Supabase Storage `property-documents` bucket의 `franchise-disclosures/<company>/...` 경로에 저장하고, 문서명/버전/브랜드/가맹본부/파일명/공개 URL을 회사 문서함에 등록한다. 같은 회사 직원은 회사 범위 문서함을 함께 사용한다.
- 후보자별 발송 기록은 발송일시/채널/수신 연락처/메모와 발송 당시 문서명/버전을 남긴다. 관리 화면에서는 별도 증빙 URL 입력을 받지 않는다.
- 후보자 상태를 `계약예정` 또는 `계약완료`로 바꾸는 서버 API는 최신 정보공개서 발송일로부터 14일이 지나지 않으면 차단한다.
- 후보자 상세 UI는 계약 가능/발송 전/D-day 상태를 표시하고, 상세 상태 변경도 같은 14일 정책으로 안내한다.
- 법령상 변호사 또는 가맹거래사 자문 예외로 기간이 단축되는 케이스는 별도 증빙 필드와 정책 확인 후 2차 범위로 둔다.
- 2차 고도화는 이메일 자동 발송 또는 카카오 알림톡 자동 발송으로 분리한다. 외부 발송 provider 연동 시 발송 요청/성공/실패/수신자/템플릿/재시도 상태를 별도 로그로 남기고, 계약 가능일 계산은 동일한 발송 이력 테이블을 기준으로 유지한다.
- 2026-06-11 SQL 적용 후 live QA에서 문서 업로드, 문서함 저장, 후보자 발송 기록, 새로고침 persistence, 발송 직후 계약 단계 전환 400 차단과 기존 상태 유지까지 확인했다.
- 법령 기준은 국가법령정보센터 가맹사업법 제7조 제3항의 정보공개서 제공 후 14일 제한을 기준으로 관리한다.

### 출점 후보지/경쟁환경 패널

- `/api/franchise-locations/competitors`가 Kakao Local 기반 반경 경쟁사 목록을 저장한다.
- 결과는 `franchise_locations.data.competitionScan`에 저장한다.
- 기본 반경은 700m, 기본 리뷰 상세 수집 대상은 상위 8곳이다.
- 정렬은 고정 상위 업체를 두지 않고 `100m 거리 구간 -> Naver 리뷰 총량 -> 실제 거리` 기준의 `거리+리뷰순`이다.
- Kakao 지도, 반경 원, 경쟁사 마커, 거리권 분포, 리뷰/광고 상태를 모달에서 보여준다.
- Google은 비용 절감을 위해 Place Details의 `reviews` 필드를 호출하지 않고 Text Search 결과의 평점/리뷰 수/지도 URL만 저장한다.
- Kakao Local 공식 API는 리뷰 수/리뷰 본문을 제공하지 않는다. UI에서는 Kakao맵 매장 페이지에서 확인하도록 연결만 제공한다.

### 외부 상가 매물 수집 MVP

- `/dashboard/franchise-leads/market-insights?tab=realty-import`에 `외부 상가 수집` 탭을 배치했다.
- 외부 상가 수집은 현재 Daangn 상가 저장/지도/점수화 MVP까지 완료한 뒤 신규 기능 개발 우선순위에서 잠시 내린다.
- 상가만 우선 수집한다. 사무실은 MVP 범위에서 제외했다.
- `realty_import_jobs`, `external_property_listings` 테이블과 외부 원본 목록 저장 흐름을 추가했다.
- Daangn은 현재 외부 상가 수집 MVP의 기본 수집 소스다.
- 수집 지역은 자연어 입력이 아니라 시도/시군구 선택 방식으로 받는다.
- Daangn 구 단위 검색은 지역 API 후보를 동 단위로 확장해 수집한다.
- Daangn 목록 호출은 `salesType=store`를 명시한다.
- 화면 수집 요청은 2000건, import API 안전 상한은 3000건이다. 저장 목록 API는 최대 2000건까지 조회한다.
- 등록 회사명 입력은 제거했다. 회사 범위가 있으면 회사 수집함에 저장하고, 회사 범위가 없으면 요청자 기준 수집함에 저장한다.
- 중복/재수집은 회사 범위가 있으면 `company_id + source + source_listing_id`, 회사 범위가 없으면 `requester_id + source + source_listing_id` 기준으로 외부 원본을 업데이트한다.
- 당근 지도 숫자는 지도 클러스터/필터/뷰포트 집계라 동별 목록 응답 수집 결과와 1:1로 맞지 않을 수 있다. MVP는 숫자 완전 일치보다 검토 가능한 후보 목록 정리를 우선한다.
- 네이버부동산 수집은 MVP 완료 조건에서 제외하고 향후 과제로 이관한다. 공식 API가 아니므로 빈 응답/429/구조 변경 가능성이 있어 현재 UI/API에서는 제거했다.
- 네이버부동산 다음 검토 순서는 사용자 URL/CSV import, 로컬 Chrome 세션 기반 캡처 POC, provider/proxy 어댑터 순서다.
- 수집 결과는 실행 요약으로 보여주고, 하단 `저장된 상가` 목록에 누적 저장한다. 저장 목록은 저장 시군구 칩, 동별 현재 페이지 지도 패널, 표-지도 마커 번호 매칭, 동 단위 카드, 동 내부 페이지네이션, 저장일, 별표, 추천점수, 별표/1층/관리비 필터, 정렬을 제공한다. `최신화`는 같은 매물을 중복 추가하지 않고 새로 발견된 매물만 신규 저장한다.
- 별표는 `external_property_listings.data.favorite`에 저장하며 재수집 업데이트에서도 보존한다.
- 점포목록에는 자동 등록하지 않는다. 사용자가 특정 외부 매물을 선택하면 `/api/realty/listings/promote`를 통해 ERP 물건지로 수동 승격한다.
- 수동 승격은 `properties.operation_type='external'`, `data.externalImportMode='manual-promoted'`로 생성하고, 외부 원본의 `property_id`, `status='promoted'`, `data.promotedToPropertyId`를 갱신한다. 같은 원본을 다시 승격하면 기존 물건지를 반환한다.
- 2026-06-11 안정화 QA에서 `manual-promoted` 물건지가 `/properties` 상세/검색/외부수집 필터와 배지에 포함되도록 수정하고 검증했다.
- 2026-06-11 운영 화면 워크플로를 추가했다. `manual-promoted` 물건지는 `/dashboard/franchise-operations`의 `외부 승격 물건지 운영 전환` 패널에 표시되고, 사용자가 `운영점 등록`을 눌렀을 때만 `franchise_locations.source_property_id`가 연결된 `오픈준비` 운영점으로 등록된다.
- 2026-06-11 안정화 QA에서 `서울 마포구 합정동` 재수집 업데이트, `서울 광진구` 구 단위 동 확장 warning, `registerToProperties` 400 차단, 수집 전후 ERP `properties` 자동 생성 0건을 확인했다.
- 2026-06-11 권한/회사 범위 QA에서 교차 회사 승격/조회 차단, 회사 없는 requester 소유 범위 조회, 회사 없는 requester의 승격 400 차단과 `properties` 자동 생성 0건을 확인했다.
- 자세한 구현 범위는 이 로드맵에서 유지하고, 실제 검증 상태와 남은 QA는 `franchise-dev-qa-log.md`에서 관리한다.

## 외부 API 정책

### Naver 공식 API

- 용도: 브랜드 모니터링, 블로그/뉴스/지역검색, DataLab 트렌드.
- 장점: 공식 API라 운영 안정성이 높다.
- 한계: 네이버 플레이스 방문 리뷰/블로그 리뷰/플레이스 광고 배지 수집에는 부족하다.

### SearchAPI / SerpApi

- 용도: Naver SERP POC, 플레이스형 결과, 광고 영역 후보 수집.
- SearchAPI 현 상태: 2026-06-09 기준 월 검색 가능량 0개, 남은 크레딧 -3.
- 비용/한도 관리 원칙:
  - 경쟁스캔 버튼 연타를 막는 재스캔 제한을 둔다.
  - 같은 위치/키워드/반경은 캐시된 스캔을 우선 보여준다.
  - 429/한도 초과 시 이전 성공 값을 덮어쓰지 않는다.
  - UI는 `미수집` 대신 `SearchAPI 한도초과`처럼 원인을 분리 표시한다.

### Google Places API

- 용도: 경쟁사 Google 평점/리뷰 수 보조 지표.
- 비용 절감 원칙:
  - 기본은 Places Text Search만 사용한다.
  - Place Details의 `reviews` 필드는 기본 OFF로 둔다.
  - UI에서 리뷰 본문을 사용하지 않는 동안 상세 리뷰 호출은 하지 않는다.

### Kakao Local / Kakao Map

- 용도: 주소 검색, 좌표 변환, 반경 경쟁사 검색, 지도 표시.
- 한계: Kakao Local 공식 API는 리뷰 수/리뷰 본문을 제공하지 않는다.
- 리뷰 확인은 Kakao맵 매장 링크를 통해 사용자가 직접 확인하는 구조로 둔다.

## 다음 작업 목록

### P0

- 모객 DB 핵심 플로우는 2026-06-11 로그인 세션 QA를 통과했다.
  - `1차 유입 DB -> 후보자` 승격, 업무 큐 `전체 업무/연락 지연/오늘 연락/무응답`, 후보자 상세 업무 필드 저장, 출점 후보지/외부 상가 DB 연결/메모/삭제/중복 방지를 확인했다.
- 2026-06-11 안정화 QA에서 기존 단계값 없는 리드 유지, `연락 완료` 처리, 후보지 연결 상태/메모 reload 유지를 추가 확인했다.
- 엑셀 업로드 파일 유입 QA runner(`scripts/franchise-p0-lead-ingress-qa.mjs`)는 2026-06-11 `admin` requester와 실제 `.xlsx` fixture로 통과했다. runner 생성 리드는 `raw_intake` 저장 후 `candidate` 승격과 cleanup까지 확인했다.
- 남은 P0 회귀 QA는 실제 Meta 유입과 실운영 계정 role matrix 확인이다. Meta는 계정/앱/env가 없어 `BLOCKED_META_ENV`/HOLD 상태이며, 실운영 role matrix runner는 실제 회사 A/B/no-company 계정 env가 없어 `BLOCKED_REAL_ROLE_MATRIX`로 기록했다.
- 본사별 정보공개서 저장/후보자 발송/발송 후 14일 계약 잠금 MVP는 2026-06-11 구현 및 SQL 적용 후 live QA까지 완료했다. 2차 고도화는 이메일/카카오 알림톡 자동발송 연동으로 분리한다.
- 모객 DB UI/등록 폼 개선은 2026-06-11 로컬 dev 서버와 Playwright에서 확인했다. 남은 P0 범위는 UI 기능 자체가 아니라 실제 Meta 유입, 실운영 계정 role matrix, 오픈 준비 프로젝트 브라우저 persistence 회귀다.

### P1

- SearchAPI 유료 결제 후 아래 항목을 한 묶음으로 진행한다.
  - SearchAPI 429/월 한도 초과가 발생해도 기존 Naver 리뷰/광고 성공 값을 덮어쓰지 않는 보호 로직
  - UI의 `Naver 미수집`, `수집오류` 문구를 `SearchAPI 한도초과`, `provider 미설정`, `결과 없음`으로 분리
  - 경쟁스캔 재실행 버튼의 최소 재스캔 간격 또는 확인 문구
  - 외부 상가 고도화 1순위/2순위/3순위: 업종별 예산/면적 규칙, 좌표 영구 저장 및 기존 지도 통합, 같은 주소와 비슷한 가격/면적의 중복 후보 묶기
- 외부 상가 수집 MVP를 실제 Supabase migration 적용 후 검증한다.
  - 2026-06-11 `서울 광진구 화양동`, `서울 마포구 합정동`, `서울 광진구` 구 단위 확장 수집은 통과했다. 합정동 재수집과 광진구 구 단위 수집은 기존 행 업데이트로 처리됐다.
  - 시도/시군구 선택, 저장 지역 칩, 저장된 상가 동 카드, 최신화 버튼이 의도대로 동작하는지 확인한다.
  - 2026-06-11 `scripts/franchise-realty-scale-raw-qa.mjs --live-collect`로 `서울 광진구 화양동`, collect limit 3000, saved limit 2000을 실행했다. Daangn 원본 238건 중 신규 1건/업데이트 237건, 저장 목록 350건, raw/data 샘플 10/10, `registerToProperties=false` 기준 ERP `properties` 생성 0건을 확인했다. 실제 2000/3000에 근접한 대량 데이터셋은 별도 지역에서 추가 확인한다.
  - 외부 수집 결과가 ERP `properties`에 자동 등록되지 않는지는 2026-06-11에 재확인했다. import API 변경 때마다 회귀 확인한다.
  - 선택 외부 상가 수동 승격은 2026-06-11 1차 구현/QA, 점포목록 상세/검색/외부수집 필터 회귀, 운영 화면 전환 워크플로 확인을 통과했다.
- 외부 상가 수집 고도화는 아래 순서로 진행한다.
  - 1순위: 필터/점수화 기초 구현 완료. 다음은 업종별 예산/면적 규칙, 최근 등록 가중치, 중개사/직거래 조건을 설정화한다.
  - 2순위: 지도화 기초 구현 완료. 다음은 Kakao/Naver 서버 주소 API로 좌표를 영구 저장하고 기존 점포/출점 후보지/경쟁환경 지도와 통합한다.
  - 3순위: 같은 주소와 비슷한 가격/면적의 중복 후보 묶기
  - 4순위: 점수 상위 30~50건 상세 페이지 추가 조회
  - 5순위: 재수집 기반 가격/상태 변동 추적
  - 6순위: 사용자가 선택한 외부 매물만 ERP 물건지로 승격 완료. 점포목록 상세/검색/외부수집 필터, 권한/회사 범위, 승격 후 운영 워크플로 QA까지 통과했다. 모바일 전역 사이드바 기본 접힘 회귀는 2026-06-11 통과했고, 다음은 실운영 계정 role matrix live QA다.
- 네이버부동산은 위 고도화 이후 별도 트랙으로 진행한다.
  - 1순위: 사용자가 복사한 네이버부동산 URL/CSV/JSON을 ERP 외부 원본 목록으로 import
  - 2순위: 로컬 Chrome 로그인 세션에서 사용자가 직접 연 페이지의 목록 데이터를 읽는 캡처 POC
  - 3순위: Korean proxy/session을 제공하는 외부 provider 어댑터 검토
  - 제외: CAPTCHA/차단 우회 자동화, 로그인/문의/채팅/예약 등 외부 서비스 write action
- `competitionScan` 캐시 정책을 명확히 한다.
  - 같은 주소/키워드/반경은 최근 스캔을 우선 표시한다.
  - 수동 재스캔 시에만 외부 provider를 다시 호출한다.
  - 실패한 provider만 재시도할 수 있는 부분 재수집 버튼을 검토한다.
- Naver 광고 영역 설명을 더 명확히 한다.
  - 현재 자동 판별은 SearchAPI 구조화 광고 목록 기준이다.
  - 네이버 플레이스 지도 카드의 `광고` 배지는 별도 수집 대상이며 현재 자동 수집하지 않는다.

### P2

- `goaldeer/naver-place-rank-tracker`는 Naver Place 순위 POC 참고용으로만 검토한다. 비공식 HTML 파싱 기반이라 운영 핵심 의존성으로 두지 않는다.
- `chalkpe/naver-place`는 오래된 `store.naver.com` 기반 구현이라 현재 네이버 플레이스 수집에는 부적합하다.
- Naver Place 광고 배지/리뷰 상세 자동 수집은 공식 API 부재와 서비스 약관 리스크를 따로 검토한 뒤 POC 범위를 정한다.

### P3

- 브랜드 모니터링 대시보드에서 공식 Naver API 수집 스냅샷을 실제 데이터로 검증한다.
- 브랜드별 위험 키워드, 지역검색 노출, 뉴스/블로그 언급량을 출점 후보지 인사이트와 연결한다.
- Meta Lead Ads HOLD 해제 후 Meta 광고 성과 대시보드를 추가한다.
  - 현재 플레이 중인 캠페인/광고세트/광고 소재를 본사 담당자가 확인할 수 있게 한다.
  - 소재별 유입 리드 수, CPL, 후보자 승격 수, 상담 진행 수, 계약 전환율을 비교한다.
  - 기간 필터와 브랜드/지역/담당자 필터를 제공해 어떤 소재가 실제 모객에 기여하는지 확인한다.
  - Meta Marketing API 권한과 광고 계정 연결이 준비되기 전까지는 `BLOCKED_META_ENV`/HOLD 상태로 유지한다.
- Meta 광고 성과는 리드 소스별 CPL/계약 전환율과 후보지 추천 점수에도 연결한다.

## 추가로 만들면 좋은 문서

- `ERP/web/docs/provider-api-costs.md`
  - Naver/SearchAPI/SerpApi/Google/Kakao별 과금 단위, 월 한도, 스캔 1회당 예상 호출 수, 비용 절감 정책을 관리한다.
- `ERP/web/docs/franchise-data-contract.md`
  - `franchise_locations.data.competitionScan`, `franchise_brands`, 브랜드 모니터링 스냅샷 JSON 구조를 관리한다.
- `ERP/web/docs/franchise-ops-runbook.md`
  - 로컬 서버 실행, SQL 적용 순서, env 확인, 경쟁스캔 장애 대응, provider 한도 초과 대응 절차를 관리한다.

위 세 문서는 지금 당장 모두 만들기보다, 다음 구현에서 실제 운영 이슈가 반복될 때 분리하는 것이 좋다. 현재는 이 로드맵, `franchise-dev-qa-log.md`, `documentation-agent.md`, `MAC_CONTEXT.md`, `README.md`만 갱신해도 충분하다.
