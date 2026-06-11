# Franchise Stabilization QA Plan - 2026-06-11

## TL;DR
> Summary: Stabilize the already-built franchise lead and external realty flows before starting new feature depth.
> Deliverables: P0 regression QA closure, promoted external property follow-through, Daangn import scale QA, docs, and commit.
> Effort: Medium
> Risk: Medium - live Supabase/browser QA and legacy large UI files.

## Scope

### Must Have
- P0 regression QA for contact-complete, lead-location link status persistence, legacy no-stage lead behavior, and available intake paths.
- Manual-promoted external property follow-through through `/properties` list/search/detail and relevant franchise/operations surfaces.
- Daangn external realty scale QA for Hapjeong-dong and Gwangjin district collection, recrawl/update behavior, caps, and requester/company scope.
- Minimal code fixes for defects found during those QA flows.
- QA docs updated in `ERP/web/docs/franchise-dev-qa-log.md`, roadmap/context updated only if the status changes materially.
- Commit with only related code/docs/plan changes.

### Must NOT Have
- No Naver Land work.
- No Meta Lead Ads account/app setup work.
- No SearchAPI provider-protection implementation unless it directly blocks 1/2/4 QA.
- No broad rewrite of `PropertyCard.tsx` or `franchise-leads/page.tsx`.
- No edits to `ERP/web/handoff.md`.
- No secrets, API keys, cookies, or raw auth values in docs, evidence, or commit messages.

## Verification Strategy
- Test decision: tests-after for any discovered code fix; add pure unit tests when logic changes.
- Browser QA: run local Next dev server and drive logged-in pages through Playwright/browser surface.
- API/DB QA: use local environment configuration without printing secrets; clean all QA rows/properties/listings created for verification.
- Automated gates: `npx tsc --noEmit --pretty false`, targeted `tsx --test`, `npm run lint -- --quiet`, `npm run build`, `git diff --check`, `git diff --quiet -- ERP/web/handoff.md`.

## Todos

- [x] 1. P0 regression QA and fixes
  - Verify `연락 완료` updates `lastContactedAt`, clears `nextContactAt`, sets `consultationResult='연락 성공'`, and removes the lead from overdue/today/no-response work queues as expected.
  - Verify candidate location link status changes and memo updates persist after reload.
  - Verify no-stage/legacy candidate leads remain in candidate layer.
  - Verify available raw-intake paths that do not require external Meta account setup.
  - Fix any blocking defect found in these flows.

- [x] 2. Manual-promoted external property follow-through and fixes
  - Create/promote a controlled external listing.
  - Verify the promoted `properties` row appears in `/properties` list/search and detail.
  - Verify external/manual-promoted metadata is visible or at least not hidden by existing external filters/badges.
  - Verify relevant franchise/operations screens do not break when this promoted property exists.
  - Fix any blocking defect found in these flows.

- [x] 3. Daangn import scale QA and fixes
  - Verify Hapjeong-dong store collection, then recrawl/update behavior.
  - Verify Gwangjin district-level collection expands to dong candidates and respects API caps.
  - Verify saved-list caps, duplicate/update counts, `registerToProperties` guard, and requester/company scoping.
  - Clean every QA listing/property/lead created for this task.
  - Fix any blocking defect found in these flows.

- [x] 4. Documentation update
  - Update QA log with exact verified scenarios, blocked items, and remaining risks.
  - Update roadmap/MAC_CONTEXT only where status changed.
  - Keep `handoff.md` untouched.

- [x] 5. Final verification and commit
  - Run automated gates.
  - Run or summarize visual/browser QA artifacts for changed UI surfaces.
  - Stage only related files.
  - Commit using existing repo style.

## Success Criteria
- The requested 1/2/4 scope has observable QA evidence.
- Any defects found in that scope are fixed or explicitly documented as pre-existing/deferred when they do not block the requested flow.
- QA data is cleaned up.
- Docs reflect the actual post-QA state.
- Commit exists and worktree status is explicit.
