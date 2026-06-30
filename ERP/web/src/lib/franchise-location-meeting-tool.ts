import { parseLocationMoney, type FranchiseLocationMasterData } from '@/lib/franchise-location-master';

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
    '본 자료는 내부 검토용 참고 추정치이며 실제 수익을 보장하지 않습니다. 실제 계약·투자 판단은 원자료와 별도 검토를 함께 진행해야 합니다.';

type MutableMeetingToolDraft = {
    activeTargetKey?: unknown;
    targetSales?: unknown;
    targetScenarios?: unknown;
    costRows?: unknown;
    reportMemo?: unknown;
    updatedAt?: unknown;
};

type MutableMeetingToolPreset = MutableMeetingToolDraft & {
    id?: unknown;
    name?: unknown;
    createdAt?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).trim().replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function roundRatio(value: number): number {
    return Math.round(value * 10) / 10;
}

function isBaseCostKey(value: string): value is MeetingToolBaseCostKey {
    return MEETING_TOOL_COST_ROWS.some(definition => definition.key === value);
}

function toMeetingToolTargetKey(value: unknown): MeetingToolTargetKey {
    const raw = typeof value === 'string' ? value : '';
    return MEETING_TOOL_TARGET_SCENARIOS.find(scenario => scenario.key === raw)?.key ?? 'first';
}

function makeCustomCostKey(label: string): string {
    const compact = label
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    return `custom-${compact || 'expense'}`;
}

function recalculateCostRows(rows: readonly MeetingToolCostRow[], targetSales: number | null): readonly MeetingToolCostRow[] {
    return rows.map(row => ({
        ...row,
        ratio: targetSales && row.amount !== null ? roundRatio((row.amount / targetSales) * 100) : row.ratio
    }));
}

function normalizeCostRow(
    row: unknown,
    key: string,
    label: string,
    targetSales: number | null,
    fallbackAmount: number | null,
    custom: boolean
): MeetingToolCostRow {
    if (!isRecord(row)) {
        return {
            key,
            label,
            amount: fallbackAmount,
            ratio: targetSales && fallbackAmount !== null ? roundRatio((fallbackAmount / targetSales) * 100) : null,
            memo: '',
            custom
        };
    }

    const amount = parseNullableNumber(row.amount) ?? fallbackAmount;
    const explicitRatio = parseNullableNumber(row.ratio);
    const ratio = explicitRatio ?? (targetSales && amount !== null ? roundRatio((amount / targetSales) * 100) : null);
    const memo = typeof row.memo === 'string' ? row.memo.trim() : '';

    return { key, label, amount, ratio, memo, custom };
}

function normalizeTargetScenarios(source: MutableMeetingToolDraft, legacyTargetSales: number | null): readonly MeetingToolTargetScenario[] {
    const rowsByKey = new Map<string, unknown>();
    if (Array.isArray(source.targetScenarios)) {
        source.targetScenarios.forEach(row => {
            if (!isRecord(row)) return;
            const key = typeof row.key === 'string' ? row.key : '';
            rowsByKey.set(key, row);
        });
    }

    return MEETING_TOOL_TARGET_SCENARIOS.map(definition => {
        const row = rowsByKey.get(definition.key);
        const targetSales = isRecord(row) ? parseNullableNumber(row.targetSales) : null;
        return {
            key: definition.key,
            label: definition.label,
            targetSales: targetSales ?? (definition.key === 'first' ? legacyTargetSales : null)
        };
    });
}

function getScenarioTargetSales(scenarios: readonly MeetingToolTargetScenario[], activeTargetKey: MeetingToolTargetKey): number | null {
    return scenarios.find(scenario => scenario.key === activeTargetKey)?.targetSales ?? null;
}

function normalizeCustomCostRows(rows: readonly unknown[], targetSales: number | null): readonly MeetingToolCostRow[] {
    return rows
        .map(row => {
            if (!isRecord(row)) return null;
            const key = cleanString(row.key);
            const label = cleanString(row.label);
            if (!key || !label || isBaseCostKey(key)) return null;
            return normalizeCostRow(row, key, label, targetSales, null, true);
        })
        .filter((row): row is MeetingToolCostRow => row !== null);
}

export function getMeetingToolDefaultsFromLocation(location: Partial<FranchiseLocationMasterData>): Partial<Record<MeetingToolBaseCostKey, number | null>> {
    const monthlyRent = parseLocationMoney(location.lease?.monthlyRent);
    const maintenanceFee = parseLocationMoney(location.lease?.maintenanceFee);
    const rentAndMaintenance = (monthlyRent ?? 0) + (maintenanceFee ?? 0);

    return {
        rentAndMaintenance: rentAndMaintenance > 0 ? rentAndMaintenance : null
    };
}

