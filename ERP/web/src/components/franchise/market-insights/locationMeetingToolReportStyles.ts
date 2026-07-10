export const MEETING_TOOL_REPORT_STYLES = `
* { box-sizing: border-box; }
body { margin: 24px; color: #191f28; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif; }
header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start; padding-bottom: 16px; border-bottom: 2px solid #191f28; }
h1 { margin: 0; font-size: 24px; line-height: 1.32; letter-spacing: 0; }
h2 { margin: 22px 0 9px; color: #191f28; font-size: 15px; line-height: 1.4; break-after: avoid; page-break-after: avoid; }
p { margin: 0; color: #6b7684; font-size: 12px; line-height: 1.6; }
section { break-after: auto; }
.meta { min-width: 190px; padding: 10px 12px; border: 1px solid #e5e8eb; border-radius: 8px; background: #f9fafb; }
.guide { margin-top: 8px; color: #2272eb; font-weight: 700; }
.summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.analysis-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric, .memo, .notice, .analysis-card { border: 1px solid #e5e8eb; border-radius: 8px; background: #ffffff; }
.metric, .memo, .notice, .analysis-card, .print-map, tr { break-inside: avoid; page-break-inside: avoid; }
.metric { min-height: 64px; padding: 10px; }
.metric span { display: block; color: #6b7684; font-size: 11px; font-weight: 800; }
.metric strong { display: block; margin-top: 6px; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
.analysis-card { min-height: 86px; padding: 10px 12px; }
.analysis-card span { display: block; color: #4e5968; font-size: 11px; font-weight: 800; }
.analysis-card p { margin-top: 6px; color: #333d4b; font-size: 12px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.print-map { position: relative; width: 100%; height: 360px; overflow: hidden; border: 1px solid #e5e8eb; border-radius: 8px; background: #f9fafb; }
.print-map-placeholder { position: absolute; inset: 0; display: grid; place-items: center; color: #6b7684; font-size: 12px; font-weight: 800; }
.print-map-dot, .print-map-measure { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e5e8eb; background: #ffffff; box-shadow: 0 6px 14px rgba(25, 31, 40, 0.12); color: #191f28; font-size: 11px; font-weight: 850; }
.print-map-dot { width: 22px; height: 22px; border-color: #2272eb; border-radius: 999px; color: #2272eb; }
.print-map-measure { min-width: 72px; height: 28px; padding: 0 9px; border-radius: 999px; }
.highlight { border-color: #b9d7ff; background: #f5f9ff; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { padding: 8px 7px; border: 1px solid #e5e8eb; font-size: 11px; line-height: 1.45; text-align: left; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th { background: #f2f4f6; color: #4e5968; font-weight: 800; }
.active-row td { background: #f5f9ff; font-weight: 800; }
.memo { min-height: 78px; padding: 11px 12px; color: #333d4b; font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
.notice { margin-top: 14px; padding: 12px; background: #f9fafb; }
.notice strong { display: block; margin-bottom: 4px; color: #333d4b; font-size: 12px; }
@page { size: A4 portrait; margin: 12mm; }
@media print {
body { margin: 0; }
.no-print { display: none; }
.analysis-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
}
`;
