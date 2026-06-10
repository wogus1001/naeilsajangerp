# MAC_CONTEXT

## 목적
- 맥북에서 ERP/web 작업을 이어갈 때 필요한 운영 규칙, 폴더 구조, 배포 방식, 최근 상태를 한 문서에 정리한다.
- 새 Codex 세션은 이 문서와 [AGENTS.md](/C:/Users/awmve/OneDrive/바탕%20화면/my_project/ERP/web/AGENTS.md), [ROADMAP.md](/C:/Users/awmve/OneDrive/바탕%20화면/my_project/ERP/web/ROADMAP.md)를 먼저 읽고 시작한다.

## 현재 운영 방식
- 로컬 개발: `my_project`
- dev 배포용 worktree: `my_project_dev_deploy`
- 실서버 배포용 worktree: `my_project_main_release`
- 깨끗한 기준 확인용 worktree: `my_project_clean_main`

## 윈도우 기준 worktree 상태
- `C:/Users/awmve/OneDrive/바탕 화면/my_project` -> `main` at `8171138e`
- `C:/Users/awmve/OneDrive/바탕 화면/my_project_dev_deploy` -> `dev` at `0564333e`
- `C:/Users/awmve/OneDrive/바탕 화면/my_project_main_release` -> `release-main-20260324` at `b6f4c653`
- `C:/Users/awmve/OneDrive/바탕 화면/my_project_clean_main` -> `clean-main-20260324` at `a8258ccb`

## 맥북 권장 폴더 구조
- 권장 루트: `/Users/kimjaehyun/Documents/project/erp_workspace`
- 권장 구조:

```text
/Users/kimjaehyun/Documents/project/erp_workspace
├─ my_project
├─ my_project_dev_deploy
├─ my_project_main_release
└─ my_project_clean_main
```

## 중요한 주의사항
- `my_project*` 폴더들은 `git worktree`이므로 Finder에서 그냥 드래그 이동하지 않는다.
- ERP 관련 폴더를 한곳에 모으고 싶으면, 기존 폴더를 수동 이동하지 말고 새 위치에 clone/worktree를 다시 구성한 뒤 검증 후 교체한다.
- `node_modules`, `.next`는 플랫폼 종속이 있으므로 복사하지 않는다.
- `.env.local`은 git에 올리지 않는다.
- `handoff.md`는 단일 작성자 규칙 때문에 Codex가 수정하지 않는다.

## LazyCodex 운영 요약
- 상세 작업 규칙은 루트 `AGENTS.md`를 따른다.
- LazyCodex/OMO 스킬은 데스크탑 Codex와 터미널 Codex 모두에서 사용 가능하며, 필요 시 `omo:ulw-plan`처럼 네임스페이스를 명시한다.
- 화면/이미지 피드백이 많은 작업은 데스크탑 Codex를 우선 사용하고, 긴 CLI 루프는 터미널 Codex를 보조로 사용한다.
- 큰 작업은 `ulw-plan`으로 계획을 만든 뒤 사용자 승인 후 `start-work`로 실행한다.
- 사용자가 "끝까지", "알아서 진행", "문서/QA/커밋까지"를 요청하면 `ulw-loop`를 우선 고려한다.
- 커밋 전에는 변경 범위, `ERP/web/handoff.md` 무변경, 관련 검증 결과를 확인한다.
- 구조가 크게 바뀌거나 새 모듈이 생기면 `init-deep`로 프로젝트 메모리를 갱신한다.
- Codex는 주요 변경/커밋 전 Hermes Doc/Ops Brief 호출 타이밍과 붙여넣을 프롬프트를 사용자에게 제안한다.

## 맥에서 ERP 전용 폴더로 재구성하는 안전한 순서
- 이미 `/Users/kimjaehyun/Documents/project` 아래에 작업 폴더가 있는 상태를 기준으로 한다.
- 아래 방식은 기존 현재 상태를 유지한 채, 새 `erp_workspace`를 만들고 그 안에서 다시 구성하는 방식이다.

```bash
mkdir -p /Users/kimjaehyun/Documents/project/erp_workspace
cd /Users/kimjaehyun/Documents/project/erp_workspace

git clone https://github.com/wogus1001/naeilsajang.git my_project
cd my_project
git fetch origin

git worktree add ../my_project_dev_deploy dev
git worktree add -b release-main-$(date +%Y%m%d) ../my_project_main_release origin/main
git worktree add -b clean-main-$(date +%Y%m%d) ../my_project_clean_main origin/main
```

- 환경변수는 기존 위치에서 복사:

