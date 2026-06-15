# Franchise Operations Opening Stability

## TL;DR
> Summary:      P0 lead-ingress QA, mobile sidebar layout stability, external realty scale/raw regression, and the first HQ-only opening project workflow are executed as one guarded operations-stability release.
> Deliverables:
> - Agent-executed P0 QA for Excel/raw-intake lead promotion and role/company scope.
> - Mobile-first sidebar auto-collapse with regression checks on the three affected franchise routes.
> - External realty 2000/3000 limit, saved-list limit, raw/data, and no-auto-property regression evidence.
> - Dedicated `franchise_opening_projects` SQL/API/UI MVP inside `/dashboard/franchise-operations`.
> - Roadmap, QA log, and `MAC_CONTEXT.md` updates, with `ERP/web/handoff.md` untouched.
> Effort:       Large
> Risk:         Medium - crosses DB, API scope, operational UI, logged-in QA, and external-provider/data-volume checks.

## Scope
### Must have
- Keep the current Hermes state as the baseline: docs are consistent as of 2026-06-11, `manual-promoted` workflow and role/company API QA are documented complete, and no forbidden-file contact occurred.
- Preserve `ERP/web/handoff.md` untouched.
- Keep SearchAPI 429/provider protection out of this release. It remains a separate P1 after SearchAPI paid quota is available.
- Keep Meta Lead Ads HOLD. If real Meta account/env/form access is unavailable, document it as blocked instead of simulating success.
- Verify Excel upload through an actual `.xlsx` file object and the existing `/api/franchise-leads/batch` path, then promote `raw_intake` to `candidate`.
- Verify work queue counts/list alignment for `all`, `overdue`, `today`, and `no_response`.
- Verify role/company scope across franchise leads, franchise locations, external realty listings, and franchise operations/opening projects.
- Fix mobile first-entry layout by auto-collapsing `MainLayout`/`Sidebar` on mobile while keeping desktop default open.
- Verify `/dashboard/franchise-leads`, `/dashboard/franchise-leads/market-insights?tab=realty-import`, and `/dashboard/franchise-operations` on mobile and desktop.
- Verify external realty UI limit 2000, API clamp 3000, saved-list API limit 2000, `external_property_listings.raw/data`, `registerToProperties` 400, and `properties` auto-create count 0.
- Add opening project MVP for HQ staff:
  - Projects are tied to `franchise_locations` rows whose status is `오픈준비`.
  - Use a dedicated SQL table, not `franchise_locations.data`, for project state.
  - Default checklist tasks: 계약, 인테리어, 교육, 초도물류, 홍보, 오픈일.
  - Each task stores status, owner, due date, and memo.
  - Project target open date, status, memo, and tasks persist after refresh.
  - Company scope and manager/company mismatch checks match existing franchise APIs.

### Must NOT have
- Do not edit `ERP/web/handoff.md`.
- Do not write secrets, tokens, private provider URLs, or real credentials into docs, evidence, SQL, or source.
- Do not enable automatic ERP `properties` creation from realty import.
- Do not add a franchisee portal, POS/order, royalty, settlement, payment, messaging, external-service write action, CAPTCHA bypass, or login automation to third-party services.
- Do not collapse provider failure, quota exceeded, unconfigured, and no-result states into one state.
- Do not introduce a new UI design system. Reuse existing CSS module patterns under `src/app/(main)/dashboard/franchise-leads/page.module.css` and operation components under `src/components/franchise/operations`.
- Do not make broad refactors in `franchise-leads/page.tsx` or unrelated property/customer modules.

