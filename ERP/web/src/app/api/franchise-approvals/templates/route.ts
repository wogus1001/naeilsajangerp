import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { isMissingWorkflowSchemaError } from '@/lib/franchise-workflow';
import type { ApprovalTemplateRow, JsonRecord } from '@/lib/franchise-workflow-store';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function canManageApprovals(requester: RequesterProfile): boolean {
    return requester.role === 'admin' || requester.role === 'manager';
}

function arrayOrEmpty(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

function recordOrEmpty(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

function transformTemplate(row: ApprovalTemplateRow) {
    return {
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        description: row.description,
        documentType: row.document_type,
        fields: arrayOrEmpty(row.fields),
        approverProfileIds: arrayOrEmpty(row.approver_profile_ids),
        completionRule: recordOrEmpty(row.completion_rule),
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function resolveCompanyId(
    request: Request,
    body: JsonRecord | null,
    requester: RequesterProfile
): Promise<string | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const companyIdInput = cleanText(body?.companyId) || searchParams.get('companyId') || '';
    const companyNameInput = cleanText(body?.companyName) || searchParams.get('company') || '';
    const companyIdByName = companyNameInput ? await resolveCompanyIdByName(supabaseAdmin, companyNameInput) : null;
    return isAdmin(requester) ? companyIdInput || companyIdByName || requester.company_id : requester.company_id;
}

function schemaFailure(error: unknown): Response {
    if (isMissingWorkflowSchemaError(error)) {
        return fail(500, 'INTERNAL_ERROR', '결재 양식 SQL이 아직 적용되지 않았습니다. supabase_franchise_approval_calendar_migration.sql 등록이 필요합니다.');
    }
    return fail(500, 'INTERNAL_ERROR', '결재 양식을 처리하지 못했습니다.');
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const companyId = await resolveCompanyId(request, null, requester);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canAccessCompanyScope(requester, companyId)) return fail(403, 'FORBIDDEN', '결재 양식 접근 권한이 없습니다.');

        const { searchParams } = new URL(request.url);
        const documentType = searchParams.get('documentType') || '';
        let query = supabaseAdmin
            .from('approval_templates')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
        if (documentType) query = query.eq('document_type', documentType);
        if (searchParams.get('includeInactive') !== 'true') query = query.eq('active', true);

        const { data, error } = await query.returns<ApprovalTemplateRow[]>();
        if (error) throw error;
        return ok((data || []).map(transformTemplate));
    } catch (error) {
        console.error('Approval templates GET error:', error);
        return schemaFailure(error);
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
        if (!canManageApprovals(requester)) return fail(403, 'FORBIDDEN', '결재 양식을 생성할 권한이 없습니다.');

        const parsed: unknown = await request.json().catch(() => ({}));
        const body = isRecord(parsed) ? parsed : {};
        const companyId = await resolveCompanyId(request, body, requester);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canAccessCompanyScope(requester, companyId)) return fail(403, 'FORBIDDEN', '결재 양식 생성 권한이 없습니다.');

        const name = cleanText(body.name);
        if (!name) return fail(400, 'VALIDATION_ERROR', '양식명이 필요합니다.');

        const now = new Date().toISOString();
        const { data, error } = await supabaseAdmin
            .from('approval_templates')
            .insert({
                company_id: companyId,
                name,
                description: cleanText(body.description),
                document_type: cleanText(body.documentType) || 'general',
                fields: arrayOrEmpty(body.fields),
                approver_profile_ids: arrayOrEmpty(body.approverProfileIds),
                completion_rule: recordOrEmpty(body.completionRule),
                active: true,
                created_by: requester.id,
                updated_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('*')
            .single<ApprovalTemplateRow>();
        if (error || !data) throw error || new Error('Approval template insert failed');
        return ok(transformTemplate(data), 201);
    } catch (error) {
        console.error('Approval templates POST error:', error);
        return schemaFailure(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
        if (!canManageApprovals(requester)) return fail(403, 'FORBIDDEN', '결재 양식을 수정할 권한이 없습니다.');

        const parsed: unknown = await request.json().catch(() => ({}));
        const body = isRecord(parsed) ? parsed : {};
        const id = cleanText(body.id);
        if (!id) return fail(400, 'VALIDATION_ERROR', '양식 ID가 필요합니다.');

        const { data: existing, error: existingError } = await supabaseAdmin
            .from('approval_templates')
            .select('*')
            .eq('id', id)
            .maybeSingle<ApprovalTemplateRow>();
        if (existingError) throw existingError;
        if (!existing) return fail(404, 'NOT_FOUND', '결재 양식을 찾을 수 없습니다.');
        if (!canAccessCompanyScope(requester, existing.company_id)) return fail(403, 'FORBIDDEN', '결재 양식 수정 권한이 없습니다.');

        const updates: JsonRecord = { updated_by: requester.id, updated_at: new Date().toISOString() };
        if (Object.prototype.hasOwnProperty.call(body, 'name')) updates.name = cleanText(body.name) || existing.name;
        if (Object.prototype.hasOwnProperty.call(body, 'description')) updates.description = cleanText(body.description);
        if (Object.prototype.hasOwnProperty.call(body, 'documentType')) updates.document_type = cleanText(body.documentType) || existing.document_type;
        if (Object.prototype.hasOwnProperty.call(body, 'fields')) updates.fields = arrayOrEmpty(body.fields);
        if (Object.prototype.hasOwnProperty.call(body, 'approverProfileIds')) updates.approver_profile_ids = arrayOrEmpty(body.approverProfileIds);
        if (Object.prototype.hasOwnProperty.call(body, 'completionRule')) updates.completion_rule = recordOrEmpty(body.completionRule);
        if (Object.prototype.hasOwnProperty.call(body, 'active')) updates.active = body.active === true;

        const { data, error } = await supabaseAdmin
            .from('approval_templates')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single<ApprovalTemplateRow>();
        if (error || !data) throw error || new Error('Approval template update failed');
        return ok(transformTemplate(data));
    } catch (error) {
        console.error('Approval templates PATCH error:', error);
        return schemaFailure(error);
    }
}
