Task: T5 Plan and scaffold docs/evidence update boundaries
Date: 2026-06-11

Command:
- rg -n "P0|P1|오픈 준비|모바일|2000/3000|SearchAPI|manual-promoted|권한|회사" docs/franchise-growth-roadmap.md docs/franchise-dev-qa-log.md ../../MAC_CONTEXT.md

Doc targets after implementation evidence:
- docs/franchise-growth-roadmap.md
  - Current priorities: add "오픈 준비 프로젝트 MVP" as implemented under 본사 운영관리.
  - 본사 운영관리/current status: record dedicated `franchise_opening_projects` table/API/UI checklist MVP.
  - P0/P1 next work: mark mobile default sidebar auto-collapse implemented; leave live Excel/Meta and live role matrix QA blocked until QA requester/env exists.
  - External realty P1: record scale/raw runner and blocked live 2000/3000 QA without live requester env.
- docs/franchise-dev-qa-log.md
  - Development log: add SQL/API/UI implementation notes for opening projects and mobile layout hook.
  - Verification: add commands for `npx tsx --test`, `npx tsc --noEmit`, `npm run lint -- --quiet`, runner `--allow-blocked` outputs.
  - Remaining QA: live Excel upload, live role matrix, live 2000/3000 Daangn scale, SearchAPI paid-provider bundle.
- ../../MAC_CONTEXT.md
  - Add concise 2026-06-11 resume note: opening project MVP implemented, mobile sidebar auto-collapse implemented, QA runners added, live env blockers.

Do not edit:
- ERP/web/handoff.md
- env files
- package metadata
- source/SQL from docs-only pass

Evidence sources to cite:
- .omo/evidence/task-2-lead-ingress.json
- .omo/evidence/task-3-sql-audit.txt
- .omo/evidence/task-4-opening-project-lib-test.txt
- .omo/evidence/task-9-realty-scale-raw.json
- final verification command output for typecheck/lint/build/browser QA
