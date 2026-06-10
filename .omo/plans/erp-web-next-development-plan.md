# ERP Web Next Development Plan

## TL;DR
> Summary:      Stabilize the current Daangn-only external store import before expanding the saved listing workflow, then defer Naver Land to a manual-import-first POC and move franchise brand/competition hardening into the final wave.
> Deliverables:
> - Daangn MVP stabilization plan covering SQL/RLS, three realty API routes, requester/company scope, no-auto-registration, live/provider QA, and browser QA.
> - Saved external listing enhancement plan covering API paging/filter/sort contracts, table controls, detail drawer, raw summary, mobile/long-text states, and future scoring.
> - Future Naver Land POC plan limited to URL/CSV/JSON import first, then passive local capture, then provider/proxy review.
> - Franchise brand/competition hardening plan covering SearchAPI quota preservation, provider-state labels, cache/rescan policy, and brand fallback QA.
> Effort:       XL
> Risk:         High - live external providers, Supabase schema/RLS, authenticated dashboard QA, and cross-module franchise workflows.

## Scope
### Must have
- Respect this plan's priority order even though existing docs list SearchAPI 429 work as P0: Daangn stabilization first, saved listing list second, Naver Land POC third, brand/competition fourth.
- Keep `ERP/web/handoff.md` permanently out of scope.
- Preserve existing user or agent changes. Start each implementation session with `git status --short --untracked-files=all` and do not overwrite unrelated changes.
- Treat `ERP/web` as the implementation root for web work.
- Keep Daangn as the only active live external realty source during Wave 1 and Wave 2.
- Keep external realty import read-only against external services. Do not log in, message, reserve, inquire, pay, bypass blocks, solve CAPTCHA, or perform external write actions.
- Keep external listing records separate from ERP `properties` until an explicit user-selected promotion flow exists.
- Enforce requester/company scope on every new or changed API route.
- Preserve provider states separately: unconfigured, quota exceeded, timeout/error, and no result.
- Preserve useful prior provider data when a new provider collection fails from quota, timeout, or transient errors.
- Use existing dashboard CSS/module patterns in `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css`.

### Must NOT have
- No edits to `ERP/web/handoff.md`.
- No blind scraping-first Naver Land implementation.
- No automated Naver login, CAPTCHA handling, block bypass, external-service chat/inquiry/reservation/payment, or write actions.
- No weakening lint/type/build gates.
- No broad rewrite of large legacy TSX files outside the needed workflow.
- No treating unauthenticated `/login` redirects as full QA.
- No collapsing quota/provider failures into "no data".
- No automatic ERP `properties` creation from the Daangn import endpoint.
- No storing secrets, service-role keys, provider tokens, private URLs, or session cookies in docs, source, SQL, or `.omo/evidence`.

