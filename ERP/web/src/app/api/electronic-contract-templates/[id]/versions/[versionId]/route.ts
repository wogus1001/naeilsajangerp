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
    numberValue,
    textValue
} from '../../../templateApi';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string; readonly versionId: string }>;
};

function booleanValue(record: Record<string, unknown>, key: string): boolean {
    return record[key] === true;
}

export async function PATCH(request: Request, context: RouteContext) {
    const supabaseAdmin = getSupabaseAdmin();
    let createdVersionId: string | null = null;
    try {
        const { id, versionId } = await context.params;
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid template version payload');

        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿 버전을 수정할 권한이 없습니다.');
        }

        const details = await fetchVersionDetails(supabaseAdmin, versionId);
        if (!details.version || details.version.template_id !== id) return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');

        const pageCount = Math.max(1, Math.trunc(numberValue(body, 'pageCount', details.version.page_count || 1)));
        const roles = normalizeTemplateRoles(body.roles);
        const fields = normalizeTemplateFields(body.fields);
        const validation = validateTemplateFieldLayout(fields, roles, pageCount);
        if (!validation.ok) return fail(400, 'VALIDATION_ERROR', validation.errors.join(' / '));

        const versions = await fetchTemplateVersions(supabaseAdmin, [id]);
        const nextVersionNumber = versions.reduce((max, version) => Math.max(max, version.version_number || 1), 0) + 1;
        const now = new Date().toISOString();
        const { data: newVersion, error: versionError } = await supabaseAdmin
            .from('company_contract_template_versions')
            .insert({
                template_id: id,
                company_id: details.version.company_id,
                version_number: nextVersionNumber,
                status: 'draft',
                source_file_url: details.version.source_file_url || null,
                source_file_path: details.version.source_file_path || null,
                source_file_name: details.version.source_file_name || null,
                source_file_size: details.version.source_file_size || null,
                page_count: pageCount,
                ucansign_template_id: textValue(body, 'ucansignTemplateId') || null,
                direct_ucansign_supported: booleanValue(body, 'directUcansignSupported'),
                created_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (versionError || !newVersion) throw versionError || new Error('Template version insert failed');
        createdVersionId = newVersion.id;

        const { error: roleError } = await supabaseAdmin.from('company_contract_template_roles').insert(
            roles.map(role => ({
                template_version_id: newVersion.id,
                role_key: role.roleKey,
                label: role.label,
                signing_order: role.signingOrder,
                required: role.required
            }))
        );
        if (roleError) throw roleError;

        if (fields.length > 0) {
            const { error: fieldError } = await supabaseAdmin.from('company_contract_template_fields').insert(
                fields.map(field => ({
                    template_version_id: newVersion.id,
                    field_key: field.fieldKey,
                    label: field.label,
                    field_type: field.type,
                    page: field.page,
                    x: field.x,
                    y: field.y,
                    width: field.width,
                    height: field.height,
                    required: field.required,
                    role_key: field.roleKey || null,
                    default_value: field.defaultValue || null
                }))
            );
            if (fieldError) throw fieldError;
        }

        const { error: templateError } = await supabaseAdmin
            .from('company_contract_templates')
            .update({ updated_at: now })
            .eq('id', id);
        if (templateError) throw templateError;

        createdVersionId = null;
        return ok({ versionId: newVersion.id, saved: true, updatedAt: now });
    } catch (error) {
        if (createdVersionId) {
            const { error: cleanupError } = await supabaseAdmin
                .from('company_contract_template_versions')
                .delete()
                .eq('id', createdVersionId);
            if (cleanupError) console.error('Electronic contract template version cleanup error:', cleanupError);
        }
        console.error('Electronic contract template version PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿 버전을 저장하지 못했습니다.');
    }
}