## Verification strategy
> Zero human intervention - all verification is agent-executed. If real Meta or real production role-matrix credentials are missing, the agent records a concrete blocked result with the missing variable/account name.
- Test decision: TDD for new opening-project normalization helpers and API scope behavior; tests-after for mobile layout and end-to-end logged-in/browser flows.
- QA policy: every todo has agent-executed scenarios with evidence under `.omo/evidence/`.
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>`
- Required final gates:
  - `npm run lint -- --quiet`
  - `npx tsc --noEmit --pretty false`
  - targeted `npx tsx --test ...`
  - `npm run build`
  - browser/mobile screenshots or Playwright/Browser Plugin evidence for all three routes.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. < 3 per wave except the final = under-splitting.
- Wave 1 (no deps): T1, T2, T3, T4, T5
- Wave 2 (after T1/T3/T5): T6, T7, T8, T9, T10
- Wave 3 (after T6/T7/T8/T9): T11, T12, T13, T14, T15
- Wave 4 (after all implementation todos): T16, T17, T18
- Critical path: T1 -> T6 -> T7 -> T11 -> T16 -> T18

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 | none | T6, T16 | T2, T3, T4, T5 |
| T2 | none | T10, T17 | T1, T3, T4, T5 |
| T3 | none | T8, T9 | T1, T2, T4, T5 |
| T4 | none | T13, T17 | T1, T2, T3, T5 |
| T5 | none | T15, T18 | T1, T2, T3, T4 |
| T6 | T1 | T7, T11 | T8, T9, T10 |
| T7 | T6 | T11, T12 | T8, T9, T10 |
| T8 | T3 | T13 | T6, T7, T9, T10 |
| T9 | T3 | T13 | T6, T7, T8, T10 |
| T10 | T2 | T17 | T6, T7, T8, T9 |
| T11 | T6, T7 | T12, T16 | T13, T14, T15 |
| T12 | T7, T11 | T16 | T13, T14, T15 |
| T13 | T8, T9 | T17 | T11, T12, T14, T15 |
| T14 | T6, T7 | T16 | T11, T12, T13, T15 |
| T15 | T5 | T18 | T11, T12, T13, T14 |
| T16 | T1, T11, T12, T14 | F1-F4 | T17, T18 |
| T17 | T2, T4, T10, T13 | F1-F4 | T16, T18 |
| T18 | T5, T15 | F1-F4 | T16, T17 |

## Todos
> Implementation + Test = ONE todo. Never separate.

- [x] T1. Lock the pre-work guardrails and dirty-worktree baseline
  What to do / Must NOT do: Confirm the working tree state before code edits, record unrelated dirty paths as outside scope, and verify `ERP/web/handoff.md` has no diff. Do not revert unrelated files.
  Parallelization: Can parallel Y | Wave 1 | Blocks T6, T16
  References: `../../AGENTS.md:1`, `AGENTS.md:1`, `../../MAC_CONTEXT.md:1`, `docs/franchise-growth-roadmap.md:7`, `docs/franchise-dev-qa-log.md:243`
  Acceptance criteria (agent-executable): `git status --short --branch`; `git diff -- ERP/web/handoff.md` returns empty; create `.omo/evidence/task-1-baseline.txt` with branch, dirty paths, and handoff diff result.
  QA scenarios (name the exact tool + invocation): shell `git status --short --branch`; shell `git diff -- ERP/web/handoff.md`; Evidence `.omo/evidence/task-1-baseline.txt`.
  Commit: N | none | Files `.omo/evidence/task-1-baseline.txt`

- [x] T2. Build the P0 lead-ingress QA fixture and runner
  What to do / Must NOT do: Add a small runner that creates an `.xlsx` fixture using the existing `xlsx` dependency, posts it through `/api/franchise-leads/batch`, verifies new rows enter `data.leadStage='raw_intake'`, promotes one through the existing `/api/franchise-leads` update path, and confirms `candidate` reload. Do not bypass the app's batch mapping rules.
  Parallelization: Can parallel Y | Wave 1 | Blocks T10, T17
  References: `package.json:11`, `package.json:27`, `src/app/api/franchise-leads/batch/route.ts:176`, `src/app/api/franchise-leads/batch/route.ts:201`, `src/app/api/franchise-leads/batch/route.ts:210`, `src/app/api/franchise-leads/route.ts:540`, `src/app/(main)/dashboard/franchise-leads/page.tsx:1869`, `src/app/(main)/dashboard/franchise-leads/page.tsx:1886`, `src/app/(main)/dashboard/franchise-leads/page.tsx:2011`
  Acceptance criteria (agent-executable): `node scripts/franchise-p0-lead-ingress-qa.mjs --base-url http://localhost:<port>` exits 0 when QA requester/company env is present; exits with explicit `BLOCKED_META_ENV` only for Meta; writes counts and created IDs to `.omo/evidence/task-2-lead-ingress.json`.
  QA scenarios (name the exact tool + invocation): shell `node scripts/franchise-p0-lead-ingress-qa.mjs --base-url http://localhost:<port>`; Browser Plugin file-upload check on `/dashboard/franchise-leads`; Evidence `.omo/evidence/task-2-lead-ingress.json` and `.omo/evidence/task-2-franchise-leads-upload-mobile.png`.
  Commit: Y | `test(franchise): add lead ingress regression runner` | Files `scripts/franchise-p0-lead-ingress-qa.mjs`, `.omo/evidence/task-2-*`