## Verification strategy
> Zero human intervention - all verification is agent-executed after required env/session prerequisites are present.
- Test decision: none for unit tests; the repo has no `test` script in `ERP/web/package.json:5`. Use integration verification through SQL checks, provider fixtures where added, `curl`, authenticated Browser/Playwright checks, `lint`, `tsc`, `build`, and `git diff --check`.
- QA policy: every todo has agent-executed scenarios. If a required Supabase URL, service role, provider key, or authenticated session is missing, the todo is not complete; record the missing prerequisite in `.omo/evidence/task-<N>-<slug>.md` and stop that todo rather than declaring success.
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>` for every todo, plus final evidence under `.omo/evidence/final-erp-web-next-development-plan/`.
- Common commands:
  - `cd ERP/web && npm run lint -- --quiet`
  - `cd ERP/web && npx tsc --noEmit`
  - `cd ERP/web && npm run build`
  - `git diff --check`
  - `git diff -- ERP/web/handoff.md`

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Wave sizes are intentionally smaller where provider/schema dependencies are sequential.
- Wave 1 (no deps): T1, T2, T3, T4, T5
- Wave 2 (after T1-T5): T6, T7, T8, T9, T10
- Wave 3 (after T6-T10): T11, T12, T13
- Wave 4 (after T1 and can overlap with late Wave 3 once Daangn is stable): T14, T15, T16, T17
- Critical path: T1 -> T2 -> T4 -> T5 -> T6 -> T7 -> T8 -> final verification.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 | none | T2, T4, T5, T6 | T3 |
| T2 | T1 | T4, T5 | T3 |
| T3 | none | T5 | T1, T2 |
| T4 | T1, T2 | T5, T6 | none |
| T5 | T1-T4 | T6, T7 | none |
| T6 | T1, T4, T5 | T7, T8, T9 | T10 |
| T7 | T6 | T8, T9 | T10 |
| T8 | T6, T7 | T9 | T10 |
| T9 | T7, T8 | final QA | T10 |
| T10 | T6 | future saved-list ranking | T7, T8, T9 |
| T11 | T6 | T12, T13 | T14 |
| T12 | T11 | T13 | T14, T15 |
| T13 | T11, T12 | future Naver provider work | T14, T15, T16 |
| T14 | T1 | T15, T16 | T11, T12 |
| T15 | T14 | T16 | T12, T13 |
| T16 | T14, T15 | final QA | T17 |
| T17 | T1-T16 | final QA | T16 |

## Todos
> Implementation + Test = ONE todo. Never separate.

- [ ] T1. Verify realty SQL/RLS/schema drift before code changes
  What to do / Must NOT do:
  Verify that `supabase_realty_import_migration.sql` and `supabase_schema.sql` agree for the two realty tables, indexes, nullable company/requester scope, and RLS policies. Add a small checked-in SQL verification script only if needed under `ERP/web/scripts` or `ERP/web/docs` conventions; do not edit `ERP/web/handoff.md`.
  Parallelization: Can parallel Y | Wave 1 | Blocks T2/T4/T5/T6
  References (executor has NO interview context - be exhaustive): `ERP/web/supabase_realty_import_migration.sql:4`, `ERP/web/supabase_realty_import_migration.sql:28`, `ERP/web/supabase_realty_import_migration.sql:61`, `ERP/web/supabase_realty_import_migration.sql:68`, `ERP/web/supabase_realty_import_migration.sql:89`, `ERP/web/supabase_realty_import_migration.sql:115`, `ERP/web/supabase_realty_import_migration.sql:147`, `ERP/web/supabase_realty_import_migration.sql:150`, `ERP/web/docs/realty-import-plan.md:127`, `ERP/web/AGENTS.md`.
  Acceptance criteria (agent-executable):
  - `psql "$SUPABASE_DB_URL" -f ERP/web/supabase_realty_import_migration.sql` succeeds against a disposable/local Supabase database.
  - `psql "$SUPABASE_DB_URL" -Atc "select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name='external_property_listings' and column_name in ('company_id','requester_id','source_listing_id') order by column_name"` shows `company_id` nullable, `requester_id` present, and `source_listing_id` present.
  - `psql "$SUPABASE_DB_URL" -Atc "select indexname from pg_indexes where schemaname='public' and tablename='external_property_listings' order by indexname"` includes both source unique indexes and collected indexes.
  - `psql "$SUPABASE_DB_URL" -Atc "select policyname from pg_policies where schemaname='public' and tablename in ('realty_import_jobs','external_property_listings') order by tablename, policyname"` includes company-member and requester-own policies for select/insert/update/delete.
  QA scenarios (name the exact tool + invocation): happy SQL apply with `psql`; drift check with the three SQL queries above; failure case by running `GET /api/realty/listings` against a DB missing `requester_id` and expecting a 424 migration guidance response. Evidence `.omo/evidence/task-1-realty-schema.md`.
  Commit: Y | `test(realty): verify external listing schema and rls` | Files limited to SQL verification artifact/docs if added.

- [ ] T2. Harden all three realty API routes for missing schema and no-auto-registration
  What to do / Must NOT do:
  Update `POST /api/realty/import-jobs`, `GET /api/realty/import-jobs/:id`, and `GET /api/realty/listings` so schema/table drift produces explicit 424 migration guidance, failed jobs do not stay `running`, and `registerToProperties=true` is rejected for the current import endpoint unless a separate future promotion endpoint exists. Do not create ERP `properties` from the import endpoint in this wave.
  Parallelization: Can parallel Y | Wave 1 | Blocks T4/T5
  References: `ERP/web/src/app/api/realty/import-jobs/route.ts:120`, `ERP/web/src/app/api/realty/import-jobs/route.ts:126`, `ERP/web/src/app/api/realty/import-jobs/route.ts:447`, `ERP/web/src/app/api/realty/import-jobs/route.ts:457`, `ERP/web/src/app/api/realty/import-jobs/route.ts:509`, `ERP/web/src/app/api/realty/import-jobs/route.ts:623`, `ERP/web/src/app/api/realty/import-jobs/route.ts:684`, `ERP/web/src/app/api/realty/import-jobs/[id]/route.ts:64`, `ERP/web/src/app/api/realty/import-jobs/[id]/route.ts:93`, `ERP/web/src/app/api/realty/listings/route.ts:52`, `ERP/web/src/app/api/realty/listings/route.ts:117`, `ERP/web/src/app/api/AGENTS.md`.
  Acceptance criteria:
  - `curl -sS -X POST "$BASE_URL/api/realty/import-jobs" -H 'Content-Type: application/json' -d '{"requesterId":"'$REQUESTER_ID'","region":"서울특별시 광진구","sources":["daangn"],"listingTypes":["store"],"limit":1,"registerToProperties":true}' | jq -e '.success == false and .error.code == "VALIDATION_ERROR"'` passes.
  - With schema intentionally missing in a disposable DB, POST and both GET routes return HTTP 424 and mention `supabase_realty_import_migration.sql`.
  - If an error occurs after job insert, `realty_import_jobs.status` is `failed`, not `running`.
  QA scenarios: `curl` for `registerToProperties=true` rejection; `curl` for missing-schema POST/GET; SQL select for failed job status. Evidence `.omo/evidence/task-2-realty-route-hardening.md`.
  Commit: Y | `fix(realty): harden import routes and block auto registration` | `ERP/web/src/app/api/realty/import-jobs/route.ts`, `ERP/web/src/app/api/realty/import-jobs/[id]/route.ts`, `ERP/web/src/app/api/realty/listings/route.ts`, focused docs/tests if needed.

- [ ] T3. Lock the Daangn collector contract with fixture and bounded live QA
  What to do / Must NOT do:
  Stabilize the collector around `salesType=store`, district-to-dong expansion warnings, 12s timeout, 500 default, 1000 max, `STORE` filtering, dedupe by `source:sourceListingId`, raw payload preservation, and non-map-count expectations. Do not assert exact equality with Daangn map cluster counts.
  Parallelization: Can parallel Y | Wave 1 | Blocks T5
  References: `ERP/web/src/lib/realty-import.ts:75`, `ERP/web/src/lib/realty-import.ts:77`, `ERP/web/src/lib/realty-import.ts:94`, `ERP/web/src/lib/realty-import.ts:149`, `ERP/web/src/lib/realty-import.ts:169`, `ERP/web/src/lib/realty-import.ts:203`, `ERP/web/src/lib/realty-import.ts:239`, `ERP/web/src/lib/realty-import.ts:246`, `ERP/web/src/lib/realty-import.ts:250`, `ERP/web/src/lib/realty-import.ts:276`, `ERP/web/docs/realty-import-plan.md:37`, `ERP/web/docs/realty-import-plan.md:48`, `ERP/web/src/lib/AGENTS.md`.
  Acceptance criteria:
  - A fixture-based check proves non-`STORE` Daangn posts are dropped and duplicate `sourceListingId` rows collapse to one listing.
  - Live bounded check records outcomes for `서울특별시 광진구`, `광진구`, and `합정동` with `limit=5`; success means the request completes and records listing/warning/error status, not a fixed count.
  - Limit check proves `limit=500` is sent by UI and `limit=10000` is clamped to 1000 in collector/API behavior.
  QA scenarios: fixture test script or route-level mock using Node fetch stubbing; live `curl` POST with `limit=5` for named regions; evidence includes source URLs and warnings but no provider secrets. Evidence `.omo/evidence/task-3-daangn-collector.md`.
  Commit: Y | `test(realty): lock daangn collector contract` | `ERP/web/src/lib/realty-import.ts`, focused fixture/test artifacts if added.

- [ ] T4. Prove dedupe, requester-only scope, company scope, and no properties creation
  What to do / Must NOT do:
  Verify and harden `company_id + source + source_listing_id` and requester-only `requester_id + source + source_listing_id` updates. Ensure exact-address existing `properties` only marks `duplicate_candidate`, and re-collection never creates `properties` while `registerToProperties=false`.
  Parallelization: Can parallel N | Wave 1 | Blocks T5/T6
  References: `ERP/web/docs/realty-import-plan.md:72`, `ERP/web/docs/realty-import-plan.md:81`, `ERP/web/docs/realty-import-plan.md:89`, `ERP/web/src/app/api/realty/import-jobs/route.ts:175`, `ERP/web/src/app/api/realty/import-jobs/route.ts:217`, `ERP/web/src/app/api/realty/import-jobs/route.ts:238`, `ERP/web/src/app/api/realty/import-jobs/route.ts:354`, `ERP/web/src/app/api/realty/import-jobs/route.ts:527`, `ERP/web/src/app/api/realty/listings/route.ts:58`, `ERP/web/src/app/api/realty/listings/route.ts:100`.
  Acceptance criteria:
  - Two POST imports for the same requester/sourceListingId update one `external_property_listings` row and increment/update counts instead of inserting duplicates.
  - A company-scoped requester cannot see another company's external listings through `GET /api/realty/listings`.
  - A requester without company scope can save and read only rows with `company_id is null` and their own `requester_id`.
  - `select count(*) from public.properties where data->>'externalImportMode' in ('auto-created','auto-updated') and updated_at > '$START_TIME'` remains 0 after Daangn import QA.
  QA scenarios: SQL seed two profiles/companies; `curl` POST twice; `curl` GET as each requester; SQL count checks. Evidence `.omo/evidence/task-4-realty-scope-dedupe.md`.
  Commit: Y | `fix(realty): preserve scoped external listing dedupe` | API/SQL files touched by the fix.

- [ ] T5. Run authenticated Daangn MVP browser QA in franchise operations
  What to do / Must NOT do:
  Verify the actual `/dashboard/franchise-operations` flow with an authenticated session, selected region, result summary, saved list refresh, duplicate status, migration guidance, and source links. Do not count login redirect as QA.
  Parallelization: Can parallel N | Wave 1 | Blocks T6/T7
  References: `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:368`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:584`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:618`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:629`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:638`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:647`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1047`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1053`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1085`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1108`, `ERP/web/docs/franchise-dev-qa-log.md:147`.
  Acceptance criteria:
  - Browser opens `/dashboard/franchise-operations`, active tab `외부 상가 수집` loads for an authenticated user, and does not redirect to `/login`.
  - Selecting `서울특별시 / 광진구` and running import posts `sources:["daangn"]`, `listingTypes:["store"]`, `limit:500`, `registerToProperties:false`.
  - Result summary shows collected/new/updated/duplicate/failed counts and warnings.
  - Saved list refreshes after import and `최신화` does not duplicate existing `sourceListingId` rows.
  - Source link opens in a new tab for rows with `sourceUrl`.
  QA scenarios: Browser or Playwright authenticated session; network log assertion for POST body; screenshot of saved list; SQL row count before/after refresh. Evidence `.omo/evidence/task-5-daangn-browser-qa.md` plus screenshots.
  Commit: Y | `fix(realty): stabilize daangn import workflow` | UI/API files changed by fixes.

