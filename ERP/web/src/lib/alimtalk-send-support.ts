export const ALIMTALK_SCENARIO_KEYS = [
    'signup_request',
    'signup_approved',
    'disclosure_email_sent',
    'disclosure_confirmed',
    'franchise_contract_eligible',
    'vendor_contract_due',
    'supervision_visit_due',
    'supervision_report_missing',
    'supervision_report_reviewed',
    'supervision_corrective_action_due',
    'owner_notice_published',
    'owner_facility_request_created',
    'owner_account_created'
] as const;

export type AlimtalkScenarioKey = typeof ALIMTALK_SCENARIO_KEYS[number];

export type AlimtalkRecipient = {
    readonly profileId?: string | null;
    readonly name: string;
    readonly phone: string | null | undefined;
};

export type AlimtalkSendInput = {
    readonly scenarioKey: AlimtalkScenarioKey;
    readonly companyId: string | null;
    readonly recipient: AlimtalkRecipient;
    readonly variables: Readonly<Record<string, string>>;
    readonly logVariables?: Readonly<Record<string, string>>;
    readonly sourceType: string;
    readonly sourceId: string;
    readonly requiresMobileRecipient?: boolean;
    readonly now?: Date;
};

export type AlimtalkTemplateConfigRow = {
    readonly template_key: string;
    readonly template_id: string;
    readonly channel_id: string;
    readonly status: string;
    readonly enabled: boolean;
};

export type AlimtalkScenarioConfigRow = {
    readonly scenario_key: string;
    readonly template_key: string;
    readonly enabled: boolean;
    readonly fallback_channel: string;
};

export type AlimtalkCompanySettingConfigRow = {
    readonly enabled: boolean;
    readonly monthly_limit: number | null;
};

export type AlimtalkSendStatus = 'success' | 'failed' | 'blocked' | 'fallback_sms';

export type AlimtalkSendResult = {
    readonly status: AlimtalkSendStatus | 'skipped';
    readonly reason: string;
};

const MIN_PHONE_LENGTH = 9;

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isMissingAlimtalkSchemaError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = typeof error.code === 'string' ? error.code : '';
    const message = typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /alimtalk_/i.test(message);
}

export function toMonthStartIso(now: Date): string {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function toVariableKey(key: string): string {
    const cleanKey = cleanString(key);
    if (cleanKey.startsWith('#{') && cleanKey.endsWith('}')) return cleanKey;
    return `#{${cleanKey}}`;
}

export function buildAlimtalkVariables(input: Readonly<Record<string, string>>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(input)
            .map(([key, value]) => [toVariableKey(key), String(value ?? '')])
            .filter(([key]) => key !== '#{}')
    );
}

export function buildAlimtalkLogVariables(input: AlimtalkSendInput): Record<string, string> {
    return buildAlimtalkVariables(input.logVariables ?? input.variables);
}

export function isFinalAlimtalkSendStatus(status: string): boolean {
    return status === 'success' || status === 'fallback_sms';
}

export function formatAlimtalkDate(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function isKoreanMobileRecipientPhone(value: string): boolean {
    return /^(010\d{8}|01[1-9]\d{7,8})$/.test(value);
}

export function resolveAlimtalkBlockReason(input: {
    readonly scenario: AlimtalkScenarioConfigRow;
    readonly template: AlimtalkTemplateConfigRow;
    readonly companySetting: AlimtalkCompanySettingConfigRow | null;
    readonly monthlySendCount: number;
    readonly recipientPhone: string;
    readonly providerEnabled: boolean;
    readonly requiresMobileRecipient?: boolean;
}): string | null {
    if (!input.providerEnabled) return 'Solapi provider is disabled or missing config';
    if (input.recipientPhone.length < MIN_PHONE_LENGTH) return 'recipient phone is missing';
    if (input.requiresMobileRecipient && !isKoreanMobileRecipientPhone(input.recipientPhone)) return 'recipient phone must be a mobile number';
    if (!input.scenario.enabled) return 'scenario is disabled';
    if (input.template.status !== 'approved') return 'template is not approved';
    if (!input.template.enabled) return 'template is disabled';
    if (!input.template.template_id || !input.template.channel_id) return 'template id or channel id is missing';
    if (input.companySetting && !input.companySetting.enabled) return 'company AlimTalk is disabled';
    if (input.companySetting?.monthly_limit !== null && input.companySetting?.monthly_limit !== undefined) {
        if (input.monthlySendCount >= input.companySetting.monthly_limit) return 'company monthly limit reached';
    }
    return null;
}
