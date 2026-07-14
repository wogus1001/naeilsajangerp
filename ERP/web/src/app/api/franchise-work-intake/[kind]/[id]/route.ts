import { getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
import { FRANCHISE_MATCHING_REQUEST_SOURCE, normalizeLeadGrade, normalizeLeadPhone, normalizeLeadStatus } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canManageWorkIntakeRecord, type WorkIntakeAccessRow } from '@/lib/work-intake-access';
import { missingWorkIntakeEditFields } from '@/lib/work-intake-edit-validation';

export const dynamic = 'force-dynamic';

type WorkIntakeMutationKind = 'properties' | 'leadRegistrations' | 'matchingRequests';
type RouteContext = {
    readonly params: Promise<{ readonly kind: string; readonly id: string }>;
};
type IntakeRow = WorkIntakeAccessRow & {
    readonly id: string;
    readonly operation_type?: string | null;
    readonly source?: string | null;
    readonly data: Record<string, unknown> | null;
};
type Target = {
    readonly table: 'properties' | 'franchise_lead_registration_requests' | 'franchise_leads';
    readonly row: IntakeRow;
};

const DATA_CONTROL_FIELDS = new Set([
    'id',
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'managerId',
    'manager_id',
    'name',
    'mobile',
    'source',
    'status',
    'grade',
    'desiredRegion',
    'budgetMax',
    'interestedBrand',
    'memo'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
    const value: unknown = await request.json();
    return isRecord(value) ? value : {};
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized || null;
}

function parseNullableNumber(value: unknown): number | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = Number(raw.replace(/,/g, '').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return Math.abs(parsed) > 0 && Math.abs(parsed) < 1_000_000 ? parsed * 10_000 : parsed;
}

function resolveKind(kind: string): WorkIntakeMutationKind | null {
    if (kind === 'properties' || kind === 'leadRegistrations' || kind === 'matchingRequests') return kind;
    return null;
}

function editableData(body: Record<string, unknown>, existingData: Record<string, unknown> | null, managerId: string | null | undefined) {
    const data: Record<string, unknown> = { ...(existingData || {}) };
    Object.entries(body).forEach(([key, value]) => {
        if (!DATA_CONTROL_FIELDS.has(key)) data[key] = value;
    });
    if (body.companyName !== undefined) data.companyName = body.companyName;
    if (managerId) data.managerId = managerId;
    data.requestEditedAt = new Date().toISOString();
    return data;
}

async function fetchTarget(kind: WorkIntakeMutationKind, id: string): Promise<Target | null> {
    const supabaseAdmin = getSupabaseAdmin();
    if (kind === 'properties') {
        const { data, error } = await supabaseAdmin
            .from('properties')
            .select('id, company_id, manager_id, operation_type, data')
            .eq('id', id)
            .maybeSingle<IntakeRow>();
        if (error) throw error;
        return data?.operation_type === '물건등록' ? { table: 'properties', row: data } : null;
    }

    if (kind === 'leadRegistrations') {
        const { data, error } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, created_by, data')
            .eq('id', id)
            .maybeSingle<IntakeRow>();
        if (error && !isMissingLeadRegistrationRequestTableError(error)) throw error;
        return data ? { table: 'franchise_lead_registration_requests', row: data } : null;
    }

    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by, source, data')
        .eq('id', id)
        .maybeSingle<IntakeRow>();
    if (error) throw error;
    return data?.source === FRANCHISE_MATCHING_REQUEST_SOURCE ? { table: 'franchise_leads', row: data } : null;
}

function buildPropertyUpdates(body: Record<string, unknown>, row: IntakeRow) {
    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        data: editableData(body, row.data, row.manager_id)
    };
    if (body.name !== undefined) updates.name = cleanString(body.name) || '이름 없는 물건';
    if (body.status !== undefined) updates.status = cleanString(body.status) || '공실';
    if (body.address !== undefined) updates.address = cleanString(body.address) || '';
    if (body.isFavorite !== undefined) updates.is_favorite = Boolean(body.isFavorite);
    return updates;
}

function buildLeadUpdates(body: Record<string, unknown>, row: IntakeRow) {
    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        data: editableData(body, row.data, row.manager_id)
    };
    const mobile = cleanString(body.mobile) || '';
    if (body.name !== undefined) updates.name = cleanString(body.name) || '이름 없음';
    if (body.mobile !== undefined) {
        updates.mobile = mobile;
        updates.mobile_normalized = normalizeLeadPhone(mobile);
    }
    if (body.status !== undefined) updates.status = normalizeLeadStatus(body.status);
    if (body.grade !== undefined) updates.grade = normalizeLeadGrade(body.grade);
    if (body.desiredRegion !== undefined) updates.desired_region = cleanString(body.desiredRegion) || '';
    if (body.budgetMax !== undefined) updates.budget_max = parseNullableNumber(body.budgetMax);
    if (body.interestedBrand !== undefined) updates.interested_brand = cleanString(body.interestedBrand) || '';
    if (body.memo !== undefined) updates.memo = cleanString(body.memo) || '';
    return updates;
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const params = await context.params;
        const kind = resolveKind(params.kind);
        if (!kind) return fail(400, 'VALIDATION_ERROR', 'Unsupported work intake kind');
        const body = await parseBody(request);
        const missingFields = missingWorkIntakeEditFields(kind, body);
        if (missingFields.length > 0) {
            return fail(400, 'VALIDATION_ERROR', `필수 항목을 확인해주세요: ${missingFields.join(', ')}`);
        }
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, cleanString(body.requesterId));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const target = await fetchTarget(kind, params.id);
        if (!target) return fail(404, 'NOT_FOUND', 'Work intake record not found');
        if (!canManageWorkIntakeRecord(requester, target.row)) {
            return fail(403, 'FORBIDDEN', '작성자, 회사 팀장 또는 관리자만 수정할 수 있습니다.');
        }

        const updates = kind === 'properties' ? buildPropertyUpdates(body, target.row) : buildLeadUpdates(body, target.row);
        const { data, error } = await supabaseAdmin
            .from(target.table)
            .update(updates)
            .eq('id', params.id)
            .eq('company_id', target.row.company_id)
            .select()
            .single();
        if (error) throw error;
        return ok({ record: data });
    } catch (error) {
        console.error('Franchise work intake PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update work intake record');
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const params = await context.params;
        const kind = resolveKind(params.kind);
        if (!kind) return fail(400, 'VALIDATION_ERROR', 'Unsupported work intake kind');
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const target = await fetchTarget(kind, params.id);
        if (!target) return fail(404, 'NOT_FOUND', 'Work intake record not found');
        if (!canManageWorkIntakeRecord(requester, target.row)) {
            return fail(403, 'FORBIDDEN', '작성자, 회사 팀장 또는 관리자만 삭제할 수 있습니다.');
        }

        const { error } = await supabaseAdmin.from(target.table).delete()
            .eq('id', params.id)
            .eq('company_id', target.row.company_id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Franchise work intake DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete work intake record');
    }
}