```bash
cp /Users/kimjaehyun/Documents/project/my_project/ERP/web/.env.local /Users/kimjaehyun/Documents/project/erp_workspace/my_project/ERP/web/.env.local
cp /Users/kimjaehyun/Documents/project/my_project/ERP/web/.env.local /Users/kimjaehyun/Documents/project/erp_workspace/my_project_dev_deploy/ERP/web/.env.local
cp /Users/kimjaehyun/Documents/project/my_project/ERP/web/.env.local /Users/kimjaehyun/Documents/project/erp_workspace/my_project_main_release/ERP/web/.env.local
cp /Users/kimjaehyun/Documents/project/my_project/ERP/web/.env.local /Users/kimjaehyun/Documents/project/erp_workspace/my_project_clean_main/ERP/web/.env.local
```

- 의존성 재설치:

```bash
cd /Users/kimjaehyun/Documents/project/erp_workspace/my_project/ERP/web && npm ci
cd /Users/kimjaehyun/Documents/project/erp_workspace/my_project_dev_deploy/ERP/web && npm ci
cd /Users/kimjaehyun/Documents/project/erp_workspace/my_project_main_release/ERP/web && npm ci
cd /Users/kimjaehyun/Documents/project/erp_workspace/my_project_clean_main/ERP/web && npm ci
```

- 최종 확인:

```bash
cd /Users/kimjaehyun/Documents/project/erp_workspace/my_project
git status
git worktree list

cd /Users/kimjaehyun/Documents/project/erp_workspace/my_project/ERP/web
npm run build
```

## 맥북 배포 방식
- 로컬에서 먼저 수정/확인
- dev로 올릴 때는 `my_project_dev_deploy`에서 필요한 파일만 반영 후 `dev`로 push
- 실서버는 `my_project_main_release`에서 필요한 파일만 반영 후 `HEAD:main`으로 push
- 최근 운영 원칙:
  - 실사용 확인이 필요한 작업은 `dev` 먼저
  - 확인 후 `main`
  - 예외적으로 사용자가 실서버 먼저 요청한 경우만 `main` 우선
  - 리뷰/후속 작업은 `codex/` 접두사의 작업 브랜치를 만들고, dev/main 반영 브랜치를 분리한다.

## 최근 배포 이력 기준점
- `dev` 최신 확인 커밋: `1f4cc3d` `fix: harden list search and logging`
- `main` 최신 확인 커밋: `d76f31a` `fix: harden list search and logging`

## 최근 중요 작업 요약
- 2026-06-09 Meta Lead Ads 개발 HOLD
  - 사유: Meta 계정/앱 설정 문제가 먼저 해결되어야 함
  - 현재 구현된 Meta Lead Ads 코드와 SQL은 유지하되, 계정 문제가 해결되기 전까지 추가 개발, dev/main 배포, 운영 활성화를 보류한다.
  - 재개 조건:
    - `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_API_VERSION`, `META_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` 준비
    - Meta Webhook Callback URL 및 OAuth Redirect URI 설정 완료
    - `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` 권한/검수 상태 확인
    - dev 테스트 Page/Form과 Lead Ads 테스트 수신 경로 준비
  - `handoff.md`는 단일 작성자 규칙 때문에 수정하지 않는다.
