import {
    calculateMeetingToolSummary,
    MEETING_TOOL_DISCLAIMER,
    MEETING_TOOL_TARGET_SCENARIOS,
    setMeetingToolActiveTarget,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import { MEETING_TOOL_MARKET_REPORT_FIELDS } from '@/lib/franchise-location-meeting-tool-market-report';
import {
    formatLocationMoney,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData
} from '@/lib/franchise-location-master';
import {
    buildMeetingToolReportMapScript,
    buildMeetingToolReportMapSection,
    type ReportMapPosition
} from './locationMeetingToolReportMap';
import { MEETING_TOOL_REPORT_STYLES } from './locationMeetingToolReportStyles';
import type { FranchiseLocation } from './locationMasterTypes';

export type MeetingToolPrintMode = 'print' | 'pdf';

type MeetingToolReportParams = {
    readonly location: FranchiseLocation;
    readonly draft: MeetingToolDraft;
    readonly managerName: string;
    readonly mapPosition?: ReportMapPosition | null;
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
    mapPosition,
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
${MEETING_TOOL_REPORT_STYLES}
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
<h2>상권분석·목표매출 근거</h2>
<div class="analysis-grid">${buildMarketReportCards(draft)}</div>
</section>
${buildMeetingToolReportMapSection()}
<section>
<h2>검토 의견</h2>
<div class="memo">${escapeHtml(draft.reportMemo || '-')}</div>
<div class="notice"><strong>내부 검토 안내</strong><p>${escapeHtml(MEETING_TOOL_DISCLAIMER)}</p></div>
</section>
${buildMeetingToolReportMapScript({ location, draft, mapPosition })}
</body>
</html>`;
}