- [ ] T6. Extend `GET /api/realty/listings` into a saved-list query contract
  What to do / Must NOT do:
  Add an explicit saved-list API contract before client UI growth: `limit`, `offset` or cursor, total count, sort field/order, status filter, keyword/address filter, price/deposit/rent range filters, area range filters, collected date range, source, region, importJobId, propertyId. Preserve current response fields and compatibility.
  Parallelization: Can parallel Y | Wave 2 | Blocks T7/T8/T9/T10
  References: `ERP/web/src/app/api/realty/listings/route.ts:58`, `ERP/web/src/app/api/realty/listings/route.ts:65`, `ERP/web/src/app/api/realty/listings/route.ts:70`, `ERP/web/src/app/api/realty/listings/route.ts:94`, `ERP/web/src/app/api/realty/listings/route.ts:100`, `ERP/web/src/app/api/realty/listings/route.ts:105`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:589`, `ERP/web/docs/realty-import-plan.md:86`.
  Acceptance criteria:
  - `curl "$BASE_URL/api/realty/listings?requesterId=$REQUESTER_ID&source=daangn&region=광진구&limit=25&offset=0&sort=collectedAt&order=desc"` returns `{ listings, totalCount, limit, offset, sort, order }`.
  - Filtering by `status=duplicate_candidate`, `keyword=<address token>`, `minMonthlyRent`, `maxMonthlyRent`, `minDeposit`, `maxDeposit`, `minAreaSqm`, `maxAreaSqm`, and collected date range changes SQL query results predictably in seeded data.
  - Limit remains bounded and invalid sort/filter params return 400 rather than unsafe PostgREST fragments.
  QA scenarios: seeded SQL rows; `curl` matrix for paging, sort, status, keyword, numeric ranges; malicious filter string should fail safely. Evidence `.omo/evidence/task-6-saved-list-api-contract.md`.
  Commit: Y | `feat(realty): add saved listing query contract` | `ERP/web/src/app/api/realty/listings/route.ts`.

- [ ] T7. Add saved-list controls without changing Daangn-only MVP scope
  What to do / Must NOT do:
  Add controls above `저장된 상가`: status segmented control, keyword input, sort selector, page size selector, pagination, and date/price/area filters if space allows. Keep `source=daangn` as the default active source. Reuse existing CSS patterns from the franchise leads dashboard.
  Parallelization: Can parallel Y | Wave 2 | Blocks T8/T9
  References: `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:584`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1047`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1063`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:2167`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:2187`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:2217`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:2362`.
  Acceptance criteria:
  - Changing each control updates `GET /api/realty/listings` params without full page reload.
  - Pagination displays total count and prevents previous/next outside range.
  - Loading, empty, error, and populated states are distinct and do not clear user filters unexpectedly.
  - Source remains Daangn-only in UI; Naver Land controls do not appear in this wave.
  QA scenarios: Browser authenticated session; network param assertions; empty-state seed; error simulation by pointing API to missing schema; screenshot desktop and mobile. Evidence `.omo/evidence/task-7-saved-list-controls.md`.
  Commit: Y | `feat(realty): add saved listing controls` | `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css`.

- [ ] T8. Add saved-list detail drawer with curated raw summary
  What to do / Must NOT do:
  Add row selection/detail drawer for saved external listings. Show address, region, price, area/floor, management fee, collected/import job metadata, duplicate candidate reason, source URL, and curated raw summary. Do not dump huge raw JSON into the default UI; raw JSON can be behind an admin/developer-only expander if needed.
  Parallelization: Can parallel Y | Wave 2 | Blocks T9
  References: `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1080`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1084`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1094`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1100`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:1104`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:3093`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:3103`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:3198`, `ERP/web/docs/realty-import-plan.md:43`, `ERP/web/docs/realty-import-plan.md:88`.
  Acceptance criteria:
  - Clicking a row opens a drawer without changing page filters.
  - Drawer includes curated raw fields and duplicate candidate display where `duplicateOfPropertyId` exists.
  - Esc/backdrop/close button closes drawer and restores body scroll.
  - Raw JSON is not shown by default to non-admin users.
  QA scenarios: Browser click row, close via Esc and backdrop, long content row, duplicate candidate row, source URL row. Evidence `.omo/evidence/task-8-saved-list-detail.md`.
  Commit: Y | `feat(realty): add saved listing detail drawer` | UI/CSS files only unless API needs fields.

