import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    type RequesterProfile
} from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isRecord, parseOptionalUuid, type JsonRecord } from './boundary';
import { ApprovalRouteError, throwDatabaseError } from './errors';
import { canManageApprovals } from './policy';

export type ApprovalSupabase = ReturnType<typeof getSupabaseAdmin>;

export type ApprovalContext = {
    readonly supabase: ApprovalSupabase;
    readonly requester: RequesterProfile;
    readonly companyId: string;
    readonly approvalAdmin: boolean;
};

type RoleAssignmentRow = {
    readonly active_from: string | null;
    readonly active_until: string | null;
};

function activeAt(row: RoleAssignmentRow, now: string): boolean {
    return (row.active_from === null || row.active_from <= now) &&
        (row.active_until === null || now <= row.active_until);
}

function companyIdInput(request: Request, body: JsonRecord | null, requester: RequesterProfile): unknown {
    const bodyCompanyId = body?.companyId;
    if (bodyCompanyId !== undefined && bodyCompanyId !== null && bodyCompanyId !== '') return bodyCompanyId;
    const queryCompanyId = new URL(request.url).searchParams.get('companyId');
    return queryCompanyId || requester.company_id;
}

async function hasApprovalAdminAssignment(
    supabase: ApprovalSupabase,
    requester: RequesterProfile,
    companyId: string
): Promise<boolean> {
    if (requester.role === 'admin') return true;
    const { data, error } = await supabase
        .from('approval_role_assignments')
        .select('active_from, active_until')
        .eq('company_id', companyId)
        .eq('profile_id', requester.id)
        .eq('role_key', 'approval_admin')
        .eq('active', true)
        .returns<RoleAssignmentRow[]>();
    throwDatabaseError(error);
    const now = new Date().toISOString();
    return (data || []).some(row => activeAt(row, now));
}

export async function resolveApprovalContext(request: Request, parsedBody?: unknown): Promise<ApprovalContext> {
    const supabase = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabase, request);
    if (!requester) throw new ApprovalRouteError(401, 'AUTH_REQUIRED', 'Authenticated session is required');
    if ((requester.status !== undefined && requester.status !== 'active') || requester.role === 'partner_vendor') {
        throw new ApprovalRouteError(403, 'FORBIDDEN', 'Active company employees are required for electronic approvals');
    }
    const body = isRecord(parsedBody) ? parsedBody : null;
    const companyId = parseOptionalUuid(companyIdInput(request, body, requester), 'companyId');
    if (!companyId) throw new ApprovalRouteError(400, 'VALIDATION_ERROR', 'companyId is required');
    if (!canAccessCompanyScope(requester, companyId)) {
        throw new ApprovalRouteError(403, 'FORBIDDEN', 'Cross-company approval access is denied');
    }
    return {
        supabase,
        requester,
        companyId,
        approvalAdmin: await hasApprovalAdminAssignment(supabase, requester, companyId)
    };
}

export function requireApprovalManager(context: ApprovalContext): void {
    if (!canManageApprovals(context.requester, context.approvalAdmin)) {
        throw new ApprovalRouteError(403, 'FORBIDDEN', 'Approval administration permission is required');
    }
}
