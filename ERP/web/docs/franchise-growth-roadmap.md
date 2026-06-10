# Franchise Growth Roadmap

## 목적

프랜차이즈 본사용 고도화 작업의 우선순위, 현재 구현 상태, 외부 API 한계, 다음 작업 기준을 한곳에서 관리한다. 세션 인수인계는 `MAC_CONTEXT.md`를 우선으로 보되, 기능별 의사결정과 제품 방향은 이 문서를 기준으로 삼는다.

## 문서 운영 원칙

- `ERP/web/handoff.md`는 단일 작성자 규칙 때문에 Codex가 수정하지 않는다. 내용이 오래되어도 검토 참고만 하고 변경하지 않는다.
- `MAC_CONTEXT.md`는 다음 세션이 바로 이어서 작업할 수 있도록 현재 상태와 로컬 운영 규칙을 짧게 갱신한다.
- `ERP/web/README.md`는 실행, 환경변수, SQL 적용 순서처럼 개발자가 바로 따라야 하는 설정 정보를 관리한다.
- `ERP/web/docs/franchise-growth-roadmap.md`는 프랜차이즈 고도화 계획, API 정책, 다음 작업 목록을 관리한다.
- `ERP/web/docs/franchise-dev-qa-log.md`는 개발 과정, 검증 결과, 미검증 리스크, 다음 QA 체크리스트를 관리한다.
- `ERP/web/docs/documentation-agent.md`는 Docs Steward의 문서 직접 반영 권한, 금지 범위, 보고 형식을 관리한다.
- `ERP/web/docs/fdam-reference.md`는 외부 ERP 레퍼런스 분석 문서로 유지하고, 현재 구현 상태 문서로 사용하지 않는다.
- `ERP/web/docs/realty-import-plan.md`는 가맹 운영 외부 상가 매물 수집 MVP의 구현 범위, API/DB, QA 체크리스트를 관리한다.
- Docs Steward는 approved docs를 직접 수정할 수 있지만, `ERP/web/handoff.md`, 코드, SQL migration, env, package 파일은 수정하지 않는다.

## 현재 우선순위

1. Naver 공식 API MVP
2. SERP Provider POC
3. 브랜드 모니터링 대시보드
4. 출점 후보지/가맹 운영 경쟁환경 패널 고도화
5. 가맹 운영 외부 상가 매물 수집 MVP
6. Meta Lead Ads는 계정/앱 설정 문제가 풀릴 때까지 HOLD

## 현재 완료/진행 상태

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

### 출점 후보지/경쟁환경 패널

- `/api/franchise-locations/competitors`가 Kakao Local 기반 반경 경쟁사 목록을 저장한다.
- 결과는 `franchise_locations.data.competitionScan`에 저장한다.
- 기본 반경은 700m, 기본 리뷰 상세 수집 대상은 상위 8곳이다.
- 정렬은 고정 상위 업체를 두지 않고 `100m 거리 구간 -> Naver 리뷰 총량 -> 실제 거리` 기준의 `거리+리뷰순`이다.
- Kakao 지도, 반경 원, 경쟁사 마커, 거리권 분포, 리뷰/광고 상태를 모달에서 보여준다.
- Google은 비용 절감을 위해 Place Details의 `reviews` 필드를 호출하지 않고 Text Search 결과의 평점/리뷰 수/지도 URL만 저장한다.
- Kakao Local 공식 API는 리뷰 수/리뷰 본문을 제공하지 않는다. UI에서는 Kakao맵 매장 페이지에서 확인하도록 연결만 제공한다.

### 외부 상가 매물 수집 MVP

