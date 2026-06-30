import {
    calculateMeetingToolSummary,
    MEETING_TOOL_DISCLAIMER,
    MEETING_TOOL_MARKET_REPORT_FIELDS,
    MEETING_TOOL_TARGET_SCENARIOS,
    setMeetingToolActiveTarget,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import {
    formatLocationMoney,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData
} from '@/lib/franchise-location-master';
import type { FranchiseLocation } from './locationMasterTypes';

export type MeetingToolPrintMode = 'print' | 'pdf';

type MeetingToolReportParams = {
    readonly location: FranchiseLocation;
    readonly draft: MeetingToolDraft;
    readonly managerName: string;
    readonly mode: MeetingToolPrintMode;
};

function escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatPercent(value: number | null): string {
    return value === null ? '-' : `${value.toLocaleString()}%`;
}

function buildScenarioRows(draft: MeetingToolDraft): string {
    return MEETING_TOOL_TARGET_SCENARIOS.map(scenario => {
        const scenarioDraft = setMeetingToolActiveTarget(draft, scenario.key);
        const summary = calculateMeetingToolSummary(scenarioDraft);
        const activeClass = scenario.key === draft.activeTargetKey ? ' class="active-row"' : '';
        return `
<tr${activeClass}>
<td>${escapeHtml(scenario.label)}</td>
<td>${escapeHtml(formatLocationMoney(summary.targetSales))}</td>
<td>${escapeHtml(formatLocationMoney(summary.totalCost))}</td>
<td>${escapeHtml(formatLocationMoney(summary.preTaxProfit))}</td>
<td>${escapeHtml(formatPercent(summary.profitRatio))}</td>
</tr>`;
    }).join('');
}

function buildCostRows(draft: MeetingToolDraft): string {
    return draft.costRows.map(row => `
<tr>
<td>${escapeHtml(row.label)}</td>
<td>${escapeHtml(formatLocationMoney(row.amount))}</td>
<td>${escapeHtml(formatPercent(row.ratio))}</td>
<td>${escapeHtml(row.memo || '-')}</td>
</tr>`).join('');
}

function buildMarketReportCards(draft: MeetingToolDraft): string {
    return MEETING_TOOL_MARKET_REPORT_FIELDS.map(field => `
<div class="analysis-card">
<span>${escapeHtml(field.label)}</span>
<p>${escapeHtml(draft.marketReport[field.key] || '-')}</p>
</div>`).join('');
}

export function buildMeetingToolReportHtml({
    location,
    draft,
    managerName,
    mode
}: MeetingToolReportParams): string {
    const data = normalizeFranchiseLocationMasterData(location);
    const summary = calculateMeetingToolSummary(draft);
    const generatedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
    const modeGuide = mode === 'pdf'
        ? '<p class="no-print guide">브라우저 인쇄 대화상자에서 대상 프린터를 PDF 저장으로 선택해주세요.</p>'
        : '';

    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(location.name)} 출점 검토 리포트</title>
<style>
* { box-sizing: border-box; }
body { margin: 24px; color: #191f28; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif; }
header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start; padding-bottom: 16px; border-bottom: 2px solid #191f28; }
h1 { margin: 0; font-size: 24px; line-height: 1.32; letter-spacing: 0; }
h2 { margin: 22px 0 9px; color: #191f28; font-size: 15px; line-height: 1.4; }
p { margin: 0; color: #6b7684; font-size: 12px; line-height: 1.6; }
.meta { min-width: 190px; padding: 10px 12px; border: 1px solid #e5e8eb; border-radius: 8px; background: #f9fafb; }
.guide { margin-top: 8px; color: #2272eb; font-weight: 700; }
.summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.analysis-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric, .memo, .notice, .analysis-card { border: 1px solid #e5e8eb; border-radius: 8px; background: #ffffff; }
.metric { min-height: 64px; padding: 10px; }
.metric span { display: block; color: #6b7684; font-size: 11px; font-weight: 800; }
.metric strong { display: block; margin-top: 6px; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
.analysis-card { min-height: 86px; padding: 10px 12px; }
.analysis-card span { display: block; color: #4e5968; font-size: 11px; font-weight: 800; }
.analysis-card p { margin-top: 6px; color: #333d4b; font-size: 12px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.highlight { border-color: #b9d7ff; background: #f5f9ff; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { padding: 8px 7px; border: 1px solid #e5e8eb; font-size: 11px; line-height: 1.45; text-align: left; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th { background: #f2f4f6; color: #4e5968; font-weight: 800; }
.active-row td { background: #f5f9ff; font-weight: 800; }
.memo { min-height: 78px; padding: 11px 12px; color: #333d4b; font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
.notice { margin-top: 14px; padding: 12px; background: #f9fafb; }
.notice strong { display: block; margin-bottom: 4px; color: #333d4b; font-size: 12px; }
@page { size: A4 portrait; margin: 12mm; }
@media print { body { margin: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<header>
<div>
<h1>${escapeHtml(location.name)} 출점 검토 리포트</h1>
<p>${escapeHtml(location.address || location.region || '주소 미등록')}</p>
${modeGuide}
</div>
<div class="meta">
<p>${escapeHtml(generatedDate)}</p>
<p>담당 ${escapeHtml(managerName || '미지정')}</p>
</div>
</header>
<section>
<h2>후보지 요약</h2>
<div class="summary">
<div class="metric"><span>브랜드</span><strong>${escapeHtml(location.brand || '미지정')}</strong></div>
<div class="metric"><span>진행 상태</span><strong>${escapeHtml(location.status)} · ${escapeHtml(data.developmentStage)}</strong></div>
<div class="metric"><span>입점비용</span><strong>${escapeHtml(formatLocationMoney(getAcquisitionCostTotal(data.cost)))}</strong></div>
<div class="metric"><span>월세·관리비</span><strong>${escapeHtml(formatLocationMoney((data.lease.monthlyRent ?? 0) + (data.lease.maintenanceFee ?? 0)))}</strong></div>
<div class="metric"><span>보증금</span><strong>${escapeHtml(formatLocationMoney(data.cost.deposit))}</strong></div>
<div class="metric"><span>권리금</span><strong>${escapeHtml(formatLocationMoney(data.cost.premium))}</strong></div>
<div class="metric"><span>전용면적</span><strong>${escapeHtml(data.siteCondition.exclusiveAreaPyeong === null ? '-' : `${data.siteCondition.exclusiveAreaPyeong.toLocaleString()}평`)}</strong></div>
<div class="metric"><span>임대인</span><strong>${escapeHtml(data.landlord.name || '미확인')}</strong></div>
</div>
</section>
<section>
<h2>목표매출 시나리오 비교</h2>
<table>
<thead><tr><th>시나리오</th><th>목표매출(만원)</th><th>비용 합계</th><th>세전수익</th><th>세전 수익률</th></tr></thead>
<tbody>${buildScenarioRows(draft)}</tbody>
</table>
</section>
<section>
<h2>상권분석·목표매출 근거</h2>
<div class="analysis-grid">${buildMarketReportCards(draft)}</div>
</section>
<section>
<h2>현재 선택안 비용 구조</h2>
<div class="summary">
<div class="metric highlight"><span>목표매출</span><strong>${escapeHtml(formatLocationMoney(summary.targetSales))}</strong></div>
<div class="metric"><span>비용 합계</span><strong>${escapeHtml(formatLocationMoney(summary.totalCost))}</strong></div>
<div class="metric"><span>세전수익</span><strong>${escapeHtml(formatLocationMoney(summary.preTaxProfit))}</strong></div>
<div class="metric"><span>세전 수익률</span><strong>${escapeHtml(formatPercent(summary.profitRatio))}</strong></div>
</div>
<table>
<thead><tr><th>항목</th><th>금액(만원)</th><th>비율</th><th>메모</th></tr></thead>
<tbody>${buildCostRows(draft)}</tbody>
</table>
</section>
<section>
<h2>검토 의견</h2>
<div class="memo">${escapeHtml(draft.reportMemo || '-')}</div>
<div class="notice"><strong>내부 검토 안내</strong><p>${escapeHtml(MEETING_TOOL_DISCLAIMER)}</p></div>
</section>
<script>
(function () {
    function printReport() {
        window.focus();
        window.setTimeout(function () {
            window.print();
        }, 300);
    }

    if (document.readyState === 'complete') {
        printReport();
    } else {
        window.addEventListener('load', printReport, { once: true });
    }
})();
</script>
</body>
</html>`;
}