- 프랜차이즈 본사용 고도화 방향
  - 1순위: 모객 전환율 개선 Command Center
    - `오늘 연락`, `연락 지연`, `HOT 리드`, `무응답`, `계약 가능성` 중심의 업무 큐 강화
    - 리드별 `다음 액션`, `상담 결과`, `이탈 사유`, `자금/지역/브랜드 적합도`, `담당자 성과` 관리
    - KPI 우선순위: 응답 속도, 상담 전환율, 계약예정 전환율, 소스별 효율, 담당자별 처리율
    - 기존 고객/명함/엑셀 유입은 유지하고, Meta 유입은 HOLD 상태로 표시만 남긴다.
  - 2순위: 본사 운영관리
    - `가맹점/예정점 마스터`, `오픈 준비 프로젝트`, `SV 방문/점검`, `이슈/CS 티켓`, `공지/매뉴얼 배포`를 본사 직원용으로 추가
    - 1차 범위는 본사 사용자 전용이며 가맹점주 포털은 제외
    - 기존 계약/공지/점포 DB와 연결 가능한 구조로 잡되, 수발주/POS/로열티 자동정산은 후순위로 둔다.
  - 3순위: 점포·상권 매칭
    - 모객 리드의 `희망지역`, `예산`, `관심브랜드`와 기존 점포 DB를 연결
    - 후보자 상세에서 추천 점포, 추천 지역, 예산 적합도, 출점 리스크를 보여주는 방향
    - 지도/상권 분석은 기본 매칭 이후 별도 고도화로 진행
  - 2026-06-09 개발 순서:
    - 1차 완료: 기존 모객DB와 점포 DB만 사용해 `출점 후보지 인사이트` 추가
    - 2차 완료: 본사 직영점/가맹점/예정점 위치 마스터 DB/API/UI 분리
    - 화면 구조:
      - `/dashboard/franchise-leads/market-insights`: 후보자 및 출점 후보지 관리
      - `/dashboard/franchise-operations`: 현재 직영점/가맹점 운영 관리, 외부 상가 수집 탭 포함
      - `/dashboard/franchise-leads/brand-monitoring`: 브랜드별 모니터링 대시보드
    - 구분 원칙:
      - 출점 후보지: `예정점`, `검토중`, `오픈준비` 중심으로 모객 리드의 희망지역/예산/관심브랜드와 연결
      - 가맹 운영: `직영점`, `가맹점`, `운영중`, `휴점`, `폐점` 중심으로 본사 운영 상태 관리
    - 3차 진행: Kakao Local API로 반경별 주변 경쟁업체 수집 API/UI 추가
      - 위치 마스터별 `경쟁스캔` 버튼으로 주소를 좌표 변환한 뒤 반경 700m 장소 검색
      - 결과는 `franchise_locations.data.competitionScan`에 저장하고 지역별 경쟁강도 점수에 반영
      - 경쟁스캔은 `competitionKeyword` 또는 `brand`만 사용하고, 위치명 fallback은 금지한다. 지명으로 검색하면 요양원/파출소 등 비경쟁 장소가 섞임.
      - 출점 후보지/가맹 운영 주소 입력은 `/api/integrations/kakao/address`로 Kakao 주소 검색 결과를 선택하는 방식
      - 실행 env: `KAKAO_REST_API_KEY` 필요
    - 3.5차 진행: 브랜드 마스터 및 경쟁검색 키워드 추천
      - `franchise_brands` DB/API 추가. 회사 저장 브랜드와 정보공개서 기반 공용 브랜드를 분리 저장
      - 출점 후보지/가맹 운영의 브랜드 입력은 저장 브랜드를 상단 노출하고, 추가 브랜드 검색/직접 입력 가능
      - 브랜드 선택 시 업태/업종/분류를 함께 저장하고, 경쟁검색 키워드는 브랜드/업종 기반 추천값으로 자동 세팅하되 현장에서 수정 가능
      - 정보공개서 API 동기화는 `/api/franchise-brands/sync`와 `FRANCHISE_DISCLOSURE_API_URL`, `FRANCHISE_DISCLOSURE_SERVICE_KEY` 계열 env 준비 후 admin으로 실행
      - 적용 SQL: `ERP/web/supabase_franchise_brands_migration.sql`
    - 4차 진행: Naver 공식 API MVP + SERP Provider POC + 브랜드 모니터링 대시보드
      - `/api/franchise-market-monitoring` 및 `/dashboard/franchise-leads/brand-monitoring` 추가.
      - 공식 Naver API MVP는 블로그/뉴스/지역검색 총량과 TOP5, DataLab 검색어 트렌드, 위험 키워드 블로그/뉴스 언급량을 스냅샷으로 저장하는 구조.
      - Naver 키가 없으면 감시목록 저장과 설정 상태 표시만 가능하고, 수집 결과 스냅샷 저장은 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정 후 가능.
      - SERP Provider POC는 `SEARCHAPI_API_KEY` 또는 `SERPAPI_API_KEY`가 있을 때 선택 실행. SearchAPI는 `q`, SerpApi는 `query` 파라미터를 사용하도록 분기했고, `knowledge_graph`/장소형 결과까지 정규화해 우리 매장 노출 순위를 계산한다.
      - 대시보드는 수집 조건, 최근 스냅샷 KPI, 네이버 지역검색 TOP5, 위험 키워드 감지, 감시목록, 수집 이력 테이블로 구성.
      - 브랜드 검색은 점포 신규등록의 프랜차이즈 브랜드 찾기와 같은 별도 모달 방식으로 변경했다.
      - 정보공개서 브랜드 검색은 공공데이터포털 `공정거래위원회_가맹정보_브랜드 목록 정보 제공 서비스` 실시간 API(`FftcBrandRlsInfo2_Service/getBrandinfo`)를 우선 사용한다. 공식 API는 브랜드명 검색 파라미터가 없어 기준년도 데이터를 페이지 단위로 받아 서버에서 검색어를 필터링한다.
      - 공식 API 검색 속도 개선: 기준년도 기본 우선순위는 `FRANCHISE_DISCLOSURE_BASE_YEAR` 미설정 시 최근 완료 가능성이 높은 연도부터 조회하고, 페이지 조회는 병렬 처리 후 서버 프로세스 메모리에 6시간 캐시한다. 프론트는 로컬 캐시 결과를 먼저 표시하고 공식 API는 최대 3.5초만 버튼 로딩 상태로 기다린 뒤 늦게 도착하면 결과를 갱신한다.
      - 공식 API 키가 없거나 결과가 없으면 기존 `/api/franchise?query=` 로컬 정보공개서 캐시(`src/data/franchises.json`)를 보조로 병합한다. 저장 브랜드를 먼저 보여주고, 공식/캐시 검색 결과를 뒤에 병합한다.
      - 출점 후보지/가맹 운영 주소 검색도 점포 신규등록과 같은 Daum 우편번호 검색 모달 방식으로 맞췄다. 주소 선택 시 주소/지역을 채우고 좌표는 비워두며, 경쟁스캔은 기존처럼 서버에서 주소 기반 좌표 변환을 수행한다.
      - 적용 SQL: `ERP/web/supabase_franchise_market_monitoring_migration.sql`
      - 실데이터 테스트 전 선행 적용 필요 SQL: `ERP/web/supabase_franchise_brands_migration.sql`, `ERP/web/supabase_franchise_market_monitoring_migration.sql`
      - 브랜드 모니터링 실제 수집 전 선행 SQL: `ERP/web/supabase_franchise_brands_migration.sql`, `ERP/web/supabase_franchise_market_monitoring_migration.sql`
      - P0: SearchAPI 429/한도 초과 시 기존 Naver 리뷰/광고 성공 값을 덮어쓰지 않게 보호하고, UI를 `SearchAPI 한도초과`/`provider 미설정`/`결과 없음`으로 분리 표시.
      - P1: `supabase_realty_import_migration.sql` 적용 후 당근 `합정동`/`광진구` 상가 수집, 동 단위 확장 warning, `salesType=store` 적용 후 수집량 변화, 재수집 업데이트, 500/1000 리밋, 점포목록 미등록, 회사 격리 확인.
    - 4.5차 진행: 출점 후보지/가맹 운영 경쟁환경 패널 고도화
      - `/api/franchise-locations/competitors`가 Kakao Local 경쟁사 스캔 결과에 리뷰/광고 확장 필드를 함께 저장하도록 변경.
      - 경쟁사별 Kakao 장소 링크는 항상 저장하되, Kakao Local 공식 API는 리뷰 수/본문을 제공하지 않아 UI에 `리뷰수 공식 미제공`으로 표시한다.
      - Naver 리뷰/광고는 `SEARCHAPI_API_KEY` 또는 `SERPAPI_API_KEY`가 있을 때만 수집한다. 광고순위는 업체별 검색이 아니라 `지역 + 경쟁키워드` SERP 1회에서 광고 목록을 뽑아 경쟁사명과 매칭한다.
      - Google 리뷰는 `GOOGLE_PLACES_API_KEY` 또는 `GOOGLE_MAPS_API_KEY`가 있을 때 Places Text Search로 평점, 리뷰 수, 지도 URL만 수집한다. 비용 절감을 위해 Place Details의 `reviews` 필드는 기본 호출하지 않는다.
      - 2026-06-09 확인: 로컬 `.env.local`에 Google Places 키 저장 후 `Places API (New)` 호출 정상(`places:searchText` 응답 OK). 기존 Places endpoint fallback도 정상.
      - 기본 리뷰 상세 수집 대상은 스캔 결과 상위 8곳이며 `FRANCHISE_COMPETITOR_REVIEW_LIMIT`으로 0~10 범위 조절 가능.
      - 새 공통 UI `ERP/web/src/components/franchise/LocationCompetitionPanel.tsx` 추가. Kakao 지도, 반경 원, 경쟁사 마커, 거리권 분포, Naver/Google/Kakao 리뷰 상태, Naver 광고 노출 여부를 출점 후보지와 가맹 운영 화면에서 함께 사용한다.
      - 2026-06-09 UI 보정: 경쟁환경 패널은 목록에서 기본 접힘 요약형으로 변경. 지도/상세 리뷰/광고 리스트는 펼치기 버튼으로 확인하고, 위치 마스터 목록 내부 스크롤을 제거해 답답한 카드 느낌을 줄였다.
      - 2026-06-09 추가 UI 보정: 카드 내부 펼침 상세를 제거하고 `상세 보기` 모달로 변경. 목록 카드에는 요약/상위 3개 경쟁사만 노출하고, 모달에서 좌측 지도/광고, 우측 경쟁사 리스트를 넓은 화면으로 분리 표시한다.
      - 2026-06-09 지도 표시 보정: 모달 오픈 직후 Kakao Map이 컨테이너 크기를 잘못 계산해 빈 배경만 보이는 문제를 막기 위해 지도 렌더를 지연하고 `map.relayout()`/`setCenter()`를 강제 호출한다. Kakao SDK 로딩 중/실패 상태도 지도 영역에 표시한다.
      - 2026-06-09 지도 실패 원인 확인: Kakao JavaScript 키의 Web 플랫폼 사이트 도메인 등록이 필요하다. 현재 로컬 기준 `http://localhost:3000`에서 지도 표시 확인 완료. 필요 시 `http://localhost:3004`, 배포 도메인도 추가 등록한다.
      - 2026-06-09 Naver 광고 표시 보정: SearchAPI 응답은 쿼리별 차이가 크다. 테스트 기준 `치킨`은 광고 10개, `서울 광진구 치킨`은 1개, `군자 치킨`은 0개. UI는 `미수집`/`수집오류`/`미노출`/`N개`를 분리 표시하도록 변경.
      - 2026-06-09 Naver 광고 검색어 보정: 광고 수집은 `구 단위 + 경쟁키워드` -> `지역 + 경쟁키워드` -> `경쟁키워드` -> `구 단위 + 브랜드` -> `지역 + 브랜드` 순서로 재시도한다. 예: `광진구 치킨`, `서울 광진구 치킨`, `치킨`, `광진구 비비큐(BBQ)`, `서울 광진구 비비큐(BBQ)`.
      - 2026-06-09 Naver 리뷰 수집 보정: 경쟁사별 방문/블로그 리뷰는 주소를 붙이면 장소 지식패널이 빠지는 경우가 있어 `상호명 단독` -> `상호명 + 지역` -> `상호명 + 주소` 순서로 재시도한다. 테스트 기준 `잘만든치킨굿킨 중곡역점`은 SearchAPI에서 방문 73, 블로그 22를 반환하고, 주소를 붙인 검색은 장소 패널이 누락됨.
      - 2026-06-09 숫자 파싱 보정: 외부 SERP가 리뷰 수를 `1,867`처럼 콤마 포함 문자열로 내려줘도 숫자로 저장하도록 보완했다.
      - 2026-06-09 `.env.local` 보정: `SERP_PROVIDER`가 중복 선언되어 뒤쪽 `serpapi`가 적용되던 문제를 확인했다. SearchAPI가 실제로 광고/리뷰 값을 더 잘 반환하므로 뒤쪽 `SERP_PROVIDER=serpapi`를 주석 처리하고 `SERP_PROVIDER=searchapi`가 유효하게 했다.
      - 2026-06-09 Naver 광고 타임아웃 보정: SearchAPI 광고 응답이 4.5초를 넘으며 `This operation was aborted`로 저장되던 문제를 확인했다. 광고 조회는 15초 타임아웃을 사용하고, 검색어별 실패가 전체 광고 수집을 중단하지 않도록 재시도 로직을 분리했다.
      - 2026-06-09 군자 후보지 재스캔 확인: `provider=searchapi`, 광고 검색어 `광진구 치킨`, 광고 3개 저장. `잘만든치킨굿킨 중곡역점`은 방문 73, 블로그 22 저장. `푸라닭치킨 중곡점`은 방문 580, 블로그 54 저장.
      - 2026-06-09 Naver 플레이스 링크 보정: SearchAPI의 `directions` URL이 Naver 버튼에 저장되어 길찾기로 열리던 문제를 확인했다. `street_view`/`directions`의 place id를 `https://map.naver.com/p/entry/place/{id}`로 정규화해 Naver 버튼이 플레이스로 열리게 변경했다.
      - 2026-06-09 Naver 리뷰 타임아웃 보정: 리뷰 조회도 4.5초 타임아웃 경계에서 `This operation was aborted`가 발생해 기존 리뷰값을 비우는 경우가 있었다. 리뷰 조회를 15초로 늘리고 검색어별 실패 시 다음 검색어로 재시도하도록 변경했다.
      - 2026-06-09 Kakao 리뷰 UI 문구 보정: Kakao Local 공식 API는 리뷰 수/본문을 제공하지 않으므로 `Kakao API 리뷰 미제공`/`Kakao맵에서 확인`으로 표시하고, 상단 버튼은 `Kakao맵`으로 표시한다.
      - 2026-06-09 Google Places 비용 절감: Google은 Place Details의 `reviews` 필드를 호출하지 않고 Text Search 결과의 평점/리뷰 수/지도 URL만 저장한다. 저장 결과의 `reviews` 배열은 기본 빈 배열이다.
      - 2026-06-09 경쟁사 정렬 보정: 고정 경쟁사 정렬은 사용하지 않는다. 표시 순서는 `100m 단위 거리 구간 -> Naver 리뷰 총량 우선 -> 실제 거리순` 기준의 `거리+리뷰순`이다. 기본 리뷰 상세 수집 대상은 화면 상위 8곳으로 맞췄다.
      - 2026-06-09 Naver 광고 UI 보정: `광고 미노출` 표현을 제거하고, SERP 광고 목록과 업체명이 매칭된 경우만 `검색광고 n위`로 표시한다. SearchAPI 구조화 응답만으로는 네이버지도/플레이스의 `광고` 배지 자동 판별이 어려워 수동 체크 방식은 사용하지 않는다.
      - 2026-06-09 군자 후보지 재스캔 확인: 정렬 정책 `distance-review`, Google 리뷰 본문 미수집(`reviews: []`), 불스바베큐 방문 21/블로그 1 저장 확인.
      - 2026-06-09 provider 한도 확인: SearchAPI 계정 상태 endpoint 기준 `monthly_allowance=0`, `remaining_credits=-3`. 현재 Naver SERP/리뷰/광고 신규 수집은 429(`You have used all of the searches for the month`)로 막힌다. 이는 네이버 결과 없음이 아니라 SearchAPI 월 한도 초과 상태다.
      - 다음 P0: SearchAPI 429/한도 초과가 발생해도 기존 Naver 리뷰/광고 성공 값을 덮어쓰지 않게 보호하고, UI를 `SearchAPI 한도초과`/`provider 미설정`/`결과 없음`으로 분리 표시한다.
      - 2026-06-09 로컬 확인: `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` 통과. `npm run start -- -p 3000`으로 `http://localhost:3000` 실행 중이며 `/dashboard/franchise-leads/market-insights`, `/dashboard/franchise-operations`, `/login` HTTP 200 확인.
      - 이전 검증 기록: `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build`, `localhost:3004` 두 화면 HTTP 200 확인. Playwright MCP는 Chrome 프로필 잠금으로 스크린샷 확인 불가.
    - 5차: Meta 계정 HOLD 해제 후 광고 성과와 CPL 연결
  - 위치 마스터 DB 적용 파일:
    - `ERP/web/supabase_franchise_locations_migration.sql`
  - 참고 레퍼런스:
    - 모객/가맹 후보자 CRM: FranConnect, FranchiseSoft, ClientTether
    - 운영관리: Naranga, FranConnect Operations, 프담, 리드플래닛
    - 상권/출점 매칭: Zors AI, 프랜차이즈 ERP 상권분석 사례