- [ ] T9. Harden saved-list layout for mobile, long Korean text, and source links
  What to do / Must NOT do:
  Keep the table usable with horizontal scroll or a compact card view. Ensure Korean addresses, content summaries, status pills, price cells, and source link column do not overlap or clip at desktop and mobile widths.
  Parallelization: Can parallel Y | Wave 2 | Blocks final QA
  References: `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1028`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1036`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1041`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1049`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1099`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1120`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:1143`, `ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css:4227`.
  Acceptance criteria:
  - Desktop screenshot at 1440x900 shows all columns and controls without overlap.
  - Mobile screenshot at 390x844 shows usable controls and either horizontal table scroll or card view; source link remains reachable.
  - Rows with very long Korean addresses and content summaries wrap within cells and do not push buttons off-screen.
  QA scenarios: Browser/Playwright screenshots at 1440x900, 768x1024, 390x844; seeded long-address row; source link keyboard focus. Evidence `.omo/evidence/task-9-saved-list-responsive.md`.
  Commit: Y | `fix(realty): improve saved listing responsive layout` | CSS/UI files only.

- [ ] T10. Add first saved-list intelligence fields: score and duplicate group
  What to do / Must NOT do:
  Add the first non-destructive saved-list intelligence layer: computed candidate score, duplicate group marker for same address plus similar price/area, and sort/filter support for score. Do not fetch Daangn detail pages for all 500 rows yet.
  Parallelization: Can parallel Y | Wave 2 | Blocks future ranking/detail enrichment
  References: `ERP/web/docs/realty-import-plan.md:94`, `ERP/web/docs/realty-import-plan.md:99`, `ERP/web/docs/realty-import-plan.md:104`, `ERP/web/docs/realty-import-plan.md:109`, `ERP/web/docs/realty-import-plan.md:114`, `ERP/web/src/app/api/realty/import-jobs/route.ts:238`, `ERP/web/src/app/api/realty/import-jobs/route.ts:391`.
  Acceptance criteria:
  - Score uses deposit, monthly rent, area, floor, collected/registered date, management fee, address completeness, and broker/direct hints where available.
  - Duplicate grouping never merges records physically; it only adds group metadata and UI display.
  - Sorting by score works via `GET /api/realty/listings`.
  QA scenarios: seeded rows for first-floor/recent/in-budget, same-address similar price, same-address different area, missing address; API and UI assertions. Evidence `.omo/evidence/task-10-saved-list-score-duplicates.md`.
  Commit: Y | `feat(realty): add candidate scoring and duplicate grouping` | API/UI/SQL docs as needed.

