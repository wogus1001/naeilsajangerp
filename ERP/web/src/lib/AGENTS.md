# LIB KNOWLEDGE BASE

## SCOPE
- Applies to `ERP/web/src/lib`.
- Keep this directory UI-free; components belong under `src/components` or route files.

## OVERVIEW
- Shared domain helpers for API auth, response envelopes, Supabase clients, franchise lead/brand/market logic, external provider collection, realty import, templates, and UCANSIGN client code.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| API requester/company scope | `api-auth.ts` | Normalize legacy requester IDs and enforce company/resource access. |
| API response shape | `api-response.ts` | Standard success/error envelope for newer routes. |
| Supabase admin | `supabase-admin.ts` | Lazy env validation to avoid build-time crashes. |
| Franchise lead constants | `franchise-leads.ts` | Status/source/grade normalization. |
| Franchise brand logic | `franchise-brands.ts` | Brand normalization and recommended keyword merge. |
| Disclosure API | `franchise-disclosure.ts` | Public-data API config, paging, cache behavior. |
| Market monitoring | `franchise-market-monitoring.ts` | Naver official/SERP snapshot collection. |
| Realty import | `realty-import.ts` | Daangn region/listing collection and external listing payloads. |

## CONVENTIONS
- Keep provider config behind env-derived helper functions and expose safe config-state objects where UI needs setup status.
- Do not throw away useful prior provider data just because a new collection attempt times out or hits quota.
- Normalize Korean business strings before comparison; preserve display text for UI.
- Use typed result shapes for external provider adapters and keep raw payloads under explicit `raw`/`data` fields.

## ANTI-PATTERNS
- Importing React/UI modules into `src/lib`.
- Hardcoding real keys or private URLs.
- Reusing browser Supabase clients for admin/server-only work.
- Treating all provider failures as empty data.