- 2026-06-09 프담 ERP 레퍼런스 문서화
  - 문서 위치: `ERP/web/docs/fdam-reference.md`
  - 핵심 결론:
    - 프담은 `가맹 상담 -> 계약 -> 오픈 -> 운영/QSCV -> 리뷰/CS -> 매출/물류 리포트 -> 문서/알림/권한` 흐름의 본사 ERP 구조를 갖고 있다.
    - 화면을 그대로 복제하지 말고, `회사별 마스터 데이터 엔진`과 `문서/알림 템플릿`을 먼저 만들고 모객DB/계약/운영 모듈이 이를 참조하도록 확장한다.
    - 계획 후보지와 현재 운영 가맹점은 계속 분리한다.
    - POS/배달/물류/리뷰 외부 연동은 CSV/수동 업로드 MVP 이후 단계적으로 붙인다.
- 2026-06-09 프랜차이즈 고도화 로드맵 문서화
  - 문서 위치: `ERP/web/docs/franchise-growth-roadmap.md`
  - 문서 역할:
    - `MAC_CONTEXT.md`: 세션 인수인계/로컬 운영 요약
    - `ERP/web/README.md`: 실행/환경변수/SQL 적용 안내
    - `ERP/web/docs/franchise-growth-roadmap.md`: 기능 우선순위, API 정책, 다음 작업 목록
    - `ERP/web/docs/franchise-dev-qa-log.md`: 개발 과정, QA 결과, 미검증 리스크, 다음 QA 체크리스트
    - `ERP/web/docs/documentation-agent.md`: Docs Steward 역할, 수정 권한, 출력 형식
    - `ERP/web/handoff.md`: 단일 작성자 규칙 때문에 Codex 수정 금지. 검토 참고만 가능.
  - 추가 후보 문서: `provider-api-costs.md`, `franchise-data-contract.md`, `franchise-ops-runbook.md`. 지금은 새 로드맵 문서에 통합 관리하고 반복 이슈가 생길 때 분리한다.