- [ ] T11. Define provider-neutral manual external listing import contract
  What to do / Must NOT do:
  Before Naver Land work, define a manual import contract that maps URL/CSV/JSON rows into `external_property_listings` without live scraping. It must support source names like `naver-land-manual` later while preserving current Daangn compatibility.
  Parallelization: Can parallel Y | Wave 3 | Blocks T12/T13
  References: `ERP/web/docs/realty-import-plan.md:55`, `ERP/web/docs/realty-import-plan.md:61`, `ERP/web/docs/realty-import-plan.md:65`, `ERP/web/docs/franchise-growth-roadmap.md:144`, `ERP/web/src/lib/realty-import.ts:1`, `ERP/web/src/app/api/realty/import-jobs/route.ts:21`, `ERP/web/src/app/api/realty/listings/route.ts:104`.
  Acceptance criteria:
  - Contract document or typed schema defines required fields, optional fields, source namespace, dedupe keys, raw/data shape, and validation errors.
  - Existing Daangn import still stores `source='daangn'` and remains default in UI.
  - No Naver Land live network calls are introduced in this todo.
  QA scenarios: schema validation on sample CSV/JSON rows; invalid row errors; Daangn regression via existing import QA. Evidence `.omo/evidence/task-11-manual-import-contract.md`.
  Commit: Y | `docs(realty): define manual external listing import contract` | Docs/types only unless validation helpers are added.

