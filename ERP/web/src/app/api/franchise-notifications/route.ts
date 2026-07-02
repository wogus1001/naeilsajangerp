import { getAuthenticatedRequesterProfile, isAdmin, resolveCompanyIdByName } from '@/lib/api-auth';
import { notifyAlimtalkFranchiseNotificationCandidates } from '@/lib/alimtalk-event-notifications';
import { fail, ok } from '@/lib/api-response';
import { isPartnerVendorRole } from '@/lib/franchise-location-access';
import { attachDisclosureSummariesToLeads } from '@/lib/franchise-lead-disclosure-summary';
import { canDispatchFranchiseNotificationAlimtalk } from '@/lib/franchise-notification-alimtalk-scope';
import {
    FRANCHISE_NOTIFICATION_SOURCE_TYPES,
    buildAutomaticFranchiseNotifications,
    transformFranchiseNotification,
    type FranchiseNotificationCandidate,
    type FranchiseNotificationRow,
    type NotificationLead
} from '@/lib/franchise-notifications';
import {
    buildVendorContractNotifications,
    type VendorContractNotificationContract,
    type VendorContractNotificationRecipient
} from '@/lib/franchise-vendor-contract-notifications';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type LeadNotificationRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly created_by: string | null;
    readonly name: string | null;
    readonly status: string | null;
    readonly grade: string | null;
    readonly next_contact_at: string | null;
};

type NotificationUpdateBody = {
    readonly notificationId?: unknown;
    readonly id?: unknown;
    readonly markAllRead?: unknown;
};

type ExistingNotificationRow = { readonly id: string; readonly source_id: string };
type VendorContractNotificationRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly owner_profile_id: string | null;
    readonly vendor_name: string | null;
    readonly contract_title: string | null;
    readonly contract_end_date: string | null;
    readonly status: string | null;
};
type NotificationRecipientProfileRow = {
    readonly id: string;
    readonly company_id: string | null;
};

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function parseLimit(value: string | null): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 12;
    return Math.min(Math.floor(parsed), 50);
}

function isMissingNotificationSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_notifications/i.test(message);
}

function isMissingVendorContractSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_vendor_contracts/i.test(message);
}

function mapLeadRow(row: LeadNotificationRow): NotificationLead {
    return {
        id: row.id,
        companyId: row.company_id,
        managerId: row.manager_id,
        name: row.name || '가맹 희망자',
        status: row.status || '',
        grade: row.grade || '',
        nextContactAt: row.next_contact_at
    };
}

function toNotificationPayload(candidate: FranchiseNotificationCandidate) {
    const now = new Date().toISOString();
    return {
        company_id: candidate.companyId,
        recipient_profile_id: candidate.recipientProfileId,
        source_type: candidate.sourceType,
        source_id: candidate.sourceId,
        lead_id: candidate.leadId,
        severity: candidate.severity,
        title: candidate.title,
        body: candidate.body,
        action_url: candidate.actionUrl,
        due_at: candidate.dueAt,
        delivery_channel: 'in_app',
        kakao_template_key: '',
        data: candidate.data,
        updated_at: now
    };
}

async function readBody(request: Request): Promise<NotificationUpdateBody> {
    try {
        const body: unknown = await request.json();
        return typeof body === 'object' && body !== null && !Array.isArray(body) ? body : {};
    } catch {
        return {};
    }
}

