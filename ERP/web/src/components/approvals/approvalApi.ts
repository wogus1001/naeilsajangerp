import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, readApiJson } from '@/utils/apiResponse';
import type {
    ApprovalAction,
    ApprovalDelegation,
    ApprovalDocumentDetail,
    ApprovalDocumentSummary,
    ApprovalFieldValues,
    ApprovalInboxFilter,
    ApprovalLineSelections,
    ApprovalOrganization,
    ApprovalTemplate,
    ApprovalTemplateStep
} from './approvalTypes';
import {
    approvalDetailFromWire,
    approvalDetailTemplateId,
    approvalSummaryFromWire,
    isApprovalRecord
} from './approvalDocumentAdapters';
import { templateFields, templateSteps } from './approvalTemplateAdapters';

export type ApprovalInboxResult = {
    readonly documents: readonly ApprovalDocumentSummary[];
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly delayedTotal: number;
};

export type SaveApprovalDocumentInput = {
    readonly action: 'saveDraft' | 'submit';
    readonly attachments: readonly File[];
    readonly approvalLineSelections: ApprovalLineSelections;
    readonly documentBox: string;
    readonly fieldValues: ApprovalFieldValues;
    readonly retentionPeriod: string;
    readonly securityLevel: string;
    readonly templateId: string;
    readonly title: string;
    readonly documentId?: string;
    readonly readerProfileIds: readonly string[];
    readonly receiverUnitIds: readonly string[];
};

export type SaveApprovalTemplateInput = {
    readonly command: 'save' | 'publish' | 'archive';
    readonly template: ApprovalTemplate;
};

export type ApprovalOrganizationPatch = {
    readonly units?: readonly Partial<ApprovalOrganization['units'][number]>[];
    readonly memberships?: readonly Partial<ApprovalOrganization['memberships'][number]>[];
    readonly roleAssignments?: readonly Partial<ApprovalOrganization['roleAssignments'][number]>[];
};

export type ApprovalDelegationInput = {
    readonly delegatorProfileId?: string;
    readonly delegateProfileId: string;
    readonly actionScope: readonly string[];
    readonly startsAt: string;
    readonly endsAt: string;
    readonly reason: string;
};

type ApprovalTemplateSummary = {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly category: string;
    readonly active: boolean;
    readonly currentVersionId: string | null;
};

type TemplateCollectionResponse = {
    readonly templates: readonly ApprovalTemplateSummary[];
};

type TemplateVersionWire = {
    readonly id: string;
    readonly version: number;
    readonly status: 'draft' | 'published' | 'retired';
    readonly name?: string;
    readonly description?: string;
    readonly category?: string;
    readonly fields: unknown;
    readonly steps: unknown;
};

