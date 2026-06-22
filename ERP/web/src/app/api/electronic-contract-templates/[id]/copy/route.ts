import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
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

function copiedTemplateName(name: string): string {
    return `${name} 복사본`;
}

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
            return fail(403, 'FORBIDDEN', '템플릿을 복사할 권한이 없습니다.');
        }

        const latestVersion = latestVersionForTemplate(await fetchTemplateVersions(supabaseAdmin, [id]), id);
        if (!latestVersion) return fail(404, 'NOT_FOUND', '복사할 템플릿 버전이 없습니다.');

        const details = await fetchVersionDetails(supabaseAdmin, latestVersion.id);
        const now = new Date().toISOString();
        const nextStatus = latestVersion.ucansign_template_id ? 'active' : 'draft';
        const nextName = textValue(bodyRecord, 'name') || copiedTemplateName(access.template.name);

        const { data: template, error: templateError } = await supabaseAdmin
            .from('company_contract_templates')
            .insert({
                company_id: access.template.company_id,
                name: nextName,
                description: access.template.description || null,
                status: nextStatus,
                created_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (templateError || !template) throw templateError || new Error('Template copy insert failed');

        const { data: version, error: versionError } = await supabaseAdmin
            .from('company_contract_template_versions')
            .insert({
                template_id: template.id,
                company_id: access.template.company_id,
                version_number: 1,
                status: nextStatus,
                source_file_url: latestVersion.source_file_url || null,
                source_file_path: latestVersion.source_file_path || null,
                source_file_name: latestVersion.source_file_name || null,
                source_file_size: latestVersion.source_file_size || null,
                page_count: latestVersion.page_count || 1,
                ucansign_template_id: latestVersion.ucansign_template_id || null,
                created_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (versionError || !version) throw versionError || new Error('Template version copy insert failed');

        if (details.roles.length > 0) {
            const { error: roleError } = await supabaseAdmin.from('company_contract_template_roles').insert(
                details.roles.map(role => ({
                    template_version_id: version.id,
                    role_key: role.role_key,
                    label: role.label,
                    signing_order: role.signing_order || 1,
                    required: role.required ?? true
                }))
            );
            if (roleError) throw roleError;
        }

        if (details.fields.length > 0) {
            const { error: fieldError } = await supabaseAdmin.from('company_contract_template_fields').insert(
                details.fields.map(field => ({
                    template_version_id: version.id,
                    field_key: field.field_key,
                    label: field.label,
                    field_type: field.field_type,
                    page: field.page || 1,
                    x: field.x || 0,
                    y: field.y || 0,
                    width: field.width || 24,
                    height: field.height || 8,
                    required: field.required ?? false,
                    role_key: field.role_key || null,
                    default_value: field.default_value || null
                }))
            );
            if (fieldError) throw fieldError;
        }

        if (nextStatus === 'active') {
            const { error: activeError } = await supabaseAdmin
                .from('company_contract_templates')
                .update({ active_version_id: version.id, updated_at: now })
                .eq('id', template.id);
            if (activeError) throw activeError;
        }

        return ok({ templateId: template.id, versionId: version.id, status: nextStatus }, 201);
    } catch (error) {
        console.error('Electronic contract template copy error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿을 복사하지 못했습니다.');
    }
}
