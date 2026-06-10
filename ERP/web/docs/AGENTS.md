# DOCS KNOWLEDGE BASE

## SCOPE
- Applies to `ERP/web/docs`.
- Documentation-only subtree. Parent `ERP/web/AGENTS.md` still applies.

## OVERVIEW
- Working docs for franchise roadmap, QA logs, FDAM reference, realty import planning, and the Docs Steward role.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Docs steward rules | `documentation-agent.md` | Authority, approved docs, required report format. |
| Product roadmap | `franchise-growth-roadmap.md` | Priorities, provider policies, next work. |
| Development/QA log | `franchise-dev-qa-log.md` | Verified commands, open QA, blocked provider checks. |
| External realty import | `realty-import-plan.md` | Daangn MVP, limits, deferred Naver Land approach. |
| FDAM reference | `fdam-reference.md` | Competitive ERP reference, not live status. |

## CONVENTIONS
- Keep live status in roadmap/QA docs; keep reference analysis separate.
- Approved docs may be edited when development status, QA, API limits, rollout notes, or future plans change.
- Every Docs Steward run should finish with the `Doc Update Brief` format from `documentation-agent.md`.
- Keep `MAC_CONTEXT.md` concise; it is session resume context, not a full changelog.
- Cross-link docs by path when a status note depends on another document.

## ANTI-PATTERNS
- Editing `ERP/web/handoff.md`.
- Editing source code, SQL migrations, env files, package metadata, or generated artifacts from a docs-only task.
- Writing secrets, keys, tokens, or private provider URLs.
- Recording provider quota exhaustion as "no data"; keep limit/error state explicit.