type TemplateVersionsResponse = {
    readonly versions: readonly TemplateVersionWire[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

async function requestJson<Result>(url: string, init?: RequestInit): Promise<Result> {
    const headers = await getApiAuthHeaders(init?.headers);
    const response = await fetch(url, { ...init, cache: 'no-store', headers });
    if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(readApiError(payload));
    }
    return readApiJson<Result>(response);
}

export function fetchApprovalInbox(
    filter: ApprovalInboxFilter,
    page = 1,
    pageSize = 20
): Promise<ApprovalInboxResult> {
    const params = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
    return requestJson<unknown>(`/api/approvals/inbox?${params.toString()}`).then(value => {
        if (!isApprovalRecord(value) || !Array.isArray(value.documents) || !isApprovalRecord(value.pagination)) {
            throw new Error('전자결재 문서함 응답 형식을 확인할 수 없습니다.');
        }
        const pagination = isApprovalRecord(value.pagination) ? value.pagination : {};
        const summary = isApprovalRecord(value.summary) ? value.summary : {};
        const rawDocuments = value.documents;
        return {
            documents: rawDocuments.map(approvalSummaryFromWire).filter((item): item is ApprovalDocumentSummary => item !== null),
            page: typeof pagination.page === 'number' ? pagination.page : page,
            pageSize: typeof pagination.pageSize === 'number' ? pagination.pageSize : pageSize,
            total: typeof pagination.total === 'number' ? pagination.total : rawDocuments.length,
            delayedTotal: typeof summary.delayedTotal === 'number' ? summary.delayedTotal : 0
        };
    });
}

export async function fetchApprovalDocument(documentId: string): Promise<ApprovalDocumentDetail> {
    const wire = await requestJson<unknown>(`/api/approvals/documents/${encodeURIComponent(documentId)}`);
    const versionFields = isApprovalRecord(wire) ? templateFields(wire.fields) : [];
    const templateId = approvalDetailTemplateId(wire);
    const templates = versionFields.length === 0 && templateId ? await fetchApprovalTemplates(true) : [];
    const fields = versionFields.length > 0 ? versionFields : templates.find(template => template.id === templateId)?.fields ?? [];
    return approvalDetailFromWire(wire, fields);
}

export async function downloadApprovalAttachment(attachment: {
    readonly name: string;
    readonly url?: string;
}): Promise<void> {
    if (!attachment.url) throw new Error('첨부파일 주소를 확인할 수 없습니다.');
    const headers = await getApiAuthHeaders();
    const response = await fetch(attachment.url, { cache: 'no-store', headers });
    if (!response.ok) {
        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
        throw new Error(payload ? readApiError(payload) : '첨부파일을 내려받지 못했습니다.');
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}

export function fetchApprovalTemplates(includeArchived = false): Promise<readonly ApprovalTemplate[]> {
    const params = new URLSearchParams();
    if (includeArchived) params.set('includeInactive', 'true');
    return requestJson<TemplateCollectionResponse>(`/api/approvals/templates?${params.toString()}`)
        .then(async result => Promise.all(result.templates.map(async template => {
            const versions = await requestJson<TemplateVersionsResponse>(`/api/approvals/templates/${encodeURIComponent(template.id)}/versions`);
            const selected = includeArchived
                ? versions.versions[0]
                : versions.versions.find(version => version.id === template.currentVersionId && version.status === 'published');
            return {
                ...template,
                name: selected?.name ?? template.name,
                description: selected?.description ?? template.description,
                category: selected?.category ?? template.category,
                status: template.active
                    ? selected?.status === 'published' ? 'published' as const : 'draft' as const
                    : 'archived' as const,
                version: selected?.version ?? 0,
                fields: templateFields(selected?.fields),
                steps: templateSteps(selected?.steps)
            };
        }))).then(templates => includeArchived ? templates : templates.filter(template => template.status === 'published'));
}

export async function fetchApprovalOrganization(): Promise<ApprovalOrganization> {
    const [organization, delegationData] = await Promise.all([
        requestJson<Omit<ApprovalOrganization, 'delegations'>>('/api/approvals/organization'),
        requestJson<{ readonly delegations: readonly ApprovalDelegation[] }>('/api/approvals/delegations')
    ]);
    return { ...organization, delegations: delegationData.delegations };
}

export function saveApprovalDocument(input: SaveApprovalDocumentInput): Promise<ApprovalDocumentDetail> {
    const documentUrl = input.documentId
        ? `/api/approvals/documents/${encodeURIComponent(input.documentId)}`
        : '/api/approvals/documents';
    return requestJson<{ readonly document: { readonly id: string } }>(documentUrl, {
        method: input.documentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            templateId: input.templateId,
            title: input.title,
            values: input.fieldValues,
            category: input.documentBox,
            securityLevel: input.securityLevel === 'normal' ? 'company' : input.securityLevel,
            body: {
                approvalLineSelections: input.approvalLineSelections,
                documentBox: input.documentBox,
                retentionPeriod: input.retentionPeriod
            },
            readerProfileIds: input.readerProfileIds,
            receiverUnitIds: input.receiverUnitIds
        })
    }).then(async result => {
        for (const file of input.attachments) {
            const form = new FormData();
            form.set('file', file);
            await requestJson(`/api/approvals/documents/${encodeURIComponent(result.document.id)}/attachments`, {
                method: 'POST',
                body: form
            });
        }
        if (input.action === 'submit') {
            await requestJson(`/api/approvals/documents/${encodeURIComponent(result.document.id)}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'submit' })
            });
        }
        return fetchApprovalDocument(result.document.id);
    });
}

export function runApprovalAction(
    documentId: string,
    action: ApprovalAction,
    comment: string
): Promise<ApprovalDocumentDetail> {
    return requestJson<unknown>(`/api/approvals/documents/${encodeURIComponent(documentId)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: comment })
    }).then(() => fetchApprovalDocument(documentId));
}

export async function saveApprovalTemplate(input: SaveApprovalTemplateInput): Promise<ApprovalTemplate> {
    const status = input.command === 'publish' ? 'published' : input.command === 'archive' ? 'archived' : 'draft';
    if (input.command !== 'archive' && !input.template.id) {
        const created = await requestJson<{ readonly template: ApprovalTemplateSummary }>('/api/approvals/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: input.template.category,
                description: input.template.description,
                fields: input.template.fields.map(field => ({ ...field, key: field.id })),
                name: input.template.name,
                status,
                steps: input.template.steps.map(step => ({ ...step, key: step.id }))
            })
        });
        return { ...input.template, ...created.template, status, version: 1 };
    }
    if (input.command !== 'archive') {
        await requestJson(`/api/approvals/templates/${encodeURIComponent(input.template.id)}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: input.template.category,
                description: input.template.description,
                fields: input.template.fields.map(field => ({ ...field, key: field.id })),
                name: input.template.name,
                status,
                steps: input.template.steps.map(step => ({ ...step, key: step.id }))
            })
        });
        return { ...input.template, status, version: input.template.version + 1 };
    }
    const metadata = await requestJson<{ readonly template: ApprovalTemplateSummary }>('/api/approvals/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: input.template.id || undefined,
            name: input.template.name,
            description: input.template.description,
            category: input.template.category,
            active: input.command !== 'archive'
        })
    });
    return { ...input.template, ...metadata.template, status, version: input.template.version };
}

export function saveApprovalOrganization(patch: ApprovalOrganizationPatch): Promise<Omit<ApprovalOrganization, 'delegations'>> {
    return requestJson<ApprovalOrganization>('/api/approvals/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
    });
}

export async function deleteApprovalOrganizationUnit(unitId: string): Promise<void> {
    const params = new URLSearchParams({ entity: 'unit', id: unitId });
    await requestJson(`/api/approvals/organization?${params.toString()}`, { method: 'DELETE' });
}

export async function deleteApprovalMembership(membershipId: string): Promise<void> {
    const params = new URLSearchParams({ entity: 'membership', id: membershipId });
    await requestJson(`/api/approvals/organization?${params.toString()}`, { method: 'DELETE' });
}

export async function deleteApprovalRoleAssignment(roleId: string): Promise<void> {
    const params = new URLSearchParams({ entity: 'role', id: roleId });
    await requestJson(`/api/approvals/organization?${params.toString()}`, { method: 'DELETE' });
}

export function createApprovalDelegation(input: ApprovalDelegationInput): Promise<ApprovalDelegation> {
    return requestJson<{ readonly delegation: ApprovalDelegation }>('/api/approvals/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    }).then(result => result.delegation);
}

export async function deleteApprovalDelegation(delegationId: string): Promise<void> {
    const params = new URLSearchParams({ id: delegationId });
    await requestJson(`/api/approvals/delegations?${params.toString()}`, { method: 'DELETE' });
}
