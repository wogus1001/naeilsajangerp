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

- `../../MAC_CONTEXT.md`: 맥북 worktree 운영, 배포 방식, 세션 시작 체크리스트.
- `docs/franchise-current-status.md`: 프랜차이즈 최신 구현/배포/SQL/샘플/live QA 상태 요약.
- `docs/release-management.md`: 브랜치, 커밋, dev/main 반영, 배포 이력 관리 규칙.
- `docs/supabase-service-role-incident-response.md`: Git 이력에 노출된 Supabase 관리자 키의 폐기, 교체, 로그 조사, 이력 정화 절차.
- `docs/franchise-growth-roadmap.md`: 프랜차이즈 고도화 우선순위, API 정책, 다음 작업 목록.
- `docs/franchise-dev-qa-log.md`: 개발 과정, QA 결과, 미검증 리스크.
- `docs/fdam-reference.md`: FDAM ERP 레퍼런스 분석.
- `docs/documentation-agent.md`: Docs Steward 권한, 금지 범위, 보고 형식.
- `handoff.md`: 단일 작성자 규칙 때문에 Codex는 읽거나 수정하지 않는다.

## Version Control Workflow

업데이트는 작업 브랜치와 커밋 해시를 기준으로 추적한다. 기능 작업은 `codex/<topic>-YYYYMMDD` 브랜치에서 시작하고, `dev`/`main` 반영은 사용자가 명시적으로 배포를 요청한 경우에만 별도 worktree에서 진행한다. 배포 후에는 `docs/release-management.md`의 ledger 형식에 맞춰 기능 커밋, dev/main 반영 커밋, Vercel 배포 URL, 검증 결과, 남은 env/migration 이슈를 함께 기록한다.

과거 Git 이력의 Supabase service-role key 노출은 `docs/supabase-service-role-incident-response.md`에 따라 대응한다. 키 폐기와 환경 교체를 Git 이력 정화보다 먼저 완료한다.

## Database Migrations

