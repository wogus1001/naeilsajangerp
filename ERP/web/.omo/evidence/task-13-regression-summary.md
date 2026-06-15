Task: T13 P0/P1 regression runners and browser QA
Date: 2026-06-11

Commands:
- node scripts/franchise-p0-lead-ingress-qa.mjs --base-url http://localhost:3000 --allow-blocked
- node scripts/franchise-role-matrix-qa.mjs --base-url http://localhost:3000 --allow-blocked
- node scripts/franchise-realty-scale-raw-qa.mjs --base-url http://localhost:3000 --allow-blocked
- node scripts/franchise-opening-projects-api-qa.mjs --base-url http://localhost:3000 --allow-blocked
- Browser MCP route sweep at 390x844 and 1440x900 for franchise leads, realty import, and operations.

Results:
- Lead ingress runner: BLOCKED_QA_ENV because no `FRANCHISE_QA_REQUESTER_ID`/`QA_REQUESTER_ID` is present.
- Role matrix runner: BLOCKED_REAL_ROLE_MATRIX because real admin/company A/company B/no-company QA account env is not present.
- Realty scale/raw runner: BLOCKED_QA_ENV because no live QA requester env is present.
- Opening projects API runner: BLOCKED_OPENING_API_ENV because requester and an existing 오픈준비 `franchise_locations` id are not present.
- Browser layout sweep: PASS for mobile/desktop sidebar widths and no horizontal overflow on all three target routes.

Blocked but explicit:
- Meta remains BLOCKED_META_ENV/HOLD.
- Live Excel upload, live role matrix, live opening-project persistence, and live 2000/3000 Daangn scale QA need real QA env/account/database state.
