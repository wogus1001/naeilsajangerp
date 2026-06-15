# API ROUTE KNOWLEDGE BASE

## SCOPE
- Applies to `ERP/web/src/app/api`.
- Parent `ERP/web/AGENTS.md` rules apply.

## OVERVIEW
- Next App Router route handlers backed by Supabase, legacy localStorage requester IDs, and company-scoped access checks.
- APIs serve CRUD, imports, franchise analytics, external integrations, templates, contracts, and sharing flows.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Auth helpers | `../../../lib/api-auth.ts` | `getRequesterProfile`, company/resource checks, legacy ID resolution. |
| JSON envelopes | `../../../lib/api-response.ts` | `ok(data, status)` and `fail(status, code, message)`. |
| Supabase admin | `../../../lib/supabase-admin.ts` | Lazy service-role client for API routes. |
| Search helpers | `../../../utils/search.ts` | Shared term parsing and PostgREST `ilike` OR filters. |
| Realty import | `realty/import-jobs/route.ts` | Daangn import job orchestration and tracking-table fallback. |
| Competitor scan | `franchise-locations/competitors/route.ts` | Kakao/Naver/Google enrichment and provider-state handling. |

## CONVENTIONS
- Export `dynamic = 'force-dynamic'` for live Supabase/provider data.
- Resolve requester identity before reading private rows; accept legacy `requesterId`/`userId` only through helper paths.
- Admin users can cross company boundaries; non-admin users need matching `company_id` or owned resource IDs.
- Transform snake_case database rows to frontend camelCase in route-local transform helpers.
- Preserve response compatibility for existing clients; add fields without removing legacy names unless the task covers migration.

## EXTERNAL PROVIDERS
- Use bounded timeouts and return explicit provider status. Do not collapse quota, timeout, missing env, and no-result states.
- Competitor scans use Kakao Local for place discovery. Kakao official API does not provide review counts/bodies.
- Naver review/ad enrichment uses SearchAPI/SerpApi only when configured; SearchAPI quota exhaustion must not erase prior successful values.
- Google Places enrichment intentionally uses Text Search rating/count/link by default, not Place Details review bodies.

## ANTI-PATTERNS
- Service-role client use outside server/API code.
- Cross-company reads or writes without `canAccessCompanyScope` / `canAccessCompanyResource`.
- Logging secrets, raw tokens, or provider credentials.
- Auto-promoting external listings into `properties`; current realty import keeps source records separate.
