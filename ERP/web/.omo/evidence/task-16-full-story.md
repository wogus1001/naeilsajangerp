Task: T16 Full operations story verification
Date: 2026-06-11

Result: BLOCKED_DB_MIGRATION_AND_LIVE_QA_ENV

Verified:
- `/dashboard/franchise-operations` renders both the existing `외부 승격 물건지 운영 전환` panel and the new `오픈 준비 프로젝트` panel.
- Mobile collapsed layout renders without horizontal overflow.
- Unit tests for manual-promoted operation conversion and opening project checklist helpers passed.

Blocked:
- Full browser story `manual-promoted -> 운영점 등록 -> opening project -> checklist update -> reload persistence` was not executed because the local DB has not applied `supabase_franchise_opening_projects_migration.sql`.
- API CRUD runner also requires `FRANCHISE_QA_REQUESTER_ID` and an existing `FRANCHISE_QA_OPENING_LOCATION_ID`.

Next live command:
- node scripts/franchise-opening-projects-api-qa.mjs --base-url http://localhost:3000
