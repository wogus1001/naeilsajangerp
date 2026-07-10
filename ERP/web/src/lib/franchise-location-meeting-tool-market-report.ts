export const MEETING_TOOL_MARKET_REPORT_FIELDS = [
    { key: 'tradeAreaSummary', label: '상권 요약', placeholder: '상권 특성, 입지 장점, 배후 수요를 입력하세요.' },
    { key: 'demandEvidence', label: '수요 근거', placeholder: '유동인구, 배후세대, 시간대별 수요를 입력하세요.' },
    { key: 'targetSalesBasis', label: '목표매출 산정 근거', placeholder: '객단가, 예상 방문수, 회전율 등 산정 근거를 입력하세요.' },
    { key: 'riskNotes', label: '리스크/확인사항', placeholder: '경쟁점, 임대 조건, 추가 확인사항을 입력하세요.' }
] as const;

export type MeetingToolMarketReportKey = typeof MEETING_TOOL_MARKET_REPORT_FIELDS[number]['key'];

export type MeetingToolMarketReport = {
    readonly [key in MeetingToolMarketReportKey]: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanMarketReportText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function normalizeMeetingToolMarketReport(value: unknown): MeetingToolMarketReport {
    const source = isRecord(value) ? value : {};
    return {
        tradeAreaSummary: cleanMarketReportText(source.tradeAreaSummary),
        demandEvidence: cleanMarketReportText(source.demandEvidence),
        targetSalesBasis: cleanMarketReportText(source.targetSalesBasis),
        riskNotes: cleanMarketReportText(source.riskNotes)
    };
}
