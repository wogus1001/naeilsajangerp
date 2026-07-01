import type {
    MeetingToolCostKey,
    MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import type { FranchiseLocation } from './locationMasterTypes';
import {
    buildMeetingToolReportHtml,
    type MeetingToolPrintMode
} from './locationMeetingToolReport';
import type { ReportMapPosition } from './locationMeetingToolReportMap';

const NUMBER_INPUT_FORMATTER = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 3
});

export function parseNumberInput(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatMoneyInputValue(value: number | null): string {
    return value === null ? '' : NUMBER_INPUT_FORMATTER.format(value);
}

export function formatRatioInputValue(value: number | null): string {
    return value === null ? '' : String(value);
}

export function removeRatioInputValue(source: Record<MeetingToolCostKey, string>, key: MeetingToolCostKey): Record<MeetingToolCostKey, string> {
    if (!(key in source)) return source;
    const next = { ...source };
    delete next[key];
    return next;
}

export function formatPercent(value: number | null): string {
    return value === null ? '-' : `${value.toLocaleString()}%`;
}

export function isDemoApiBlockedError(error: unknown): boolean {
    return error instanceof Error && (
        error.name === 'DemoApiBlockedError'
        || error.message.startsWith('Demo mode blocked real API request:')
    );
}

export function openMeetingToolReport(
    location: FranchiseLocation,
    draft: MeetingToolDraft,
    managerName: string,
    mode: MeetingToolPrintMode,
    mapPosition?: ReportMapPosition | null
): void {
    const reportHtml = buildMeetingToolReportHtml({ draft, location, managerName, mapPosition, mode });
    const reportUrl = window.URL.createObjectURL(new Blob([reportHtml], { type: 'text/html;charset=utf-8' }));
    const printWindow = window.open(reportUrl, '_blank', 'width=980,height=760');
    if (!printWindow) {
        window.URL.revokeObjectURL(reportUrl);
        window.alert('팝업이 차단되어 보고서 화면을 열 수 없습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
        return;
    }

    printWindow.focus();
    window.setTimeout(() => {
        window.URL.revokeObjectURL(reportUrl);
    }, 60_000);
}
