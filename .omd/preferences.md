---
schema: omd.preferences/v1
design_md_hash_at_creation:
---

# Preference Log

## 2026-06-11T06:42:07.864Z — operational-dashboards-should-avoid-dupl

```omd-meta
id: pref_mq94r2ik_4d3f75d2
timestamp: 2026-06-11T06:42:07.864Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadDashboard.tsx"
```

Operational dashboards should avoid duplicate summary card rows and keep KPI cards ordered by the real workflow.

## 2026-06-11T06:44:54.244Z — kpi-cards-should-keep-consistent-title-n

```omd-meta
id: pref_mq94umw7_d30140fc
timestamp: 2026-06-11T06:44:54.244Z
scope: components.card
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadDashboard.tsx"
```

KPI cards should keep consistent title, number, and helper typography; remove low-value metrics such as immediate consulting.

## 2026-06-11T06:47:03.446Z — contact-kpi-meanings-must-be-mutually-ex

```omd-meta
id: pref_mq94xel6_b79147d6
timestamp: 2026-06-11T06:47:03.446Z
scope: components.card
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/useLeadDerivedData.ts"
```

Contact KPI meanings must be mutually exclusive: today contacts count only contacts scheduled for today, while overdue contacts count past-due follow-ups.

## 2026-06-11T06:55:21.000Z — date-range-filters-should-use-clear-kr

```omd-meta
id: pref_mq953n9c_6a1d4bb8
timestamp: 2026-06-11T06:55:21.000Z
scope: components.filter
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadToolbar.tsx"
```

Date range filters should use clear Korean labels such as 최근 7일, 최근 30일, 최근 3개월 instead of terse labels such as 7D, 30D, 3M.

## 2026-06-11T06:55:22.000Z — header-actions-should-avoid-low-priority-refresh

```omd-meta
id: pref_mq953oa4_f2671f30
timestamp: 2026-06-11T06:55:22.000Z
scope: components.button
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.tsx"
```

Operational page headers should avoid low-priority generic refresh buttons when the page already refreshes after primary data actions.

## 2026-06-11T06:55:23.000Z — close-buttons-need-visible-touch-targets

```omd-meta
id: pref_mq953p20_889cfe55
timestamp: 2026-06-11T06:55:23.000Z
scope: components.dialog
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css"
```

Dialog close buttons should have a clearly visible icon, subtle tinted background, and at least a 40px pointer target.

## 2026-06-11T06:58:31.000Z — filter-bars-should-avoid-decorative-icons

```omd-meta
id: pref_mq957y8c_6a8849a9
timestamp: 2026-06-11T06:58:31.000Z
scope: components.filter
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadToolbar.tsx"
```

Filter bars should avoid decorative filter-shape icons when the controls already communicate their purpose.

## 2026-06-11T06:58:32.000Z — redundant-quick-filters-should-be-removed

```omd-meta
id: pref_mq957z0f_0ad871fb
timestamp: 2026-06-11T06:58:32.000Z
scope: components.filter
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadToolbar.tsx"
```

Remove redundant quick filter buttons when an adjacent select control already supports the same filtering path.

## 2026-06-11T06:58:33.000Z — date-range-inputs-need-explicit-separator

```omd-meta
id: pref_mq957zrd_e9a2c04e
timestamp: 2026-06-11T06:58:33.000Z
scope: components.filter
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadToolbar.tsx"
```

Date range inputs should show an explicit separator such as `~` between start and end fields.

## 2026-06-11T07:05:15.000Z — dashboard-charts-should-show-values

```omd-meta
id: pref_mq95h2aw_1ce4b90d
timestamp: 2026-06-11T07:05:15.000Z
scope: components.chart
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadDashboard.tsx"
```

Operational dashboard charts should show numeric values directly on bars or lines, not only in hover tooltips.

## 2026-06-11T07:06:38.000Z — chart-axis-numbers-should-not-duplicate-labels

