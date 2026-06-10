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
- 외부 상가 매물 수집: `ERP/web/docs/realty-import-plan.md`에 구현 범위와 QA 체크리스트 정리

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
- 진입점은 물건지 상세가 아니라 `/dashboard/franchise-operations`의 `외부 상가 수집` 탭으로 배치했다.
- 구 단위 당근 검색은 지역 API 후보를 동 단위로 확장해 수집하도록 보정했다.
- 당근 목록 호출은 `salesType=store`를 명시해 전체 매물 중 일부만 상가로 필터링되던 누락을 줄였다.
- 외부 수집 결과 표는 당근 요약 매물명 대신 주소를 기본 식별값으로 표시하고, 가격, 면적/층, 관리비, 사용승인일, 등록일, 채팅/관심 수, 사진 수, 설명 일부, 원문 링크를 노출한다.
- 화면 기본 수집 리밋은 500건, API 안전 상한은 1000건으로 정했다.
- 중복 원본은 `company_id + source + source_listing_id` 기준으로 관리한다.
- 점포목록 자동 등록은 끄고, 향후 선택한 외부 매물만 ERP 물건지로 승격하는 방식으로 분리했다.
- `realty_import_jobs`가 schema cache에 없을 때 `Realty import failed` alert가 뜨던 문제를 확인하고, SQL 미적용 시 migration 적용 안내를 반환하도록 보정했다.
- 당근 지도 숫자는 지도 클러스터/필터/뷰포트 집계라 동별 공개 목록 응답 수집 건수와 1:1로 맞지 않을 수 있으며, 현재 MVP는 숫자 완전 일치보다 검토 가능한 후보 정리를 우선한다.
- 방향, 입주가능일, 화장실, 주차, 위반건축물, 건축물 용도, 세부 위치/특징은 상세 페이지 추가 호출이 필요하므로 상위 N건 선택 보강 대상으로 분리했다.
- 네이버부동산 POC는 단일 `articleList` 호출에서 모바일 `clusterList -> articleList` 흐름으로 보강했다.
- UI에서는 네이버를 기본 소스가 아니라 `네이버 보조 POC`로 표시하고, 빈 응답/429/구조 변경 가능성이 있어 현재 MVP에서는 당근 상가 수집을 기본으로 유지한다.
- 네이버부동산 대안 조사를 진행했다. `single-markers/2.0` 계열 예시는 아파트/단지 마커 요약에 가까워 상가 목록 수집에는 바로 맞지 않고, `clusterList -> articleList` 계열은 서버 호출에서 빈 응답/429가 반복될 수 있어 MVP 완료 조건에서 제외했다.
- 네이버부동산은 향후 `사용자 URL/CSV import -> 로컬 Chrome 세션 기반 캡처 POC -> provider/proxy 어댑터` 순서로 재검토한다.

## QA 결과

### 통과

