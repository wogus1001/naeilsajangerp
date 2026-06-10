# FDAM Franchise ERP Reference

Last updated: 2026-06-09

## Purpose

This document summarizes the FDAM franchise ERP reference reviewed during franchise headquarters feature planning. It is not a UI copy spec. The goal is to extract the operational structure that should guide our franchise headquarters modules.

Do not edit `ERP/web/handoff.md` for this reference. Use this document as the working reference for future feature planning.

## Reference Sources

- FDAM official site: https://fdam.co.kr/
- MSBenter official site: https://www.benter.co.kr/
- User-provided FDAM screenshots reviewed on 2026-06-09

## High-Level Product Pattern

FDAM is organized around a franchise headquarters lifecycle:

1. Franchise inquiry and lead intake
2. Sales consultation and follow-up
3. Contract and pre-disclosure document handling
4. Store opening preparation
5. Store master and operation management
6. SV visit, QSCV inspection, and field activity
7. Delivery platform, review, POS, sales, and logistics reporting
8. Notices, documents, alerts, permissions, and admin setup

The main lesson is not the screen design. The value is the connected workflow and the master data structure behind it.

## Observed Functional Areas

### Sales Management

- Franchise consultation and contract list
- Date, brand, sales owner, recognition channel, acquisition source, lead stage, consultation status, assignment type filters
- Lead table with name, phone, desired opening region, desired store count, acquisition source, recognition channel, owner, progress stage, consultation status
- Sales calendar with consultation history and next appointment distinction
- Sales reports by month, acquisition channel, owner, and contract conversion

Implication for our product:

- Our `Franchise Leads` module should remain the primary sales workspace.
- Lead state, source, recognition channel, owner, next action, and consultation result should move from hardcoded values to company-managed master codes.
- Calendar and daily task views should be driven by `next_contact_at` and consultation history, not separate schedule-only data.

### Contract Management

- Contract list by brand, contract status, contract type, store operation status, electronic contract, sales owner, operation owner, contract owner
- Contract schedule calendar
- Contract form/template management
- Pre-disclosure document management
- SMS/LMS history for document authentication and document delivery

Implication for our product:

- After a lead reaches `contract planned` or `contract complete`, the workflow should move into a contract module.
- Pre-disclosure document delivery, authentication code, read timestamp, and SMS history should be treated as audit evidence.
- Contract templates should be brand/company scoped.

### Store And Operation Management

- Store master list with brand, store name, contract date, business number, owner name, phone, logistics company, operation owner, regional team, operation type, address
- Business overlap / territory overlap list
- Transfer and takeover list
- Store operation calendar
- Store operation reports

Implication for our product:

- Current franchise/direct-store location work should become a proper `Store Master`.
- Planned sites and active stores should stay separated:
  - Planned site: site planning, lead-linked demand, budget, candidate region, opening readiness
  - Active store: franchise/direct store operation, status, owner, operation owner, SV visit, QSCV, review, sales

### QSCV And Field Visit

- QSCV form builder
- Visit purpose master
- Visit result master
- Store task category
- Store score relation master
- Visit calendar and field activity pages
- Inspection result and corrective action history

Implication for our product:

- QSCV should be built after the store master is stable.
- QSCV form and visit purpose/result values should be master-managed.
- Corrective actions should become operational tasks linked to store, owner, due date, and status.

### Delivery Platform And Reviews

- Delivery platform integration management for Baemin, Yogiyo, Coupang Eats, and similar channels
- Store-by-platform connection status
- Review list and review reports
- Review reply template management
- AI reply generation and bulk reply workflows

Implication for our product:

- Start with CSV/import-based review collection before full platform integration.
- Review reply templates can be implemented early because they are company/brand master data.
- Risk keyword alerts should be prioritized over full automation.

### POS, Sales, Logistics, And Reports

- POS sales analysis
- Menu sales analysis
- Order channel analysis
- Payment method analysis
- Store-level sales reports
- Delivery sales settlement
- Logistics sales comparison and monthly logistics sales
- CS and claim reports

Implication for our product:

- These modules depend heavily on external integrations.
- MVP should accept CSV/manual uploads and normalize them into reporting tables.
- Full POS/delivery/logistics integrations should be staged after the master data and store master are reliable.