- 2026-06-09 Docs Steward 채용
  - 운영 방식: 레포 문서 역할 정의 + 별도 Codex 스레드 병행.
  - 별도 스레드 ID: `019eab56-5460-7160-a000-8d73e22b5460`
  - 권한: approved docs 직접 수정 가능. 단, `ERP/web/handoff.md`, 코드, SQL migration, env, package 파일은 수정 금지.
  - 산출물: `Doc Update Brief` 형식으로 변경 문서, 반영 이유, 남은 QA/로드맵 gap, handoff 상태를 보고한다.
  - 운영 리듬: 시간표 기반 자동화보다 작업 중 주요 변경 단위마다 메인 Codex가 문서관리 세션 전달 프롬프트와 커밋 묶음/메시지 제안을 사용자에게 함께 제공한다.
- 2026-06-09 외부 상가 매물 수집 MVP
  - 진입점: `/dashboard/franchise-operations` 하위 `외부 상가 수집` 탭.
  - 범위: 우선 상가만 수집. 사무실은 MVP에서 제외.
  - 추가 SQL: `ERP/web/supabase_realty_import_migration.sql`, base schema 반영: `ERP/web/supabase_schema.sql`.
  - 추가 API: `POST /api/realty/import-jobs`, `GET /api/realty/import-jobs/:id`, `GET /api/realty/listings`.
  - 기본 소스: Daangn 상가 목록 단일화. 네이버부동산은 UI/API에서 제거하고 향후 과제로 이관했다.
  - Naver Land 후속 검토 순서는 사용자 URL/CSV/JSON import -> 로컬 Chrome 세션 캡처 POC -> provider/proxy 어댑터다.
  - 저장: `external_property_listings` 원본 추적. ERP `properties`에는 자동 생성하지 않는다.
  - 수집 지역은 자연어 입력이 아니라 시도/시군구 선택 방식이다. Daangn 구 단위 검색은 동 단위 후보로 자동 확장한다. 예: 서울 광진구 -> 자양동/화양동/구의동/광장동/군자동/중곡동/능동.
  - 등록 회사명 입력은 제거했다. 회사 범위가 있으면 `company_id`, 없으면 `requester_id` 기준 수집함에 저장한다.
  - 하단 `저장된 상가` 목록과 `최신화` 버튼을 추가했다. 최신화는 기존 sourceListingId를 중복 추가하지 않고 새 매물만 신규 저장한다.
  - Daangn 목록 호출은 `salesType=store`를 명시한다. 결과 UI는 매물명보다 주소를 중심으로 표시하고 목록 응답의 관리비/승인일/등록일/반응수/설명 일부를 함께 보여준다.
  - 당근 지도 숫자는 지도 클러스터/필터/뷰포트 집계라 동별 목록 응답 수집 건수와 1:1로 맞지 않을 수 있다. 현재 MVP는 숫자 완전 일치보다 검토 가능한 후보 목록 정리를 우선한다.
  - 화면 기본 수집 리밋은 500건, API 안전 상한은 1000건이다.
  - 외부 원본 중복은 `company_id + source + source_listing_id` 기준으로 업데이트한다.
  - 물건지 목록의 `외부수집` 필터/배지는 과거 자동 등록 데이터 구분용으로만 유지.
  - 문서: `ERP/web/docs/realty-import-plan.md`.
  - 로컬 검증: `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` 통과.
  - 다음 QA: SQL 적용 후 당근 `합정동`/`광진구` 상가 수집, 동 단위 확장 warning, `salesType=store` 적용 후 수집량 변화, 재수집 업데이트, 500/1000 리밋, 점포목록 미등록, 회사 격리 확인.
  - 다음 개발순서: 필터/점수화 -> 주소 지오코딩/지도화 -> 중복 후보 묶기 -> 상위 N건 상세 보강 -> 가격/상태 변동 추적 -> 선택 승격 플로우.
