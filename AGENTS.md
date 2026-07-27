# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-10 11:06:01 KST
**Commit:** 96782e6
**Branch:** codex/franchise-leads-20260608

## SCOPE
- Applies to the whole repository. Deeper `AGENTS.md` files override these notes for their subtree.
- Preserve existing user or agent changes. Never revert unrelated work in this shared worktree.
- `ERP/web/handoff.md` is read-only reference. Do not edit it.

## OVERVIEW
- ERP workspace centered on a Next.js ERP app in `ERP/web`, plus a Windows OCR crawler POC in `ERP/crawler`.
- Current product focus is franchise lead/operation workflows, external store listing import, Supabase-backed company scoping, and Korean business documentation.

## STRUCTURE
```text
my_project/
|-- AGENTS.md          # repository-level project memory
|-- MAC_CONTEXT.md     # local worktree/deploy/session handoff notes
`-- ERP/
    |-- web/           # Next.js app, Supabase SQL, docs
    `-- crawler/       # Windows UI/OCR crawler experiments
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Local worktree/deploy context | `MAC_CONTEXT.md` | Read at session start; contains current operating state. |
| Web app setup and feature env | `ERP/web/README.md` | Commands, SQL order, integration env names. |
| Web app code | `ERP/web/src` | Next App Router, API routes, components, lib. |
| Franchise roadmap | `ERP/web/docs/franchise-growth-roadmap.md` | Product priorities and provider policy. |
| Franchise QA history | `ERP/web/docs/franchise-dev-qa-log.md` | Verification status and unresolved QA gaps. |
| AI development workflow | `ERP/web/docs/harness-engineering-playbook.md` | Task contract, context loading, execution, verification, and improvement gates. |
| External realty import status | `ERP/web/docs/franchise-growth-roadmap.md`, `ERP/web/docs/franchise-dev-qa-log.md` | Daangn MVP scope, current status, and remaining QA. |
| OCR crawler | `ERP/crawler` | Windows-only pywinauto/PIL/win32 tooling. |

## COMMANDS
```bash
cd ERP/web
npm ci
npm run dev
npm run lint -- --quiet
npx tsc --noEmit
npm run build
```

## WORKTREE RULES
- This workspace is one of several git worktrees under `/Users/kimjaehyun/Documents/project/erp_workspace`.
- `node_modules`, `.next`, env files, and generated artifacts are local/runtime concerns unless the user explicitly asks otherwise.
- Do not write secrets, API keys, service-role keys, private URLs, or tokens into project docs.
- For user-facing Korean text, preserve UTF-8 and inspect for mojibake before finishing.

## LAZYCODEX / OMO WORKFLOW
- For substantial UI/API/SQL/integration work, follow `ERP/web/docs/harness-engineering-playbook.md`: define measurable completion criteria before editing, load only task-relevant context, and separate implementation from risk-based verification.
- OMO skills are available in Codex Desktop and terminal Codex; prefer explicit skill names such as `omo:ulw-plan`, `omo:start-work`, `omo:ulw-loop`, `omo:review-work`, and `omo:init-deep`.
- Prefer Codex Desktop for screenshot/image-heavy UI work, and terminal Codex for long CLI-oriented loops.
- Small changes in 1-2 files can be implemented directly with focused verification.
- Multi-file work touching UI, API, DB, or docs should start with a short plan.
- Large or ambiguous work should use `ulw-plan` first, then `start-work` after user approval.
- Use `ulw-loop` when the user asks to proceed end-to-end, including implementation, QA, docs, and commit readiness.
- Use `review-work` before commits or after risky changes to check bugs, regressions, missing tests, and documentation drift.
- Use `init-deep` after major structural changes or new modules to refresh project memory.
- Before commits, confirm `ERP/web/handoff.md` has no diff and run applicable verification.

## HERMES DOC/OPS CHECKPOINTS
- Suggest a Hermes Doc/Ops Brief when docs and code change together, 2+ docs change, SQL/API/UI change together, QA logs or verification results change, a feature milestone completes, external API/quota/cost/crawling policy changes, or before broad commits.
- When suggesting Hermes, give the user an exact paste-ready prompt and remind it not to edit code, SQL, env, package files, or `ERP/web/handoff.md`.

## CURRENT PRODUCT NOTES
- Meta Lead Ads Business Login, Page/Form discovery, Webhook test delivery, and 모객 DB raw-intake 저장은 dev에서 확인했다. 운영 광고 리드 수신과 장기 Webhook/백필 안정성은 별도 live QA로 남아 있으며, 광고 성과 Marketing API 범위는 계속 HOLD다.
- SearchAPI quota exhaustion is not the same as "no Naver data"; preserve prior successful Naver review/ad values when provider limits or timeouts occur.
- External realty import is Daangn store-listing MVP only. Naver Land is deferred to URL/CSV/JSON import, then local Chrome capture POC, then provider/proxy adapter.
- Franchise location competitor scans must use `competitionKeyword` or `brand`; do not fall back to location names for competitor search.

## ANTI-PATTERNS
- Editing `ERP/web/handoff.md`.
- Treating protected-route browser redirects as full feature QA; logged-in flows require an actual session and configured provider env.
- Broad refactors inside large legacy TSX files unless the task explicitly calls for them.
- Collapsing provider states into one UI/error state; distinguish unconfigured, quota exceeded, timeout/error, and no result.

<!-- omd:start v=1 hash=be71c8d154c9 -->
## Design System (oh-my-design)

**Before any UI, styling, copy, or motion change, open and read `./DESIGN.md` in full.** It is the authoritative brand/design spec. Treat its tokens, voice, and component rules as binding unless the user overrides in chat.

If present, read `./.omd/preferences.md` — pending corrections not yet folded into DESIGN.md. Apply them; flag conflicts.
<!-- omd:end -->