- [x] T3. Specify opening-project data contract and SQL migration
  What to do / Must NOT do: Add `supabase_franchise_opening_projects_migration.sql` and mirror it into `supabase_schema.sql`. Use dedicated table `public.franchise_opening_projects` with `company_id`, `location_id`, `manager_id`, `status`, `target_open_date`, `memo`, `tasks jsonb`, `data jsonb`, timestamps, `unique(company_id, location_id)`, RLS by `get_my_company_id()`, and useful company/status/date indexes. Do not store project state only in `franchise_locations.data`.
  Parallelization: Can parallel Y | Wave 1 | Blocks T8, T9
  References: `supabase_franchise_locations_migration.sql:6`, `supabase_franchise_locations_migration.sql:19`, `supabase_franchise_locations_migration.sql:26`, `supabase_schema.sql:346`, `README.md:43`, `README.md:47`
  Acceptance criteria (agent-executable): SQL contains table, RLS policies, unique index, and company/date indexes; `rg -n "franchise_opening_projects" supabase_franchise_opening_projects_migration.sql supabase_schema.sql README.md` shows all required references.
  QA scenarios (name the exact tool + invocation): shell `rg -n "franchise_opening_projects|get_my_company_id|unique|target_open_date" supabase_franchise_opening_projects_migration.sql supabase_schema.sql`; Evidence `.omo/evidence/task-3-sql-audit.txt`.
  Commit: Y | `feat(franchise): add opening project schema` | Files `supabase_franchise_opening_projects_migration.sql`, `supabase_schema.sql`, `README.md`

- [x] T4. Define opening-project normalization helpers and tests
  What to do / Must NOT do: Add `src/lib/franchise-opening-projects.ts` with default task definitions, status normalization, task merge/update helpers, progress summary, due-soon/blocker counters, and transform functions. Add `src/lib/franchise-opening-projects.test.mts`. Do not couple helper tests to Supabase.
  Parallelization: Can parallel Y | Wave 1 | Blocks T13, T17
  References: `src/lib/manual-promoted-operations.ts:24`, `src/lib/manual-promoted-operations.ts:68`, `src/lib/manual-promoted-operations.test.mts:1`, `src/lib/franchise-lead-workflow.ts:1`, `src/lib/franchise-lead-workflow.test.mts:1`
  Acceptance criteria (agent-executable): `npx tsx --test src/lib/franchise-opening-projects.test.mts` passes and covers default tasks, partial task updates, invalid status fallback, progress counts, and overdue/due-soon calculation.
  QA scenarios (name the exact tool + invocation): shell `npx tsx --test src/lib/franchise-opening-projects.test.mts`; Evidence `.omo/evidence/task-4-opening-project-lib-test.txt`.
  Commit: Y | `feat(franchise): add opening project helpers` | Files `src/lib/franchise-opening-projects.ts`, `src/lib/franchise-opening-projects.test.mts`

- [x] T5. Plan and scaffold docs/evidence update boundaries
  What to do / Must NOT do: Prepare the exact documentation sections that will be updated after implementation: roadmap next-work priorities, QA pass/blocked entries, and concise `MAC_CONTEXT.md` resume note. Do not edit docs before evidence exists. Do not edit `handoff.md`.
  Parallelization: Can parallel Y | Wave 1 | Blocks T15, T18
  References: `docs/AGENTS.md:1`, `docs/franchise-growth-roadmap.md:18`, `docs/franchise-growth-roadmap.md:148`, `docs/franchise-dev-qa-log.md:204`, `../../MAC_CONTEXT.md:93`, `../../MAC_CONTEXT.md:118`
  Acceptance criteria (agent-executable): Create `.omo/evidence/task-5-doc-targets.md` with the exact headings/line ranges to update and the evidence needed for each.
  QA scenarios (name the exact tool + invocation): shell `rg -n "P0|P1|오픈 준비|모바일|2000/3000|SearchAPI" docs/franchise-growth-roadmap.md docs/franchise-dev-qa-log.md ../../MAC_CONTEXT.md`; Evidence `.omo/evidence/task-5-doc-targets.md`.
  Commit: N | none | Files `.omo/evidence/task-5-doc-targets.md`

