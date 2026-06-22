import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import type { CompanyTemplateField, CompanyTemplateRole } from '@/lib/electronic-contracts/company-template';

export type CompanyTemplateSummary = {
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

export type CompanyTemplateDetail = {
    readonly template: {
        readonly id: string;
        readonly company_id: string;
        readonly name: string;
        readonly description: string | null;
        readonly status: string | null;
        readonly active_version_id: string | null;
    };
    readonly latestVersion: {
        readonly id: string;
        readonly version_number: number | null;
        readonly source_file_url: string | null;
        readonly source_file_name: string | null;
        readonly source_file_size: number | null;
        readonly page_count: number | null;
        readonly ucansign_template_id: string | null;
    } | null;
    readonly roles: readonly {
        readonly role_key: string;
        readonly label: string;
        readonly signing_order: number | null;
        readonly required: boolean | null;
    }[];
    readonly fields: readonly {
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
    }[];
};

type ApiEnvelope<T> = {
    readonly data?: T;
    readonly message?: string;
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: await getApiAuthHeaders({
            ...(init?.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : {}),
            'Content-Type': 'application/json'
        })
    });
    const payload: ApiEnvelope<T> = await response.json();
    if (!response.ok || !payload.data) throw new Error(payload.message || '요청을 처리하지 못했습니다.');
    return payload.data;
}

export async function fetchCompanyTemplates(): Promise<readonly CompanyTemplateSummary[]> {
    const data = await jsonRequest<{ readonly templates: readonly CompanyTemplateSummary[] }>('/api/electronic-contract-templates');
    return data.templates;
}

export async function createCompanyTemplate(name: string, description: string): Promise<{
    readonly templateId: string;
    readonly versionId: string;
    readonly status: string;
}> {
    return jsonRequest('/api/electronic-contract-templates', {
        method: 'POST',
        body: JSON.stringify({ name, description })
    });
}

export async function copyCompanyTemplate(templateId: string): Promise<{
    readonly templateId: string;
    readonly versionId: string;
    readonly status: string;
}> {
    return jsonRequest(`/api/electronic-contract-templates/${encodeURIComponent(templateId)}/copy`, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export async function fetchCompanyTemplateDetail(
    templateId: string,
    options: { readonly source?: 'stored' | 'ucansign' } = {}
): Promise<CompanyTemplateDetail> {
    const params = new URLSearchParams();
    if (options.source === 'ucansign') params.set('source', 'ucansign');
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return jsonRequest(`/api/electronic-contract-templates/${encodeURIComponent(templateId)}${suffix}`);
}

export async function deleteCompanyTemplate(templateId: string): Promise<{
    readonly deleted: boolean;
    readonly archived: boolean;
}> {
    return jsonRequest(`/api/electronic-contract-templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE'
    });
}

export async function restoreCompanyTemplate(templateId: string, status: 'draft' | 'active'): Promise<void> {
    await jsonRequest(`/api/electronic-contract-templates/${encodeURIComponent(templateId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

export async function saveCompanyTemplateVersion(input: {
    readonly templateId: string;
    readonly versionId: string;
    readonly pageCount: number;
    readonly ucansignTemplateId: string;
    readonly roles: readonly CompanyTemplateRole[];
    readonly fields: readonly CompanyTemplateField[];
}): Promise<void> {
    await jsonRequest(
        `/api/electronic-contract-templates/${encodeURIComponent(input.templateId)}/versions/${encodeURIComponent(input.versionId)}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                pageCount: input.pageCount,
                ucansignTemplateId: input.ucansignTemplateId,
                roles: input.roles,
                fields: input.fields
            })
        }
    );
}

export async function activateCompanyTemplate(templateId: string, versionId: string): Promise<void> {
    await jsonRequest(`/api/electronic-contract-templates/${encodeURIComponent(templateId)}/activate`, {
        method: 'POST',
        body: JSON.stringify({ versionId })
    });
}

export async function startCompanyTemplateUcansignLink(input: {
    readonly templateId: string;
    readonly versionId: string;
}): Promise<{ readonly url: string; readonly mode: 'create' | 'modify' }> {
    return jsonRequest(`/api/electronic-contract-templates/${encodeURIComponent(input.templateId)}/ucansign-link`, {
        method: 'POST',
        body: JSON.stringify({ versionId: input.versionId })
    });
}

export async function uploadCompanyTemplatePdf(input: {
    readonly templateId: string;
    readonly file: File;
    readonly pageCount: number;
}): Promise<void> {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('pageCount', String(input.pageCount));
    const response = await fetch(`/api/electronic-contract-templates/${encodeURIComponent(input.templateId)}/upload`, {
        method: 'POST',
        headers: await getApiAuthHeaders(),
        body: formData
    });
    const payload: ApiEnvelope<unknown> = await response.json();
    if (!response.ok) throw new Error(payload.message || 'PDF 업로드에 실패했습니다.');
}

export async function saveCompanyTemplateDraft(input: {
    readonly templateId: string;
    readonly versionId: string;
    readonly contractId: string;
    readonly inputMode: 'erp' | 'template';
    readonly values: Record<string, string>;
    readonly participants: readonly { readonly roleKey: string; readonly name: string; readonly contact: string }[];
}): Promise<{ readonly contractId: string; readonly status: string; readonly updatedAt: string }> {
    return jsonRequest('/api/electronic-contracts/draft-company-template', {
        method: 'POST',
        body: JSON.stringify(input)
    });
}
