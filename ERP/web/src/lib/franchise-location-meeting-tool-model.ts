import type { MeetingToolMarketReport } from '@/lib/franchise-location-meeting-tool-market-report';

export const MEETING_TOOL_COST_ROWS = [
    { key: 'materialCost', label: '재료비' },
    { key: 'laborCost', label: '인건비' },
    { key: 'rentAndMaintenance', label: '관리비·공과금' },
    { key: 'miscCost', label: '기타잡비' },
    { key: 'royalty', label: '로열티' }
] as const;

export const MEETING_TOOL_TARGET_SCENARIOS = [
    { key: 'first', label: '1차' },
    { key: 'second', label: '2차' },
    { key: 'third', label: '3차' }
] as const;

export type MeetingToolBaseCostKey = typeof MEETING_TOOL_COST_ROWS[number]['key'];
export type MeetingToolCostKey = string;
export type MeetingToolTargetKey = typeof MEETING_TOOL_TARGET_SCENARIOS[number]['key'];

export type MeetingToolTargetScenario = {
    readonly key: MeetingToolTargetKey;
    readonly label: string;
    readonly targetSales: number | null;
};

export type MeetingToolCostRow = {
    readonly key: MeetingToolCostKey;
    readonly label: string;
    readonly amount: number | null;
    readonly ratio: number | null;
    readonly memo: string;
    readonly custom: boolean;
};

export type MeetingToolDraft = {
    readonly activeTargetKey: MeetingToolTargetKey;
    readonly targetSales: number | null;
    readonly targetScenarios: readonly MeetingToolTargetScenario[];
    readonly costRows: readonly MeetingToolCostRow[];
    readonly marketReport: MeetingToolMarketReport;
    readonly reportMemo: string;
    readonly updatedAt: string | null;
};

export type MeetingToolPresetData = {
    readonly activeTargetKey: MeetingToolTargetKey;
    readonly targetSales: number | null;
    readonly targetScenarios: readonly MeetingToolTargetScenario[];
    readonly costRows: readonly MeetingToolCostRow[];
};

export type MeetingToolPreset = MeetingToolPresetData & {
    readonly id: string;
    readonly name: string;
    readonly createdAt: string | null;
    readonly updatedAt: string | null;
};

export type MeetingToolSummary = {
    readonly targetSales: number | null;
    readonly totalCost: number;
    readonly preTaxProfit: number | null;
    readonly profitRatio: number | null;
};

export const MEETING_TOOL_DISCLAIMER =
    '내부 검토용 추정치입니다. 수익 보장 자료가 아니며, 계약·투자는 원자료 확인 후 판단하세요.';