프랜차이즈 고도화 기능을 실데이터로 확인하기 전에 아래 SQL을 필요한 환경에 적용한다. 환경별 적용 여부와 최근 사용자 확인 상태는 `docs/franchise-current-status.md`와 `docs/release-management.md`에 기록한다.

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
supabase_company_logo_migration.sql
supabase_electronic_contracts_platform_migration.sql
supabase_company_contract_templates_migration.sql
supabase_franchise_lead_documents_migration.sql
supabase_franchise_contract_store_linkage_migration.sql
supabase_franchise_location_meeting_tool_presets_migration.sql
supabase_franchise_location_meeting_tool_versions_migration.sql
supabase_franchise_vendor_contracts_migration.sql
supabase_franchise_vendor_contract_events_migration.sql
supabase_franchise_vendors_migration.sql
supabase_franchise_alimtalk_operations_migration.sql
supabase_franchise_supervision_migration.sql
supabase_franchise_supervision_v2_migration.sql
supabase_franchise_approval_calendar_migration.sql
supabase_franchise_schedule_visibility_migration.sql
supabase_franchise_labor_planning_migration.sql
supabase_franchise_owner_portal_migration.sql
supabase_franchise_owner_company_login_scope.sql
supabase_franchise_owner_notice_attachments_migration.sql
supabase_franchise_owner_portal_alimtalk_templates_migration.sql
supabase_meta_lead_ads_migration.sql
supabase_realty_import_migration.sql
```

`franchise_brands`, `franchise_location_messages`, `franchise_disclosure_documents`, `franchise_lead_disclosure_deliveries`, `profile_gmail_connections`, `franchise_notifications`, `franchise_lead_contract_checklist_steps`, `franchise_market_monitoring`, `partner_vendor_access`, `company_menu_features`, `electronic_contracts`, `franchise_location_meeting_tool_presets`, `franchise_location_meeting_tool_versions`, `franchise_vendor_contracts`, `franchise_vendor_contract_events`, `franchise_vendors`, `alimtalk_templates`, `franchise_supervisor_assignments`, `approval_templates`, `approval_documents`, `approval_document_events`, `franchise_labor_settings`, `franchise_owner_accounts`, 또는 `franchise_owner_notices.attachments` SQL이 미적용된 상태에서 관련 화면/API를 열면 Supabase schema cache 오류, 예를 들어 `PGRST205`, 가 발생할 수 있다. 점주 포털 알림톡 3종은 `supabase_franchise_alimtalk_operations_migration.sql` 적용 후 `supabase_franchise_owner_portal_alimtalk_templates_migration.sql`로 seed를 추가하고, `/admin/alimtalk`에서 승인 템플릿의 SOLAPI template/channel ID를 저장한다. 공통 일정/결재 MVP는 `supabase_franchise_approval_calendar_migration.sql`로 기존 `schedules` 확장과 결재 테이블을 추가한 뒤 확인한다. dev와 main Supabase 프로젝트는 분리되어 있으므로 배포 전 각 환경의 적용 여부를 따로 확인한다.

가맹운영 전용 일정의 공유/개인 구분은 `franchise_schedules` 생성 SQL 적용 후 `supabase_franchise_schedule_visibility_migration.sql`을 실행한다. 기존 일정과 시스템 생성 일정은 공유로 유지되고, 개인 일정은 생성자 본인에게만 조회·수정·삭제가 허용된다. 전자결재 보안 리뷰에서 비활성 계정의 직접 RLS 접근을 차단하도록 정책을 보강했으므로 기존 적용 환경도 최신 파일을 다시 실행한다. **SQL 재등록 필요**.

## Franchise Supervision Setup

Run `supabase_franchise_supervision_migration.sql` before enabling the `가맹 운영 > 슈퍼바이징` tab in production. The migration creates supervisor assignments, store visits, inspection reports, and corrective actions. The tab uses existing `franchise_locations`, `profiles`, and company-scoped access rules; `admin` and `manager` can manage company-wide supervision, while ordinary staff/SV users work around assigned stores and their own reports.

After the MVP migration is applied, run `supabase_franchise_supervision_v2_migration.sql` for the second-phase features. **SQL 등록 필요**. The v2 migration adds company report templates, report submit/approve/reject events, corrective-action events, a report `template_id`, and draft AlimTalk templates/scenarios for internal SV operations.

The MVP supports active SV assignment per operating store, visit scheduling with a lightweight `schedules` sync, inspection report draft/submission, manager approval/rejection, image upload under the private `franchise-supervision-private/franchise-supervision/<company_id>/<report_id>/...` storage scope, and corrective-action creation for `개선필요` inspection items. The v2 UI reorganizes the tab into `운영 리포트 / 배정 관리 / 방문 일정 / 점검 보고서 / 승인·시정요청`, makes KPI cards clickable filters, lets managers save the company inspection template, prints inspection reports, syncs visit changes back to `schedules`, and leaves report/action history for audit. The assignment tab removes the separate region field and provides store-based and supervisor-based list views with search, SV, and assignment-status filters; managers open an inline editor below the selected operating-store row, and the list is paginated to keep the assignment screen scannable. The operating report also exposes a computed `운영 우선순위` list for today/tomorrow visits, missing reports, pending approvals, and overdue corrective actions; this list uses existing supervision tables and does not require extra SQL. The report tab now includes a visit-based inspection report list that shows missing/submitted/approved states, improvement counts, photo counts, and the selected report editor in one workflow. The review tab uses table-style approval and corrective-action lists so managers can compare pending reports, rejection reasons, assignees, due dates, and status updates without scanning card stacks. Internal AlimTalk hooks are wired for visit creation, report approval/rejection, and corrective-action assignment when the v2 scenarios are approved and enabled. Report save/approval transitions, assignment/report company scope, event-table RLS, and supervision photo URL handling are hardened in the v2 route review pass. Legacy public-bucket supervision attachment metadata is not returned by the API and should be removed from `property-documents` during the migration cleanup.

Run `supabase_franchise_approval_calendar_migration.sql` after the supervision migrations before enabling common workflow features. The production migration was confirmed applied on 2026-07-10. **SQL 등록 완료 확인**. The migration extends `schedules` with `source_type`, `source_id`, assignee/manager, due/remind/completed timestamps, and metadata, then adds `approval_templates`, `approval_documents`, and `approval_document_events`. The first integration links SV inspection reports to common approval documents, creates manager approval tasks on `/schedule`, and sends in-app notifications for submit/approve/reject without changing the existing external AlimTalk contract. Development and production Supabase projects must be checked separately when their environment configuration differs.

## Franchise Labor Planning Setup

Run `supabase_franchise_labor_planning_migration.sql` before enabling saved labor plans in `가맹 운영 > 인력 세팅`. **SQL 등록 필요**. The migration creates company labor settings, store-level staffing plans, and role-level staffing recommendations.

The tab supports temporary calculation without SQL, but plan persistence and history require the migration. The calculator uses company/year labor settings for minimum hourly wage, employee/employer insurance rates, withholding rate, and overtime/night/holiday multipliers; saved plans store the settings snapshot used at calculation time. The first release includes monthly-sales-based staffing recommendations, weekly schedule cost projection, payroll/3.3%/day-wage calculators, and a labor document box that links into electronic contracts. Results are labelled as operational budget estimates, not legal or payroll filing advice.

## Franchise Vendor Contract Vault Setup

Run `supabase_franchise_vendors_migration.sql` before enabling direct vendor registration in `/dashboard/franchise-vendors`. Then run or re-run `supabase_franchise_vendor_contracts_migration.sql` before enabling `/contracts/vendor` so the vault has the `vendor_id` linkage column. Run `supabase_franchise_vendor_contract_events_migration.sql` before enabling vendor contract renewal/termination history.

The vendor contract vault stores company-scoped contracts with logistics, food material, interior, marketing, lease, and other vendors. Contract files are uploaded to the existing `property-documents` bucket under `franchise-vendor-contracts/<company_id>/<contract_id>/...`; the API issues short-lived signed URLs for viewing instead of storing public document URLs.

The vault can also link a completed or in-progress electronic contract from the same company. Vendor contract D-30 and D-7 expiration alerts are synced into the existing in-app franchise notification table for the contract owner and company team leads. If the SQL is not applied, the page shows a migration notice and the write API returns a migration-required error.

The 2A renewal flow adds `/api/franchise-vendor-contracts/actions`. `renew` marks the old contract as `renewed`, creates a new active contract copy, and writes lifecycle events. `terminate` marks the contract as `terminated` with a reason. The UI shows an internal expiry work queue, selected contract detail panel, and newest-first lifecycle history.

The vendor management view has an `업체 생성` button inside the vendor list and stores vendor master records in `franchise_vendors`. New vault contracts created from `업체 선택` store `vendor_id`, so vendor management merges contracts by master ID first; older direct-entry contracts still fall back to vendor-name matching for contract counts, renewal/expiration risk, latest memo, and a jump back to the filtered contract vault.

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

## Public Demo Access Setup

The `/demo` and `/demo/[role]` sample-data pages are protected by a lightweight demo-only login gate. It does not create a Supabase session and keeps the demo API guard that blocks real ERP API calls.

Required environment variables:

```bash
DEMO_ACCESS_ID=
DEMO_ACCESS_PASSWORD=
DEMO_ACCESS_COOKIE_SECRET=
```

Use different values per Vercel environment when needed. `DEMO_ACCESS_COOKIE_SECRET` signs the short-lived httpOnly `/demo` cookie and must not be committed to source control.

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

When `SOLAPI_SMS_ENABLED=true`, intake registration can send a Solapi SMS after the core DB write succeeds. Set `FRANCHISE_INTAKE_ALERT_PHONES` to comma-separated receiver numbers for 입점요청/예비 창업자 등록 alerts. If this env is empty, the route falls back to `SIGNUP_ADMIN_ALERT_PHONES`. Missing Solapi env or SMS failure is logged and does not block registration.

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

- App home page URI: `https://www.fcerp.co.kr/landing`
- Privacy policy URI: `https://www.fcerp.co.kr/privacy`
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