```omd-meta
id: pref_mq95iuyu_c4565c31
timestamp: 2026-06-11T07:06:38.000Z
scope: components.chart
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadDashboard.tsx"
```

When dashboard charts show direct data labels, avoid duplicate numeric axis labels that add visual noise.

## 2026-06-11T07:08:05.000Z — db-ingress-trend-should-be-switchable

```omd-meta
id: pref_mq95knps_1af0b732
timestamp: 2026-06-11T07:08:05.000Z
scope: components.chart
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadDashboard.tsx"
```

DB ingress trend charts should be switchable by daily, weekly, and monthly views instead of being fixed to the last 7 days.

## 2026-06-11T07:08:06.000Z — important-chart-controls-need-strong-visibility

```omd-meta
id: pref_mq95kohe_8b6c71bb
timestamp: 2026-06-11T07:08:06.000Z
scope: components.chart
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css"
```

Important chart controls such as daily, weekly, and monthly toggles should be large, high-contrast, and easy to scan.

## 2026-06-11T07:13:25.219Z — mobile-lead-dashboards-should-hide-low-f

```omd-meta
id: pref_mq95vb39_89f8fa96
timestamp: 2026-06-11T07:13:25.219Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css"
```

Mobile lead dashboards should hide low-frequency utility actions and dense pipeline selector cards so the first screen stays focused on core work.

## 2026-06-11T07:18:39.210Z — candidate-registration-forms-should-norm

```omd-meta
id: pref_mq9621d7_44ddd916
timestamp: 2026-06-11T07:18:39.210Z
scope: components.input
signal: user-statement
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadRegionMultiSelect.tsx"
```

Candidate registration forms should normalize contact and region data at input time instead of leaving free-form cleanup to DB management.

## 2026-06-11T07:40:20.000Z — lead-tables-should-be-configurable-and-filterable

```omd-meta
id: pref_mq96w704_9bbff0aa
timestamp: 2026-06-11T07:40:20.000Z
scope: components.table
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadTableView.tsx"
```

Lead management tables should avoid unnecessary view/status icons, expose practical filters such as region and budget, and let users choose which columns are visible.

## 2026-06-11T07:40:20.000Z — franchise-leads-should-use-warmer-business-copy

```omd-meta
id: pref_mq96w704_c615625a
timestamp: 2026-06-11T07:40:20.000Z
scope: copy
signal: user-question
confidence: medium
status: pending
source_agent: codex
source_context: "ERP/web/src/lib/franchise-leads.ts"
```

Use `가맹 희망자` for customer-facing lead labels instead of the colder `후보자` wording when the record represents a person considering a franchise contract.

## 2026-06-11T07:57:51.000Z — lead-tables-should-support-key-account-stars

```omd-meta
id: pref_mq97k8lc_7d12a3e4
timestamp: 2026-06-11T07:57:51.000Z
scope: components.table
signal: user-statement
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadTableRow.tsx"
```

Lead management tables should support a visible star marker for important leads, labeled as `중요` in Korean UI copy.

## 2026-06-11T08:18:36.162Z — pipeline-board-cards-should-stay-compact

```omd-meta
id: pref_mq9874si_ad431efc
timestamp: 2026-06-11T08:18:36.162Z
scope: components.card
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css"
```

Pipeline board cards should stay compact, with narrower columns and status badges such as converted kept visually consistent.

## 2026-06-11T08:24:54.055Z — lead-follow-up-views-should-use-business

```omd-meta
id: pref_mq98f8dk_a4242bdb
timestamp: 2026-06-11T08:24:54.055Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadTaskBoard.tsx"
```

Lead follow-up views should use business-language labels such as contact management instead of queue terminology, and individual task cards should stay compact rather than full-width.

## 2026-06-12T00:00:00.000Z — contract-owner-workflows-live-in-tabs

```omd-meta
id: pref_mqa8cm8s_f8d51e9b
timestamp: 2026-06-12T00:00:00.000Z
scope: components.tabs
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadWorkspaceTabs.tsx"
```

