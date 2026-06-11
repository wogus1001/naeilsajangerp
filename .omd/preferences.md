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
