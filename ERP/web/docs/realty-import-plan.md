# Realty Import Plan

## 목적

가맹 운영 화면에서 지역 기준 외부 상가 매물을 수집하고, 점포목록과 분리된 외부 원본 목록으로 관리하는 MVP를 관리한다.

## 현재 범위

- 진입점: `/dashboard/franchise-operations`의 `외부 상가 수집` 탭
- 수집 대상: 상가 전용
- 수집 방식: 지역명 입력 후 외부 소스별 대량 수집
- 저장 방식:
  - `realty_import_jobs`에 수집 실행 이력 저장
  - `external_property_listings`에 원본 매물과 원문 JSON 저장
  - `properties`에는 자동 생성하지 않는다.
- 화면 기본 수집 리밋은 500건이고, API 안전 상한은 1000건이다.
- SQL이 아직 적용되지 않아 수집 이력 테이블이 없으면 저장을 막고 migration 적용 안내를 반환한다.
- 향후 사용자가 특정 외부 매물을 선택했을 때만 ERP 물건지로 등록하는 버튼을 별도 추가한다.

## 구현 파일

- SQL:
  - `ERP/web/supabase_realty_import_migration.sql`
  - `ERP/web/supabase_schema.sql`
- 수집/정규화:
  - `ERP/web/src/lib/realty-import.ts`
- API:
  - `POST /api/realty/import-jobs`
  - `GET /api/realty/import-jobs/:id`
  - `GET /api/realty/listings`
- UI:
  - `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx`
  - `ERP/web/src/app/(main)/properties/page.tsx`

## 수집 소스 정책

### Daangn

- 기본 활성 소스다.
- 지역 API로 내부 지역 id를 해석한 뒤 `salesType=store`를 붙여 부동산 목록 `_data` 응답을 읽는다.
- `광진구`처럼 구 단위로 입력하면 지역 API 후보를 동 단위로 확장해 여러 지역을 수집한다.
- MVP에서는 `salesType` 또는 `salesTypeV2`가 `STORE`인 항목만 저장한다.
- 공개 웹 구조에 의존하므로 원본 URL, raw payload, 수집 시각을 함께 저장한다.
- 목록 응답에 포함된 주소, 보증금/월세/매매가, 면적/평수, 층, 관리비, 사용승인일, 등록일, 채팅/관심 수, 사진 수, 설명 일부, 중개사/직거래 추정 `writerType`은 저장/표시 대상이다.
- 방향, 입주가능일, 화장실, 주차, 위반건축물, 건축물 용도, 세부 위치/특징 정규화는 상세 페이지 추가 호출이 필요하므로 기본 수집에서는 제외한다.
- 상세 수집은 500건 전체가 아니라 점수 상위 30~50건처럼 상위 N건에만 선택적으로 수행하는 방향이 좋다.

## 숫자 차이와 MVP 한계

- 현재 수집 경로는 `동별 공개 목록 응답 + salesType=store` 기반이다.
- 당근부동산 지도 숫자는 지도 클러스터, 필터, 뷰포트 집계 기준이라 목록 응답으로 저장한 숫자와 1:1로 맞지 않을 수 있다.
- 이 차이는 MVP 수집 방식의 한계이며, 현재 목적에는 충분하다.
- 지도 숫자와 완전 일치시키기보다 수집 결과를 주소/가격/면적/상태 기준으로 검토 가능하게 정리하는 방향을 우선한다.

### Naver Land

- MVP 기본 수집 소스에서 제외하고 향후 과제로 이관한 보조 POC 소스다.
- `map/getRegionList`로 지역/좌표를 해석하고 `cluster/clusterList -> cluster/ajax/articleList` 계열 목록 호출을 시도한다.
- 네이버부동산은 공식 공개 API가 아니므로 빈 응답, 429 제한, 구조 변경 가능성이 높다.
- 네이버 목록 수집 실패는 job warning으로 남기고, 당근 수집과 원본 저장은 계속 진행한다.
- UI에서는 `네이버 보조 POC`로 표시해 기본 수집 소스가 아님을 명확히 한다.
- 현재 운영 기준에서는 네이버부동산 실패를 수집 실패로 보지 않고, 당근 상가 수집 MVP를 우선 완료한다.

### Naver Land 향후 검토안

- `new.land.naver.com/api/complexes/single-markers/2.0` 방식은 아파트/단지 마커 요약에 가까워 상가 목록 MVP에는 바로 맞지 않는다.
- `clusterList -> articleList` 방식은 상가 목록에 가장 가까운 비공식 웹 표면이지만, 서버 호출에서 빈 응답이나 429가 반복될 수 있다.
- 다음 검토 순서는 `사용자 URL/CSV import -> 로컬 Chrome 세션 기반 캡처 POC -> provider/proxy 어댑터` 순서로 둔다.
- 로그인, CAPTCHA, 차단 우회 자동화는 MVP 범위에서 제외하고, provider/proxy 방식은 약관/법무/비용 검토 후 별도 진행한다.
- 참고 레퍼런스:
  - https://velog.io/@qldh1654/naverland
  - https://github.com/BiohPark/naverland
  - https://github.com/jissp/naver-land-crawler

## 중복 정책

- 1순위: `company_id + source + source_listing_id`가 같으면 기존 외부 원본을 업데이트한다.
- 2순위: 주소가 완전히 같은 기존 `properties`가 있으면 `duplicate_candidate`로 표시한다.
- 주소/가격/면적 유사 중복은 다음 단계에서 별도 검토 로직으로 확장한다.
- 현재 가맹 운영 화면은 `registerToProperties=false`로 호출하므로 중복 재수집은 ERP 물건지가 아니라 `external_property_listings` 기준으로 검증한다.