- [ ] T12. Build Naver Land URL/CSV/JSON import as a manual POC
  What to do / Must NOT do:
  Add a POC import surface for user-provided Naver Land URLs, CSV, or JSON exports. Parse only user-supplied content and store into external listing tracking tables under a manual Naver source. Do not implement live Naver scraping, automated login, CAPTCHA bypass, or session automation.
  Parallelization: Can parallel Y | Wave 3 | Blocks T13
  References: `ERP/web/docs/realty-import-plan.md:61`, `ERP/web/docs/realty-import-plan.md:65`, `ERP/web/docs/realty-import-plan.md:66`, `ERP/web/docs/franchise-dev-qa-log.md:97`, `ERP/web/docs/franchise-dev-qa-log.md:159`, `ERP/web/docs/franchise-growth-roadmap.md:145`.
  Acceptance criteria:
  - User can paste/import sample Naver Land URL/CSV/JSON data and preview normalized rows before save.
  - Save creates `external_property_listings` rows with a non-Daangn manual source and raw original input.
  - Dedupe updates same manual sourceListingId instead of inserting duplicates.
  - UI labels clearly mark this as manual POC, not live Naver collection.
  QA scenarios: sample URL-only row, CSV with two rows, JSON array, malformed CSV, duplicate import; SQL row checks and browser preview screenshots. Evidence `.omo/evidence/task-12-naver-land-manual-poc.md`.
  Commit: Y | `feat(realty): add manual naver land import poc` | New API/UI files and docs.

- [ ] T13. Add passive local Chrome capture POC only after manual import works
  What to do / Must NOT do:
  If T12 is complete, design a passive capture path that reads user-exported or locally captured page data into the manual import contract. This must not automate login, CAPTCHA, block bypass, or external-service write actions. Provider/proxy adapter remains a later legal/cost review item.
  Parallelization: Can parallel Y | Wave 3 | Blocks future provider work
  References: `ERP/web/docs/realty-import-plan.md:64`, `ERP/web/docs/realty-import-plan.md:65`, `ERP/web/docs/realty-import-plan.md:66`, `ERP/web/docs/franchise-growth-roadmap.md:146`, `ERP/web/docs/franchise-growth-roadmap.md:147`, `ERP/web/docs/franchise-growth-roadmap.md:148`.
  Acceptance criteria:
  - POC accepts only local/user-provided captured payload files or pasted data.
  - The UI/docs include a guardrail checklist: no login automation, no CAPTCHA bypass, no write actions, no provider/proxy until review.
  - Captured sample maps through the same validation/dedupe path from T11/T12.
  QA scenarios: local sample payload import; malformed payload; guardrail text visible in UI/docs; no network calls to `new.land.naver.com` during automated QA. Evidence `.omo/evidence/task-13-naver-land-passive-capture.md`.
  Commit: Y | `feat(realty): add passive naver land capture poc` | POC files/docs only.