## Franchise AlimTalk Operations Setup

Run `supabase_franchise_alimtalk_operations_migration.sql` before enabling `/admin/alimtalk`.

The admin AlimTalk operations page manages the six first-stage Kakao AlimTalk cases selected for review: signup approval request, signup approval completion, disclosure email sent notice, disclosure receipt confirmation, franchise contract eligibility, and vendor contract expiration reminders. The page tracks template review status and provider IDs, global send scenarios, company-level monthly limits, and send logs. Scenario management shows one combined send-flow board plus individual scenario cards for ON/OFF and fallback settings. It does not submit templates to Kakao/SOLAPI; operators record the approved `templateId` and `channelId` after provider review.

Templates must be `승인완료` and enabled before send hooks can use them. Company settings can disable AlimTalk for a company or set monthly volume thresholds. If the migration is missing, the page shows a SQL-required notice instead of failing the admin shell.

AlimTalk phase 2 connects approved templates to real business events. The current hooks cover signup approval request, signup approval completion, disclosure receipt confirmation, franchise contract eligibility, and vendor contract D-30/D-7 reminders. The disclosure email sent notice remains disabled until its Kakao template review is approved. Send hooks check scenario enabled state, template approval, company send settings, monthly limits, and fallback policy before sending; each result is recorded in `alimtalk_send_logs`. Missing provider env, disabled scenarios, pending templates, or missing template/channel IDs skip or block the external send without blocking the core ERP action. Phase 3 expands operations with usage dashboards, failure analytics, manual resend, provider status checks, calendar/vendor-expiry queues, and any billing or retry tables that later become necessary.

