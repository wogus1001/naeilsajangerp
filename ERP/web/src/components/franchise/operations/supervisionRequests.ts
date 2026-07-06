import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    buildDefaultInspectionItems,
    type SupervisionInspectionItem,
    type SupervisionPhotoAttachment,
    type SupervisionReportTemplateItem
} from '@/lib/franchise-supervision';
import type { SupervisionReportAiSummary } from '@/lib/franchise-supervision-ai-summary';
import type {
    SupervisionPayload,
    SupervisionScope
} from './supervisionTypes';

type SaveAssignmentInput = SupervisionScope & {
    readonly companyId: string;
    readonly id?: string;
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly memo: string;
    readonly assignedAt: string;
};

type SaveVisitInput = SupervisionScope & {
    readonly companyId: string;
    readonly id?: string;
    readonly assignmentId?: string;
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly visitDate: string;
    readonly purpose: string;
    readonly memo: string;
};

type DeleteVisitInput = SupervisionScope & {
    readonly companyId: string;
    readonly id: string;
};

type SaveReportInput = SupervisionScope & {
    readonly companyId: string;
    readonly reportId?: string;
    readonly visitId: string;
    readonly event: 'saveDraft' | 'submit' | 'approve' | 'reject';
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly templateId?: string;
    readonly specialNote: string;
    readonly rejectReason: string;
    readonly photoFiles: readonly File[];
    readonly existingAttachments: readonly SupervisionPhotoAttachment[];
};

type UpdateActionInput = SupervisionScope & {
    readonly companyId: string;
    readonly id: string;
    readonly status: string;
    readonly memo: string;
};

type SaveTemplateInput = SupervisionScope & {
    readonly companyId: string;
    readonly name: string;
    readonly description: string;
    readonly inspectionItems: readonly SupervisionReportTemplateItem[];
};

type SummarizeReportInput = SupervisionScope & {
    readonly visitId: string;
    readonly transcript: string;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
};

type SummarizeReportResult = {
    readonly summary: SupervisionReportAiSummary;
    readonly model: string;
    readonly fallbackUsed: boolean;
    readonly providerIssue?: string;
};

const SUPERVISION_AI_CLIENT_TIMEOUT_MS = 45_000;

async function readJsonSafely(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch (error) {
        if (error instanceof SyntaxError) return {};
        throw error;
    }
}

async function readPayload(response: Response): Promise<unknown> {
    const payload = await readJsonSafely(response);
    if (!response.ok) throw new Error(readApiError(payload));
    return payload;
}

function buildEmptyPayload(): SupervisionPayload {
    return {
        schemaReady: false,
        canManage: false,
        companyId: '',
        locations: [],
        supervisors: [],
        assignments: [],
        visits: [],
        reports: [],
        reportTemplates: [],
        reportEvents: [],
        correctiveActions: [],
        correctiveActionEvents: [],
        operationQueue: [],
        summary: {
            todayVisitCount: 0,
            weekVisitCount: 0,
            missingReportCount: 0,
            pendingApprovalCount: 0,
            activeCorrectiveActionCount: 0
        }
    };
}

function safeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'photo';
}

