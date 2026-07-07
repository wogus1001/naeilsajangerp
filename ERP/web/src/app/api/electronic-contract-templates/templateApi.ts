import type { SupabaseClient } from '@supabase/supabase-js';
import { canAccessCompanyScope, isAdmin, type RequesterProfile } from '@/lib/api-auth';

export type ContractTemplateRow = {
    readonly id: string;
    readonly company_id: string;
    readonly name: string;
    readonly description: string | null;
    readonly status: string | null;
    readonly active_version_id: string | null;
    readonly created_by: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
};

export type ContractTemplateVersionRow = {
    readonly id: string;
    readonly template_id: string;
    readonly company_id: string;
    readonly version_number: number | null;
    readonly status: string | null;
    readonly source_file_url: string | null;
    readonly source_file_path: string | null;
    readonly source_file_name: string | null;
    readonly source_file_size: number | null;
    readonly page_count: number | null;
    readonly ucansign_template_id: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
};

export type TemplateRoleRow = {
    readonly id: string;
    readonly template_version_id: string;
    readonly role_key: string;
    readonly label: string;
    readonly signing_order: number | null;
    readonly required: boolean | null;
};

export type TemplateFieldRow = {
    readonly id: string;
    readonly template_version_id: string;
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

export type TemplateAccess = {
    readonly ok: true;
    readonly template: ContractTemplateRow;
} | {
    readonly ok: false;
    readonly status: 403 | 404;
    readonly message: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function textValue(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

export function numberValue(record: Record<string, unknown>, key: string, fallback: number): number {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

export function canManageTemplate(requester: RequesterProfile | null, companyId: string): boolean {
    if (!requester) return false;
    if (isAdmin(requester)) return true;
    if (requester.role !== 'manager' && requester.role !== 'sub_manager') return false;
    return canAccessCompanyScope(requester, companyId);
}

export async function fetchTemplateForRequester(
    supabaseAdmin: SupabaseClient,
    requester: RequesterProfile,
    templateId: string
): Promise<TemplateAccess> {
    const { data, error } = await supabaseAdmin
        .from('company_contract_templates')
        .select('id, company_id, name, description, status, active_version_id, created_by, created_at, updated_at')
        .eq('id', templateId)
        .maybeSingle<ContractTemplateRow>();

    if (error) throw error;
    if (!data) return { ok: false, status: 404, message: '템플릿을 찾을 수 없습니다.' };
    if (!canAccessCompanyScope(requester, data.company_id)) {
        return { ok: false, status: 403, message: '템플릿을 조회할 권한이 없습니다.' };
    }
    return { ok: true, template: data };
}

export async function fetchTemplateVersions(
    supabaseAdmin: SupabaseClient,
    templateIds: readonly string[]
): Promise<readonly ContractTemplateVersionRow[]> {
    if (templateIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
        .from('company_contract_template_versions')
        .select('id, template_id, company_id, version_number, status, source_file_url, source_file_path, source_file_name, source_file_size, page_count, ucansign_template_id, created_at, updated_at')
        .in('template_id', templateIds)
        .order('version_number', { ascending: false })
        .returns<ContractTemplateVersionRow[]>();
    if (error) throw error;
    return data || [];
}

export async function fetchVersionDetails(
    supabaseAdmin: SupabaseClient,
    versionId: string
): Promise<{
    readonly version: ContractTemplateVersionRow | null;
    readonly roles: readonly TemplateRoleRow[];
    readonly fields: readonly TemplateFieldRow[];
}> {
    const { data: version, error: versionError } = await supabaseAdmin
        .from('company_contract_template_versions')
        .select('id, template_id, company_id, version_number, status, source_file_url, source_file_path, source_file_name, source_file_size, page_count, ucansign_template_id, created_at, updated_at')
        .eq('id', versionId)
        .maybeSingle<ContractTemplateVersionRow>();
    if (versionError) throw versionError;
    if (!version) return { version: null, roles: [], fields: [] };

    const [{ data: roles, error: roleError }, { data: fields, error: fieldError }] = await Promise.all([
        supabaseAdmin
            .from('company_contract_template_roles')
            .select('id, template_version_id, role_key, label, signing_order, required')
            .eq('template_version_id', versionId)
            .order('signing_order', { ascending: true })
            .returns<TemplateRoleRow[]>(),
        supabaseAdmin
            .from('company_contract_template_fields')
            .select('id, template_version_id, field_key, label, field_type, page, x, y, width, height, required, role_key, default_value')
            .eq('template_version_id', versionId)
            .order('page', { ascending: true })
            .order('y', { ascending: true })
            .returns<TemplateFieldRow[]>()
    ]);
    if (roleError) throw roleError;
    if (fieldError) throw fieldError;
    return { version, roles: roles || [], fields: fields || [] };
}

export function latestVersionForTemplate(
    versions: readonly ContractTemplateVersionRow[],
    templateId: string
): ContractTemplateVersionRow | null {
    return versions.find(version => version.template_id === templateId) || null;
}
