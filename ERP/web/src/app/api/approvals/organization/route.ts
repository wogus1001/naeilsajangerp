import { fail, ok } from '@/lib/api-response';
import { resolveApprovalContext, requireApprovalManager, type ApprovalContext } from '../_shared/access';
import { readJsonRecord } from '../_shared/boundary';
import { approvalErrorResponse, ApprovalRouteError, throwDatabaseError } from '../_shared/errors';
import {
    approvalRoleAssignmentView,
    organizationMembershipView,
    organizationUnitView,
    parseOrganizationPatch,
    type ApprovalRoleAssignmentRow,
    type OrganizationMembershipRow,
    type OrganizationUnitRow
} from '../_shared/organization';

export const dynamic = 'force-dynamic';

const UNIT_SELECT = 'id, company_id, parent_id, code, name, description, manager_profile_id, sort_order, active, created_at, updated_at';
const MEMBERSHIP_SELECT = 'id, company_id, unit_id, profile_id, job_title, position_rank, is_primary, active, starts_on, ends_on, created_at, updated_at';
const ROLE_SELECT = 'id, company_id, role_key, role_name, profile_id, unit_id, active_from, active_until, active, created_at, updated_at';
const PEOPLE_SELECT = 'id, name, email, role, status';

type OrganizationPersonRow = {
    readonly id: string;
    readonly name: string | null;
    readonly email: string | null;
    readonly role: string | null;
    readonly status: string | null;
};

async function organizationData(context: ApprovalContext) {
    const [units, memberships, roleAssignments, people] = await Promise.all([
        context.supabase.from('organization_units').select(UNIT_SELECT)
            .eq('company_id', context.companyId).order('sort_order', { ascending: true }).returns<OrganizationUnitRow[]>(),
        context.supabase.from('organization_memberships').select(MEMBERSHIP_SELECT)
            .eq('company_id', context.companyId).order('position_rank', { ascending: false }).returns<OrganizationMembershipRow[]>(),
        context.supabase.from('approval_role_assignments').select(ROLE_SELECT)
            .eq('company_id', context.companyId).order('role_key', { ascending: true }).returns<ApprovalRoleAssignmentRow[]>(),
        context.supabase.from('profiles').select(PEOPLE_SELECT)
            .eq('company_id', context.companyId).eq('status', 'active')
            .neq('role', 'partner_vendor')
            .order('name', { ascending: true }).returns<OrganizationPersonRow[]>()
    ]);
    throwDatabaseError(units.error);
    throwDatabaseError(memberships.error);
    throwDatabaseError(roleAssignments.error);
    throwDatabaseError(people.error);
    return {
        people: (people.data || []).map(person => ({
            id: person.id,
            name: person.name?.trim() || person.email?.trim() || '이름 없음',
            email: person.email?.trim() || '',
            role: person.role?.trim() || ''
        })),
        units: (units.data || []).map(organizationUnitView),
        memberships: (memberships.data || []).map(organizationMembershipView),
        roleAssignments: (roleAssignments.data || []).map(approvalRoleAssignmentView)
    };
}

async function requireScopedIds(
    context: ApprovalContext,
    table: 'organization_units' | 'organization_memberships' | 'approval_role_assignments',
    rows: readonly Record<string, unknown>[]
): Promise<void> {
    const ids = rows.flatMap(row => typeof row.id === 'string' ? [row.id] : []);
    if (ids.length === 0) return;
    const { data, error } = await context.supabase.from(table).select('id')
        .eq('company_id', context.companyId).in('id', ids)
        .returns<Array<{ readonly id: string }>>();
    throwDatabaseError(error);
    const scopedIds = new Set((data || []).map(row => row.id));
    if (ids.some(id => !scopedIds.has(id))) {
        throw new ApprovalRouteError(403, 'FORBIDDEN', 'Cross-company organization row update is not allowed');
    }
}

export async function GET(request: Request) {
    try {
        const context = await resolveApprovalContext(request);
        return ok(await organizationData(context));
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval organization');
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        requireApprovalManager(context);
        const patch = parseOrganizationPatch(body, context.companyId, context.requester.id);
        if (patch.units === null && patch.memberships === null && patch.roleAssignments === null) {
            return fail(400, 'VALIDATION_ERROR', 'No organization changes were provided');
        }
        const suppliedGroups = [patch.units, patch.memberships, patch.roleAssignments].filter(group => group !== null).length;
        if (suppliedGroups > 1) {
            return fail(400, 'VALIDATION_ERROR', 'Update one organization setting group per request');
        }
        if (patch.units !== null && patch.units.length > 0) {
            await requireScopedIds(context, 'organization_units', patch.units);
            const { error } = await context.supabase.from('organization_units').upsert(patch.units);
            throwDatabaseError(error);
        }
        if (patch.memberships !== null && patch.memberships.length > 0) {
            await requireScopedIds(context, 'organization_memberships', patch.memberships);
            const { error } = await context.supabase.from('organization_memberships').upsert(patch.memberships);
            throwDatabaseError(error);
        }
        if (patch.roleAssignments !== null && patch.roleAssignments.length > 0) {
            await requireScopedIds(context, 'approval_role_assignments', patch.roleAssignments);
            const { error } = await context.supabase.from('approval_role_assignments').upsert(patch.roleAssignments);
            throwDatabaseError(error);
        }
        return ok(await organizationData(context));
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to update approval organization');
    }
}