## UI 정책

- `가맹 운영 > 외부 상가 수집` 탭에서 지역, 회사명, 수집 소스를 입력한다.
- 구 단위 입력은 당근 지역 후보를 동 단위로 확장한다. 예: `광진구` -> `자양동`, `화양동`, `구의동`, `광장동`, `군자동`, `중곡동`, `능동`.
- 화면 기본 수집 리밋은 500건이고, API 안전 상한은 1000건이다.
- 어드민 계정은 회사 범위가 비어 있을 수 있으므로 수집 탭에 등록 회사명 입력을 둔다.
- 결과는 수집/신규수집/업데이트/중복후보/실패 건수와 주소 중심 원문 링크 표로 보여준다.
- 결과 표는 매물명보다 주소를 중심으로 표시하고, 가격, 면적/층, 관리비, 사용승인일, 등록일, 채팅/관심 수, 사진 수, 설명 일부, 원문 링크를 함께 보여준다.
- 점포목록 자동 등록은 하지 않는다.
- 기존 점포목록의 `외부수집` 필터/배지는 과거 자동 등록 데이터나 수동 승격 데이터 확인용으로만 유지한다.

## 고도화 개발순서

### 1순위: 필터/점수화

- 보증금, 월세, 면적, 층, 등록일, 관리비, 중개사/직거래 기준으로 후보 점수를 계산한다.
- 1층, 최근 등록, 예산 내, 면적 적정, 관리비 명확, 주소 정보 충분 같은 조건에 가점을 둔다.

### 2순위: 주소 지오코딩 및 지도화

- Kakao/Naver 주소 API로 외부 매물 좌표를 보강한다.
- 외부 매물을 지도에 표시하고 기존 점포, 출점 후보지, 경쟁환경과 함께 볼 수 있게 한다.

### 3순위: 중복 후보 묶기

- 같은 주소와 비슷한 가격/면적의 매물을 하나의 후보군으로 묶는다.
- 중개사별 중복 등록을 정리해 사용자가 실제 후보지를 빠르게 판단하게 한다.

### 4순위: 상위 N건 상세 보강

- 점수 상위 30~50건만 상세 페이지를 추가 조회한다.
- 방향, 입주가능일, 화장실, 주차, 위반건축물, 건축물 용도, 세부 위치/특징을 보강한다.

### 5순위: 가격/상태 변동 추적

- 재수집 시 가격, 월세, 상태, 삭제 추정 변경 이력을 기록한다.
- 신규, 가격변동, 삭제추정 배지를 표시한다.

### 6순위: 선택 승격 플로우

- 외부수집 목록에서 사용자가 선택한 매물만 ERP 물건지로 등록한다.
- 자동등록은 계속 OFF로 유지한다.
- 승격 시 원본 `sourceListingId`, `sourceUrl`, `importJobId` 연결을 보존한다.

## QA 체크리스트

- `supabase_realty_import_migration.sql` 적용 후 테이블/RLS가 생성되는지 확인한다.
- 당근 정상 케이스:
  - `합정동`, `광진구` 등으로 상가 매물이 내려오는지 확인한다.
  - `salesType=store` 적용 후 당근 상가 수집 결과가 기존보다 늘어나는지 확인한다.
  - `광진구` 입력 시 동 단위 확장 warning과 동별 원본/상가 수가 표시되는지 확인한다.
  - ERP `properties`에 자동 생성되지 않는지 확인한다.
  - `external_property_listings`에 원본 raw/data가 저장되는지 확인한다.
  - 결과 표가 주소 중심으로 표시되는지 확인한다.
- 네이버 향후 과제 검토 시:
  - 지역 코드 조회 성공 여부를 확인한다.
  - `clusterList -> articleList` 흐름이 실패하거나 목록 응답이 비어도 전체 job이 실패하지 않고 warning으로 남는지 확인한다.
  - 429 제한이 발생해도 당근 상가 수집 결과가 유지되는지 확인한다.
  - UI에서 `네이버 보조 POC`로 표시되는지 확인한다.
- 중복 케이스:
  - 같은 `source + listingId`를 재수집하면 신규 생성이 아니라 업데이트되는지 확인한다.
  - 같은 주소 기존 물건지가 있으면 중복후보가 표시되는지 확인한다.
  - 재수집으로 ERP `properties`가 생성되지 않는지 확인한다.
- 회사 격리:
  - 다른 회사 사용자가 만든 외부수집 매물이 보이지 않는지 확인한다.
- UI:
  - 가맹 운영 탭에서 수집 실행, 결과 확인, 원문 링크 이동을 확인한다.
  - 점포목록으로 자동 유입되지 않는지 확인한다.
- 검증 명령:
  - `npm run lint -- --quiet`
  - `npm run build`

## 참고 레퍼런스

- Daangn 공개 표면: https://github.com/NomaDamas/k-skill/blob/main/docs/features/daangn-realty-search.md
- Naver Land POC 참고: https://github.com/jissp/naver-land-crawler

## 운영 주의

- MVP는 공개 웹 데이터의 읽기 전용 수집만 한다.
- 로그인, 문의, 채팅, 예약, 결제, 우회 자동화는 하지 않는다.
- 운영 전에는 서비스 약관과 법무 검토가 필요하다.
- 외부 웹 구조 변경 가능성이 있으므로 raw payload와 수집 시각을 보존한다.
- 정상 운영 전에는 `supabase_realty_import_migration.sql`을 적용해야 원본 추적과 수집 이력 조회가 가능하다.
