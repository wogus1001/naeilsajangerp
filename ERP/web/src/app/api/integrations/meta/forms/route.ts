import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canManageMetaIntegration,
    decryptMetaToken,
    fetchMetaForms,
    findMetaFieldMappingConflicts,
    getMetaFormReadiness,
    isEligibleMetaFormManager,
    isMetaRequestTimeout,
    normalizeFieldMapping,
    planMetaFormDiscoveryWrite,
    sanitizeMetaForm
} from '@/lib/meta-leads';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body: unknown = await request.json().catch(() => null);
        if (!isRecord(body)) {
            return fail(400, 'VALIDATION_ERROR', '요청 내용을 확인해주세요.');
        }
        const requesterId = typeof body.requesterId === 'string'
            ? body.requesterId
            : typeof body.userId === 'string'
                ? body.userId
                : null;
        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            requesterId
        );

        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
        }
        if (!canManageMetaIntegration(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Meta 연동 설정 권한이 없습니다.');
        }
        if (typeof body.id !== 'string' || !body.id.trim()) {
            return fail(400, 'VALIDATION_ERROR', '신청 양식을 확인해주세요.');
        }
        const formId = body.id.trim();

        const { data: form, error: formError } = await supabaseAdmin
            .from('meta_lead_forms')
            .select('*')
            .eq('id', formId)
            .single();

        if (formError || !form) {
            return fail(404, 'NOT_FOUND', 'Meta 신청 양식을 찾지 못했습니다.');
        }
        if (!canAccessCompanyScope(requesterProfile, form.company_id)) {
            return fail(403, 'FORBIDDEN', '다른 회사의 Meta 신청 양식은 변경할 수 없습니다.');
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };
        let nextManagerId = typeof form.default_manager_id === 'string'
            ? form.default_manager_id
            : null;
        let nextMapping = normalizeFieldMapping(form.field_mapping);

        if (typeof body.enabled === 'boolean') {
            updates.enabled = body.enabled;
        }

        if (body.defaultManagerId !== undefined) {
            const requestedManagerId = typeof body.defaultManagerId === 'string'
                ? body.defaultManagerId.trim()
                : '';
            if (!requestedManagerId) {
                updates.default_manager_id = null;
                nextManagerId = null;
            } else {
                const managerUuid = await resolveUserUuid(supabaseAdmin, requestedManagerId);
                if (!managerUuid) {
                    return fail(400, 'VALIDATION_ERROR', '기본 담당자를 확인해주세요.');
                }

                updates.default_manager_id = managerUuid;
                nextManagerId = managerUuid;
            }
        }

        if (body.fieldMapping !== undefined) {
            nextMapping = normalizeFieldMapping(body.fieldMapping);
            updates.field_mapping = nextMapping;
        }

        const willBeEnabled = typeof body.enabled === 'boolean' ? body.enabled : Boolean(form.enabled);
        if (nextManagerId && (willBeEnabled || body.defaultManagerId !== undefined)) {
            const { data: managerProfile } = await supabaseAdmin
                .from('profiles')
                .select('company_id, status')
                .eq('id', nextManagerId)
                .maybeSingle();
            if (!isEligibleMetaFormManager(managerProfile, form.company_id)) {
                return fail(400, 'VALIDATION_ERROR', '같은 회사의 재직 중인 담당자를 선택해주세요.');
            }
        }
        if (willBeEnabled) {
            const conflicts = findMetaFieldMappingConflicts(nextMapping);
            if (conflicts.length > 0) {
                return fail(409, 'CONFLICT', '한 Meta 질문은 하나의 모객 DB 항목에만 연결할 수 있습니다.');
            }
            const readiness = getMetaFormReadiness({
                questions: form.data?.questions,
                mapping: nextMapping,
                defaultManagerId: nextManagerId
            });
            if (!readiness.ready) {
                return fail(400, 'VALIDATION_ERROR', '이름, 연락처, 기본 담당자를 연결한 뒤 자동 수집을 켜주세요.');
            }
        }

        const { data: updated, error } = await supabaseAdmin
            .from('meta_lead_forms')
            .update(updates)
            .eq('id', formId)
            .select()
            .single();

        if (error) throw error;
        return ok({ form: sanitizeMetaForm(updated) });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Meta form update error';
        console.error('Meta form PUT error:', message);
        return fail(500, 'INTERNAL_ERROR', 'Meta 신청 양식을 저장하지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body: unknown = await request.json().catch(() => null);
        if (!isRecord(body) || typeof body.id !== 'string' || !body.id.trim()) {
            return fail(400, 'VALIDATION_ERROR', '신청 양식을 확인해주세요.');
        }
        const requesterId = typeof body.requesterId === 'string'
            ? body.requesterId
            : typeof body.userId === 'string'
                ? body.userId
                : null;
        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            requesterId
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
        }
        if (!canManageMetaIntegration(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Meta 연동 설정 권한이 없습니다.');
        }
        const formId = body.id.trim();

        const { data: form, error: formError } = await supabaseAdmin
            .from('meta_lead_forms')
            .select('*')
            .eq('id', formId)
            .single();
        if (formError || !form) {
            return fail(404, 'NOT_FOUND', 'Meta 신청 양식을 찾지 못했습니다.');
        }
        if (!canAccessCompanyScope(requesterProfile, form.company_id)) {
            return fail(403, 'FORBIDDEN', '다른 회사의 Meta 신청 양식은 변경할 수 없습니다.');
        }

        const { data: connection, error: connectionError } = await supabaseAdmin
            .from('meta_lead_connections')
            .select('id, company_id, meta_page_id, access_token_encrypted, status')
            .eq('id', form.connection_id)
            .single();
        if (
            connectionError ||
            !connection ||
            connection.company_id !== form.company_id ||
            connection.status !== 'connected' ||
            typeof connection.access_token_encrypted !== 'string' ||
            !connection.access_token_encrypted
        ) {
            return fail(409, 'CONFLICT', 'Meta 계정을 다시 연결해주세요.');
        }

        const discoveredForms = await fetchMetaForms(
            connection.meta_page_id,
            decryptMetaToken(connection.access_token_encrypted)
        );
        const discoveredForm = discoveredForms.find(item => item.id === form.meta_form_id);
        if (!discoveredForm) {
            return fail(404, 'NOT_FOUND', 'Meta에서 이 신청 양식을 찾지 못했습니다.');
        }

        const write = planMetaFormDiscoveryWrite({
            companyId: form.company_id,
            connectionId: connection.id,
            connectedBy: requesterProfile.id,
            discoveredForm,
            existingForm: form
        });
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('meta_lead_forms')
            .update({
                ...write.values,
                updated_at: new Date().toISOString()
            })
            .eq('id', form.id)
            .select()
            .single();
        if (updateError) throw updateError;

        return ok({ form: sanitizeMetaForm(updated) });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Meta form refresh error';
        console.error('Meta form refresh POST error:', message);
        if (isMetaRequestTimeout(error)) {
            return fail(504, 'INTERNAL_ERROR', 'Meta 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
        }
        return fail(500, 'INTERNAL_ERROR', 'Meta 신청 양식을 새로고침하지 못했습니다.');
    }
}
