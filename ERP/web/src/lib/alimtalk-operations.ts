export const ALIMTALK_TEMPLATE_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'paused'] as const;
export type AlimtalkTemplateStatus = typeof ALIMTALK_TEMPLATE_STATUSES[number];

export const ALIMTALK_SEND_STATUSES = ['success', 'failed', 'blocked', 'fallback_sms'] as const;
export type AlimtalkSendStatus = typeof ALIMTALK_SEND_STATUSES[number];

export type AlimtalkCompanyRow = {
    readonly id: string;
    readonly name: string | null;
};

export type AlimtalkTemplateRow = {
    readonly template_key: string;
    readonly name: string;
    readonly template_id: string;
    readonly channel_id: string;
    readonly status: string;
    readonly enabled: boolean;
    readonly content: string;
    readonly variables: readonly string[] | null;
    readonly review_note: string;
    readonly updated_at: string;
};

export type AlimtalkScenarioRow = {
    readonly scenario_key: string;
    readonly template_key: string;
    readonly name: string;
    readonly trigger_label: string;
    readonly recipient_label: string;
    readonly enabled: boolean;
    readonly fallback_channel: string;
    readonly memo: string;
    readonly updated_at: string;
};

export type AlimtalkCompanySettingRow = {
    readonly company_id: string;
    readonly enabled: boolean;
    readonly monthly_limit: number | null;
    readonly warning_threshold: number | null;
};

export type AlimtalkSendLogRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly scenario_key: string;
    readonly template_key: string;
    readonly recipient_name: string;
    readonly recipient_phone: string;
    readonly status: AlimtalkSendStatus | string;
    readonly error_message: string;
    readonly sent_at: string;
};

export type AlimtalkCompanyUsageSummary = {
    readonly companyId: string;
    readonly companyName: string;
    readonly enabled: boolean;
    readonly monthlyLimit: number | null;
    readonly warningThreshold: number | null;
    readonly total: number;
    readonly success: number;
    readonly failed: number;
    readonly blocked: number;
    readonly fallbackSms: number;
    readonly recentSentAt: string;
};

export type AlimtalkOperationsOverview = {
    readonly scenarioCount: number;
    readonly enabledScenarioCount: number;
    readonly approvedTemplateCount: number;
    readonly enabledCompanyCount: number;
    readonly monthlySendCount: number;
    readonly monthlyFailedCount: number;
};

export type AlimtalkOperationsSummary = {
    readonly overview: AlimtalkOperationsOverview;
    readonly companyUsage: readonly AlimtalkCompanyUsageSummary[];
};

function maxIsoDate(currentValue: string, candidateValue: string): string {
    if (!candidateValue) return currentValue;
    if (!currentValue) return candidateValue;
    return candidateValue > currentValue ? candidateValue : currentValue;
}

function isCurrentMonth(value: string, now: Date): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

function emptyUsage(
    company: AlimtalkCompanyRow,
    setting: AlimtalkCompanySettingRow | undefined
): AlimtalkCompanyUsageSummary {
    return {
        companyId: company.id,
        companyName: company.name || '회사명 없음',
        enabled: setting?.enabled ?? true,
        monthlyLimit: setting?.monthly_limit ?? null,
        warningThreshold: setting?.warning_threshold ?? null,
        total: 0,
        success: 0,
        failed: 0,
        blocked: 0,
        fallbackSms: 0,
        recentSentAt: ''
    };
}

function incrementUsage(
    usage: AlimtalkCompanyUsageSummary,
    log: AlimtalkSendLogRow
): AlimtalkCompanyUsageSummary {
    return {
        ...usage,
        total: usage.total + 1,
        success: usage.success + (log.status === 'success' ? 1 : 0),
        failed: usage.failed + (log.status === 'failed' ? 1 : 0),
        blocked: usage.blocked + (log.status === 'blocked' ? 1 : 0),
        fallbackSms: usage.fallbackSms + (log.status === 'fallback_sms' ? 1 : 0),
        recentSentAt: maxIsoDate(usage.recentSentAt, log.sent_at)
    };
}

export function summarizeAlimtalkOperations(input: {
    readonly companies: readonly AlimtalkCompanyRow[];
    readonly templates: readonly AlimtalkTemplateRow[];
    readonly scenarios: readonly AlimtalkScenarioRow[];
    readonly companySettings: readonly AlimtalkCompanySettingRow[];
    readonly sendLogs: readonly AlimtalkSendLogRow[];
    readonly now?: Date;
}): AlimtalkOperationsSummary {
    const now = input.now ?? new Date();
    const settingByCompany = new Map(input.companySettings.map(setting => [setting.company_id, setting]));
    const usageByCompany = new Map<string, AlimtalkCompanyUsageSummary>();

    for (const company of input.companies) {
        usageByCompany.set(company.id, emptyUsage(company, settingByCompany.get(company.id)));
    }

    for (const log of input.sendLogs) {
        if (!log.company_id || !isCurrentMonth(log.sent_at, now)) continue;
        const company = input.companies.find(item => item.id === log.company_id) || {
            id: log.company_id,
            name: '회사명 없음'
        };
        const currentUsage = usageByCompany.get(company.id) || emptyUsage(company, settingByCompany.get(company.id));
        usageByCompany.set(company.id, incrementUsage(currentUsage, log));
    }

    const companyUsage = [...usageByCompany.values()].sort((left, right) => {
        if (right.total !== left.total) return right.total - left.total;
        return left.companyName.localeCompare(right.companyName, 'ko-KR');
    });

    return {
        overview: {
            scenarioCount: input.scenarios.length,
            enabledScenarioCount: input.scenarios.filter(scenario => scenario.enabled).length,
            approvedTemplateCount: input.templates.filter(template => template.status === 'approved').length,
            enabledCompanyCount: companyUsage.filter(company => company.enabled).length,
            monthlySendCount: companyUsage.reduce((sum, company) => sum + company.total, 0),
            monthlyFailedCount: companyUsage.reduce((sum, company) => sum + company.failed, 0)
        },
        companyUsage
    };
}

export function parseAlimtalkTemplateStatus(value: string): AlimtalkTemplateStatus {
    switch (value) {
        case 'draft':
        case 'approved':
        case 'rejected':
        case 'paused':
            return value;
        default:
            return 'submitted';
    }
}
