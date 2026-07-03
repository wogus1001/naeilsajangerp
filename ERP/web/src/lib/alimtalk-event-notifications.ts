import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAlimtalkNotification, formatAlimtalkDate, type AlimtalkScenarioKey } from './alimtalk-send';
import type { FranchiseNotificationCandidate } from './franchise-notifications';

type ProfileRecipientRow = {
    readonly id: string;
    readonly name: string | null;
    readonly phone: string | null;
    readonly phone_normalized: string | null;
};

type CompanyNameRow = {
    readonly name: string | null;
    readonly manager_id: string | null;
};

type LeadDisclosureRow = {
    readonly id: string;
    readonly company_id: string;
    readonly lead_id: string;
    readonly recipient_name: string | null;
    readonly document_title: string | null;
    readonly confirmed_at: string | null;
    readonly data?: unknown;
};

type LeadDisclosureEmailSentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly lead_id: string;
    readonly recipient_name: string | null;
    readonly recipient_phone: string | null;
    readonly brand_name: string | null;
};

type LeadManagerRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly interested_brand: string | null;
};

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
    return [...new Set(values.map(cleanString).filter(Boolean))];
}

function readRecordValue(value: unknown, key: string): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    return cleanString((value as Record<string, unknown>)[key]);
}

export function buildDisclosureEmailSentAlimtalkVariables(input: {
    readonly candidateName: string | null | undefined;
    readonly brandName: string | null | undefined;
}): Record<string, string> {
    return {
        브랜드명: cleanString(input.brandName) || '-',
        후보자명: cleanString(input.candidateName) || '예비 창업자'
    };
}

export function buildDisclosureConfirmedAlimtalkVariables(input: {
    readonly candidateName: string | null | undefined;
    readonly brandName: string | null | undefined;
    readonly confirmedAt: string | Date | null | undefined;
}): Record<string, string> {
    return {
        브랜드명: cleanString(input.brandName) || '-',
        수령일: formatAlimtalkDate(input.confirmedAt || new Date()),
        예비창업자명: cleanString(input.candidateName) || '예비 창업자'
    };
}

async function fetchCompanyMeta(
    supabaseAdmin: SupabaseClient,
    companyId: string | null
): Promise<{ readonly name: string; readonly managerId: string | null }> {
    if (!companyId) return { managerId: null, name: '' };
    const { data, error } = await supabaseAdmin
        .from('companies')
        .select('name, manager_id')
        .eq('id', companyId)
        .maybeSingle<CompanyNameRow>();
    if (error) throw error;
    return { managerId: data?.manager_id || null, name: data?.name || '' };
}

async function fetchProfilesByIds(
    supabaseAdmin: SupabaseClient,
    profileIds: readonly (string | null | undefined)[]
): Promise<readonly ProfileRecipientRow[]> {
    const ids = uniqueStrings(profileIds);
    if (ids.length === 0) return [];
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, phone, phone_normalized')
        .in('id', ids)
        .returns<ProfileRecipientRow[]>();
    if (error) throw error;
    return data || [];
}

export async function notifyAlimtalkDisclosureEmailSent(
    supabaseAdmin: SupabaseClient,
    delivery: LeadDisclosureEmailSentRow
): Promise<void> {
    const company = await fetchCompanyMeta(supabaseAdmin, delivery.company_id);
    await sendAlimtalkNotification(supabaseAdmin, {
        companyId: delivery.company_id,
        recipient: {
            name: delivery.recipient_name || '예비 창업자',
            phone: delivery.recipient_phone,
            profileId: null
        },
        scenarioKey: 'disclosure_email_sent',
        sourceId: delivery.id,
        sourceType: 'disclosure-email-sent',
        variables: buildDisclosureEmailSentAlimtalkVariables({
            brandName: delivery.brand_name || company.name,
            candidateName: delivery.recipient_name
        })
    });
}