- [x] T6. Add `GET/POST/PUT/DELETE /api/franchise-opening-projects`
  What to do / Must NOT do: Add `src/app/api/franchise-opening-projects/route.ts` using `getRequesterProfile`, `resolveCompanyIdByName`, `canAccessCompanyScope`, `canAccessCompanyResource`, and `ok`/`fail`. `GET` lists projects scoped by company and can filter by `locationId`. `POST` upserts one project for an `오픈준비` franchise location in the same company. `PUT` updates status, target date, memo, and tasks. `DELETE` removes a project only when requester can access the company resource. Do not allow no-company requester project creation.
  Parallelization: Can parallel Y | Wave 2 | Blocks T7, T11
  References: `src/app/api/AGENTS.md:1`, `src/app/api/franchise-locations/route.ts:115`, `src/app/api/franchise-locations/route.ts:128`, `src/app/api/franchise-locations/route.ts:226`, `src/app/api/franchise-locations/route.ts:276`, `src/lib/api-auth.ts:77`, `src/lib/api-auth.ts:105`, `src/lib/api-auth.ts:115`, `src/lib/api-response.ts`
  Acceptance criteria (agent-executable): API returns 401 without requester, 400 for no company scope mutation, 403 cross-company, 404 missing location/project, and 200/201 for scoped CRUD. Add an API-focused test or QA runner output to `.omo/evidence/task-6-opening-api.json`.
  QA scenarios (name the exact tool + invocation): shell `node scripts/franchise-opening-projects-api-qa.mjs --base-url http://localhost:<port>`; shell `npx tsc --noEmit --pretty false`; Evidence `.omo/evidence/task-6-opening-api.json`.
  Commit: Y | `feat(franchise): add opening project api` | Files `src/app/api/franchise-opening-projects/route.ts`, `scripts/franchise-opening-projects-api-qa.mjs`

- [x] T7. Add client request layer and controller state for opening projects
  What to do / Must NOT do: Extend `src/components/franchise/operations/requests.ts`, `types.ts`, and `useFranchiseOperationsController.ts` for fetching, creating, updating, deleting, and refreshing opening projects. Keep existing manual-promoted conversion behavior unchanged.
  Parallelization: Can parallel Y | Wave 2 | Blocks T11, T12
  References: `src/components/franchise/operations/types.ts:17`, `src/components/franchise/operations/requests.ts:82`, `src/components/franchise/operations/requests.ts:119`, `src/components/franchise/operations/useFranchiseOperationsController.ts:37`, `src/components/franchise/operations/useFranchiseOperationsController.ts:87`, `src/components/franchise/operations/useFranchiseOperationsController.ts:222`
  Acceptance criteria (agent-executable): `npx tsc --noEmit --pretty false` passes; controller exposes `openingProjects`, loading/saving IDs, summary counts, and methods without breaking existing operations props.
  QA scenarios (name the exact tool + invocation): shell `npx tsc --noEmit --pretty false`; shell `npx tsx --test src/lib/manual-promoted-operations.test.mts src/lib/franchise-opening-projects.test.mts`; Evidence `.omo/evidence/task-7-controller-typecheck.txt`.
  Commit: Y | `feat(franchise): wire opening projects into operations controller` | Files `src/components/franchise/operations/types.ts`, `src/components/franchise/operations/requests.ts`, `src/components/franchise/operations/useFranchiseOperationsController.ts`

- [x] T8. Add role/company scope QA runner for franchise surfaces
  What to do / Must NOT do: Add a runner that exercises franchise leads, franchise locations, realty listings, manual-promoted operations linkage, and opening projects for company A, company B, admin, and no-company requester. It must reuse existing APIs and clean up temporary data. Do not use real secrets in output.
  Parallelization: Can parallel Y | Wave 2 | Blocks T13
  References: `src/app/api/franchise-leads/route.ts:390`, `src/app/api/franchise-locations/route.ts:253`, `src/app/api/realty/listings/route.ts:70`, `src/app/api/realty/listings/route.ts:112`, `src/app/api/franchise-locations/route.ts:276`, `src/lib/api-auth.ts:101`
  Acceptance criteria (agent-executable): `node scripts/franchise-role-matrix-qa.mjs --base-url http://localhost:<port>` proves allowed same-company access, 403 cross-company reads/writes, no-company owner-only realty listings, and no-company opening-project mutation 400. Missing real production account env records `BLOCKED_REAL_ROLE_MATRIX` in evidence.
  QA scenarios (name the exact tool + invocation): shell `node scripts/franchise-role-matrix-qa.mjs --base-url http://localhost:<port>`; Evidence `.omo/evidence/task-8-role-matrix.json`.
  Commit: Y | `test(franchise): add role matrix regression runner` | Files `scripts/franchise-role-matrix-qa.mjs`

