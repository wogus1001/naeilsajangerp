import type { SupervisionInspectionItem, SupervisionItemResult } from '@/lib/franchise-supervision';

export type SupervisionInspectionSummary = {
    readonly total: number;
    readonly goodCount: number;
    readonly warningCount: number;
    readonly improvementCount: number;
    readonly memoCount: number;
    readonly completionRate: number;
    readonly overallResult: SupervisionItemResult;
};

export function summarizeInspectionItems(items: readonly SupervisionInspectionItem[]): SupervisionInspectionSummary {
    const total = items.length;
    const goodCount = items.filter(item => item.result === '양호').length;
    const warningCount = items.filter(item => item.result === '주의').length;
    const improvementCount = items.filter(item => item.result === '개선필요').length;
    const memoCount = items.filter(item => item.memo.trim().length > 0).length;
    const completionRate = total > 0 ? Math.round((goodCount / total) * 100) : 0;
    const overallResult: SupervisionItemResult = improvementCount > 0 ? '개선필요' : warningCount > 0 ? '주의' : '양호';
    return { total, goodCount, warningCount, improvementCount, memoCount, completionRate, overallResult };
}

export function getActionRequiredInspectionItems(items: readonly SupervisionInspectionItem[]): readonly SupervisionInspectionItem[] {
    return items.filter(item => item.result === '주의' || item.result === '개선필요');
}
