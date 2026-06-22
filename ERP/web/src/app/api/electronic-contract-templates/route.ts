import { canAccessCompanyScope, getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    COMPANY_TEMPLATE_DEFAULT_ROLES,
    type CompanyTemplateStatus
} from '@/lib/electronic-contracts/company-template';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canManageTemplate,
    fetchTemplateVersions,
    isRecord,
    latestVersionForTemplate,
    textValue,
    type ContractTemplateRow
} from './templateApi';

export const dynamic = 'force-dynamic';

type TemplateView = {
    readonly id: string;
    readonly companyId: string;
    readonly name: string;
    readonly description: string;
    readonly status: string;
    readonly activeVersionId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly createdByName: string;
    readonly latestVersion: {
        readonly id: string;
        readonly versionNumber: number;
        readonly status: string;
        readonly sourceFileName: string;
        readonly sourceFileUrl: string;
        readonly sourceFileSize: number;
        readonly pageCount: number;
        readonly ucansignTemplateId: string;
    } | null;
};

type CreatorProfileRow = {
    readonly id: string;
    readonly name: string | null;
    readonly email: string | null;
};

function normalizeStatus(value: string | null): CompanyTemplateStatus | null {
    if (value === 'draft' || value === 'active' || value === 'archived') return value;
    return null;
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { searchParams } = new URL(request.url);
        const status = normalizeStatus(searchParams.get('status'));
        const requestedCompanyId = searchParams.get('companyId');
        const companyId = isAdmin(requester) && requestedCompanyId ? requestedCompanyId : requester.company_id;
        if (!companyId && !isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Company scope is required');

        let query = supabaseAdmin
            .from('company_contract_templates')
            .select('id, company_id, name, description, status, active_version_id, created_by, created_at, updated_at');
        if (companyId) query = query.eq('company_id', companyId);
        if (status) query = query.eq('status', status);

        const { data, error } = await query
            .order('updated_at', { ascending: false })
            .returns<ContractTemplateRow[]>();
        if (error) throw error;

        const templates = (data || []).filter(template => canAccessCompanyScope(requester, template.company_id));
        const versions = await fetchTemplateVersions(supabaseAdmin, templates.map(template => template.id));
        const creatorIds = [...new Set(templates.flatMap(template => template.created_by ? [template.created_by] : []))];
        const { data: creators, error: creatorError } = creatorIds.length > 0
            ? await supabaseAdmin
                .from('profiles')
                .select('id, name, email')
                .in('id', creatorIds)
                .returns<CreatorProfileRow[]>()
            : { data: [], error: null };
        if (creatorError) throw creatorError;

        const creatorNames = new Map(
            (creators || []).map(profile => [profile.id, profile.name || profile.email || '-'])
        );

        const views: readonly TemplateView[] = templates.map(template => {
            const latestVersion = latestVersionForTemplate(versions, template.id);
            return {
                id: template.id,
                companyId: template.company_id,
                name: template.name,
                description: template.description || '',
                status: template.status || 'draft',
                activeVersionId: template.active_version_id || '',
                createdAt: template.created_at || '',
                updatedAt: template.updated_at || '',
                createdByName: template.created_by ? creatorNames.get(template.created_by) || '-' : '-',
                latestVersion: latestVersion ? {
                    id: latestVersion.id,
                    versionNumber: latestVersion.version_number || 1,
                    status: latestVersion.status || 'draft',
                    sourceFileName: latestVersion.source_file_name || '',
                    sourceFileUrl: latestVersion.source_file_url || '',
                    sourceFileSize: latestVersion.source_file_size || 0,
                    pageCount: latestVersion.page_count || 1,
                    ucansignTemplateId: latestVersion.ucansign_template_id || ''
                } : null
            };
        });

        return ok({ templates: views });
    } catch (error) {
        console.error('Electronic contract templates GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid template payload');

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const requestedCompanyId = textValue(body, 'companyId');
        const companyId = isAdmin(requester) && requestedCompanyId ? requestedCompanyId : requester.company_id;
        if (!companyId) return fail(403, 'FORBIDDEN', 'Company scope is required');
        if (!canManageTemplate(requester, companyId)) return fail(403, 'FORBIDDEN', '템플릿을 관리할 권한이 없습니다.');

        const name = textValue(body, 'name');
        if (!name) return fail(400, 'VALIDATION_ERROR', '템플릿명이 필요합니다.');

        const now = new Date().toISOString();
        const { data: template, error: templateError } = await supabaseAdmin
            .from('company_contract_templates')
            .insert({
                company_id: companyId,
                name,
                description: textValue(body, 'description') || null,
                status: 'draft',
                created_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('id, company_id, name, description, status, active_version_id, created_by, created_at, updated_at')
            .single<ContractTemplateRow>();
        if (templateError || !template) throw templateError || new Error('Template insert failed');

        const { data: version, error: versionError } = await supabaseAdmin
            .from('company_contract_template_versions')
            .insert({
                template_id: template.id,
                company_id: companyId,
                version_number: 1,
                status: 'draft',
                page_count: 1,
                created_by: requester.id,
                created_at: now,
                updated_at: now
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (versionError || !version) throw versionError || new Error('Template version insert failed');

        const roleRows = COMPANY_TEMPLATE_DEFAULT_ROLES.map(role => ({
            template_version_id: version.id,
            role_key: role.roleKey,
            label: role.label,
            signing_order: role.signingOrder,
            required: role.required
        }));
        const { error: roleError } = await supabaseAdmin.from('company_contract_template_roles').insert(roleRows);
        if (roleError) throw roleError;

        return ok({ templateId: template.id, versionId: version.id, status: 'draft' }, 201);
    } catch (error) {
        console.error('Electronic contract templates POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿을 생성하지 못했습니다.');
    }
}