- [x] T9. Add external realty scale/raw regression runner
  What to do / Must NOT do: Add a runner that can operate in live mode or fixture mode. It verifies Daangn `limit=2000`, direct API clamp at 3000, saved-list `limit=2000`, `raw/data` presence, `registerToProperties` 400, and `properties` auto-create count 0. Do not call external providers more than necessary; fixture mode must be available for deterministic CI-like checks.
  Parallelization: Can parallel Y | Wave 2 | Blocks T13
  References: `src/components/franchise/RealtyImportPanel.tsx:31`, `src/components/franchise/RealtyImportPanel.tsx:86`, `src/components/franchise/RealtyImportPanel.tsx:123`, `src/app/api/realty/listings/route.ts:82`, `src/app/api/realty/import-jobs/route.ts:490`, `src/app/api/realty/import-jobs/route.ts:495`, `src/lib/realty-import.ts:77`, `src/lib/realty-import.ts:94`, `src/lib/realty-import.ts:239`
  Acceptance criteria (agent-executable): `node scripts/realty-scale-raw-qa.mjs --base-url http://localhost:<port> --mode fixture` exits 0; live mode writes warnings if provider data volume is below 2000 but still proves clamp and no-auto-create invariants.
  QA scenarios (name the exact tool + invocation): shell `node scripts/realty-scale-raw-qa.mjs --base-url http://localhost:<port> --mode fixture`; optional shell `node scripts/realty-scale-raw-qa.mjs --base-url http://localhost:<port> --mode live --region "서울 광진구"`; Evidence `.omo/evidence/task-9-realty-scale-raw.json`.
  Commit: Y | `test(realty): add scale and raw regression runner` | Files `scripts/realty-scale-raw-qa.mjs`

- [x] T10. Fix mobile first-entry sidebar behavior
  What to do / Must NOT do: Update `MainLayout` so mobile first entry defaults to collapsed using `window.matchMedia`, reacts to breakpoint changes, and keeps desktop default open. Update `MainLayout.module.css`/`Sidebar.module.css` so collapsed mobile content gets full width and manual sidebar open does not permanently squeeze the page. Do not change auth behavior or menu hierarchy.
  Parallelization: Can parallel Y | Wave 2 | Blocks T17
  References: `src/components/layout/MainLayout.tsx:37`, `src/components/layout/MainLayout.tsx:38`, `src/components/layout/MainLayout.tsx:281`, `src/components/layout/MainLayout.tsx:283`, `src/components/layout/MainLayout.module.css:1`, `src/components/layout/Sidebar.module.css:1`, `src/components/layout/Sidebar.module.css:16`, `src/components/layout/Sidebar.tsx:92`
  Acceptance criteria (agent-executable): On viewport width 390, first load of each target route shows `.global-sidebar` collapsed or overlay-safe and `.global-main-wrapper` width is not squeezed below 360px; on width 1440, sidebar defaults open.
  QA scenarios (name the exact tool + invocation): Browser Plugin screenshots at 390x844 and 1440x900 for `/dashboard/franchise-leads`, `/dashboard/franchise-leads/market-insights?tab=realty-import`, `/dashboard/franchise-operations`; Evidence `.omo/evidence/task-10-mobile-*.png` and `.omo/evidence/task-10-mobile-layout.json`.
  Commit: Y | `fix(layout): collapse sidebar by default on mobile` | Files `src/components/layout/MainLayout.tsx`, `src/components/layout/MainLayout.module.css`, `src/components/layout/Sidebar.module.css`