async function notifyProfileRecipients(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly scenarioKey: AlimtalkScenarioKey;
    readonly companyId: string | null;
    readonly profileIds: readonly (string | null | undefined)[];
    readonly variables: Readonly<Record<string, string>>;
    readonly sourceType: string;
    readonly sourceId: string;
}): Promise<void> {
    const recipients = await fetchProfilesByIds(input.supabaseAdmin, input.profileIds);
    await Promise.all(recipients.map(recipient => sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: {
            name: recipient.name || '담당자',
            phone: recipient.phone_normalized || recipient.phone,
            profileId: recipient.id
        },
        scenarioKey: input.scenarioKey,
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        variables: {
            ...input.variables,
            담당자명: input.variables.담당자명 || recipient.name || '담당자'
        }
    })));
}

export async function notifyAlimtalkDisclosureConfirmed(
    supabaseAdmin: SupabaseClient,
    delivery: LeadDisclosureRow
): Promise<void> {
    const { data: lead, error: leadError } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, name, interested_brand')
        .eq('id', delivery.lead_id)
        .maybeSingle<LeadManagerRow>();
    if (leadError) throw leadError;
    if (!lead) return;

    const company = await fetchCompanyMeta(supabaseAdmin, delivery.company_id);
    const storedBrandName = readRecordValue(delivery.data, 'brandName');
    await notifyProfileRecipients({
        companyId: delivery.company_id,
        profileIds: [lead.manager_id, company.managerId],
        scenarioKey: 'disclosure_confirmed',
        sourceId: delivery.id,
        sourceType: 'disclosure-confirmed',
        supabaseAdmin,
        variables: buildDisclosureConfirmedAlimtalkVariables({
            brandName: storedBrandName || lead.interested_brand || company.name,
            candidateName: delivery.recipient_name || lead.name,
            confirmedAt: delivery.confirmed_at || new Date()
        })
    });
}

function scenarioForCandidate(candidate: FranchiseNotificationCandidate): AlimtalkScenarioKey | null {
    if (candidate.sourceType === 'disclosure-eligible') return 'franchise_contract_eligible';
    if (candidate.sourceType === 'vendor-contract-due') return 'vendor_contract_due';
    return null;
}

export function buildAlimtalkVariablesForCandidate(
    candidate: FranchiseNotificationCandidate,
    companyName: string
): Record<string, string> {
    if (candidate.sourceType === 'vendor-contract-due') {
        const remainingDays = cleanString(candidate.data.remainingDays) || '-';
        return {
            계약명: cleanString(candidate.data.contractTitle) || '업체 계약',
            만료일: formatAlimtalkDate(candidate.dueAt),
            남은기간: remainingDays === '-' ? '-' : `D-${remainingDays}`,
            남은일수: remainingDays,
            업체명: cleanString(candidate.data.vendorName) || '업체'
        };
    }
    return {
        가능일: formatAlimtalkDate(candidate.dueAt),
        브랜드명: companyName || '-',
        예비창업자명: cleanString(candidate.data.leadName) || '예비 창업자'
    };
}

export async function notifyAlimtalkFranchiseNotificationCandidates(
    supabaseAdmin: SupabaseClient,
    candidates: readonly FranchiseNotificationCandidate[]
): Promise<void> {
    const actionableCandidates = candidates
        .map(candidate => ({ candidate, scenarioKey: scenarioForCandidate(candidate) }))
        .filter((item): item is { readonly candidate: FranchiseNotificationCandidate; readonly scenarioKey: AlimtalkScenarioKey } => Boolean(item.scenarioKey));
    if (actionableCandidates.length === 0) return;

    const companyNames = new Map<string, string>();
    const companyIds = uniqueStrings(actionableCandidates.map(item => item.candidate.companyId));
    if (companyIds.length > 0) {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .in('id', companyIds)
            .returns<{ readonly id: string; readonly name: string | null }[]>();
        if (error) throw error;
        for (const company of data || []) companyNames.set(company.id, company.name || '');
    }

    await Promise.all(actionableCandidates.map(item => notifyProfileRecipients({
        companyId: item.candidate.companyId,
        profileIds: [item.candidate.recipientProfileId],
        scenarioKey: item.scenarioKey,
        sourceId: item.candidate.sourceId,
        sourceType: item.candidate.sourceType,
        supabaseAdmin,
        variables: buildAlimtalkVariablesForCandidate(item.candidate, companyNames.get(item.candidate.companyId) || '')
    })));
}