- `npm run lint -- --quiet`
- `npx tsc --noEmit`
- `npm run build`
- 2026-06-09 외부 상가 수집 MVP 구현 후 `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` 통과
- 2026-06-09 `realty_import_jobs` schema cache 오류 대응 후 `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` 재통과
- 2026-06-09 `POST /api/realty/import-jobs`를 `sources=["naver_land"]`, `region="서울 광진구"`로 확인했을 때 HTTP 성공, 매물 0건 warning 정상 반환
- `npm run start -- -p 3000`
- `http://localhost:3000/login` HTTP 200 확인
- `http://localhost:3000/dashboard/franchise-leads/market-insights` 보호 라우트 로그인 이동 확인
- `http://localhost:3000/dashboard/franchise-operations` 보호 라우트 로그인 이동 확인
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
- 실제 로그인 세션에서 전체 사용자 플로우를 끝까지 반복 QA한 기록은 아직 부족하다.
- 이번 Docs Steward 감사에서는 새 브라우저/빌드 QA를 실행하지 않았고, 문서와 코드 검색 기준으로 최신성만 확인했다.
- 외부 상가 수집은 구현 직후 상태이며 아직 실제 Supabase migration 적용 후 지역별 실수집 QA를 완료하지 않았다.
- 네이버부동산 POC는 지역 코드 조회는 가능해도 목록 응답이 빈 값일 수 있어 운영 데이터 소스로 확정하지 않았다.
- 네이버부동산 보조 POC의 `clusterList -> articleList` 흐름은 빈 응답/429 가능성이 있어 현재 MVP QA에서 분리하고, 향후 과제 트랙에서 반복 QA한다.
- 네이버부동산은 향후 과제로 이관했으므로 현재 외부 상가 수집 MVP의 차단 이슈로 보지 않는다.
- API에는 `registerToProperties` 분기가 남아 있으므로 현재 UI의 `false` 기본값과 운영 정책상 자동 등록 금지가 유지되는지 회귀 QA가 필요하다.
- `salesType=store` 적용 후 당근 상가 수집 결과가 기존보다 늘어나는지 아직 실데이터로 확인하지 않았다.
- 주소 중심 결과 표가 실제 로그인 화면에서 가격/면적/층/관리비/승인일/등록일/반응수/사진 수/설명 일부/원문 링크를 기대대로 보여주는지 확인이 필요하다.
- `external_property_listings.raw`와 `data`에 원본 응답과 정규화 보조 정보가 저장되는지 DB 기준 확인이 필요하다.

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
- 네이버부동산은 공식 API가 아니라 보조 POC 어댑터로 둔다. 지역 코드 확인 후 `clusterList -> articleList` 흐름을 시도하되 빈 응답/429 제한은 warning으로 남긴다.
- 네이버부동산 수집 실패는 당근 상가 수집 MVP 실패로 처리하지 않는다. 운영 적용 전에는 URL/CSV import나 로컬 세션 캡처 방식부터 별도 검증한다.
- 외부 매물 수집은 읽기 전용이며 로그인, 문의, 채팅, 예약, 결제 자동화는 하지 않는다.

## 다음 QA 체크리스트

### P0

- SearchAPI 429 발생 시 기존 Naver 리뷰/광고 값이 유지되는지 확인
- UI에서 `SearchAPI 한도초과`, `provider 미설정`, `결과 없음`이 구분 표시되는지 확인
- 경쟁스캔 재실행 시 외부 provider 호출 남발을 막는지 확인
- 기존 스캔 캐시가 있을 때 상세 모달이 정상 렌더링되는지 확인

### P1

- `supabase_realty_import_migration.sql` 적용 후 `/dashboard/franchise-operations`의 `외부 상가 수집` 탭에서 당근 상가 수집을 확인
- `salesType=store` 적용 후 당근 상가 수집 결과가 기존보다 늘어나는지 확인
- `광진구` 입력 시 동 단위 확장 warning이 표시되는지 확인
- 같은 `source + listingId` 재수집 시 `external_property_listings`가 신규 생성이 아니라 업데이트되는지 확인
- 화면 기본 500건 수집 리밋과 API 1000건 안전 상한이 적용되는지 확인
- 기존 물건지와 주소가 같은 외부 매물이 `duplicate_candidate`로 표시되는지 확인
- 외부 수집 결과가 점포목록에 자동 등록되지 않는지 확인
- `external_property_listings`에 원본 raw/data가 저장되는지 확인
- 결과 표가 주소 중심으로 표시되는지 확인
- 네이버부동산 향후 트랙은 URL/CSV import부터 별도 POC로 검증하고, 현재 당근 상가 수집 QA와 분리
- API `registerToProperties` 분기가 실수로 켜지지 않는지 확인
- 실제 로그인 계정에서 출점 후보지 등록 -> 브랜드 선택 -> 주소 선택 -> 경쟁스캔 -> 상세 모달 확인
- 가맹 운영 화면에서도 같은 `LocationCompetitionPanel`이 깨지지 않는지 확인
- 정보공개서 브랜드 검색이 공식 API 지연/실패 시 로컬 캐시로 fallback 되는지 확인
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