### Documents, Notices, Alerts, And Admin

- Company notice and store notice
- Document management and read logs
- User group access control
- Module-specific document templates
- Alert templates by event
- Company management, user management, organization chart, alert management, API management
- SMS send history

Implication for our product:

- Permission groups and organization ownership should be introduced before expanding operational modules.
- Alert templates should support lead, contract, opening, operation, QSCV, and document events.
- SMS history should be an audit log, not just a notification afterthought.

## Master Data Map

FDAM relies on many small configuration screens. For our product, these should be unified into fewer, cleaner settings screens.

### Common Master Data

- Brand and menu
- Partner company
- Regional business team
- Operation type
- Payment/contract column configuration
- Region category

### Sales Master Data

- Consultation status
- Acquisition source
- Recognition channel
- Opening goods
- Liquor company category
- Draft beer installation
- Support details
- Pre-disclosure documents
- Franchise inquiry link
- Store owner relation

### Contract Master Data

- Contract form/template
- Schedule category
- Pre-disclosure documents
- Contract document template user settings

### Operation Master Data

- QSCV form
- Visit purpose
- Visit result
- Store task category
- Store score relation
- Schedule category
- Opening goods
- Liquor and beverage
- Pre-disclosure documents

### Delivery And Review Master Data

- Review reply template
- Delivery platform connection category
- Store-platform mapping

### Admin Master Data

- Company
- User
- User group
- Organization chart
- Alert event/template
- API connection setting
- SMS send history

## Recommended Product Direction

Do not replicate FDAM as dozens of isolated configuration pages. Instead, build a `Company Master Data Console` with grouped tabs:

- Common
- Sales
- Contract
- Operation
- Delivery and Review
- Documents and Alerts
- Admin

Each master item should support:

- `company_id`
- optional `brand_id`
- category key
- display name
- sort order
- active/inactive state
- optional color
- optional metadata JSON
- created/updated timestamps

This gives us the ERP backbone without making the UI feel like an old table-only system.

## Recommended Development Order

### Phase 1: Master Data Engine

- Add a shared `company_master_codes` table.
- Seed core codes for lead status, acquisition source, recognition channel, visit purpose, visit result, schedule category, region category, and operation type.
- Add CRUD APIs and a consolidated settings screen.
- Keep existing hardcoded values as fallback during migration.

### Phase 2: Connect Franchise Leads

- Replace hardcoded lead status/source/recognition values with company master codes.
- Keep default system codes for new companies.
- Preserve existing lead values by mapping labels during read/write.

### Phase 3: Document And Alert Templates

- Add company/brand-scoped document template storage.
- Add alert event templates for lead intake, status change, next contact, pre-disclosure document delivery, contract status, opening schedule, and QSCV result.
- Link SMS/LMS send logs to lead/customer/store when possible.

### Phase 4: Contract And Opening Workflow

- Add contract records linked to leads and customers.
- Add pre-disclosure document send/read tracking.
- Add opening checklist/project records linked to contract and planned store.

### Phase 5: Store Master And QSCV

- Promote current franchise location records into a store master structure.
- Add QSCV form builder and visit records.
- Add corrective actions with owner, due date, and status.

### Phase 6: Review, Sales, And Logistics Reporting

- Start with CSV/import-based review, sales, and logistics datasets.
- Add dashboard summaries and risk alerts.
- Add external platform integrations only after data model stability.

## What To Avoid

- Do not copy FDAM's dense table-heavy UI directly.
- Do not add many one-off settings pages before defining a shared master-code schema.
- Do not mix planned opening sites and active store operations in one screen.
- Do not build POS/delivery/logistics integrations before CSV/manual import paths exist.
- Do not make Meta, Naver, Baemin, or POS integrations hard dependencies for the MVP.

## Our Differentiation

FDAM is broad and operationally complete, but the UI is configuration-heavy. Our opportunity is to keep the same operational coverage while making the user flow simpler:

- Daily work starts from `Today Tasks`.
- Leads move naturally into `Contract`.
- Contracts move into `Opening`.
- Opened stores move into `Operations`.
- Operations generate `QSCV`, `Reviews`, `CS`, and `Reports`.
- Master data stays centralized and company/brand-scoped.

The product should feel like a franchise headquarters command center, not a collection of disconnected admin tables.
