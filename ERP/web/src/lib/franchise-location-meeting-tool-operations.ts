import { cleanString, roundRatio } from '@/lib/franchise-location-meeting-tool-common';
import {
    getMeetingToolScenarioTargetSales,
    normalizeMeetingToolDraft
} from '@/lib/franchise-location-meeting-tool-normalization';
import type {
    MeetingToolCostKey,
    MeetingToolCostRow,
    MeetingToolDraft,
    MeetingToolPreset,
    MeetingToolSummary,
    MeetingToolTargetKey
} from '@/lib/franchise-location-meeting-tool-model';

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

export function applyMeetingToolPreset(draft: MeetingToolDraft, preset: MeetingToolPreset): MeetingToolDraft {
    return normalizeMeetingToolDraft({
        activeTargetKey: preset.activeTargetKey,
        targetSales: preset.targetSales,
        targetScenarios: preset.targetScenarios,
        costRows: preset.costRows,
        marketReport: draft.marketReport,
        marketMap: draft.marketMap,
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
    const targetSales = getMeetingToolScenarioTargetSales(draft.targetScenarios, targetKey);
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
