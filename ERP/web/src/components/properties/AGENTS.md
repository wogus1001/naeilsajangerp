# PROPERTIES COMPONENT KNOWLEDGE BASE

## SCOPE
- Applies to `ERP/web/src/components/properties`.
- Parent `ERP/web/AGENTS.md` rules apply.

## OVERVIEW
- Large legacy property UI surface: cards, selectors, upload modal, sharing, report tabs, and print reports.
- `PropertyCard.tsx` is a high-risk file at roughly 5k lines; prefer narrow edits with local verification.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Main property detail/card UI | `PropertyCard.tsx` | Imports business/customer cards, Kakao map, reports, XLSX/ZIP/PDF helpers. |
| Main report tab | `PropertyReportTab.tsx` | Active report UI wrapper. |
| Print report | `reports/PropertyReportPrint.tsx` | Active print layout. |
| Property picker | `PropertySelectorModal.tsx` | Used by cross-domain linking flows. |
| Person picker | `PersonSelectorModal.tsx` | Customer/business-card selection. |
| Upload flow | `PropertyUploadModal.tsx` | Bulk or file-based property work. |
| Share links | `PropertyShareButton.tsx` | Public-share entrypoint. |

## CONVENTIONS
- Keep styles in adjacent CSS modules; avoid moving broad UI blocks unless required.
- Use lucide-react icons already present in the local component style.
- Search consistency should use shared search semantics from `src/utils/search.ts` where route/API behavior also depends on it.
- Public share behavior must coordinate with API-side sanitization in `src/app/api/properties/route.ts`.

## NOTES
- ESLint ignores `src/components/properties/reports/*backup*.tsx` and `*.backup.tsx`; treat backup files as reference, not active product code.
- Area display has historically needed `pyeong`/square-meter care in print reports.
- Report layout changes need browser/print-oriented visual checks, not only lint/type checks.

## ANTI-PATTERNS
- Broad rewrites of `PropertyCard.tsx` during unrelated fixes.
- Editing backup report files as the primary fix.
- Adding sensitive owner/landlord/internal memo fields to shared/public views.
