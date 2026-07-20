import { getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
import { FRANCHISE_MATCHING_REQUEST_SOURCE, normalizeLeadGrade, normalizeLeadPhone, normalizeLeadStatus } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canDeleteWorkIntakeRecord, canEditWorkIntakeRecord, type WorkIntakeAccessRow } from '@/lib/work-intake-access';

export const dynamic = 'force-dynamic';
export const WORK_INTAKE_DELETE_RPC_NAME = 'delete_franchise_work_intake_record_with_snapshot';
export const WORK_INTAKE_DELETE_HISTORY_UNAVAILABLE_MESSAGE = '삭제 목록 저장 기능을 확인할 수 없어 삭제하지 않았습니다. SQL 적용 상태와 Supabase 스키마 캐시를 확인해주세요.';
export const WORK_INTAKE_DELETE_HISTORY_FAILED_MESSAGE = '삭제 이력 저장 중 오류가 발생해 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.';

type WorkIntakeMutationKind = 'properties' | 'leadRegistrations' | 'matchingRequests';
type RouteContext = {
    readonly params: Promise<{ readonly kind: string; readonly id: string }>;
};
type IntakeRow = WorkIntakeAccessRow & {
    readonly id: string;
    readonly name?: string | null;
    readonly mobile?: string | null;
    readonly status?: string | null;
    readonly address?: string | null;
    readonly created_at?: string | null;
    readonly operation_type?: string | null;
    readonly source?: string | null;
    readonly data: Record<string, unknown> | null;
};
type Target = {
    readonly table: 'properties' | 'franchise_lead_registration_requests' | 'franchise_leads';
    readonly row: IntakeRow;
};
type DeleteSnapshot = {
    readonly title: string;
    readonly summary: string;
    readonly snapshot: {
        readonly sourceTable: Target['table'];
        readonly row: IntakeRow;
    };
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

function readDataText(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function joinSummary(parts: readonly unknown[]): string {
    return parts.map(part => cleanString(part)).filter((part): part is string => Boolean(part)).join(' / ');
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
            .select('id, company_id, manager_id, name, status, address, created_at, operation_type, data')
            .eq('id', id)
            .maybeSingle<IntakeRow>();
        if (error) throw error;
        return data?.operation_type === '물건등록' ? { table: 'properties', row: data } : null;
    }

    if (kind === 'leadRegistrations') {
        const { data, error } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, created_by, name, mobile, status, source, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, created_at, data')
            .eq('id', id)
            .maybeSingle<IntakeRow>();
        if (error && !isMissingLeadRegistrationRequestTableError(error)) throw error;
        return data ? { table: 'franchise_lead_registration_requests', row: data } : null;
    }

    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by, name, mobile, status, source, grade, desired_region, interested_brand, budget_min, budget_max, memo, created_at, data')
        .eq('id', id)
        .maybeSingle<IntakeRow>();
    if (error) throw error;
    return data?.source === FRANCHISE_MATCHING_REQUEST_SOURCE ? { table: 'franchise_leads', row: data } : null;
}

function buildDeleteSnapshot(kind: WorkIntakeMutationKind, target: Target): DeleteSnapshot {
    const row = target.row;
    if (kind === 'properties') {
        const title = row.name || readDataText(row.data, 'propertyName') || '입점 요청';
        return {
            title,
            summary: joinSummary([row.status, row.address, readDataText(row.data, 'desiredBrand'), readDataText(row.data, 'desiredCategory')]),
            snapshot: {
                sourceTable: target.table,
                row
            }
        };
    }

    const title = row.name || '예비 창업자 등록';
    return {
        title,
        summary: joinSummary([row.mobile, row.status, readDataText(row.data, 'desiredRegion'), readDataText(row.data, 'desiredCategory'), readDataText(row.data, 'interestedBrand')]),
        snapshot: {
            sourceTable: target.table,
            row
        }
    };
}

export function isMissingWorkIntakeDeleteSnapshotRpcError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = typeof error.code === 'string' ? error.code : '';
    const message = typeof error.message === 'string' ? error.message : '';
    const normalizedMessage = message.toLowerCase();
    return code === 'PGRST202'
        || normalizedMessage.includes('could not find the function')
        || normalizedMessage.includes('function') && normalizedMessage.includes('schema cache')
        || code === '42883'
            && normalizedMessage.includes(WORK_INTAKE_DELETE_RPC_NAME)
            && normalizedMessage.includes('does not exist');
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
        if (!kind) return fail(400, 'VALIDATION_ERROR', '수정할 수 없는 진행현황 유형입니다.');
        const body = await parseBody(request);
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, cleanString(body.requesterId));
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인 세션을 확인할 수 없습니다. 다시 로그인해주세요.');

        const target = await fetchTarget(kind, params.id);
        if (!target) return fail(404, 'NOT_FOUND', '수정할 진행현황을 찾지 못했습니다.');
        if (!canEditWorkIntakeRecord(requester, target.row)) {
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
        return fail(500, 'INTERNAL_ERROR', '진행현황 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const params = await context.params;
        const kind = resolveKind(params.kind);
        if (!kind) return fail(400, 'VALIDATION_ERROR', '삭제할 수 없는 진행현황 유형입니다.');
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해주세요.');

        const target = await fetchTarget(kind, params.id);
        if (!target) return fail(404, 'NOT_FOUND', '삭제할 진행현황을 찾지 못했습니다.');
        if (!canDeleteWorkIntakeRecord(requester, target.row)) {
            return fail(403, 'FORBIDDEN', '작성자 또는 회사 팀장만 삭제할 수 있습니다.');
        }

        const snapshot = buildDeleteSnapshot(kind, target);
        const { error } = await supabaseAdmin.rpc(WORK_INTAKE_DELETE_RPC_NAME, {
            p_kind: kind,
            p_source_id: params.id,
            p_deleted_by: requester.id,
            p_title: snapshot.title,
            p_summary: snapshot.summary,
            p_snapshot: snapshot.snapshot
        });
        if (error) {
            if (isMissingWorkIntakeDeleteSnapshotRpcError(error)) {
                return fail(503, 'INTERNAL_ERROR', WORK_INTAKE_DELETE_HISTORY_UNAVAILABLE_MESSAGE);
            }
            throw error;
        }
        return ok({ success: true, deleteHistoryStored: true });
    } catch (error) {
        console.error('Franchise work intake DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', WORK_INTAKE_DELETE_HISTORY_FAILED_MESSAGE);
    }
}