- [x] T11. Add opening-project operations UI
  What to do / Must NOT do: Add `OpeningProjectPanel` and focused child components under `src/components/franchise/operations`. Place it in `/dashboard/franchise-operations` as a full-width operational section, not a nested card inside another card. Show `오픈준비` locations, project status, target date, progress, due-soon/blocker summary, and checklist controls. Do not remove `ManualPromotedPropertyPanel`.
  Parallelization: Can parallel Y | Wave 3 | Blocks T12, T16
  References: `src/app/(main)/dashboard/franchise-operations/page.tsx:34`, `src/app/(main)/dashboard/franchise-operations/page.tsx:43`, `src/app/(main)/dashboard/franchise-operations/page.tsx:86`, `src/app/(main)/dashboard/franchise-operations/page.tsx:94`, `src/components/franchise/operations/FranchiseLocationList.tsx:31`, `src/components/franchise/operations/FranchiseLocationForm.tsx:36`, `src/app/(main)/dashboard/franchise-leads/page.module.css`
  Acceptance criteria (agent-executable): The operations page renders an opening-project section; creating/updating a project changes UI state without page reload; full refresh preserves saved target date, memo, and checklist task state.
  QA scenarios (name the exact tool + invocation): Browser Plugin logged-in flow on `/dashboard/franchise-operations` create project, update task, reload; Evidence `.omo/evidence/task-11-opening-ui-desktop.png`, `.omo/evidence/task-11-opening-ui-mobile.png`, `.omo/evidence/task-11-opening-ui.json`.
  Commit: Y | `feat(franchise): add opening project panel` | Files `src/app/(main)/dashboard/franchise-operations/page.tsx`, `src/components/franchise/operations/OpeningProjectPanel.tsx`, optional child components, `src/app/(main)/dashboard/franchise-leads/page.module.css`

- [x] T12. Preserve manual-promoted operation conversion with opening projects present
  What to do / Must NOT do: Re-run and extend tests to ensure a `manual-promoted` property still appears in the operation conversion panel, creates an `오픈준비` `franchise_locations` row with `source_property_id`, and can then receive an opening project. Do not auto-create an opening project during manual-promoted conversion unless the user explicitly clicks project creation.
  Parallelization: Can parallel Y | Wave 3 | Blocks T16
  References: `src/lib/manual-promoted-operations.ts:64`, `src/lib/manual-promoted-operations.ts:68`, `src/lib/manual-promoted-operations.test.mts:20`, `src/components/franchise/operations/ManualPromotedPropertyPanel.tsx:60`, `src/components/franchise/operations/useFranchiseOperationsController.ts:157`, `src/app/api/franchise-locations/route.ts:196`
  Acceptance criteria (agent-executable): `npx tsx --test src/lib/manual-promoted-operations.test.mts src/lib/franchise-opening-projects.test.mts` passes; browser evidence shows manual-promoted conversion panel still works with opening-project panel mounted.
  QA scenarios (name the exact tool + invocation): shell `npx tsx --test src/lib/manual-promoted-operations.test.mts src/lib/franchise-opening-projects.test.mts`; Browser Plugin `/dashboard/franchise-operations` manual-promoted conversion; Evidence `.omo/evidence/task-12-manual-promoted-opening.json`.
  Commit: Y | `test(franchise): keep manual promoted operations regression` | Files tests/evidence only unless a regression fix is needed

- [x] T13. Execute P0/P1 regression runners and browser QA
  What to do / Must NOT do: Start the local server, run T2/T8/T9 runners, and perform browser checks for lead ingress, work queue counts/list alignment, role scope, realty saved-list controls, and opening-project persistence. Do not treat unauthenticated redirect as logged-in QA.
  Parallelization: Can parallel Y | Wave 3 | Blocks T17
  References: `README.md:18`, `README.md:22`, `README.md:28`, `docs/franchise-dev-qa-log.md:204`, `docs/franchise-dev-qa-log.md:212`, `src/lib/franchise-lead-workflow.ts:136`, `src/app/(main)/dashboard/franchise-leads/page.tsx:977`, `src/app/(main)/dashboard/franchise-leads/page.tsx:993`
  Acceptance criteria (agent-executable): All available runners exit 0 or emit explicit blocked codes only for missing real Meta/production role env; work queue counts match visible lists; evidence files include route, account role, data IDs, expected/actual result.
  QA scenarios (name the exact tool + invocation): shell `npm run dev -- -p <free-port>`; shell `node scripts/franchise-p0-lead-ingress-qa.mjs --base-url http://localhost:<port>`; shell `node scripts/franchise-role-matrix-qa.mjs --base-url http://localhost:<port>`; shell `node scripts/realty-scale-raw-qa.mjs --base-url http://localhost:<port> --mode fixture`; Browser Plugin logged-in flows; Evidence `.omo/evidence/task-13-regression-summary.md`.
  Commit: N | none | Files `.omo/evidence/task-13-*`

