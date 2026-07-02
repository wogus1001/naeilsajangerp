import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAlimtalkNotification, formatAlimtalkDate, type AlimtalkScenarioKey } from './alimtalk-send';
import { getSolapiNotificationConfig } from './solapi-notifications';
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

function roleLabel(role: string): string {
    if (role === 'manager') return '팀장';
    if (role === 'staff') return '직원';
    if (role === 'partner_vendor') return '협력업체';
    return role || '회원';
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
    return [...new Set(values.map(cleanString).filter(Boolean))];
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
        variables: input.variables
    })));
}

export async function notifyAlimtalkSignupRequest(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly companyId: string;
    readonly companyName: string;
    readonly applicantName: string;
    readonly requestedRole: string;
    readonly sourceId: string;
}): Promise<void> {
    const config = getSolapiNotificationConfig();
    if (!('adminAlertPhones' in config)) return;
    await Promise.all(config.adminAlertPhones.map((phone: string) => sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: { name: '관리자', phone },
        scenarioKey: 'signup_request',
        sourceId: input.sourceId,
        sourceType: 'signup-request',
        variables: {
            가입유형: roleLabel(input.requestedRole),
            회사명: input.companyName,
            신청자명: input.applicantName,
            요청일: formatAlimtalkDate(new Date())
        }
    })));
}

export async function notifyAlimtalkSignupApproved(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly companyId: string | null;
    readonly companyName: string;
    readonly profileId: string;
    readonly name: string;
    readonly phone: string | null;
}): Promise<void> {
    await sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: { name: input.name || '회원', phone: input.phone, profileId: input.profileId },
        scenarioKey: 'signup_approved',
        sourceId: input.profileId,
        sourceType: 'signup-approved',
        variables: {
            승인일: formatAlimtalkDate(new Date()),
            회사명: input.companyName,
            회원명: input.name || '회원'
        }
    });
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
    await notifyProfileRecipients({
        companyId: delivery.company_id,
        profileIds: [lead.manager_id, company.managerId],
        scenarioKey: 'disclosure_confirmed',
        sourceId: delivery.id,
        sourceType: 'disclosure-confirmed',
        supabaseAdmin,
        variables: {
            브랜드명: lead.interested_brand || company.name || '-',
            수령일: formatAlimtalkDate(delivery.confirmed_at || new Date()),
            예비창업자명: delivery.recipient_name || lead.name || '예비 창업자'
        }
    });
}

function scenarioForCandidate(candidate: FranchiseNotificationCandidate): AlimtalkScenarioKey | null {
    if (candidate.sourceType === 'disclosure-eligible') return 'franchise_contract_eligible';
    if (candidate.sourceType === 'vendor-contract-due') return 'vendor_contract_due';
    return null;
}

function variablesForCandidate(candidate: FranchiseNotificationCandidate, companyName: string): Record<string, string> {
    if (candidate.sourceType === 'vendor-contract-due') {
        return {
            계약명: cleanString(candidate.data.contractTitle) || '업체 계약',
            만료일: formatAlimtalkDate(candidate.dueAt),
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
        variables: variablesForCandidate(item.candidate, companyNames.get(item.candidate.companyId) || '')
    })));
}
