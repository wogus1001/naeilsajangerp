# ERP/web AGENTS.md

## SCOPE
- Applies to `ERP/web`.
- Parent repository rules still apply. `ERP/web/handoff.md` remains read-only reference and must not be edited.

## OVERVIEW
- Next.js 16 App Router ERP app using React 19, TypeScript strict mode, Supabase, CSS modules, lucide-react, Recharts, Kakao maps, XLSX/PDF utilities, and SQL migration files.
- Main domains: properties, customers, business cards, contracts/templates, franchise leads, franchise operations, location competition scans, Meta Lead Ads, and external realty import.

## STRUCTURE
```text
ERP/web/
|-- src/app/        # pages, layouts, and API routes
|-- src/components/ # shared and domain UI
|-- src/lib/        # server/domain helpers and external provider logic
|-- src/utils/      # client/server utility helpers
|-- docs/           # roadmap, QA, reference, docs steward rules
|-- scripts/        # ignored by lint config
`-- supabase_*.sql  # schema and feature migrations
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Run/build/test commands | `README.md` | Source of truth for local verification commands. |
| Session/deploy state | `../../MAC_CONTEXT.md` | Read before changing active franchise work. |
| Main app routes | `src/app/(main)` | Protected UI surfaces and dashboards. |
| APIs | `src/app/api` | Route handlers; use API subtree notes. |
| Auth/company scoping | `src/lib/api-auth.ts` | Requester profile and company access checks. |
| Response envelopes | `src/lib/api-response.ts` | Prefer `ok()` / `fail()` for new API work. |
| Supabase admin | `src/lib/supabase-admin.ts` | Lazy env check; server/API only. |
| Client user identity | `src/utils/userUtils.ts` | Legacy localStorage user/requester shape. |
| Search parsing | `src/utils/search.ts` | Whitespace/comma OR search helpers. |

## COMMANDS
```bash
npm run dev
npm run lint -- --quiet
npx tsc --noEmit
npm run build
npm run start -- -p 3000
```

## CONVENTIONS
- **Encoding Gate (Required):** All source/text files must be saved as UTF-8, and any PR that introduces mojibake is blocked until fixed.
- API routes that read live data commonly export `dynamic = 'force-dynamic'`.
- New API routes should enforce requester/company scope with `getRequesterProfile`, `canAccessCompanyScope`, or `canAccessCompanyResource`.
- Preserve legacy request compatibility: many endpoints accept `requesterId`, `userId`, `managerId`, `companyName`, and `companyId`.
- Use `@/*` imports from `tsconfig.json` for app source modules.
- CSS is mostly CSS modules in feature directories; shared franchise dashboards reuse `src/app/(main)/dashboard/franchise-leads/page.module.css`.

## DATA AND INTEGRATION NOTES
- Apply the relevant `supabase_*.sql` migration before real data QA; missing tables/columns often surface as PostgREST `PGRST204` or `PGRST205`.
- Meta Lead Ads is on HOLD until account/app permissions and env are ready.
- Kakao Local address/competitor flows require server REST key; Kakao map rendering requires allowed Web platform domains for `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`.
- SearchAPI/SerpApi provider failures, quota exhaustion, and no-result states must stay distinct.
- External realty import collects Daangn store listings into tracking tables; it does not automatically create ERP `properties`.

## ANTI-PATTERNS
- Do not edit `ERP/web/handoff.md`.
- Do not commit secrets or real provider tokens in docs, source, SQL, or examples.
- Do not use Supabase service-role clients in client components.
- Do not weaken lint/type gates to pass a build.
- Do not treat unauthenticated redirects to `/login` as full QA for logged-in workflows.
