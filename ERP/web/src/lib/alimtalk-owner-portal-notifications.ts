import type { SupabaseClient } from '@supabase/supabase-js';
import { formatAlimtalkDate, sendAlimtalkNotification } from './alimtalk-send';
import { normalizeSolapiPhone } from './solapi-notifications';

type OwnerAccountRecipientRow = {
    readonly id: string;
    readonly location_id: string;
    readonly owner_name: string | null;
    readonly owner_phone: string | null;
};

type StaffRecipientRow = {
    readonly id: string;
    readonly name: string | null;
    readonly phone: string | null;
    readonly phone_normalized: string | null;
};

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function uniqueRecipientsByPhone<T extends { readonly id: string; readonly phone: string | null | undefined }>(recipients: readonly T[]): readonly T[] {
    const seenPhones = new Set<string>();
    return recipients.filter(recipient => {
        const phone = normalizeSolapiPhone(recipient.phone);
        if (!phone) return true;
        if (seenPhones.has(phone)) return false;
        seenPhones.add(phone);
        return true;
    });
}

async function fetchCompanyName(supabaseAdmin: SupabaseClient, companyId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .maybeSingle<{ readonly name: string | null }>();
    if (error) throw error;
    return data?.name || '';
}

async function fetchNoticeRecipients(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly companyId: string;
    readonly locationId: string | null;
}): Promise<readonly OwnerAccountRecipientRow[]> {
    let query = input.supabaseAdmin
        .from('franchise_owner_accounts')
        .select('id, location_id, owner_name, owner_phone')
        .eq('company_id', input.companyId)
        .eq('status', 'active');
    if (input.locationId) query = query.eq('location_id', input.locationId);
    const { data, error } = await query.returns<OwnerAccountRecipientRow[]>();
    if (error) throw error;
    return uniqueRecipientsByPhone((data || []).map(account => ({
        ...account,
        phone: account.owner_phone
    })));
}

async function fetchInternalRecipients(supabaseAdmin: SupabaseClient, companyId: string): Promise<readonly StaffRecipientRow[]> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, phone, phone_normalized')
        .eq('company_id', companyId)
        .in('role', ['manager', 'sub_manager'])
        .eq('status', 'active')
        .returns<StaffRecipientRow[]>();
    if (error) throw error;
    return uniqueRecipientsByPhone((data || []).map(profile => ({
        ...profile,
        phone: profile.phone_normalized || profile.phone
    })));
}

export function buildOwnerNoticePublishedAlimtalkVariables(input: {
    readonly brandName: string | null | undefined;
    readonly noticeTitle: string;
    readonly publishedAt: string | Date | null | undefined;
}): Record<string, string> {
    return {
        공지제목: cleanString(input.noticeTitle) || '공지/공문',
        발행일: formatAlimtalkDate(input.publishedAt || new Date()),
        브랜드명: cleanString(input.brandName) || '브랜드'
    };
}

export function buildOwnerFacilityRequestAlimtalkVariables(input: {
    readonly locationName: string | null | undefined;
    readonly ownerName: string | null | undefined;
    readonly requestTitle: string;
    readonly submittedAt: string | Date | null | undefined;
}): Record<string, string> {
    return {
        매장명: cleanString(input.locationName) || '운영점',
        문의제목: cleanString(input.requestTitle) || '시설/고장 문의',
        접수일: formatAlimtalkDate(input.submittedAt || new Date()),
        점주명: cleanString(input.ownerName) || '점주'
    };
}

export function buildOwnerAccountCreatedAlimtalkVariables(input: {
    readonly loginId: string;
    readonly temporaryPassword: string;
}): Record<string, string> {
    return {
        임시비밀번호: input.temporaryPassword,
        점주아이디: input.loginId
    };
}

export function buildOwnerAccountCreatedAlimtalkLogVariables(input: {
    readonly loginId: string;
}): Record<string, string> {
    return {
        임시비밀번호: '[마스킹]',
        점주아이디: input.loginId
    };
}

export async function notifyOwnerNoticePublished(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly companyId: string;
    readonly locationId: string | null;
    readonly noticeId: string;
    readonly noticeTitle: string;
    readonly publishedAt: string | Date | null | undefined;
}): Promise<void> {
    const [companyName, recipients] = await Promise.all([
        fetchCompanyName(input.supabaseAdmin, input.companyId),
        fetchNoticeRecipients(input)
    ]);
    const variables = buildOwnerNoticePublishedAlimtalkVariables({
        brandName: companyName,
        noticeTitle: input.noticeTitle,
        publishedAt: input.publishedAt
    });
    await Promise.all(recipients.map(recipient => sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: {
            name: recipient.owner_name || '점주',
            phone: recipient.owner_phone,
            profileId: null
        },
        scenarioKey: 'owner_notice_published',
        sourceId: input.noticeId,
        sourceType: 'owner-notice-published',
        variables
    })));
}

export async function notifyOwnerFacilityRequestCreated(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly companyId: string;
    readonly locationName: string | null | undefined;
    readonly ownerName: string | null | undefined;
    readonly requestTitle: string;
    readonly sourceId: string;
    readonly sourceType?: 'owner-facility-request-created' | 'owner-facility-request-resubmitted';
    readonly submittedAt: string | Date | null | undefined;
}): Promise<void> {
    const recipients = await fetchInternalRecipients(input.supabaseAdmin, input.companyId);
    const variables = buildOwnerFacilityRequestAlimtalkVariables(input);
    await Promise.all(recipients.map(recipient => sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: {
            name: recipient.name || '담당자',
            phone: recipient.phone_normalized || recipient.phone,
            profileId: recipient.id
        },
        scenarioKey: 'owner_facility_request_created',
        sourceId: input.sourceId,
        sourceType: input.sourceType || 'owner-facility-request-created',
        variables: {
            ...variables,
            담당자명: recipient.name || '담당자'
        }
    })));
}

export async function notifyOwnerAccountCreated(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly accountId: string;
    readonly companyId: string;
    readonly loginId: string;
    readonly ownerName: string | null | undefined;
    readonly ownerPhone: string | null | undefined;
    readonly temporaryPassword: string;
    readonly issuedAt?: string | Date | null;
}): Promise<void> {
    const sourceIdSuffix = input.issuedAt ? `:${input.issuedAt instanceof Date ? input.issuedAt.toISOString() : input.issuedAt}` : '';
    await sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: {
            name: cleanString(input.ownerName) || '점주',
            phone: input.ownerPhone,
            profileId: null
        },
        logVariables: buildOwnerAccountCreatedAlimtalkLogVariables({
            loginId: input.loginId
        }),
        requiresMobileRecipient: true,
        scenarioKey: 'owner_account_created',
        sourceId: `${input.accountId}${sourceIdSuffix}`,
        sourceType: 'owner-account-created',
        variables: buildOwnerAccountCreatedAlimtalkVariables({
            loginId: input.loginId,
            temporaryPassword: input.temporaryPassword
        })
    });
}

export async function safelyNotifyOwnerPortalAlimtalk(work: () => Promise<void>, label: string): Promise<void> {
    try {
        await work();
    } catch (error) {
        console.warn(`${label} AlimTalk notification skipped:`, error instanceof Error ? error.message : String(error));
    }
}
