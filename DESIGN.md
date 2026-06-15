---
omd: 0.1
brand: "내일사장 Franchise OS"
bootstrapped_from: toss
bootstrapped_at: "2026-06-11T15:02:33+09:00"
---

# Design System - 내일사장 Franchise OS

Based on Toss, adapted for a franchise headquarters operating system. This is not a consumer fintech clone. The target user is a headquarters employee who repeatedly manages leads, candidate locations, disclosure documents, opening projects, and franchise operations.

## 1. Visual Theme & Atmosphere

The interface should feel clean, fast, and trustworthy. It should make complex franchise work look ordered without making it look empty. Use Toss-like clarity: white surfaces, quiet grey backgrounds, strong black text, blue for actions, and very little decoration.

This product is an operational tool, so the first screen should prioritize scanning and action over storytelling. Filters, counts, task queues, tables, status badges, and next actions must be immediately readable. Avoid marketing-style hero composition, oversized cards, ornamental gradients, decorative illustrations, and "AI-generated dashboard" spacing.

**Key Characteristics:**
- Clear white and light-grey surfaces with restrained blue accents.
- Dense but calm layouts for repeated headquarters work.
- Status-first information hierarchy: what is blocked, due, late, eligible, or ready.
- Korean business text with short labels and concrete verbs.
- Minimal shadows. Structure comes from spacing, borders, and typography.
- Mobile views must keep the work usable, not just visually stacked.
- The UI should look designed by a product team, not prompted by an image model.

## 2. Color Palette & Roles

### Primary

- **Primary Blue** (`#3182f6`): primary actions, active tabs, selected filters, focus states.
- **Primary Hover** (`#2272eb`): hover and pressed state for primary blue.
- **Primary Soft** (`#e8f3ff`): selected row background, informational callouts, weak active states.
- **Canvas** (`#ffffff`): main cards, forms, tables.
- **App Background** (`#f2f4f6`): page background and secondary bands.
- **Foreground** (`#191f28`): primary headings and strong text.

### Brand (Logo/Marketing Only)

- **Brand Blue** (`#0064ff`): logo, brand moments, and external marketing material only.
- **Brand Charcoal** (`#202632`): brand lockup and formal identity surfaces.

### Semantic

- **Error Red** (`#f04452`): destructive actions, failed import, overdue legal blocker.
- **Success Green** (`#03b26c`): completed, eligible, opened, synced.
- **Warning Orange** (`#fe9800`): needs attention, waiting, quota warning.
- **Info Teal** (`#18a5a5`): neutral external data, provider state, reference data.
- **Review Purple** (`#8b5cf6`): optional insight or analysis, never primary workflow.

### Neutral Scale

- **Grey 50** (`#f9fafb`): subtle table striping, inner panel background.
- **Grey 100** (`#f2f4f6`): page background, disabled fill.
- **Grey 200** (`#e5e8eb`): standard border and divider.
- **Grey 300** (`#d1d6db`): stronger border, active input outline.
- **Grey 400** (`#b0b8c1`): placeholders and disabled icons.
- **Grey 500** (`#8b95a1`): metadata and helper text.
- **Grey 600** (`#6b7684`): descriptions.
- **Grey 700** (`#4e5968`): labels and secondary headings.
- **Grey 800** (`#333d4b`): strong labels.
- **Grey 900** (`#191f28`): primary text.

### Surface & Borders

- Use `#ffffff` cards on `#f2f4f6` page background.
- Use `#e5e8eb` for standard borders.
- Use `#d1d6db` for active or emphasized borders.
- Avoid tinted full-page backgrounds unless they express an explicit status.
- Avoid nested cards. Use section bands, tables, and panels instead.

## 3. Typography Rules

### Font Family

- **Primary**: system Korean sans stack: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif`.
- **Monospace**: `"SF Mono", SFMono-Regular, Menlo, Consolas, monospace`.
- Toss Product Sans may be used only if it is already legally available in the app.

### Hierarchy

| Role | Size | Weight | Line Height | Use |
| --- | ---: | ---: | ---: | --- |
| Page Title | 28px | 700 | 1.35 | Work area title |
| Section Title | 20px | 700 | 1.40 | Major panels |
| Card Title | 16px | 700 | 1.50 | Repeated cards and metric tiles |
| Label | 13px | 600 | 1.45 | Form labels, table headers, chips |
| Body | 14px | 400 | 1.57 | Standard text |
| Body Small | 13px | 400 | 1.54 | Metadata and helper text |
| Caption | 12px | 400 | 1.50 | timestamps, provider details |
| Metric | 28px | 700 | 1.20 | KPI numbers |

### Principles

- Use 400, 600, and 700 only unless a component already requires another weight.
- Do not scale font size with viewport width.
- Letter spacing is 0.
- Korean labels should be short and noun-first: `오늘 연락`, `연락 지연`, `계약 가능일`.
- Numbers in tables and KPIs should align predictably. Use tabular numerals where available.

## 4. Component Stylings

### Buttons

Buttons are action controls, not decoration.

**Primary**
- Background: `#3182f6`
- Text: `#ffffff`
- Border: none
- Radius: 8px for admin UI; 12px allowed for large mobile CTAs.
- Height: 40px desktop, 44px mobile.
- Use: save, create, execute import, register candidate.