Contract owner workflows should live inside the contract-owner tab and retain inline editing actions instead of opening a separate standalone page.

## 2026-06-12T00:00:00.000Z — contract-tabs-focus-on-checklists

```omd-meta
id: pref_mqa90kgi_e7b96877
timestamp: 2026-06-12T00:00:00.000Z
scope: components.tabs
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadContractChecklistWorkspace.tsx"
```

Contract-owner tabs should focus on contract-related checklist progress instead of showing the full generic lead database table.

## 2026-06-12T05:54:55.886Z — active-filters-should-be-visibly-highlig

```omd-meta
id: pref_mqaii80e_ac590c73
timestamp: 2026-06-12T05:54:55.886Z
scope: components.filter
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadToolbar.tsx"
```

Active filters should be visibly highlighted with a clear blue-tinted surface, not only a subtle border.

## 2026-06-12T05:57:44.349Z — active-filter-highlights-should-stay-cal

```omd-meta
id: pref_mqailtzx_0d0d572c
timestamp: 2026-06-12T05:57:44.349Z
scope: components.filter
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css"
```

Active filter highlights should stay calm and lightly tinted, avoiding strong blue fills or focus-like glow.

## 2026-06-12T06:02:12.105Z — generic-lead-tables-should-not-show-cont

```omd-meta
id: pref_mqairkll_04a95912
timestamp: 2026-06-12T06:02:12.105Z
scope: components.table
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadTableView.tsx"
```

Generic lead tables should not show contract checklist columns; checklist progress belongs in the contract owner workspace.

## 2026-06-12T06:28:37.912Z — contact-counts-belong-in-practitioner-fo

```omd-meta
id: pref_mqajpk7t_170e7752
timestamp: 2026-06-12T06:28:37.912Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadDashboard.tsx"
```

Contact counts belong in practitioner follow-up management, not executive dashboard KPI cards.

## 2026-06-12T07:46:18.032Z — consultation-histories-should-stay-colla

```omd-meta
id: pref_mqamhfzk_56076f0c
timestamp: 2026-06-12T07:46:18.032Z
scope: layout
signal: user-statement
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadActivitySection.tsx"
```

Consultation histories should stay collapsed or shortened by default so long records do not push core lead detail content down.

## 2026-06-12T07:54:35.102Z — adjacent-operational-detail-sections-sho

```omd-meta
id: pref_mqams3j2_205a2eaa
timestamp: 2026-06-12T07:54:35.102Z
scope: typography
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/app/(main)/dashboard/franchise-leads/page.module.css"
```

Adjacent operational detail sections should share the same typography scale and weight unless their business state differs.

## 2026-06-15T00:00:00.000Z — contact-management-tabs-should-label-no-

```omd-meta
id: pref_mqeiwcmr_4c7cc4f2
timestamp: 2026-06-15T00:00:00.000Z
scope: components.tabs
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/leads/LeadTaskBoard.tsx"
```

Contact management tabs should label no-response follow-ups as confirmation work, distinct from date-based overdue or today contacts.

## 2026-06-15T07:17:04.469Z — market-insight-pages-should-avoid-redu

```omd-meta
id: pref_mqevrexh_3beb8a95
timestamp: 2026-06-15T07:17:04.469Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "ERP/web/src/components/franchise/market-insights/MarketInsightOverview.tsx"
```

Market insight pages should avoid redundant top summary card rows and decorative header pills or icons when the section content already communicates the workflow.

## 2026-06-18T00:03:27.247Z — use-sub-agents-for-development-work

```omd-meta
id: pref_mqiqlbww_a90719fe
timestamp: 2026-06-18T00:03:27.247Z
scope: workflow.development
signal: user-statement
confidence: explicit
status: pending
source_agent: codex
source_context: "project workflow"
```

Use sub-agents for development work when it can improve speed, parallel review, or verification efficiency.