- 점포/고객/명함 목록 검색 개선
  - 쉼표/띄어쓰기 OR 검색 공용 파서 적용
  - 검색 시 `limit=500` 밖 데이터까지 전체 범위에서 조회
  - 고객/명함 API는 DB `ilike` 선필터 후 JS 최종 필터
  - `PropertySelector`, `PropertySelectorModal`, `PersonSelectorModal` 검색 일관화
- 운영 로그 정리 및 lint 게이트 개선
  - 공유 브리핑/계약 다운로드/브리핑 생성/점포 hydration 민감 로그 제거
  - `npm run lint -- --quiet` 기준 error 0 상태로 정리
- 매물 상세 리포트 인쇄형식 헤더 정리
  - `발행일` 옆에 `담당자`
  - 기존 담당자 위치에 `주소`
  - 오른쪽 상단에는 매장명만 유지
- 매물 상세 리포트 면적 표시 수정
  - 저장값 `평` 기준을 리포트에서 올바른 `㎡`로 변환
- 인쇄형식1 상세 내용 영역 항상 표시
  - 값이 없어도 박스 유지, 비어 있으면 `-`
- 계약 양식 편집기 표 기능 확장
  - 행/열 삭제
  - 가로/세로 병합 및 해제
  - 폭 조절 개선