**Secondary**
- Background: `#ffffff`
- Text: `#333d4b`
- Border: `1px solid #e5e8eb`
- Use: refresh, cancel, sample download, filter reset.

**Weak**
- Background: `#f2f4f6`
- Text: `#4e5968`
- Border: none or `1px solid #e5e8eb`
- Use: low-risk toggles, optional filters.

**Danger**
- Background: `#fff1f2`
- Text: `#e42939`
- Border: `1px solid #fecdd3`
- Use: delete, unlink, irreversible actions.

### Inputs

- Radius: 8px.
- Height: 40px desktop, 44px mobile.
- Border: `#e5e8eb`; focus border `#3182f6`.
- Placeholder: `#8b95a1`.
- Labels sit above inputs for forms; compact filter bars may use placeholder-only if context is obvious.
- Search fields should include a search icon and a clear affordance when text exists.

### Cards

- Radius: 8px.
- Border: `1px solid #e5e8eb`.
- Shadow: none by default.
- Padding: 16px to 20px.
- Cards are for repeated items, metrics, modals, and discrete work panels.
- Do not place cards inside cards.

### Badges

- Radius: 999px for compact status chips.
- Height: 24px to 28px.
- Use semantic colors sparingly.
- Every badge label must answer a business state: `1차 유입`, `후보자`, `계약 가능`, `연락 지연`, `manual-promoted`.

### Tabs

- Use segmented tabs for local views inside the same workflow.
- Active tab: blue text, blue icon if present, soft blue background or underline.
- Keep tab labels concrete: `대시보드`, `DB 관리`, `외부 상가 수집`, `오픈 준비`.
- On mobile, tabs may horizontally scroll, but the page itself must not overflow.

### Toasts

- Use short result messages.
- Start with the result: `저장됐습니다`, `연결을 해제했습니다`, `수집이 실패했습니다`.
- Include next action only when useful.

### Dialogs

- Radius: 12px.
- Width: 480px to 720px depending on form complexity.
- Keep destructive confirmation dialogs narrow.
- Do not use dialogs for large data exploration. Use a panel or page section.

### Toggles

- Use toggles only for persistent binary state.
- Use checkboxes for batch filters.
- Use segmented controls for mutually exclusive modes.

## 5. Layout Principles

### Spacing System

- 4px base unit.
- Use 8px for tight internal gaps, 12px for form rows, 16px for card padding, 24px for section rhythm, 32px for page-level separation.
- Avoid arbitrary one-off spacing.

### Grid & Container

- Desktop content max width should remain readable, but operational tables can use the full available workspace.
- Metric tiles use stable grid tracks. Dynamic counts must not resize cards.
- Filter bars wrap cleanly without pushing the viewport wider.

### Whitespace Philosophy

- Whitespace should clarify grouping, not create emptiness.
- High-frequency screens can be dense if rows, labels, and actions remain scannable.
- Do not add decorative whitespace to imitate a landing page.

### Border Radius Scale

- Default radius: 8px.
- Small controls: 6px.
- Large mobile CTAs and modal shells: 12px.
- Pills and badges: 999px.
- Avoid large rounded rectangles for ordinary admin cards.

## 6. Depth & Elevation

- Default surfaces use borders, not shadows.
- Use subtle shadow only for dropdowns, popovers, sticky toolbars, and modals.
- Avoid floating card stacks.

### Blur Effects

- Avoid blur as decoration.
- Use overlay scrims only for dialogs or blocking flows.

## 7. Do's and Don'ts

### Do

- Lead with the next operational decision.
- Keep filters visible and understandable.
- Show counts that match the list currently shown.
- Preserve data after refresh and make saved state obvious.
- Use clear empty states that say what is missing and how to proceed.
- Make mobile layouts usable for quick checks, not full back-office work.

### Don't

- Do not use gradient blobs, decorative orbs, bokeh, or stock-like background imagery.
- Do not use oversized hero sections inside operational dashboards.
- Do not hide legal blockers such as information disclosure 14-day waiting periods.
- Do not make provider errors look like no data.
- Do not invent AI-sounding explanations in the UI.
- Do not use vague labels like `관리하기` when the action is `후보자 승격`, `연결 해제`, or `발송 기록`.