export function normalizeMeetingToolDraft(
    value: unknown,
    defaults?: Partial<Record<MeetingToolBaseCostKey, number | null>>
): MeetingToolDraft {
    const source: MutableMeetingToolDraft = isRecord(value) ? value : {};
    const legacyTargetSales = parseNullableNumber(source.targetSales);
    const activeTargetKey = toMeetingToolTargetKey(source.activeTargetKey);
    const targetScenarios = normalizeTargetScenarios(source, legacyTargetSales);
    const targetSales = getScenarioTargetSales(targetScenarios, activeTargetKey);
    const rowsByKey = new Map<MeetingToolCostKey, unknown>();
    const sourceCostRows = Array.isArray(source.costRows) ? source.costRows : [];
    if (Array.isArray(source.costRows)) {
        source.costRows.forEach(row => {
            if (!isRecord(row)) return;
            const key = typeof row.key === 'string' ? row.key : '';
            if (isBaseCostKey(key)) {
                rowsByKey.set(key, row);
            }
        });
    }

    return {
        activeTargetKey,
        targetSales,
        targetScenarios,
        costRows: [
            ...MEETING_TOOL_COST_ROWS.map(definition => normalizeCostRow(
                rowsByKey.get(definition.key),
                definition.key,
                definition.label,
                targetSales,
                defaults?.[definition.key] ?? null,
                false
            )),
            ...normalizeCustomCostRows(sourceCostRows, targetSales)
        ],
        reportMemo: typeof source.reportMemo === 'string' ? source.reportMemo.trim() : '',
        updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null
    };
}

export function toMeetingToolPresetData(value: unknown): MeetingToolPresetData {
    const draft = normalizeMeetingToolDraft(value);
    return {
        activeTargetKey: draft.activeTargetKey,
        targetSales: draft.targetSales,
        targetScenarios: draft.targetScenarios,
        costRows: draft.costRows
    };
}

export function normalizeMeetingToolPreset(value: unknown): MeetingToolPreset | null {
    const source: MutableMeetingToolPreset = isRecord(value) ? value : {};
    const id = cleanString(source.id);
    const name = cleanString(source.name);
    if (!id || !name) return null;

    const data = toMeetingToolPresetData(source);
    return {
        id,
        name,
        ...data,
        createdAt: typeof source.createdAt === 'string' ? source.createdAt : null,
        updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null
    };
}

export function applyMeetingToolPreset(draft: MeetingToolDraft, preset: MeetingToolPreset): MeetingToolDraft {
    return normalizeMeetingToolDraft({
        activeTargetKey: preset.activeTargetKey,
        targetSales: preset.targetSales,
        targetScenarios: preset.targetScenarios,
        costRows: preset.costRows,
        reportMemo: draft.reportMemo,
        updatedAt: draft.updatedAt
    });
}

export function calculateMeetingToolSummary(draft: MeetingToolDraft): MeetingToolSummary {
    const totalCost = draft.costRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const preTaxProfit = draft.targetSales === null ? null : draft.targetSales - totalCost;
    const profitRatio = draft.targetSales && preTaxProfit !== null
        ? roundRatio((preTaxProfit / draft.targetSales) * 100)
        : null;

    return {
        targetSales: draft.targetSales,
        totalCost,
        preTaxProfit,
        profitRatio
    };
}

export function updateMeetingToolTargetSales(draft: MeetingToolDraft, targetSales: number | null): MeetingToolDraft {
    const targetScenarios = draft.targetScenarios.map(scenario => scenario.key === draft.activeTargetKey
        ? { ...scenario, targetSales }
        : scenario);

    return {
        ...draft,
        targetSales,
        targetScenarios,
        costRows: recalculateCostRows(draft.costRows, targetSales)
    };
}

export function updateMeetingToolCostAmount(
    draft: MeetingToolDraft,
    key: MeetingToolCostKey,
    amount: number | null
): MeetingToolDraft {
    return {
        ...draft,
        costRows: draft.costRows.map(row => row.key === key
            ? {
                ...row,
                amount,
                ratio: draft.targetSales && amount !== null ? roundRatio((amount / draft.targetSales) * 100) : null
            }
            : row)
    };
}

export function updateMeetingToolCostRatio(
    draft: MeetingToolDraft,
    key: MeetingToolCostKey,
    ratio: number | null
): MeetingToolDraft {
    return {
        ...draft,
        costRows: draft.costRows.map(row => row.key === key
            ? {
                ...row,
                ratio,
                amount: draft.targetSales && ratio !== null ? Math.round((draft.targetSales * ratio) / 100) : row.amount
            }
            : row)
    };
}

export function setMeetingToolActiveTarget(draft: MeetingToolDraft, targetKey: MeetingToolTargetKey): MeetingToolDraft {
    const targetSales = getScenarioTargetSales(draft.targetScenarios, targetKey);
    return {
        ...draft,
        activeTargetKey: targetKey,
        targetSales,
        costRows: recalculateCostRows(draft.costRows, targetSales)
    };
}

export function addMeetingToolCustomCostRow(draft: MeetingToolDraft, label: string): MeetingToolDraft {
    const cleanedLabel = cleanString(label);
    if (!cleanedLabel) return draft;
    const baseKey = makeCustomCostKey(cleanedLabel);
    const existingKeys = new Set(draft.costRows.map(row => row.key));
    const key = existingKeys.has(baseKey) ? `${baseKey}-${existingKeys.size + 1}` : baseKey;
    const costRow: MeetingToolCostRow = {
        key,
        label: cleanedLabel,
        amount: null,
        ratio: null,
        memo: '',
        custom: true
    };

    return {
        ...draft,
        costRows: [...draft.costRows, costRow]
    };
}

export function removeMeetingToolCustomCostRow(draft: MeetingToolDraft, key: string): MeetingToolDraft {
    return {
        ...draft,
        costRows: draft.costRows.filter(row => row.key !== key || !row.custom)
    };
}
