import { fail, ok } from '@/lib/api-response';
import { canManageApprovals } from '../_shared/policy';
import { resolveApprovalContext } from '../_shared/access';
import { parseRequiredUuid, readJsonRecord } from '../_shared/boundary';
import {
    delegationProfilesAreEligible,
    delegationView,
    parseDelegationInsert,
    type ApprovalDelegationRow
} from '../_shared/delegations';
import { approvalErrorResponse, ApprovalRouteError, throwDatabaseError } from '../_shared/errors';

export const dynamic = 'force-dynamic';

const DELEGATION_SELECT = 'id, company_id, delegator_profile_id, delegate_profile_id, action_scope, starts_at, ends_at, reason, active, created_by, created_at, updated_at';

export async function GET(request: Request) {
    try {
        const context = await resolveApprovalContext(request);
        const { searchParams } = new URL(request.url);
        let query = context.supabase
            .from('approval_delegations')
            .select(DELEGATION_SELECT)
            .eq('company_id', context.companyId)
            .order('starts_at', { ascending: false });
        if (!canManageApprovals(context.requester, context.approvalAdmin)) {
            query = query.or(`delegator_profile_id.eq.${context.requester.id},delegate_profile_id.eq.${context.requester.id}`);
        }
        if (searchParams.get('includeInactive') !== 'true') query = query.eq('active', true);
        const { data, error } = await query.returns<ApprovalDelegationRow[]>();
        throwDatabaseError(error);
        return ok({ delegations: (data || []).map(delegationView) });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval delegations');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        const insert = parseDelegationInsert(body, context.companyId, context.requester.id);
        if (insert.delegator_profile_id !== context.requester.id &&
            !canManageApprovals(context.requester, context.approvalAdmin)) {
            throw new ApprovalRouteError(403, 'FORBIDDEN', 'Only approval administrators may delegate for another user');
        }
        const profileIds = [insert.delegator_profile_id, insert.delegate_profile_id];
        const { data: eligibleProfiles, error: profileError } = await context.supabase
            .from('profiles')
            .select('id')
            .eq('company_id', context.companyId)
            .eq('status', 'active')
            .neq('role', 'partner_vendor')
            .in('id', profileIds)
            .returns<Array<{ readonly id: string }>>();
        throwDatabaseError(profileError);
        if (!delegationProfilesAreEligible(profileIds, eligibleProfiles || [])) {
            throw new ApprovalRouteError(400, 'VALIDATION_ERROR', '대결자는 회사의 사용 가능한 구성원이어야 합니다.');
        }
        const { data, error } = await context.supabase
            .from('approval_delegations')
            .insert(insert)
            .select(DELEGATION_SELECT)
            .single<ApprovalDelegationRow>();
        throwDatabaseError(error);
        if (!data) throw new ApprovalRouteError(500, 'INTERNAL_ERROR', 'Approval delegation was not returned');
        return ok({ delegation: delegationView(data) }, 201);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to create approval delegation');
    }
}

export async function DELETE(request: Request) {
    try {
        const context = await resolveApprovalContext(request);
        const id = parseRequiredUuid(new URL(request.url).searchParams.get('id'), 'id');
        const { data: existing, error: fetchError } = await context.supabase
            .from('approval_delegations')
            .select(DELEGATION_SELECT)
            .eq('id', id)
            .eq('company_id', context.companyId)
            .maybeSingle<ApprovalDelegationRow>();
        throwDatabaseError(fetchError);
        if (!existing) return fail(404, 'NOT_FOUND', 'Approval delegation not found');
        if (existing.delegator_profile_id !== context.requester.id &&
            !canManageApprovals(context.requester, context.approvalAdmin)) {
            return fail(404, 'NOT_FOUND', 'Approval delegation not found');
        }
        const { error } = await context.supabase
            .from('approval_delegations')
            .delete()
            .eq('id', id)
            .eq('company_id', context.companyId);
        throwDatabaseError(error);
        return ok({ id });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to delete approval delegation');
    }
}