## 8. Responsive Behavior

### Breakpoints

- Mobile: 360px to 480px.
- Tablet: 768px and up.
- Desktop: 1200px and up.

### Touch Targets

- Minimum 40px desktop pointer target.
- Minimum 44px mobile touch target.
- Icon-only controls require tooltip or accessible label.

### Collapsing Strategy

- On mobile, the global sidebar should default collapsed.
- Tables become cards only when the row has fewer than 8 critical fields. Dense operational tables may remain horizontally scrollable inside their own container, never at page level.
- Filter bars wrap into two-column or single-column forms.

### Image Behavior

- Use real product, map, document, or listing previews only when they help inspection.
- Avoid generic illustration for operational pages.

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary action: `#3182f6`.
- Active soft background: `#e8f3ff`.
- Page background: `#f2f4f6`.
- Card background: `#ffffff`.
- Border: `#e5e8eb`.
- Text: `#191f28`.
- Muted text: `#6b7684`.
- Error: `#f04452`.
- Success: `#03b26c`.
- Warning: `#fe9800`.

### Example Component Prompts

- "모객 DB 테이블을 Toss-like 운영 SaaS 톤으로 정리해줘. 카드 남발 없이 필터, 상태, 다음 액션이 먼저 보이게."
- "출점 후보지 외부 상가 연결 UI를 대량 데이터 기준으로 단순화해줘. 저장 상태와 중복 연결 상태를 명확히."
- "가맹 운영 화면을 본사 직원이 매일 쓰는 작업 큐처럼 정리해줘."

### Iteration Guide

- If the screen looks too decorative, remove color and shadow before adding structure.
- If the screen feels empty, increase information density with grouped rows and clearer labels, not bigger cards.
- If a workflow is confusing, add state labels and next actions before adding explanatory text.

## 10. Voice & Tone

The voice is concise, operational, and calm. The UI should sound like a capable headquarters operator, not a chatbot.

- Prefer: `정보공개서 발송 후 14일이 지나야 계약할 수 있습니다.`
- Avoid: `계약 진행을 위해 법적 요건을 충족하는 멋진 여정을 시작하세요.`
- Prefer: `저장된 상가가 없습니다. 상가 수집을 실행하면 이 목록에 누적됩니다.`
- Avoid: `아직 데이터가 없어요! 새로운 가능성을 찾아볼까요?`

Use Korean business language. Keep button labels short. Use helper text only when it prevents a mistake.

## 11. Brand Narrative

내일사장 Franchise OS is a headquarters operating system for franchise growth teams. It connects lead intake, candidate promotion, site discovery, information disclosure delivery, contract readiness, opening preparation, and post-opening operations.

<!-- omd:limitation Founding date and official tagline are not yet confirmed. Replace before external launch material. -->

The product thesis: headquarters teams should know the next required action without stitching together spreadsheets, messages, and disconnected tools.

## 12. Principles

1. **Make the next action visible.** Every lead, site, document, and store should show what has to happen next.
2. **Separate source data from operational records.** External listings and raw imports must not silently become ERP properties.
3. **Respect legal timing.** Information disclosure delivery and the 14-day contract waiting period must be explicit.
4. **Keep provider states honest.** Unconfigured, quota exceeded, timeout, no result, and saved result are separate states.
5. **Design for headquarters repetition.** Daily screens should be fast to scan, stable after refresh, and efficient with large data.

## 13. Personas

- **Franchise Development Manager**: reviews leads, promotes candidates, links candidate sites, tracks disclosure delivery, prepares contracts.
- **Location Development Staff**: collects external store listings, filters viable sites, checks duplicates, links saved candidates.
- **Operations/SV Staff**: manages open stores, opening projects, operational status, and follow-up tasks.
- **Executive/Admin**: checks pipeline health, overdue work, conversion status, company scope, and role-based access.

## 14. States

- **Empty**: state what is missing and the action that creates the first record.
- **Loading**: preserve layout dimensions and show which data is loading.
- **Saved**: show persistent state after refresh, especially linked sites and disclosure delivery records.
- **Blocked**: explain the blocker and the earliest next date when relevant.
- **Provider Warning**: show provider name and state without overwriting previous successful data.
- **Destructive**: require confirmation for deletion, unlinking, and duplicate merge actions.

## 15. Motion & Easing

Motion should be quiet and functional.

- Use 120ms to 180ms for hover, focus, and small state transitions.
- Use 180ms to 240ms for drawer, panel, and modal transitions.
- Avoid bounce, springy decoration, and attention-seeking motion.
- Loading skeletons should be stable and aligned with final layout.
- Changes in counts, filters, and task queues should not shift the surrounding layout.