## Electronic Contract v2 Setup

The legacy `/contracts`, `/contracts/create`, and `/contracts/builder` flows remain available. The new ERP-driven electronic contract flow lives under `/contracts/electronic`; company-created UCanSign templates stay under company templates. Built-in forms such as 권리금계약서 are kept in the catalog but hidden from the common template list until they are production-ready.

Run `supabase_electronic_contracts_platform_migration.sql` before enabling the new flow. The migration creates the platform UCANSIGN connection table, company-scoped `electronic_contracts`, webhook `contract_events`, and SafetyData license import tables.

Run `supabase_company_contract_templates_migration.sql` before enabling company-uploaded contract templates. It creates company-scoped PDF template tables, roles, fields, version metadata, and extends `electronic_contracts` with `template_source`, `company_template_id`, and `company_template_version_id`. The SQL must be applied manually in Supabase SQL Editor.

Run `supabase_franchise_lead_documents_migration.sql` before enabling the checklist document hub. It adds the v2 checklist columns, lead-linked electronic contracts, franchise lead documents, and checklist-document links.

Run `supabase_franchise_contract_store_linkage_migration.sql` before enabling contract-completed lead to franchise operation creation. It links `franchise_locations` back to the contract lead and source candidate/external listing.

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

## NVIDIA NIM AI Summary Setup

The `가맹 운영 > 슈퍼바이징 > 점검 보고서` AI meeting summary panel calls NVIDIA NIM from the server only. Do not expose the API key to client code.

```bash
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-nano-30b-a3b
NVIDIA_FALLBACK_MODEL=meta/llama-3.1-8b-instruct
NVIDIA_REQUEST_TIMEOUT_MS=12000
NVIDIA_FORCE_JSON=false
```

`NVIDIA_FORCE_JSON=false` is the default because some NVIDIA preview models do not support structured output mode. The prompt still requests JSON only, and the server parser falls back to a local report draft when the provider response cannot be parsed or the model call fails. The synchronous report button should use a fast model (`nvidia/nemotron-3-nano-30b-a3b`) first and a short fallback (`meta/llama-3.1-8b-instruct`) second; slower high-quality models such as Mistral Medium should be reserved for a future async re-summary job.

The AI result is not applied directly. Operators review the summary, special notes, item-level verdicts, memos, and source evidence first, can exclude or edit individual checklist items, and see quality warnings for conversational wording, short action notes, missing follow-up, or missing evidence before applying the draft. No SQL is required for this integration.

## Franchise Owner Portal Setup

Run `supabase_franchise_owner_portal_migration.sql` before enabling the separated owner portal in production. **SQL 등록 필요**.

Existing databases that already applied the first owner-portal migration also need `supabase_franchise_owner_company_login_scope.sql`. **SQL 등록 필요**. This follow-up drops the old global owner-login unique constraint and replaces it with a company-scoped `(company_id, login_id_normalized)` unique constraint so different companies can issue the same owner login ID without cross-company collision.

Existing databases that already applied the owner-portal migration also need `supabase_franchise_owner_notice_attachments_migration.sql` before using 공지/공문 첨부. **SQL 등록 필요**. This follow-up adds `franchise_owner_notices.attachments` JSON metadata so headquarters can attach images/documents and owners can download them from `/owner/notices`.