async function fetchNotificationLeads(
    companyId: string | null,
    requesterId: string,
    requesterIsAdmin: boolean,
    requesterRole: string | null | undefined
): Promise<readonly NotificationLead[]> {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by, name, status, grade, next_contact_at')
        .neq('status', '보류/이탈')
        .limit(500);

    if (companyId) {
        query = query.eq('company_id', companyId);
    }
    if (isPartnerVendorRole(requesterRole)) {
        query = query.eq('created_by', requesterId);
    } else if (!requesterIsAdmin) {
        query = query.eq('manager_id', requesterId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const leads = ((data || []) as LeadNotificationRow[]).map(mapLeadRow);
    return attachDisclosureSummariesToLeads(supabaseAdmin, leads);
}

async function fetchVendorContractsForNotifications(
    companyId: string | null,
    requesterIsAdmin: boolean
): Promise<readonly VendorContractNotificationContract[]> {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
        .from('franchise_vendor_contracts')
        .select('id, company_id, owner_profile_id, vendor_name, contract_title, contract_end_date, status')
        .neq('status', 'archived')
        .limit(500);

    if (companyId) query = query.eq('company_id', companyId);
    if (!companyId && !requesterIsAdmin) return [];

    const { data, error } = await query.returns<VendorContractNotificationRow[]>();
    if (error) {
        if (isMissingVendorContractSchemaError(error)) return [];
        throw error;
    }

    return (data || []).map(row => ({
        companyId: row.company_id,
        contractEndDate: row.contract_end_date,
        contractTitle: row.contract_title || '업체 계약',
        id: row.id,
        ownerProfileId: row.owner_profile_id,
        status: row.status || 'active',
        vendorName: row.vendor_name || '업체'
    }));
}

async function fetchVendorContractNotificationRecipients(
    companyId: string | null,
    requesterId: string,
    requesterIsAdmin: boolean,
    contracts: readonly VendorContractNotificationContract[]
): Promise<readonly VendorContractNotificationRecipient[]> {
    const supabaseAdmin = getSupabaseAdmin();
    const ownerProfileIds = [...new Set(contracts.map(contract => cleanString(contract.ownerProfileId)).filter(Boolean))];
    let query = supabaseAdmin
        .from('profiles')
        .select('id, company_id')
        .in('role', ['manager'])
        .eq('status', 'active')
        .limit(500);

    if (companyId) query = query.eq('company_id', companyId);
    if (!companyId && !requesterIsAdmin) query = query.eq('id', requesterId);

    const { data, error } = await query.returns<NotificationRecipientProfileRow[]>();
    if (error) throw error;

    const { data: owners, error: ownerError } = ownerProfileIds.length > 0
        ? await supabaseAdmin
            .from('profiles')
            .select('id, company_id')
            .in('id', ownerProfileIds)
            .eq('status', 'active')
            .returns<NotificationRecipientProfileRow[]>()
        : { data: [], error: null };
    if (ownerError) throw ownerError;

    const recipients = [...(data || []), ...(owners || [])]
        .filter(row => row.company_id)
        .map(row => ({
            companyId: row.company_id || '',
            profileId: row.id
        }));

    return requesterIsAdmin || recipients.some(recipient => recipient.profileId === requesterId)
        ? recipients
        : [...recipients, { companyId: companyId || '', profileId: requesterId }].filter(recipient => recipient.companyId);
}

async function syncAutomaticNotifications(
    candidates: readonly FranchiseNotificationCandidate[],
    scope: { readonly companyId: string | null; readonly requesterId: string; readonly requesterIsAdmin: boolean }
): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();

    if (candidates.length > 0) {
        const { error } = await supabaseAdmin
            .from('franchise_notifications')
            .upsert(candidates.map(toNotificationPayload), {
                onConflict: 'company_id,recipient_profile_id,source_type,source_id'
            });
        if (error) throw error;
    }

    if (!scope.companyId && scope.requesterIsAdmin) return;

    let query = supabaseAdmin
        .from('franchise_notifications')
        .select('id, source_id')
        .is('dismissed_at', null)
        .in('source_type', [...FRANCHISE_NOTIFICATION_SOURCE_TYPES]);

    if (scope.companyId) query = query.eq('company_id', scope.companyId);
    if (!scope.requesterIsAdmin) query = query.eq('recipient_profile_id', scope.requesterId);

    const { data, error } = await query;
    if (error) throw error;

    const activeSourceIds = new Set(candidates.map(candidate => candidate.sourceId));
    const staleIds = ((data || []) as ExistingNotificationRow[])
        .filter(row => !activeSourceIds.has(row.source_id))
        .map(row => row.id);

    if (staleIds.length === 0) return;

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
        .from('franchise_notifications')
        .update({ dismissed_at: now, updated_at: now })
        .in('id', staleIds);
    if (updateError) throw updateError;
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const { searchParams } = new URL(request.url);
        const requestedCompanyName = cleanString(searchParams.get('company') || searchParams.get('companyName'));
        const requestedCompanyId = requestedCompanyName ? await resolveCompanyIdByName(supabaseAdmin, requestedCompanyName) : null;
        const companyId = isAdmin(requester) ? requestedCompanyId : requester.company_id;
        const limit = parseLimit(searchParams.get('limit'));

        const requesterIsAdmin = isAdmin(requester);
        const [leads, vendorContracts] = await Promise.all([
            fetchNotificationLeads(companyId, requester.id, requesterIsAdmin, requester.role),
            fetchVendorContractsForNotifications(companyId, requesterIsAdmin)
        ]);
        const vendorRecipients = await fetchVendorContractNotificationRecipients(
            companyId,
            requester.id,
            requesterIsAdmin,
            vendorContracts
        );
        const notificationCandidates = [
            ...buildAutomaticFranchiseNotifications(leads),
            ...buildVendorContractNotifications(vendorContracts, vendorRecipients)
        ];
        await syncAutomaticNotifications(notificationCandidates, {
            companyId,
            requesterId: requester.id,
            requesterIsAdmin
        });
        if (canDispatchFranchiseNotificationAlimtalk({ companyId, requesterIsAdmin })) {
            try {
                await notifyAlimtalkFranchiseNotificationCandidates(supabaseAdmin, notificationCandidates);
            } catch (error) {
                console.error(
                    'Franchise notification AlimTalk dispatch failed:',
                    error instanceof Error ? error.message : String(error)
                );
            }
        }

        let query = supabaseAdmin
            .from('franchise_notifications')
            .select('*')
            .is('dismissed_at', null)
            .order('read_at', { ascending: true, nullsFirst: true })
            .order('due_at', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(limit);
        let unreadCountQuery = supabaseAdmin
            .from('franchise_notifications')
            .select('id', { count: 'exact', head: true })
            .is('dismissed_at', null)
            .is('read_at', null);

        if (companyId) query = query.eq('company_id', companyId);
        if (companyId) unreadCountQuery = unreadCountQuery.eq('company_id', companyId);
        query = query.eq('recipient_profile_id', requester.id);
        unreadCountQuery = unreadCountQuery.eq('recipient_profile_id', requester.id);

        const [{ data, error }, { count, error: countError }] = await Promise.all([query, unreadCountQuery]);
        if (error) throw error;
        if (countError) throw countError;

        const notifications = ((data || []) as FranchiseNotificationRow[]).map(transformFranchiseNotification);
        return ok({ notifications, unreadCount: count || 0, schemaReady: true });
    } catch (error) {
        if (isMissingNotificationSchemaError(error)) {
            return ok({ notifications: [], unreadCount: 0, schemaReady: false });
        }
        console.error('Franchise notifications GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise notifications');
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const body = await readBody(request);
        const now = new Date().toISOString();
        const { searchParams } = new URL(request.url);
        const requestedCompanyName = cleanString(searchParams.get('company') || searchParams.get('companyName'));
        const requestedCompanyId = requestedCompanyName ? await resolveCompanyIdByName(supabaseAdmin, requestedCompanyName) : null;
        const companyId = isAdmin(requester) ? requestedCompanyId : requester.company_id;

        if (body.markAllRead === true) {
            let query = supabaseAdmin
                .from('franchise_notifications')
                .update({ read_at: now, updated_at: now })
                .is('dismissed_at', null)
                .eq('recipient_profile_id', requester.id);
            if (companyId) query = query.eq('company_id', companyId);
            const { error } = await query;
            if (error) throw error;
            return ok({ success: true });
        }

        const notificationId = cleanString(body.notificationId ?? body.id);
        if (!notificationId) return fail(400, 'VALIDATION_ERROR', 'notificationId is required');

        let query = supabaseAdmin
            .from('franchise_notifications')
            .update({ read_at: now, updated_at: now })
            .eq('id', notificationId)
            .eq('recipient_profile_id', requester.id);
        if (companyId) query = query.eq('company_id', companyId);

        const { error } = await query;
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        if (isMissingNotificationSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '알림 스키마가 아직 적용되지 않았습니다. supabase_franchise_notifications_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise notifications PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update franchise notification');
    }
}
