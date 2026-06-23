export type ElectronicContractUsageCompany = {
    readonly id: string;
    readonly name: string | null;
};

export type ElectronicContractUsageRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly status: string | null;
    readonly sent_at: string | null;
    readonly completed_at: string | null;
    readonly created_at: string | null;
};

export type ElectronicContractUsageSummary = {
    readonly companyId: string;
    readonly companyName: string;
    readonly total: number;
    readonly draft: number;
    readonly inProgress: number;
    readonly completed: number;
    readonly failed: number;
    readonly canceled: number;
    readonly recentSentAt: string;
    readonly recentCompletedAt: string;
};

function createEmptySummary(companyId: string, companyName: string): ElectronicContractUsageSummary {
    return {
        companyId,
        companyName,
        total: 0,
        draft: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
        recentSentAt: '',
        recentCompletedAt: ''
    };
}

function maxIsoDate(currentValue: string, candidateValue: string | null): string {
    if (!candidateValue) return currentValue;
    if (!currentValue) return candidateValue;
    return candidateValue > currentValue ? candidateValue : currentValue;
}

function incrementStatus(summary: ElectronicContractUsageSummary, status: string | null): ElectronicContractUsageSummary {
    if (status === 'draft') return { ...summary, draft: summary.draft + 1 };
    if (status === 'completed') return { ...summary, completed: summary.completed + 1 };
    if (status === 'send_failed') return { ...summary, failed: summary.failed + 1 };
    if (status === 'canceled') return { ...summary, canceled: summary.canceled + 1 };
    return { ...summary, inProgress: summary.inProgress + 1 };
}

export function summarizeElectronicContractUsage(
    companies: readonly ElectronicContractUsageCompany[],
    contracts: readonly ElectronicContractUsageRow[]
): readonly ElectronicContractUsageSummary[] {
    const summaries = new Map<string, ElectronicContractUsageSummary>();
    for (const company of companies) {
        summaries.set(company.id, createEmptySummary(company.id, company.name || '회사명 없음'));
    }

    for (const contract of contracts) {
        const companyId = contract.company_id || 'unassigned';
        const currentSummary = summaries.get(companyId)
            || createEmptySummary(companyId, '회사 미지정');
        const nextSummary = incrementStatus({
            ...currentSummary,
            total: currentSummary.total + 1,
            recentSentAt: maxIsoDate(currentSummary.recentSentAt, contract.sent_at || contract.created_at),
            recentCompletedAt: maxIsoDate(currentSummary.recentCompletedAt, contract.completed_at)
        }, contract.status);
        summaries.set(companyId, nextSummary);
    }

    return [...summaries.values()].sort((left, right) => {
        if (right.total !== left.total) return right.total - left.total;
        return left.companyName.localeCompare(right.companyName, 'ko-KR');
    });
}