- [x] T14. Run type/lint/build and targeted unit tests
  What to do / Must NOT do: Run the project verification gates and targeted unit tests. Do not weaken lint/type rules or skip build after UI/API/SQL changes.
  Parallelization: Can parallel Y | Wave 3 | Blocks T16
  References: `README.md:18`, `package.json:5`, `package.json:6`, `package.json:7`, `package.json:9`, `docs/franchise-dev-qa-log.md:104`
  Acceptance criteria (agent-executable): `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, targeted `npx tsx --test ...`, and `npm run build` pass. Logs are saved.
  QA scenarios (name the exact tool + invocation): shell `npm run lint -- --quiet`; shell `npx tsc --noEmit --pretty false`; shell `npx tsx --test src/lib/franchise-opening-projects.test.mts src/lib/manual-promoted-operations.test.mts src/lib/property-external-status.test.mts src/lib/realty-listing-promotion.test.mts src/lib/realty-import-schema.test.mts src/components/franchise/realty-import/scoring.test.mts src/components/franchise/realty-import/utils.test.mts src/components/franchise/realty-import/map-utils.test.mts src/lib/franchise-lead-workflow.test.mts`; shell `npm run build`; Evidence `.omo/evidence/task-14-verification.log`.
  Commit: N | none | Files `.omo/evidence/task-14-verification.log`

- [x] T15. Update docs with completed, blocked, and deferred status
  What to do / Must NOT do: Update `docs/franchise-growth-roadmap.md`, `docs/franchise-dev-qa-log.md`, and `../../MAC_CONTEXT.md` after evidence exists. Record opening-project implementation, mobile layout QA, P0 lead QA result, role matrix result, external realty scale/raw result, Meta blocked status, and SearchAPI deferred status. Do not edit `ERP/web/handoff.md`.
  Parallelization: Can parallel Y | Wave 3 | Blocks T18
  References: `docs/AGENTS.md:15`, `docs/franchise-growth-roadmap.md:18`, `docs/franchise-growth-roadmap.md:148`, `docs/franchise-dev-qa-log.md:26`, `docs/franchise-dev-qa-log.md:155`, `docs/franchise-dev-qa-log.md:204`, `../../MAC_CONTEXT.md:93`, `../../MAC_CONTEXT.md:118`
  Acceptance criteria (agent-executable): `rg -n "오픈 준비 프로젝트|모바일 전역|2000/3000|Meta.*HOLD|SearchAPI.*유료" docs/franchise-growth-roadmap.md docs/franchise-dev-qa-log.md ../../MAC_CONTEXT.md` shows consistent status; `git diff -- ERP/web/handoff.md` remains empty.
  QA scenarios (name the exact tool + invocation): shell `git diff --check`; shell `git diff -- ERP/web/handoff.md`; shell `rg -n "오픈 준비 프로젝트|모바일 전역|2000/3000|SearchAPI" docs/franchise-growth-roadmap.md docs/franchise-dev-qa-log.md ../../MAC_CONTEXT.md`; Evidence `.omo/evidence/task-15-docs-audit.txt`.
  Commit: Y | `docs(franchise): record opening project qa status` | Files `docs/franchise-growth-roadmap.md`, `docs/franchise-dev-qa-log.md`, `../../MAC_CONTEXT.md`

- [x] T16. Full operations story verification
  What to do / Must NOT do: Verify the full operational story: external `manual-promoted` property -> explicit operations conversion -> `오픈준비` location -> opening project -> checklist update -> reload persistence. Do not mark complete from API-only evidence if UI persistence is broken.
  Parallelization: Can parallel Y | Wave 4 | Blocks F1-F4
  References: `docs/franchise-growth-roadmap.md:108`, `docs/franchise-growth-roadmap.md:111`, `docs/franchise-dev-qa-log.md:98`, `docs/franchise-dev-qa-log.md:99`, `docs/franchise-dev-qa-log.md:100`, `src/app/(main)/dashboard/franchise-operations/page.tsx:86`
  Acceptance criteria (agent-executable): Browser evidence proves the story on desktop and mobile-collapsed layout; API evidence proves `franchise_locations.source_property_id` and `franchise_opening_projects.location_id` persist after reload.
  QA scenarios (name the exact tool + invocation): Browser Plugin desktop/mobile; shell API runner `node scripts/franchise-opening-projects-api-qa.mjs --base-url http://localhost:<port> --story manual-promoted`; Evidence `.omo/evidence/task-16-full-story.md`, `.omo/evidence/task-16-full-story-desktop.png`, `.omo/evidence/task-16-full-story-mobile.png`.
  Commit: N | none | Files `.omo/evidence/task-16-*`