- 점포 신규등록 주소 검색 표시 문제 수정
- 리포트 형식 1~4 레이아웃 다수 조정

## 현재 로컬 main 미커밋 변경 파일
- `.gitignore`
- `ERP/web/src/app/(main)/business-cards/page.tsx`
- `ERP/web/src/app/(main)/contracts/builder/page.tsx`
- `ERP/web/src/app/(main)/contracts/project/[id]/page.tsx`
- `ERP/web/src/app/(main)/customers/page.tsx`
- `ERP/web/src/app/(main)/properties/page.tsx`
- `ERP/web/src/app/(main)/properties/register/page.module.css`
- `ERP/web/src/app/(main)/properties/register/page.tsx`
- `ERP/web/src/components/properties/PropertyCard.tsx`
- `ERP/web/src/components/properties/reports/PropertyReportPrint.tsx`

## 현재 로컬 미커밋 변경 중 눈에 띄는 항목
- `PropertyCard.tsx`
  - 영업/임대차 커스텀 추가 행에 삭제 버튼을 붙인 상태
- `PropertyReportPrint.tsx`
  - 리포트 헤더 메타 배치 및 인쇄형식 관련 조정이 누적된 상태
- 위 변경들은 모두 로컬 main의 WIP일 수 있으므로, 맥에서 작업 시작 전 `git status`로 실제 상태를 다시 확인한다.