- `/dashboard/franchise-operations`에 `외부 상가 수집` 탭을 추가했다.
- 상가만 우선 수집한다. 사무실은 MVP 범위에서 제외했다.
- `realty_import_jobs`, `external_property_listings` 테이블과 외부 원본 목록 저장 흐름을 추가했다.
- Daangn은 현재 외부 상가 수집 MVP의 기본 수집 소스다.
- Daangn 구 단위 검색은 지역 API 후보를 동 단위로 확장해 수집한다.
- Daangn 목록 호출은 `salesType=store`를 명시한다.
- 화면 기본 수집 리밋은 500건, API 안전 상한은 1000건이다.
- 중복/재수집은 `company_id + source + source_listing_id` 기준으로 외부 원본을 업데이트한다.
- 당근 지도 숫자는 지도 클러스터/필터/뷰포트 집계라 동별 목록 응답 수집 결과와 1:1로 맞지 않을 수 있다. MVP는 숫자 완전 일치보다 검토 가능한 후보 목록 정리를 우선한다.
- 네이버부동산 수집은 MVP 완료 조건에서 제외하고 향후 과제로 이관한다. 공식 API가 아니므로 빈 응답/429/구조 변경 가능성이 있고, UI에서는 `네이버 보조 POC`로만 표시한다.
- 네이버부동산 다음 검토 순서는 사용자 URL/CSV import, 로컬 Chrome 세션 기반 캡처 POC, provider/proxy 어댑터 순서다.
- 점포목록에는 자동 등록하지 않는다. 특정 외부 매물을 ERP 물건지로 승격하는 흐름은 후속 검토한다.
- 자세한 구현 범위와 QA는 `realty-import-plan.md`에서 관리한다.

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

- SearchAPI 429/월 한도 초과가 발생해도 기존 Naver 리뷰/광고 성공 값을 덮어쓰지 않는 보호 로직을 완성한다.
- UI의 `Naver 미수집`, `수집오류` 문구를 `SearchAPI 한도초과`, `provider 미설정`, `결과 없음`으로 분리한다.
- 경쟁스캔 재실행 버튼에 최소 재스캔 간격 또는 확인 문구를 둔다.
- 위 항목은 `franchise-dev-qa-log.md`의 P0 QA 체크리스트에 맞춰 재검증한다.
- 구현/검증 후 Docs Steward가 관련 문서를 직접 갱신하고 `Doc Update Brief`를 남긴다.

### P1

- 외부 상가 수집 MVP를 실제 Supabase migration 적용 후 검증한다.
  - 당근 `합정동`, `광진구` 상가 수집 결과를 확인한다.
  - 같은 `source + listingId` 재수집 시 업데이트되는지 확인한다.
  - 화면 500건 기본 리밋과 API 1000건 안전 상한이 의도대로 동작하는지 확인한다.
  - 외부 수집 결과가 ERP `properties`에 자동 등록되지 않는지 확인한다.
- 외부 상가 수집 고도화는 아래 순서로 진행한다.
  - 1순위: 보증금, 월세, 면적, 층, 등록일, 관리비, 중개사/직거래 기준 필터/점수화
  - 2순위: Kakao/Naver 주소 API 기반 지오코딩 및 지도화
  - 3순위: 같은 주소와 비슷한 가격/면적의 중복 후보 묶기
  - 4순위: 점수 상위 30~50건 상세 페이지 추가 조회
  - 5순위: 재수집 기반 가격/상태 변동 추적
  - 6순위: 사용자가 선택한 외부 매물만 ERP 물건지로 승격
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
- Meta Lead Ads HOLD 해제 후 리드 소스별 CPL/계약 전환율과 후보지 추천 점수를 연결한다.

## 추가로 만들면 좋은 문서

- `ERP/web/docs/provider-api-costs.md`
  - Naver/SearchAPI/SerpApi/Google/Kakao별 과금 단위, 월 한도, 스캔 1회당 예상 호출 수, 비용 절감 정책을 관리한다.
- `ERP/web/docs/franchise-data-contract.md`
  - `franchise_locations.data.competitionScan`, `franchise_brands`, 브랜드 모니터링 스냅샷 JSON 구조를 관리한다.
- `ERP/web/docs/franchise-ops-runbook.md`
  - 로컬 서버 실행, SQL 적용 순서, env 확인, 경쟁스캔 장애 대응, provider 한도 초과 대응 절차를 관리한다.

위 세 문서는 지금 당장 모두 만들기보다, 다음 구현에서 실제 운영 이슈가 반복될 때 분리하는 것이 좋다. 현재는 이 로드맵, `franchise-dev-qa-log.md`, `documentation-agent.md`, `MAC_CONTEXT.md`, `README.md`만 갱신해도 충분하다.
