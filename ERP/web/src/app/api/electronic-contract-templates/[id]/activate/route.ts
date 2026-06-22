import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    normalizeTemplateFields,
    normalizeTemplateRoles,
    validateTemplateFieldLayout
} from '@/lib/electronic-contracts/company-template';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canManageTemplate,
    fetchTemplateForRequester,
    fetchTemplateVersions,
    fetchVersionDetails,
    isRecord,
    latestVersionForTemplate,
    textValue
} from '../../templateApi';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body: unknown = await request.json().catch(() => ({}));
        const bodyRecord = isRecord(body) ? body : {};

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿을 활성화할 권한이 없습니다.');
        }

        const requestedVersionId = textValue(bodyRecord, 'versionId');
        const versions = await fetchTemplateVersions(supabaseAdmin, [id]);
        const targetVersion = requestedVersionId
            ? versions.find(version => version.id === requestedVersionId) || null
            : latestVersionForTemplate(versions, id);
        if (!targetVersion) return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');
        if (!targetVersion.ucansign_template_id) {
            return fail(400, 'VALIDATION_ERROR', '유캔싸인에서 템플릿 설정을 완료해주세요.');
        }

        const details = await fetchVersionDetails(supabaseAdmin, targetVersion.id);
        const roles = normalizeTemplateRoles(details.roles.map(role => ({
            roleKey: role.role_key,
            label: role.label,
            signingOrder: role.signing_order || 1,
            required: role.required ?? true
        })));
        const fields = normalizeTemplateFields(details.fields.map(field => ({
            fieldKey: field.field_key,
            label: field.label,
            type: field.field_type,
            page: field.page || 1,
            x: field.x || 0,
            y: field.y || 0,
            width: field.width || 24,
            height: field.height || 8,
            required: field.required ?? false,
            roleKey: field.role_key || '',
            defaultValue: field.default_value || ''
        })));
        const validation = validateTemplateFieldLayout(fields, roles, targetVersion.page_count || 1);
        if (!validation.ok) return fail(400, 'VALIDATION_ERROR', validation.errors.join(' / '));

        const now = new Date().toISOString();
        const [{ error: versionError }, { error: templateError }] = await Promise.all([
            supabaseAdmin
                .from('company_contract_template_versions')
                .update({ status: 'active', updated_at: now })
                .eq('id', targetVersion.id),
            supabaseAdmin
                .from('company_contract_templates')
                .update({
                    status: 'active',
                    active_version_id: targetVersion.id,
                    updated_at: now
                })
                .eq('id', id)
        ]);
        if (versionError) throw versionError;
        if (templateError) throw templateError;

        return ok({ templateId: id, activeVersionId: targetVersion.id, status: 'active' });
    } catch (error) {
        console.error('Electronic contract template activate error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿을 사용중으로 전환하지 못했습니다.');
    }
}