## 환경변수 / 외부 서비스
- 핵심 env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `KAKAO_REST_API_KEY` (출점 후보지/가맹 운영 경쟁업체 스캔 사용 시)
  - `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` (선택: 경쟁환경 상세 지도 표시. Kakao Developers Web 플랫폼 도메인 등록 필요)
  - `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` (브랜드 모니터링 공식 Naver 검색/DataLab 수집)
  - `SEARCHAPI_API_KEY` 또는 `SERPAPI_API_KEY` (선택: 실제 SERP 순위 POC)
  - `SERP_PROVIDER` (선택: `searchapi` 또는 `serpapi`)
  - `GOOGLE_PLACES_API_KEY` 또는 `GOOGLE_MAPS_API_KEY` (선택: 경쟁사 Google 평점/리뷰 수집)
  - `FRANCHISE_COMPETITOR_REVIEW_LIMIT` (선택: 경쟁스캔 리뷰 상세 수집 상위 N개, 기본 8, 최대 10)
  - `DATA_GO_KR_SERVICE_KEY` 또는 `DATA_GO_KR_DECODING_KEY` 또는 `FRANCHISE_DISCLOSURE_SERVICE_KEY` (공공데이터포털 가맹정보 브랜드 목록 실시간 조회)
  - `FRANCHISE_DISCLOSURE_BASE_YEAR` (선택: 기본값 미설정 시 최근 연도 후보를 순차 조회)
  - `FRANCHISE_DISCLOSURE_PAGE_SIZE`, `FRANCHISE_DISCLOSURE_MAX_PAGES` (선택: 공식 API 검색 범위 조절)
  - `FRANCHISE_DISCLOSURE_CONCURRENCY`, `FRANCHISE_DISCLOSURE_CACHE_TTL_SECONDS` (선택: 공식 API 병렬 조회/메모리 캐시 조절)
- 실서버 Supabase는 dev와 별도 프로젝트로 분리되어 있음
- 실서버 Vercel 프로젝트와 dev 프로젝트의 env는 다를 수 있으므로 배포 전 확인 필요

## 새 Codex 세션 시작 체크리스트
1. 이 문서 읽기
2. `git worktree list`
3. `git status`
4. `ERP/web/AGENTS.md` 확인
5. 필요한 경우 `ERP/web/ROADMAP.md` 확인
6. 변경 범위가 리포트면 `PropertyReportPrint.tsx`, 매물 입력이면 `PropertyCard.tsx` / `properties/register/page.tsx`부터 확인