- [x] T17. Full mobile and realty/lead regression verification
  What to do / Must NOT do: Verify that the mobile sidebar fix did not break lead table/task queue, realty import saved-list table/map, or operations opening project panel. Verify text/buttons do not overlap at 390px and 1440px. Do not rely on a single route.
  Parallelization: Can parallel Y | Wave 4 | Blocks F1-F4
  References: `docs/franchise-dev-qa-log.md:161`, `docs/franchise-dev-qa-log.md:162`, `src/components/layout/MainLayout.tsx:281`, `src/components/franchise/RealtyImportPanel.tsx:220`, `src/components/franchise/realty-import/RealtySavedPanel.tsx:40`, `src/app/(main)/dashboard/franchise-leads/page.tsx:2774`
  Acceptance criteria (agent-executable): Three target routes render without incoherent overlap, page content width remains usable, sidebar starts collapsed on mobile, and desktop sidebar starts open.
  QA scenarios (name the exact tool + invocation): Browser Plugin screenshots for all routes at 390x844 and 1440x900; Evidence `.omo/evidence/task-17-route-*.png` and `.omo/evidence/task-17-layout-report.json`.
  Commit: N | none | Files `.omo/evidence/task-17-*`

- [x] T18. Commit-ready audit and final commit
  What to do / Must NOT do: Review changed files, confirm no forbidden file diff, run final gates if any file changed after T14, then create one coherent commit. Do not stage unrelated workspace changes.
  Parallelization: Can parallel Y | Wave 4 | Blocks F1-F4
  References: `../../AGENTS.md:47`, `../../AGENTS.md:60`, `AGENTS.md:18`, `README.md:18`, `docs/franchise-dev-qa-log.md:243`
  Acceptance criteria (agent-executable): `git status --short` only shows intended files; `git diff -- ERP/web/handoff.md` empty; final commit exists with a message like `feat(franchise): add opening project operations workflow`.
  QA scenarios (name the exact tool + invocation): shell `git diff --check`; shell `git status --short`; shell `git diff -- ERP/web/handoff.md`; shell `git add <intended files>`; shell `git commit -m "feat(franchise): add opening project operations workflow"`; Evidence `.omo/evidence/task-18-commit-audit.txt`.
  Commit: Y | `feat(franchise): add opening project operations workflow` | Files all intended implementation, QA runner, docs, and plan/evidence files only if project convention allows evidence commit

## Final verification wave (after ALL todos)
> Runs in parallel where tooling permits. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
  Verify every Must have has either passing evidence, a committed implementation, or an explicit blocked result for unavailable Meta/production role credentials. Reject if SearchAPI 429 protection was mixed into this release.
- [ ] F2. Code quality review
  Review new SQL/API/client/UI code for strict typing, company-scope enforcement, no client service-role usage, no broad refactors, and no accidental automatic `properties` creation.
- [ ] F3. Real manual QA
  Browser-verify the actual user-facing flows at desktop and mobile sizes with a logged-in session: lead Excel upload/promotion, work queues, realty saved list, operations conversion, and opening project persistence.
- [ ] F4. Scope fidelity
  Confirm `ERP/web/handoff.md` untouched, secrets absent, docs agree with evidence, Meta blocked status is explicit if needed, and SearchAPI provider work remains deferred.

## Commit strategy
- Prefer one final commit after all todos pass: `feat(franchise): add opening project operations workflow`.
- If execution must be split, use at most three commits:
  - `fix(layout): collapse sidebar by default on mobile`
  - `feat(franchise): add opening project operations workflow`
  - `docs(franchise): record opening project qa status`
- Stage only intended files under `ERP/web`, `MAC_CONTEXT.md`, and `.omo/plans`. Do not stage unrelated workspace changes or generated screenshots unless the project convention explicitly accepts `.omo/evidence`.

## Success criteria
- `franchise_opening_projects` schema/API/UI exists and persists project/checklist state after refresh.
- Opening projects are company-scoped and cannot be mutated by no-company requester or cross-company requester.
- `manual-promoted` operations conversion still works and can feed an opening project without automatic project creation.
- Mobile first entry no longer opens a fixed/sidebar-squeezed layout on the three franchise routes.
- Excel file upload creates `1차 유입 DB` rows and promotion moves selected leads to `후보자`.
- Work queue numbers and visible lists match for 전체 업무, 연락 지연, 오늘 연락, 무응답.
- External realty limit/raw QA proves 2000/3000/2000 boundaries, raw/data preservation, `registerToProperties` 400, and ERP `properties` auto-create count 0.
- Docs and `MAC_CONTEXT.md` match implementation and evidence; `ERP/web/handoff.md` remains unchanged.