- [ ] T14. Define and apply franchise provider-state taxonomy
  What to do / Must NOT do:
  Normalize provider states for Naver review/ad and Google/Kakao support: `unconfigured`, `quota_exceeded`, `timeout`, `error`, `no_result`, `success`, and `stale_success`. Update UI labels so quota is not shown as "미수집" or generic "수집오류".
  Parallelization: Can parallel Y | Wave 4 | Blocks T15/T16
  References: `ERP/web/docs/franchise-growth-roadmap.md:95`, `ERP/web/docs/franchise-growth-roadmap.md:99`, `ERP/web/docs/franchise-growth-roadmap.md:102`, `ERP/web/docs/franchise-growth-roadmap.md:123`, `ERP/web/docs/franchise-dev-qa-log.md:112`, `ERP/web/docs/franchise-dev-qa-log.md:140`, `ERP/web/src/components/franchise/LocationCompetitionPanel.tsx:185`, `ERP/web/src/components/franchise/LocationCompetitionPanel.tsx:213`, `ERP/web/src/components/franchise/LocationCompetitionPanel.tsx:221`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:462`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:577`.
  Acceptance criteria:
  - SearchAPI/SerpApi missing env displays provider missing.
  - SearchAPI 429/monthly allowance failure displays `SearchAPI 한도초과`.
  - Timeout/error and no-result states are distinguishable in both summary and detail modal.
  - Existing Kakao limitation remains clear: Kakao Local has place links but no official review counts.
  QA scenarios: mock/fixture provider responses for missing key, 429, timeout, empty result, success; component screenshot for each state. Evidence `.omo/evidence/task-14-provider-state-taxonomy.md`.
  Commit: Y | `fix(franchise): split competition provider states` | API/UI/lib files.

- [ ] T15. Preserve prior successful Naver values on quota, timeout, or transient failure
  What to do / Must NOT do:
  Stop whole-scan overwrites from erasing useful Naver review/ad data. Merge new scan results with prior `data.competitionScan` per competitor using place id, normalized name/address, or source URL where available, and mark retained values as stale with previous `scannedAt`.
  Parallelization: Can parallel Y | Wave 4 | Blocks T16
  References: `ERP/web/docs/franchise-growth-roadmap.md:102`, `ERP/web/docs/franchise-dev-qa-log.md:91`, `ERP/web/docs/franchise-dev-qa-log.md:116`, `ERP/web/docs/franchise-dev-qa-log.md:140`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:771`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:948`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:977`.
  Acceptance criteria:
  - Seed an existing `competitionScan` with successful Naver visitor/blog/ad values.
  - Run a scan where SearchAPI returns 429/timeout.
  - Result keeps previous Naver values, marks them stale, preserves previous `scannedAt`, and records current provider error separately.
  - Successful fresh scans replace stale values only for matching competitors with new success.
  QA scenarios: route-level fixture or mock provider; SQL before/after JSON diff; UI detail modal shows stale indicator and provider error. Evidence `.omo/evidence/task-15-preserve-naver-values.md`.
  Commit: Y | `fix(franchise): preserve naver scan values on provider failure` | competitor route/lib/UI files.

- [ ] T16. Add cache-first competition scan policy and rescan throttling
  What to do / Must NOT do:
  Implement cache-first display for same address/keyword/radius, minimum rescan interval or confirmation, explicit force refresh, and optional partial retry for failed provider sections. Do not spam external providers on repeated button clicks.
  Parallelization: Can parallel Y | Wave 4 | Blocks final QA
  References: `ERP/web/docs/franchise-growth-roadmap.md:99`, `ERP/web/docs/franchise-growth-roadmap.md:100`, `ERP/web/docs/franchise-growth-roadmap.md:101`, `ERP/web/docs/franchise-growth-roadmap.md:149`, `ERP/web/docs/franchise-dev-qa-log.md:142`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:274`, `ERP/web/src/app/api/franchise-locations/competitors/route.ts:942`, `ERP/web/src/app/(main)/dashboard/franchise-operations/page.tsx:570`.
  Acceptance criteria:
  - Same location/query/radius within TTL returns cached scan without external provider calls unless `forceRefresh=true`.
  - UI shows cache age and requires confirmation or respects minimum interval for provider refresh.
  - Rapid repeated scan clicks do not produce multiple external provider calls.
  QA scenarios: mock provider call counter; two immediate scan POSTs; force refresh POST; browser button double-click; cached detail modal render. Evidence `.omo/evidence/task-16-competition-cache-throttle.md`.
  Commit: Y | `feat(franchise): add competition scan cache and throttle` | competitor API/UI files.

