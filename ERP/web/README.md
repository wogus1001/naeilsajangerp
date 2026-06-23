# ERP Web

Next.js 기반 ERP 웹 애플리케이션이다. 로컬 운영 규칙과 세션 인수인계는 상위 `MAC_CONTEXT.md`를 먼저 확인하고, 이 문서는 실행 방법, SQL 적용 순서, 외부 연동 환경변수, 프랜차이즈 고도화 운영 메모를 관리한다.

## Local Development

```bash
npm ci
npm run dev
```

기본 로컬 URL은 [http://localhost:3000](http://localhost:3000)이다. 이미 포트가 사용 중이면 Next.js가 제안하는 다른 포트를 사용하거나 명시적으로 포트를 지정한다.

```bash
npm run dev -- -p 3004
```

## Verification

주요 변경 뒤에는 아래 순서로 확인한다.

```bash
npm run lint -- --quiet
npx tsc --noEmit
npm run build
```

운영 플로우 확인이 필요하면 빌드 후 서버를 띄워 보호 라우트와 로그인 이동을 확인한다.

```bash
npm run start -- -p 3000
```

## Documentation Map

- `../../MAC_CONTEXT.md`: 맥북 worktree 운영, 최근 작업 상태, 세션 시작 체크리스트.
- `docs/release-management.md`: 브랜치, 커밋, dev/main 반영, 배포 이력 관리 규칙.
- `docs/franchise-growth-roadmap.md`: 프랜차이즈 고도화 우선순위, API 정책, 다음 작업 목록.
- `docs/franchise-dev-qa-log.md`: 개발 과정, QA 결과, 미검증 리스크.
- `docs/fdam-reference.md`: FDAM ERP 레퍼런스 분석.
- `docs/documentation-agent.md`: Docs Steward 권한, 금지 범위, 보고 형식.
- `handoff.md`: 단일 작성자 규칙 때문에 Codex는 읽거나 수정하지 않는다.

## Version Control Workflow

업데이트는 작업 브랜치와 커밋 해시를 기준으로 추적한다. 기능 작업은 `codex/<topic>-YYYYMMDD` 브랜치에서 시작하고, `dev`/`main` 반영은 사용자가 명시적으로 배포를 요청한 경우에만 별도 worktree에서 진행한다. 배포 후에는 `docs/release-management.md`의 ledger 형식에 맞춰 기능 커밋, dev/main 반영 커밋, Vercel 배포 URL, 검증 결과, 남은 env/migration 이슈를 함께 기록한다.

## Database Migrations

프랜차이즈 고도화 기능을 실데이터로 확인하기 전에 아래 SQL을 필요한 환경에 적용한다.

```text
supabase_franchise_locations_migration.sql
supabase_franchise_location_messages_migration.sql
supabase_franchise_opening_projects_migration.sql
supabase_franchise_brands_migration.sql
supabase_franchise_disclosures_migration.sql
supabase_franchise_gmail_disclosures_migration.sql
supabase_franchise_notifications_migration.sql
supabase_franchise_contract_checklist_migration.sql
supabase_franchise_market_monitoring_migration.sql
supabase_franchise_lead_registration_requests_migration.sql
supabase_franchise_property_promotion_migration.sql
supabase_partner_vendor_access_migration.sql
supabase_login_id_migration.sql
supabase_company_menu_features_migration.sql
supabase_electronic_contracts_platform_migration.sql
supabase_meta_lead_ads_migration.sql
supabase_realty_import_migration.sql
```

`franchise_brands`, `franchise_location_messages`, `franchise_disclosure_documents`, `franchise_lead_disclosure_deliveries`, `profile_gmail_connections`, `franchise_notifications`, `franchise_lead_contract_checklist_steps`, `franchise_market_monitoring`, `partner_vendor_access`, `company_menu_features`, 또는 `electronic_contracts` SQL이 미적용된 상태에서 관련 화면/API를 열면 Supabase schema cache 오류, 예를 들어 `PGRST205`, 가 발생할 수 있다. dev와 main Supabase 프로젝트는 분리되어 있으므로 배포 전 각 환경의 적용 여부를 따로 확인한다.

## Signup And Partner Vendor Setup

Run `supabase_partner_vendor_access_migration.sql` after the franchise location, location messages, and opening projects migrations.

Run `supabase_login_id_migration.sql` before enabling company-scoped ID login in production. The migration adds `profiles.login_id` and `profiles.login_id_normalized`, backfills existing accounts from the email local part before `@`, and creates a unique index on `(company_id, login_id_normalized)`.

If two existing users in the same company share the same email local part, the migration intentionally fails with a duplicate login ID notice. Resolve the duplicate IDs manually, then re-run the SQL. New signup requires `아이디`, `이메일`, `비밀번호`, `비밀번호 확인`, `이름`, `휴대폰`, and company selection. Login defaults to `회사 + 아이디 + 비밀번호`; email login remains temporarily available as a migration fallback.

New signup requires a mobile phone number and stores both the original `profiles.phone` value and the digits-only `profiles.phone_normalized` value. Existing-company signup can request either `브랜드 임직원` or `협력업체`; both wait for the company team lead to approve. New-company signup stays team-lead-only and waits for admin approval.

`partner_vendor` is displayed as `협력업체`. Brand employees (`팀장`, `매니저`, `담당자`) can view all opening candidates for their company. 협력업체 users can view, update, and delete only the franchise locations they created through `franchise_locations.created_by`; other 협력업체 records in the same brand company are hidden from them.

## Admin Company Access Setup

Run `supabase_company_menu_features_migration.sql` before enabling company-level menu on/off persistence.

The admin page manages menu availability per company through `/api/admin/company-access`. Super admins can choose a company from the header selector, and supported dashboards read the selected company scope so the same screen shows that company's data. The selected company is stored only in the admin user's browser session and is cleared on logout; company staff do not see the super-admin lookup account or selector.

If the migration is not applied, menu features fall back to enabled for the product screens and the admin save API returns a migration-required error instead of silently losing settings.

## Meta Lead Ads Setup

Run `supabase_meta_lead_ads_migration.sql` before enabling the Meta integration.

Required environment variables:

```bash
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_GRAPH_API_VERSION=v25.0
META_TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

Use `/api/integrations/meta/webhook` as the Meta Webhook callback path. Vercel runs the scheduled backfill through `/api/integrations/meta/sync`; the endpoint requires `Authorization: Bearer $CRON_SECRET`.

## Franchise Location Insights Setup

Run `supabase_franchise_locations_migration.sql` before enabling the location master and market insights screen. Run `supabase_franchise_location_messages_migration.sql` before enabling per-location records and request notes. Run `supabase_partner_vendor_access_migration.sql` after those files to add candidate creator ownership and 협력업체 visibility rules.

Optional environment variables for Kakao Local address search and competitor scans:

```bash
KAKAO_REST_API_KEY=
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=
```

Address search uses `/api/integrations/kakao/address`. The candidate master stores site condition, landlord, cost, lease, and development-stage fields in `franchise_locations.data`, while core columns continue to hold the location name, address, region, status, importance, brand, and owner scope. The per-location records panel uses `/api/franchise-locations/messages` and stores company-scoped notes/requests in `franchise_location_messages`.

The region insight table is based on `franchise_locations` opening candidates, not ERP `properties` or external store listings. It compares regional lead demand with candidate locations and counts lead records that still need a `franchise_leads.data.locationLinks` connection to a same-region `franchise_location`.

The competitor scan endpoint is `/api/franchise-locations/competitors`. Both address and competitor APIs use the server-side Kakao REST API key, so the key is never exposed to the browser. Company-level data isolation still follows the existing `company_id` access rules; the Kakao key is not configured per company. The candidate list currently hides the competitor-scan entry point while the API and stored `competitionScan` data are retained for later re-enable.

Competitor scans use `competitionKeyword` first, then `brand`. They intentionally do not fall back to the location name because area names such as "군자" or "강남" return unrelated nearby places.

Optional environment variables for competitor review/ad enrichment:

```bash
SERP_PROVIDER=searchapi
SEARCHAPI_API_KEY=
SERPAPI_API_KEY=
GOOGLE_PLACES_API_KEY=
GOOGLE_MAPS_API_KEY=
FRANCHISE_COMPETITOR_REVIEW_LIMIT=8
```

The Kakao JavaScript key must allow the local/dev domain in Kakao Developers Web platform settings, for example `http://localhost:3000`.

SearchAPI/SerpApi are optional POC providers for Naver SERP, Naver place-style review counts, and Naver search ad candidates. When the provider returns 429 or monthly quota errors, treat it as a provider quota issue, not as "no Naver data." Google enrichment uses Places Text Search only by default; Place Details review bodies are intentionally not requested to reduce cost.

Franchise location screens are split by operating intent:

- Global navigation shows `/dashboard` as a top-level `대시보드` item. The franchise workspace is grouped under `프랜차이즈`.
- `프랜차이즈` contains `모객 DB`, `출점 후보지`, and `가맹 운영`.
- `/dashboard/franchise-leads/market-insights`: site planning for future openings and lead-linked regional demand.
- `/dashboard/franchise-operations`: current franchise/direct-store operations and store status management.

## Franchise Intake Property Registration Setup

The existing 점포개발 업무 route `/properties/register` remains the original 점포 신규등록 screen and stores general ERP `properties`.

Franchise-specific intake uses separate protected routes:

- `/dashboard/franchise-leads/property-registration`: 공인중개사용 입점 요청. It stores into `properties` with `operation_type='물건등록'` and `data.sourceType='franchise_property_registration'`.
- `/dashboard/franchise-leads/lead-registration`: internal 가맹 희망자 등록. It stores review-ready requests in `franchise_lead_registration_requests` and does not immediately create `franchise_leads`. The route and DB remain for future use, but the staff/admin menu tabs are hidden as of 2026-06-17.
- `/dashboard/franchise-leads/matching-request`: 예비 창업자 등록. It stores into `franchise_leads` with `source='프랜차이즈 매칭 요청'` for existing-data compatibility.
- `/dashboard/franchise-leads/work-intake`: staff-facing `진행현황` tabs for 입점 요청 and 예비 창업자 등록 intake records.
- `/admin/franchise-intake`: admin review tabs for `입점 요청 리스트` and `예비 창업자 등록`.

The franchise property and matching forms reuse existing 업종 data sources: company `franchise_brands` categories and `custom_categories` with `category_type='industry_detail'`, falling back to built-in common industry options. Admin promotion uses `/api/admin/franchise-intake/properties/promote` to create a `franchise_locations` opening candidate and `/api/admin/franchise-intake/matching-requests/promote` to create a first-ingress `franchise_leads` record from an 예비 창업자 등록 request. The hidden lead-registration route keeps `/api/admin/franchise-intake/leads/promote` available for future internal review flows. Fields that map to the target table columns are written directly, and source-only fields are summarized into the target memo/data snapshot. When a source record is edited after promotion, admin sees a `수정` state and must click `업데이트` to sync the promoted target through the matching or property update endpoint. The staff edit modal supports the same file attachment metadata policy as the intake form, and promotion no longer creates an automatic 상담 이력 entry in the target lead; only explicit staff-entered 상담 이력 appears in lead detail.

Apply `supabase_franchise_lead_registration_requests_migration.sql` before enabling the lead-registration intake screen. Apply `supabase_franchise_property_promotion_migration.sql` so each company can promote the same source property only once through the `franchise_locations(company_id, source_property_id)` unique index.

Admin user approval depends on UUID lookup through `/api/users`. Keep the full UUID regex format `8-4-4-4-12`; otherwise a valid profile UUID can be misread as a legacy short login id and approval fails with `User not found`.

## Company Logo Setup

Company logos are stored as metadata on `companies` and files under the existing Supabase Storage `property-images/company-logos/<company_id>/...` path.

- Apply `supabase_company_logo_migration.sql` before enabling uploads in production.
- Supported files: PNG, JPG, WebP.
- Size policy: 1MB per file, recommended 512x512px square image.
- Runtime display: the sidebar uses a fixed 40x40 logo box with a bordered white background and slight scale/contrast compensation; profile/admin previews use 64x64.
- `/profile` lets the current company upload/delete its logo. Admin company access management can upload/delete logos for selected companies.
- Logo APIs accept Supabase bearer sessions and the app's legacy `x-user-id` requester header, so existing localStorage login sessions can still upload after the migration is applied.
- The upload API prepares the existing `property-images` storage bucket before upload. If production upload fails while dev works, first confirm the production Supabase storage bucket policy and service-role env match the deployed project.

## Realty Import Setup

Run `supabase_realty_import_migration.sql` before enabling external store listing import.

The MVP lives under `/dashboard/franchise-leads/market-insights?tab=realty-import` as the `외부 상가 수집` tab. It collects store-only listings by region, stores import history in `realty_import_jobs`, and stores raw source records in `external_property_listings`. It does not automatically create ERP `properties`; selected listings can be manually promoted to ERP `properties` from the saved-list row.

Current source policy:

- Daangn is the default source for store listings.
- Daangn listing calls include `salesType=store`; the UI shows address-first rows with price, area/floor, management fee, approval date, saved date, collected source metadata, star state, and source links.
- The UI uses sido/sigungu selects instead of free-text region input; district-level Daangn searches are expanded into dong-level region candidates when available.
- Naver Land is deferred from the MVP and removed from the current UI/API. Future Naver Land work should start with user-provided URL/CSV/JSON import, then local Chrome-session capture POC, and only then a provider/proxy adapter after legal and cost review.
- The current import UI requests up to 2000 listings. The import API clamps requests to a 3000-listing safety maximum, and the saved-list API returns up to 2000 rows per request.
- External listing dedupe/update is keyed by `company_id + source + source_listing_id` when a company scope exists, otherwise `requester_id + source + source_listing_id`.
- The import screen does not ask for company name. Saved listings appear in the lower saved-list panel with explicit saved-region chips, a Kakao map panel, dong-level cards, per-dong pagination, saved dates, star toggles, recommendation scores, saved-list filters, and sort controls. The refresh button re-collects the selected saved region without duplicating existing source listing IDs.
- Daangn map counts are cluster/filter/viewport aggregates and may not match the collected dong-level listing count exactly.
- Listing-response fields are enough for address, price, area/floor, management fee, approval date, registered date, chat/interest counts, photo count, short description, source link, and inferred `writerType`; direction, move-in date, restroom, parking, violation/building-use details require selective detail-page fetches.
- Login, messaging, reservation, bypass automation, and write actions on external services are out of scope.

## Franchise Brand Master Setup

Run `supabase_franchise_brands_migration.sql` before enabling saved brand search and disclosure-brand sync.

Optional environment variables for disclosure-brand backfill:

```bash
FRANCHISE_DISCLOSURE_API_URL=
FRANCHISE_DISCLOSURE_SERVICE_KEY=
DATA_GO_KR_SERVICE_KEY=
DATA_GO_KR_DECODING_KEY=
PUBLIC_DATA_SERVICE_KEY=
FRANCHISE_DISCLOSURE_BASE_YEAR=
FRANCHISE_DISCLOSURE_PAGE_SIZE=
FRANCHISE_DISCLOSURE_MAX_PAGES=
FRANCHISE_DISCLOSURE_CONCURRENCY=
FRANCHISE_DISCLOSURE_CACHE_TTL_SECONDS=
```

The brand selector shows company-saved brands first, then shared disclosure brands. Saving a site/store with a brand also stores that brand in the company brand master, and the recommended competitor-search keyword remains editable per site/store. The public disclosure API does not provide a direct brand-name search parameter, so the server fetches year/page data and filters it locally with a short-lived memory cache.

## Franchise Disclosure Compliance Setup

Run `supabase_franchise_disclosures_migration.sql` before enabling HQ disclosure document storage and candidate disclosure delivery tracking. Run `supabase_franchise_gmail_disclosures_migration.sql` before enabling Gmail OAuth send status, open tracking, and customer confirmation tracking.

The candidate detail panel manages disclosure files through the `문서 관리` dialog. The dialog uploads files through `/api/upload` to the existing Supabase Storage `property-documents` bucket under `franchise-disclosures/<company>/...`, then stores company-scoped document metadata in `franchise_disclosure_documents`. Company employees reuse the same company disclosure document list, and Gmail delivery sends the selected saved document. Deleting a document from `문서 관리` soft-archives the document metadata so it disappears from active send options while existing delivery history remains intact. Per-lead delivery records keep the automatic Gmail sent time, recipient, memo, status, and document version snapshot.

Gmail delivery uses the 담당자 personal OAuth connection with the minimal Gmail send scope. Required environment variables:

```bash
GOOGLE_GMAIL_CLIENT_ID=
GOOGLE_GMAIL_CLIENT_SECRET=
GMAIL_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
```

If the three Gmail-specific variables are missing, the disclosure panel shows `설정 필요` and keeps the Gmail connection action disabled. Restart the Next.js process after changing `.env.local` or deployment environment variables.

Google OAuth verification support URLs:

- App home page URI: `https://naeilsajang.vercel.app/landing`
- Privacy policy URI: `https://naeilsajang.vercel.app/privacy`
- Local privacy page: `/privacy`
- Public sample demo: `/demo`. It opens the franchise demo directly without a role selection step. Hidden role-specific URLs remain available for compatibility, but the public flow focuses on franchise screens (`대시보드`, `DB 관리`, `계약 완료`, `출점 후보지`, `가맹 운영`), uses sample data only, and blocks real ERP API calls.
- Demo video: use an unlisted YouTube video that shows the Gmail OAuth consent flow and the information disclosure email send flow.

The landing footer links to the privacy policy. The privacy policy page discloses that the app only requests `gmail.send`, does not read Gmail inbox content, stores Gmail tokens encrypted, and uses Google user data only for information disclosure email delivery and delivery records.

For local OAuth, add both redirect URIs in Google Cloud `API 및 서비스` -> `사용자 인증 정보` -> OAuth client:

- `http://localhost:3000/api/integrations/gmail/callback`
- `http://127.0.0.1:3000/api/integrations/gmail/callback`

If the OAuth app is still in testing, add the sender Gmail account under `API 및 서비스` -> `OAuth 동의 화면` or `Google 인증 플랫폼` -> `대상`/`테스트 사용자`. Otherwise Google blocks the flow with `403 access_denied`.

Gmail routes are `/api/integrations/gmail/connect`, `/api/integrations/gmail/callback`, `/api/integrations/gmail/status`, `/api/integrations/gmail/disconnect`, `/api/franchise-lead-disclosures/send-email`, `/api/franchise-lead-disclosures/open?token=...`, and `/api/franchise-lead-disclosures/confirm?token=...`. OAuth tokens are stored encrypted in `profile_gmail_connections`; successful sends write Gmail message metadata to `franchise_lead_disclosure_deliveries`.

Lead status changes to `계약예정` or `계약완료` are blocked until 14 days after the latest successful or manually recorded disclosure delivery. Gmail `failed` and `pending` rows do not unlock contract status. Email image loading writes `opened_at` as an operational "열람 추정" signal only; customer receipt confirmation is tracked by `confirmed_at` when the email confirmation link is clicked. Gmail native read receipts are not used as the product source of truth.

## Franchise Notifications Setup

Run `supabase_franchise_notifications_migration.sql` before enabling in-app franchise alerts.

The header bell uses `/api/franchise-notifications` to create and read 담당자 alerts. V1 alerts are in-app only and are derived from franchise lead data: disclosure not sent, Gmail send failure, disclosure D-3/D-1, contract eligibility, overdue contact, today's contact, and HOT lead follow-up scheduling. Stale automatic alerts are dismissed during sync when their source condition no longer applies. Read alerts keep their `read_at` audit record in the database but are hidden from the header popover so the list only shows items that still require 담당자 확인. Future Kakao 알림톡 delivery can reuse `franchise_notifications.delivery_channel`, `kakao_template_key`, and `data`.

The 모객 DB list also shows a `정보공개서` column and sort options for disclosure action priority, recent send, and earliest contract eligibility. The main summary dashboard defaults to company-level `A 타입`, focused on lead DB and opening-candidate counts. Admins can switch each company to `B 타입`, the existing schedule/contract/store/customer summary, from company menu management.

## Electronic Contract v2 Setup

The legacy `/contracts`, `/contracts/create`, and `/contracts/builder` flows remain available. The new ERP-driven electronic contract flow lives under `/contracts/electronic`; company-created UCanSign templates stay under company templates. Built-in forms such as 권리금계약서 are kept in the catalog but hidden from the common template list until they are production-ready.

Run `supabase_electronic_contracts_platform_migration.sql` before enabling the new flow. The migration creates the platform UCANSIGN connection table, company-scoped `electronic_contracts`, webhook `contract_events`, and SafetyData license import tables.

Run `supabase_company_contract_templates_migration.sql` before enabling company-uploaded contract templates. It creates company-scoped PDF template tables, roles, fields, version metadata, and extends `electronic_contracts` with `template_source`, `company_template_id`, and `company_template_version_id`. The SQL must be applied manually in Supabase SQL Editor.

Required environment variables:

```bash
UCANSIGN_API_KEY=
UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID=
UCANSIGN_WEBHOOK_SECRET=
UCANSIGN_TEMPLATE_LINK_SECRET=
SAFETYDATA_SERVICE_KEY=
NEXT_PUBLIC_APP_URL=
```

The new flow uses one Naeilsajang platform UCANSIGN API KEY. Users and companies do not connect personal UCANSIGN accounts for this flow; the server issues short-lived UCANSIGN access tokens from `UCANSIGN_API_KEY` and sends documents through the Naeilsajang shared account. ERP separates document visibility by `company_id` and `sent_by_profile_id` so `내가 발송`, `회사 문서`, and admin `전체 문서` scopes are controlled inside the app. `UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID` is required only when the hidden built-in Naeilsajang 권리금계약서 template is re-enabled. Company-uploaded templates remain company-scoped in ERP and are linked to UCANSIGN template/document IDs per active template version.

`UCANSIGN_TEMPLATE_LINK_SECRET` signs temporary template-link callback state for company template embedding. If it is omitted, the app falls back to `UCANSIGN_WEBHOOK_SECRET` or `UCANSIGN_API_KEY`.

`UCANSIGN_WEBHOOK_SECRET` is the shared secret expected on UCanSign webhook requests. Configure the webhook to send it as `Authorization: Bearer <secret>` or `x-ucansign-webhook-secret`; if custom headers are not available, append `?secret=<secret>` to the webhook URL.

Company-uploaded templates are managed in `/contracts/electronic` -> `템플릿 관리`. ERP creates a company-scoped placeholder, opens the UCanSign template setup screen, and links the returned UCanSign template/document ID to the company template version. Template name, PDF, fields, signer roles, and signature boxes are configured in UCanSign so users do not type the template name twice. If UCanSign exposes the template name in callback/detail response, ERP syncs it back to the list. Templates with existing sent documents are archived instead of hard-deleted.

When writing a contract from a company-uploaded template, ERP now uses a single `필드명` input flow. Users enter the mapped field values and signer information in ERP, then send through the linked UCanSign template. The previous `작성 방식` / `템플릿에서 직접 작성` branch is not exposed because the public UCanSign API collection does not provide a reliable rendered-template preview endpoint for pre-send review. If the active template version has no linked UCanSign template/document ID, ERP blocks send with a clear template-link validation message.

Completed document downloads use `/api/electronic-contracts/:id/download`. UCanSign can return a ZIP bundle containing the signed PDF, audit certificate, and preview images; the ERP download API extracts the main PDF and serves it as `application/pdf`. If no valid PDF exists in the bundle, the response falls back to `.zip` so the browser does not save a ZIP archive with a misleading `.pdf` extension.

License number search no longer calls Food Safety Korea in real time. Admins import SafetyData `인허가업소정보` through `/api/admin/license-businesses/import`, and `/api/license-businesses/search` searches the local `license_business_records` table. Search result cards map `SALS_UNQ_SE_NO_LCPMT_NO` to the contract license number, `BUES_NM` to business name, and `ADDR` to candidate address, with road-name and lot-address similarity badges.

Amount fields in the 권리금계약 payload are split: numeric won display values go to `...Amount` fields and Korean won text goes to matching `...Text` fields. Resident registration numbers, real signature values, and sensitive authentication values are not stored in ERP snapshots.

## Franchise Partner Vendor Access Setup

Run `supabase_partner_vendor_access_migration.sql` before enabling 협력업체 accounts in production. The migration adds signup phone storage, the `partner_vendor` role support, `created_by` tracking for franchise leads and locations, and RLS helpers for lead/location/opening-project access.

Access rule: headquarters brand employees can see the company franchise leads, opening candidates, and opening operations; 협력업체 users can see only the leads and opening candidates they created. Opening operations inherit the linked opening-candidate access rule. Server APIs enforce the same rule even when they use the service role.

## Franchise Contract Checklist Setup

Run `supabase_franchise_contract_checklist_migration.sql` before enabling the per-lead pre-contract checklist.

The candidate detail panel reads and saves the common seven-step checklist through `/api/franchise-lead-contract-checklist`. The checklist is an operational confirmation layer for headquarters staff; it does not replace the disclosure delivery record, and the 14-day contract lock continues to use `franchise_lead_disclosure_deliveries.sent_at`.

The lead DB table can show checklist progress through `/api/franchise-lead-contract-checklist/summaries`. In the 모객 DB workspace, the `계약 완료` tab fixes the list to `계약완료` leads and switches to a checklist-only review surface for pre-opening follow-up.

Checklist rows are scoped by both `lead_id` and `company_id`. The migration adds a composite lead/company foreign key and RLS checks so a checklist row cannot be attached to a lead from another company. The `계약 완료` tab opens a checklist-only panel; the full generic lead detail panel remains in the standard DB workflow.

## Franchise Brand Monitoring Setup

Run `supabase_franchise_market_monitoring_migration.sql` before enabling brand monitoring snapshots.

Optional environment variables:

```bash
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
SERP_PROVIDER=searchapi
SEARCHAPI_API_KEY=
SERPAPI_API_KEY=
```

The official Naver API MVP is used for blog/news/local search and DataLab trends. SERP providers are separate POC integrations used when actual Naver result-page behavior is needed. Operational planning and provider limitations are tracked in `docs/franchise-growth-roadmap.md`.

## Current Franchise QA Notes

- Meta Lead Ads is on HOLD until Meta account/app configuration and permissions are ready.
- SearchAPI is the current preferred SERP provider for Naver place-style review/ad POC, but provider quota exhaustion must be treated separately from "no Naver data."
- Current P0 is to prevent SearchAPI 429/monthly quota failures from overwriting previously successful Naver review/ad values and to split UI labels into quota exceeded, provider missing, and no result states.
- Google Places enrichment intentionally uses Text Search rating/review counts only; Place Details review bodies are not requested by default.
- Franchise list exports are available on 모객 DB, 출점 후보지, and 가맹 운영. Excel downloads use the current filters, sort, and visible table columns where applicable; PDF and print open the shared browser print view so operators can save as PDF from the print dialog. No extra SQL is required.
