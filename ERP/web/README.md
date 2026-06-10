# ERP Web

Next.js 기반 ERP 웹 애플리케이션이다. 로컬 운영 규칙과 세션 인수인계는 상위 `MAC_CONTEXT.md`를 먼저 확인하고, 이 문서는 실행 방법, SQL 적용 순서, 외부 연동 환경변수, 프랜차이즈 고도화 운영 메모를 관리한다.

## Local Development

```bash
npm ci
npm run dev
```

기본 로컬 URL은 [http://localhost:3000](http://localhost:3000)이다. 이미 포트가 사용 중이면 Next.js가 제안하는 다른 포트를 사용하거나 명시적으로 포트를 지정한다.

```bash
npm run dev -- -p 3004
```

## Verification

주요 변경 뒤에는 아래 순서로 확인한다.

```bash
npm run lint -- --quiet
npx tsc --noEmit
npm run build
```

운영 플로우 확인이 필요하면 빌드 후 서버를 띄워 보호 라우트와 로그인 이동을 확인한다.

```bash
npm run start -- -p 3000
```

## Documentation Map

- `../../MAC_CONTEXT.md`: 맥북 worktree 운영, 최근 작업 상태, 세션 시작 체크리스트.
- `docs/franchise-growth-roadmap.md`: 프랜차이즈 고도화 우선순위, API 정책, 다음 작업 목록.
- `docs/franchise-dev-qa-log.md`: 개발 과정, QA 결과, 미검증 리스크.
- `docs/fdam-reference.md`: FDAM ERP 레퍼런스 분석.
- `docs/realty-import-plan.md`: 가맹 운영 외부 상가 매물 수집 MVP 계획과 QA 체크리스트.
- `docs/documentation-agent.md`: Docs Steward 권한, 금지 범위, 보고 형식.
- `handoff.md`: 단일 작성자 규칙 때문에 Codex는 수정하지 않고 읽기 참고만 한다.

## Database Migrations

프랜차이즈 고도화 기능을 실데이터로 확인하기 전에 아래 SQL을 필요한 환경에 적용한다.

```text
supabase_franchise_locations_migration.sql
supabase_franchise_brands_migration.sql
supabase_franchise_market_monitoring_migration.sql
supabase_meta_lead_ads_migration.sql
supabase_realty_import_migration.sql
```

`franchise_brands` 또는 `franchise_market_monitoring` SQL이 미적용된 상태에서 관련 화면/API를 열면 Supabase schema cache 오류, 예를 들어 `PGRST205`, 가 발생할 수 있다. dev와 main Supabase 프로젝트는 분리되어 있으므로 배포 전 각 환경의 적용 여부를 따로 확인한다.

## Meta Lead Ads Setup

Run `supabase_meta_lead_ads_migration.sql` before enabling the Meta integration.

Required environment variables:

```bash
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_GRAPH_API_VERSION=v25.0
META_TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

Use `/api/integrations/meta/webhook` as the Meta Webhook callback path. Vercel runs the scheduled backfill through `/api/integrations/meta/sync`; the endpoint requires `Authorization: Bearer $CRON_SECRET`.

## Franchise Location Insights Setup

Run `supabase_franchise_locations_migration.sql` before enabling the location master and market insights screen.

Optional environment variables for Kakao Local address search and competitor scans:

```bash
KAKAO_REST_API_KEY=
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=
```

Address search uses `/api/integrations/kakao/address`. The competitor scan endpoint is `/api/franchise-locations/competitors`. Both use the server-side Kakao REST API key, so the key is never exposed to the browser. Company-level data isolation still follows the existing `company_id` access rules; the Kakao key is not configured per company.

Competitor scans use `competitionKeyword` first, then `brand`. They intentionally do not fall back to the location name because area names such as "군자" or "강남" return unrelated nearby places.

Optional environment variables for competitor review/ad enrichment:

```bash
SERP_PROVIDER=searchapi
SEARCHAPI_API_KEY=
SERPAPI_API_KEY=
GOOGLE_PLACES_API_KEY=
GOOGLE_MAPS_API_KEY=
FRANCHISE_COMPETITOR_REVIEW_LIMIT=8
```

The Kakao JavaScript key must allow the local/dev domain in Kakao Developers Web platform settings, for example `http://localhost:3000`.

SearchAPI/SerpApi are optional POC providers for Naver SERP, Naver place-style review counts, and Naver search ad candidates. When the provider returns 429 or monthly quota errors, treat it as a provider quota issue, not as "no Naver data." Google enrichment uses Places Text Search only by default; Place Details review bodies are intentionally not requested to reduce cost.

Franchise location screens are split by operating intent:

- `/dashboard/franchise-leads/market-insights`: site planning for future openings and lead-linked regional demand.
- `/dashboard/franchise-operations`: current franchise/direct-store operations and store status management.

## Realty Import Setup

Run `supabase_realty_import_migration.sql` before enabling external store listing import.

The MVP lives under `/dashboard/franchise-operations` as the `외부 상가 수집` tab. It collects store-only listings by region, stores import history in `realty_import_jobs`, and stores raw source records in `external_property_listings`. It does not automatically create ERP `properties`; selected listings can be promoted later through a separate review flow.

Current source policy:

- Daangn is the default source for store listings.
- Daangn listing calls include `salesType=store`; the UI shows address-first rows with price, area/floor, management fee, approval date, saved date, collected source metadata, star state, and source links.
- The UI uses sido/sigungu selects instead of free-text region input; district-level Daangn searches are expanded into dong-level region candidates when available.
- Naver Land is deferred from the MVP and removed from the current UI/API. Future Naver Land work should start with user-provided URL/CSV/JSON import, then local Chrome-session capture POC, and only then a provider/proxy adapter after legal and cost review.
- The current import UI requests up to 2000 listings. The import API clamps requests to a 3000-listing safety maximum, and the saved-list API returns up to 2000 rows per request.
- External listing dedupe/update is keyed by `company_id + source + source_listing_id` when a company scope exists, otherwise `requester_id + source + source_listing_id`.
- The import screen does not ask for company name. Saved listings appear in the lower saved-list panel with explicit saved-region chips, dong-level cards, per-dong pagination, saved dates, star toggles, recommendation scores, saved-list filters, and sort controls. The refresh button re-collects the selected saved region without duplicating existing source listing IDs.
- Daangn map counts are cluster/filter/viewport aggregates and may not match the collected dong-level listing count exactly.
- Listing-response fields are enough for address, price, area/floor, management fee, approval date, registered date, chat/interest counts, photo count, short description, source link, and inferred `writerType`; direction, move-in date, restroom, parking, violation/building-use details require selective detail-page fetches.
- Login, messaging, reservation, bypass automation, and write actions on external services are out of scope.

## Franchise Brand Master Setup

Run `supabase_franchise_brands_migration.sql` before enabling saved brand search and disclosure-brand sync.

Optional environment variables for disclosure-brand backfill:

```bash
FRANCHISE_DISCLOSURE_API_URL=
FRANCHISE_DISCLOSURE_SERVICE_KEY=
DATA_GO_KR_SERVICE_KEY=
DATA_GO_KR_DECODING_KEY=
PUBLIC_DATA_SERVICE_KEY=
FRANCHISE_DISCLOSURE_BASE_YEAR=
FRANCHISE_DISCLOSURE_PAGE_SIZE=
FRANCHISE_DISCLOSURE_MAX_PAGES=
FRANCHISE_DISCLOSURE_CONCURRENCY=
FRANCHISE_DISCLOSURE_CACHE_TTL_SECONDS=
```

The brand selector shows company-saved brands first, then shared disclosure brands. Saving a site/store with a brand also stores that brand in the company brand master, and the recommended competitor-search keyword remains editable per site/store. The public disclosure API does not provide a direct brand-name search parameter, so the server fetches year/page data and filters it locally with a short-lived memory cache.

## Franchise Brand Monitoring Setup

Run `supabase_franchise_market_monitoring_migration.sql` before enabling brand monitoring snapshots.

Optional environment variables:

```bash
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
SERP_PROVIDER=searchapi
SEARCHAPI_API_KEY=
SERPAPI_API_KEY=
```

The official Naver API MVP is used for blog/news/local search and DataLab trends. SERP providers are separate POC integrations used when actual Naver result-page behavior is needed. Operational planning and provider limitations are tracked in `docs/franchise-growth-roadmap.md`.

## Current Franchise QA Notes

- Meta Lead Ads is on HOLD until Meta account/app configuration and permissions are ready.
- SearchAPI is the current preferred SERP provider for Naver place-style review/ad POC, but provider quota exhaustion must be treated separately from "no Naver data."
- Current P0 is to prevent SearchAPI 429/monthly quota failures from overwriting previously successful Naver review/ad values and to split UI labels into quota exceeded, provider missing, and no result states.
- Google Places enrichment intentionally uses Text Search rating/review counts only; Place Details review bodies are not requested by default.