- [ ] T17. Verify brand selector fallback and disclosure sync schema readiness
  What to do / Must NOT do:
  Harden the brand/disclosure path as the final brand wave item. Confirm saved brands load first, disclosure cache fills quickly, official disclosure API can resolve later without blocking indefinitely, and schema-cache failures surface as setup guidance rather than generic failure.
  Parallelization: Can parallel Y | Wave 4 | Blocks final QA
  References: `ERP/web/src/components/franchise/FranchiseBrandSelector.tsx:122`, `ERP/web/src/components/franchise/FranchiseBrandSelector.tsx:152`, `ERP/web/src/components/franchise/FranchiseBrandSelector.tsx:165`, `ERP/web/src/components/franchise/FranchiseBrandSelector.tsx:180`, `ERP/web/src/app/api/franchise-brands/route.ts:152`, `ERP/web/src/app/api/franchise-brands/route.ts:192`, `ERP/web/src/app/api/franchise-brands/route.ts:201`, `ERP/web/src/app/api/franchise-brands/sync/route.ts:90`, `ERP/web/src/app/api/franchise-brands/sync/route.ts:136`, `ERP/web/docs/franchise-dev-qa-log.md:163`.
  Acceptance criteria:
  - Saved brand query returns immediately when available.
  - Local disclosure cache results merge without duplicates.
  - Official disclosure API timeout after 3.5s does not block UI indefinitely; late response can still update current search if still relevant.
  - Missing `franchise_brands` schema returns setup guidance or warnings, not silent empty success.
  QA scenarios: browser selector search; mocked slow official API; missing table/schema route check; admin sync with sample payload. Evidence `.omo/evidence/task-17-brand-fallback-sync.md`.
  Commit: Y | `fix(franchise): harden brand disclosure fallback` | brand API/component files.

## Final verification wave (after ALL todos)
> Runs in parallel. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
  - Verify all implemented changes follow this priority order and no out-of-scope Naver live scraping or auto-promotion was introduced.
  - Command: `git diff --name-only HEAD` and manual file review by agent.
  - Must confirm `ERP/web/handoff.md` has no diff.
- [ ] F2. Code quality review
  - Run `cd ERP/web && npm run lint -- --quiet`, `cd ERP/web && npx tsc --noEmit`, `cd ERP/web && npm run build`, and `git diff --check`.
  - Confirm no lint/type/build gate was weakened.
- [ ] F3. Real manual QA
  - Use authenticated Browser/Playwright session for `/dashboard/franchise-operations`.
  - Verify Daangn import, saved list filters/paging/detail drawer, responsive layout, competition cache/provider states, and brand selector fallback.
  - Evidence: screenshots and network assertions under `.omo/evidence/final-erp-web-next-development-plan/`.
- [ ] F4. Scope fidelity
  - Verify no secrets in docs/source/evidence.
  - Verify Naver Land POC, if implemented, uses only manual URL/CSV/JSON or passive local captures.
  - Verify provider quota/timeout states preserve prior data.

## Commit strategy
- Keep commits wave-scoped and reviewable.
- Recommended order:
  1. `test(realty): verify external listing schema and rls`
  2. `fix(realty): harden import routes and block auto registration`
  3. `test(realty): lock daangn collector contract`
  4. `fix(realty): preserve scoped external listing dedupe`
  5. `fix(realty): stabilize daangn import workflow`
  6. `feat(realty): add saved listing query contract`
  7. `feat(realty): add saved listing controls`
  8. `feat(realty): add saved listing detail drawer`
  9. `fix(realty): improve saved listing responsive layout`
  10. `feat(realty): add candidate scoring and duplicate grouping`
  11. `docs(realty): define manual external listing import contract`
  12. `feat(realty): add manual naver land import poc`
  13. `feat(realty): add passive naver land capture poc`
  14. `fix(franchise): split competition provider states`
  15. `fix(franchise): preserve naver scan values on provider failure`
  16. `feat(franchise): add competition scan cache and throttle`
  17. `fix(franchise): harden brand disclosure fallback`
- If unrelated dirty files exist, do not stage them. Use explicit path staging.
- Keep `.omo/evidence` out of production commits unless the team explicitly wants evidence artifacts versioned.

## Success criteria
- Daangn external store import is stable enough to operate as the only active external realty source: migration applied, schema/RLS verified, provider failures explicit, requester/company scope enforced, re-import updates not duplicates, and no automatic `properties` creation.
- Saved external listings are usable beyond the initial 200-row table: filters, sorting, paging, detail inspection, raw summary, duplicate group/score support, and mobile-safe layout.
- Naver Land remains correctly deferred and enters only through a manual-import-first POC, then passive capture, then provider/proxy review.
- Franchise brand/competition work no longer treats quota or provider failures as no data, preserves prior successful Naver values, throttles rescans, and verifies brand fallback behavior.
- Final verification commands pass: `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build`, `git diff --check`.
- `git diff -- ERP/web/handoff.md` remains empty.
