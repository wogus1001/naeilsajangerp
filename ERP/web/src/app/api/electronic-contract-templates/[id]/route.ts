import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    extractUcansignTemplateFields,
    extractUcansignTemplateRoles,
    type CompanyTemplateField,
    type CompanyTemplateRole
} from '@/lib/electronic-contracts/company-template';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getPlatformTemplateDetail } from '@/lib/ucansign/platform-client';
import {
    canManageTemplate,
    fetchTemplateForRequester,
    fetchTemplateVersions,
    fetchVersionDetails,
    isRecord,
    latestVersionForTemplate,
    textValue
} from '../templateApi';

export const dynamic = 'force-dynamic';

const TEMPLATE_BUCKET = 'property-documents';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

type RoleResponseRow = {
    readonly role_key: string;
    readonly label: string;
    readonly signing_order: number | null;
    readonly required: boolean | null;
};

type FieldResponseRow = {
    readonly field_key: string;
    readonly label: string;
    readonly field_type: string;
    readonly page: number | null;
    readonly x: number | null;
    readonly y: number | null;
    readonly width: number | null;
    readonly height: number | null;
    readonly required: boolean | null;
    readonly role_key: string | null;
    readonly default_value: string | null;
};

function roleRows(roles: readonly CompanyTemplateRole[]) {
    return roles.map(role => ({
        role_key: role.roleKey,
        label: role.label,
        signing_order: role.signingOrder,
        required: role.required
    }));
}

function fieldRows(fields: readonly CompanyTemplateField[]) {
    return fields.map(field => ({
        field_key: field.fieldKey,
        label: field.label,
        field_type: field.type,
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        required: field.required,
        role_key: field.roleKey,
        default_value: field.defaultValue || ''
    }));
}

export async function GET(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);

        const versions = await fetchTemplateVersions(supabaseAdmin, [id]);
        const latestVersion = latestVersionForTemplate(versions, id);
        const details = latestVersion ? await fetchVersionDetails(supabaseAdmin, latestVersion.id) : null;
        let roles: readonly RoleResponseRow[] = details?.roles || [];
        let fields: readonly FieldResponseRow[] = details?.fields || [];

        const { searchParams } = new URL(request.url);
        if (searchParams.get('source') === 'ucansign' && latestVersion?.ucansign_template_id) {
            try {
                const providerDetail = await getPlatformTemplateDetail(latestVersion.ucansign_template_id);
                const providerRoles = extractUcansignTemplateRoles(providerDetail);
                const providerFields = extractUcansignTemplateFields(providerDetail);
                if (providerRoles.length > 0) roles = roleRows(providerRoles);
                if (providerFields.length > 0) fields = fieldRows(providerFields);
            } catch (error) {
                console.warn('Failed to fetch UCanSign template configuration:', error);
            }
        }

        return ok({
            template: access.template,
            latestVersion,
            roles,
            fields
        });
    } catch (error) {
        console.error('Electronic contract template detail GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿 정보를 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid template payload');

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿을 수정할 권한이 없습니다.');
        }

        const status = textValue(body, 'status');
        const nextStatus = status === 'draft' || status === 'active' || status === 'archived'
            ? status
            : access.template.status || 'draft';
        const name = textValue(body, 'name') || access.template.name;

        const { error } = await supabaseAdmin
            .from('company_contract_templates')
            .update({
                name,
                description: textValue(body, 'description') || null,
                status: nextStatus,
                archived_at: nextStatus === 'archived' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;

        return ok({ templateId: id, status: nextStatus });
    } catch (error) {
        console.error('Electronic contract template PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿을 수정하지 못했습니다.');
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿을 삭제할 권한이 없습니다.');
        }

        const { count, error: contractError } = await supabaseAdmin
            .from('electronic_contracts')
            .select('id', { count: 'exact', head: true })
            .eq('company_template_id', id);
        if (contractError) throw contractError;

        if ((count || 0) > 0 && access.template.status !== 'archived') {
            const { error: archiveError } = await supabaseAdmin
                .from('company_contract_templates')
                .update({
                    status: 'archived',
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            if (archiveError) throw archiveError;
            return ok({ templateId: id, deleted: false, archived: true });
        }

        const versions = await fetchTemplateVersions(supabaseAdmin, [id]);
        const storagePaths = versions
            .map(version => version.source_file_path)
            .filter((path): path is string => Boolean(path));

        const { error: deleteError } = await supabaseAdmin
            .from('company_contract_templates')
            .delete()
            .eq('id', id);
        if (deleteError) throw deleteError;

        if (storagePaths.length > 0) {
            const { error: storageError } = await supabaseAdmin.storage.from(TEMPLATE_BUCKET).remove(storagePaths);
            if (storageError) console.error('Electronic contract template storage cleanup error:', storageError);
        }

        return ok({ templateId: id, deleted: true, archived: false });
    } catch (error) {
        console.error('Electronic contract template DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿을 삭제하지 못했습니다.');
    }
}
