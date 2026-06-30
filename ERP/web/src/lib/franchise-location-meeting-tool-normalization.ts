import { parseLocationMoney, type FranchiseLocationMasterData } from '@/lib/franchise-location-master';
import { normalizeMeetingToolMarketReport } from '@/lib/franchise-location-meeting-tool-market-report';
import { cleanString, isRecord, parseNullableNumber, roundRatio } from '@/lib/franchise-location-meeting-tool-common';
import {
    MEETING_TOOL_COST_ROWS,
    MEETING_TOOL_TARGET_SCENARIOS,
    type MeetingToolBaseCostKey,
    type MeetingToolCostKey,
    type MeetingToolCostRow,
    type MeetingToolDraft,
    type MeetingToolPreset,
    type MeetingToolPresetData,
    type MeetingToolTargetKey,
    type MeetingToolTargetScenario
} from '@/lib/franchise-location-meeting-tool-model';

type MutableMeetingToolDraft = {
    activeTargetKey?: unknown;
    targetSales?: unknown;
    targetScenarios?: unknown;
    costRows?: unknown;
    marketReport?: unknown;
    reportMemo?: unknown;
    updatedAt?: unknown;
};

type MutableMeetingToolPreset = MutableMeetingToolDraft & {
    id?: unknown;
    name?: unknown;
    createdAt?: unknown;
};

function isBaseCostKey(value: string): value is MeetingToolBaseCostKey {
    return MEETING_TOOL_COST_ROWS.some(definition => definition.key === value);
}

function toMeetingToolTargetKey(value: unknown): MeetingToolTargetKey {
    const raw = typeof value === 'string' ? value : '';
    return MEETING_TOOL_TARGET_SCENARIOS.find(scenario => scenario.key === raw)?.key ?? 'first';
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

export function getMeetingToolScenarioTargetSales(
    scenarios: readonly MeetingToolTargetScenario[],
    activeTargetKey: MeetingToolTargetKey
): number | null {
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
    const targetSales = getMeetingToolScenarioTargetSales(targetScenarios, activeTargetKey);
    const rowsByKey = new Map<MeetingToolCostKey, unknown>();
    const sourceCostRows = Array.isArray(source.costRows) ? source.costRows : [];

    if (Array.isArray(source.costRows)) {
        source.costRows.forEach(row => {
            if (!isRecord(row)) return;
            const key = typeof row.key === 'string' ? row.key : '';
            if (isBaseCostKey(key)) rowsByKey.set(key, row);
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
        marketReport: normalizeMeetingToolMarketReport(source.marketReport),
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
