import type { SupabaseClient } from '@supabase/supabase-js';
import { formatAlimtalkDate, sendAlimtalkNotification } from './alimtalk-send';
import { getSolapiNotificationConfig } from './solapi-notifications';

type ManagerRecipientRow = {
    readonly id: string;
    readonly name: string | null;
    readonly phone: string | null;
    readonly phone_normalized: string | null;
};

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function roleLabel(role: string): string {
    if (role === 'manager') return '팀장';
    if (role === 'sub_manager') return '매니저';
    if (role === 'staff') return '직원';
    if (role === 'partner_vendor') return '협력업체';
    return role || '회원';
}

export function buildSignupRequestAlimtalkVariables(input: {
    readonly applicantName: string;
    readonly companyName: string;
    readonly requestedRole: string;
    readonly requestedAt: Date;
}): Record<string, string> {
    return {
        가입유형: roleLabel(input.requestedRole),
        회사명: input.companyName,
        신청자명: input.applicantName,
        요청일: formatAlimtalkDate(input.requestedAt)
    };
}

export function buildSignupApprovedAlimtalkVariables(input: {
    readonly approvedAt: Date;
    readonly companyName: string;
    readonly name: string;
}): Record<string, string> {
    const name = input.name || '회원';
    return {
        승인일: formatAlimtalkDate(input.approvedAt),
        회사명: input.companyName,
        신청자명: name,
        회원명: name
    };
}

export function shouldRouteSignupRequestToCompanyManager(input: {
    readonly companyManagerId: string | null;
    readonly requestedRole: string;
}): boolean {
    return input.requestedRole !== 'manager' && Boolean(cleanString(input.companyManagerId));
}

async function fetchCompanyManagerRecipient(
    supabaseAdmin: SupabaseClient,
    companyId: string
): Promise<ManagerRecipientRow | null> {
    const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('manager_id')
        .eq('id', companyId)
        .maybeSingle<{ readonly manager_id: string | null }>();
    if (companyError) throw companyError;
    if (!company?.manager_id) return null;

    const { data: manager, error: managerError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, phone, phone_normalized')
        .eq('id', company.manager_id)
        .maybeSingle<ManagerRecipientRow>();
    if (managerError) throw managerError;
    return manager || null;
}

export async function notifyAlimtalkSignupRequest(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly companyId: string;
    readonly companyName: string;
    readonly applicantName: string;
    readonly requestedRole: string;
    readonly sourceId: string;
}): Promise<void> {
    const variables = buildSignupRequestAlimtalkVariables({
        applicantName: input.applicantName,
        companyName: input.companyName,
        requestedAt: new Date(),
        requestedRole: input.requestedRole
    });
    const manager = await fetchCompanyManagerRecipient(input.supabaseAdmin, input.companyId);

    if (manager && shouldRouteSignupRequestToCompanyManager({
        companyManagerId: manager.id,
        requestedRole: input.requestedRole
    })) {
        await sendAlimtalkNotification(input.supabaseAdmin, {
            companyId: input.companyId,
            recipient: {
                name: manager.name || '팀장',
                phone: manager.phone_normalized || manager.phone,
                profileId: manager.id
            },
            scenarioKey: 'signup_request',
            sourceId: input.sourceId,
            sourceType: 'signup-request',
            variables
        });
        return;
    }

    const config = getSolapiNotificationConfig();
    if (!('adminAlertPhones' in config)) return;
    await Promise.all(config.adminAlertPhones.map((phone: string) => sendAlimtalkNotification(input.supabaseAdmin, {
        companyId: input.companyId,
        recipient: { name: '관리자', phone },
        scenarioKey: 'signup_request',
        sourceId: input.sourceId,
        sourceType: 'signup-request',
        variables
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
        variables: buildSignupApprovedAlimtalkVariables({
            approvedAt: new Date(),
            companyName: input.companyName,
            name: input.name
        })
    });
}