export async function fetchSupervisionData(scope: SupervisionScope): Promise<SupervisionPayload> {
    const params = new URLSearchParams({ requesterId: scope.userId });
    if (scope.companyName) params.set('company', scope.companyName);
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-supervision?${params.toString()}`, { cache: 'no-store', headers });
    const payload = await readPayload(response);
    return { ...buildEmptyPayload(), ...unwrapApiData<Partial<SupervisionPayload>>(payload) };
}

export async function saveSupervisionAssignment(input: SaveAssignmentInput): Promise<void> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const method = input.id ? 'PATCH' : 'POST';
    const response = await fetch('/api/franchise-supervision/assignments', {
        method,
        headers,
        body: JSON.stringify({
            id: input.id,
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName,
            locationId: input.locationId,
            supervisorProfileId: input.supervisorProfileId,
            regionScope: '',
            memo: input.memo,
            assignedAt: input.assignedAt
        })
    });
    await readPayload(response);
}

export async function saveSupervisionVisit(input: SaveVisitInput): Promise<void> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const method = input.id ? 'PATCH' : 'POST';
    const response = await fetch('/api/franchise-supervision/visits', {
        method,
        headers,
        body: JSON.stringify({
            id: input.id,
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName,
            assignmentId: input.assignmentId,
            locationId: input.locationId,
            supervisorProfileId: input.supervisorProfileId,
            visitDate: input.visitDate,
            purpose: input.purpose,
            memo: input.memo
        })
    });
    await readPayload(response);
}

export async function deleteSupervisionVisit(input: DeleteVisitInput): Promise<void> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-supervision/visits', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
            id: input.id,
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName
        })
    });
    await readPayload(response);
}

async function uploadReportPhotos(input: {
    readonly companyId: string;
    readonly reportId: string;
    readonly files: readonly File[];
}): Promise<readonly SupervisionPhotoAttachment[]> {
    const uploaded: SupervisionPhotoAttachment[] = [];
    for (const file of input.files) {
        const formData = new FormData();
        const path = `franchise-supervision/${input.companyId}/${input.reportId}/${Date.now()}-${safeFileName(file.name)}`;
        formData.set('bucket', 'property-documents');
        formData.set('companyId', input.companyId);
        formData.set('path', path);
        formData.set('file', file);
        const headers = await getApiAuthHeaders();
        const response = await fetch('/api/upload', { method: 'POST', headers, body: formData });
        const payload = await readPayload(response);
        const data = unwrapApiData<{ readonly path?: string; readonly publicUrl?: string }>(payload);
        uploaded.push({
            name: file.name,
            path: data.path || path,
            publicUrl: data.publicUrl || '',
            size: file.size,
            contentType: file.type
        });
    }
    return uploaded;
}

export async function saveSupervisionReport(input: SaveReportInput): Promise<void> {
    const method = input.reportId ? 'PATCH' : 'POST';
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-supervision/reports', {
        method,
        headers,
        body: JSON.stringify({
            id: input.reportId,
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName,
            visitId: input.visitId,
            event: input.event,
            inspectionItems: input.inspectionItems.length > 0 ? input.inspectionItems : buildDefaultInspectionItems(),
            templateId: input.templateId,
            specialNote: input.specialNote,
            rejectReason: input.rejectReason,
            photoAttachments: input.existingAttachments
        })
    });
    const payload = await readPayload(response);
    const saved = unwrapApiData<{ readonly id?: string }>(payload);
    const reportId = input.reportId || saved.id || '';
    if (!reportId || input.photoFiles.length === 0) return;

    const attachments = [
        ...input.existingAttachments,
        ...await uploadReportPhotos({ companyId: input.companyId, reportId, files: input.photoFiles })
    ];
    const patchResponse = await fetch('/api/franchise-supervision/reports', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            id: reportId,
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName,
            event: input.event,
            attachmentsOnly: true,
            photoAttachments: attachments
        })
    });
    await readPayload(patchResponse);
}

export async function saveSupervisionTemplate(input: SaveTemplateInput): Promise<void> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-supervision/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName,
            name: input.name,
            description: input.description,
            inspectionItems: input.inspectionItems
        })
    });
    await readPayload(response);
}

export async function updateCorrectiveAction(input: UpdateActionInput): Promise<void> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-supervision/actions', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            requesterId: input.userId,
            companyId: input.companyId,
            companyName: input.companyName,
            id: input.id,
            status: input.status,
            memo: input.memo
        })
    });
    await readPayload(response);
}

export async function summarizeSupervisionReportRequest(input: SummarizeReportInput): Promise<SummarizeReportResult> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), SUPERVISION_AI_CLIENT_TIMEOUT_MS);
    try {
        const response = await fetch('/api/franchise-supervision/reports/ai-summary', {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
                requesterId: input.userId,
                companyName: input.companyName,
                visitId: input.visitId,
                transcript: input.transcript,
                inspectionItems: input.inspectionItems
            })
        });
        const payload = await readPayload(response);
        return unwrapApiData<SummarizeReportResult>(payload);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('AI 정리 요청이 45초 안에 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }
        throw error;
    } finally {
        globalThis.clearTimeout(timeout);
    }
}