The owner portal does not use the headquarters `/login` route or the `profiles` employee role table. Headquarters staff create per-store owner accounts from `가맹 운영 > 점주 소통`, then share the company-scoped short link shown in `점주 계정 설정`. Owners sign in through `/owner/login/{companyId}` with only their owner ID and password, then work in `/owner/dashboard` with a dedicated HttpOnly owner session. Legacy `/owner/login?companyId=...` links remain accepted for compatibility.

Owner accounts are scoped to one `franchise_locations.id` and one company. The company is resolved from the dedicated owner portal link, so the login UI does not expose an editable company-name field. Passwords are stored with Node `crypto.scrypt`, and session tokens are stored only as hashes in `franchise_owner_sessions`. Owner APIs do not accept `requesterId`; they resolve access from the owner session cookie.

The 1차 workflow supports:

- Headquarters issuing, suspending, activating, and resetting owner accounts.
- Store owners submitting basic store information into `franchise_locations.data.ownerProvidedBasics`.
- Store owners reading notices, requesting owner-portal operation checklist completion, and filing facility/general requests.
- Headquarters managing owner notices, notice attachments, owner-portal operation checklists, owner submissions, and owner-account settings from `가맹 운영 > 점주 소통`.
- Owner-portal operation checklists are issued like notices from `가맹 운영 > 점주 소통 > 체크리스트`. Headquarters can send the same checklist to all stores or selected stores, then review each issued checklist's completed/incomplete store status. Store completion requests are tracked in checklist status and do not require approve/reject handling in the general submissions flow.
- Owner-portal operation checklists are stored on `franchise_locations.data.ownerPortalChecklist`; they are separate from the pre-opening project checklist and do not mutate `franchise_opening_projects.tasks`.

## Company Electronic Approval Setup

Run `supabase_company_approvals_v2_migration.sql` after the existing franchise approval/calendar migration. **SQL 등록 필요**. The migration adds company organization units and memberships, approval roles and delegations, immutable template/document versions, multi-step approval targets, readers, attachments, transactional approval/report RPCs, and the private `franchise-supervision-private` photo bucket. Re-run the latest file after review fixes so supervision report persistence and its approval transition commit atomically, direct report writes are closed, report reads match the author/SV/manager API scope, inactive profiles are rejected by RLS/RPC, and legacy public-bucket supervision attachment metadata is no longer exposed. Existing `property-documents/franchise-supervision/` objects must be removed through the Supabase Storage API or dashboard after confirming the private-bucket replacements.

For an existing database, apply `supabase_company_approvals_organization_delete_safety_migration.sql` immediately after `supabase_company_approvals_v2_migration.sql`. It changes organization membership and approval-role foreign keys from cascading deletion to restrictive deletion, so a department cannot silently remove linked settings. **SQL 등록 필요**.

Then apply the latest `supabase_company_approvals_document_line_override_migration.sql` to let authors choose one or more actual approvers for each template step while writing a document. Multiple people selected for a sequential step become separate approval stages in the selected order; parallel steps keep their all-or-any completion rule. The selected people are validated against active company profiles and captured in the submitted document version. Re-run this migration if an earlier single-approver version was applied. **SQL 등록 필요**.

Finally apply `supabase_company_approvals_security_review_migration.sql`. It blocks deleting organizations referenced by approval documents or templates, requires real uploaded files for mandatory attachment fields, ignores expired or not-yet-effective memberships, expands every multi-person sequential step into ordered stages, and makes approval actions idempotent with stale-version and stale-step checks. **SQL 등록 필요**.

The company electronic approval workspace is available at `/approvals`: `작성하기`, `결재 대기`, `내 문서함`, `부서 문서함`, `양식 관리`, and `조직·결재 설정`. System roles continue to control product access, while department, title, department-manager, and approval-role data are managed separately and captured when a document is submitted. Existing `/api/franchise-approvals/*` routes remain available during the module migration; new screens use `/api/approvals/*`.

Approval attachments use the dedicated private `approval-documents` bucket under `approval-documents/{companyId}/{documentId}`. The writer can select or drag up to five image, PDF, or business-document files, including files already saved on the draft; each file is limited to 10MB. Downloads are permission-checked, blocked after the retention period, and served through short-lived signed URLs. The detail screen generates Korean PDFs through pdfme with the bundled Noto Sans KR OFL font.
