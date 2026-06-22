import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canManageTemplate,
    fetchTemplateForRequester,
    fetchTemplateVersions,
    fetchVersionDetails,
    latestVersionForTemplate
} from '../../templateApi';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿 버전을 생성할 권한이 없습니다.');
        }

        const versions = await fetchTemplateVersions(supabaseAdmin, [id]);
        const latestVersion = latestVersionForTemplate(versions, id);
        const latestDetails = latestVersion ? await fetchVersionDetails(supabaseAdmin, latestVersion.id) : null;
        const nextVersionNumber = versions.reduce((max, version) => Math.max(max, version.version_number || 1), 0) + 1;
        const now = new Date().toISOString();

        const { data: version, error: versionError } = await supabaseAdmin
            .from('company_contract_template_versions')
            .insert({
                template_id: id,
                company_id: access.template.company_id,
                version_number: nextVersionNumber,
                status: 'draft',
                source_file_url: latestVersion?.source_file_url || null,
                source_file_path: latestVersion?.source_file_path || null,
                source_file_name: latestVersion?.source_file_name || null,
                source_file_size: latestVersion?.source_file_size || null,
                page_count: latestVersion?.page_count || 1,
                ucansign_template_id: latestVersion?.ucansign_template_id || null,
                created_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (versionError || !version) throw versionError || new Error('Version insert failed');

        if (latestDetails?.roles.length) {
            const { error: roleError } = await supabaseAdmin.from('company_contract_template_roles').insert(
                latestDetails.roles.map(role => ({
                    template_version_id: version.id,
                    role_key: role.role_key,
                    label: role.label,
                    signing_order: role.signing_order || 1,
                    required: role.required ?? true
                }))
            );
            if (roleError) throw roleError;
        }
        if (latestDetails?.fields.length) {
            const { error: fieldError } = await supabaseAdmin.from('company_contract_template_fields').insert(
                latestDetails.fields.map(field => ({
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
                    role_key: field.role_key,
                    default_value: field.default_value
                }))
            );
            if (fieldError) throw fieldError;
        }

        return ok({ versionId: version.id, versionNumber: nextVersionNumber }, 201);
    } catch (error) {
        console.error('Electronic contract template version POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿 버전을 생성하지 못했습니다.');
    }
}
