import {
    OPENING_PROJECT_STATUSES,
    buildDefaultOpeningProjectTasks,
    updateOpeningProjectTask,
    type OpeningProjectStatus,
    type OpeningProjectTask
} from '@/lib/franchise-opening-projects';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { FranchiseOpeningProject, OpeningProjectDraft } from '../operations/types';
import type { FranchiseLocation } from './types';

type LocationResponse = {
    readonly locations?: readonly FranchiseLocation[];
};

type OpeningProjectResponse = {
    readonly projects?: readonly FranchiseOpeningProject[];
    readonly project?: FranchiseOpeningProject;
};

export function readOpeningProjectStatus(value: string): OpeningProjectStatus {
    return OPENING_PROJECT_STATUSES.find(status => status === value) || '준비중';
}

export function toOpeningProjectDraft(location: FranchiseLocation, project?: FranchiseOpeningProject): OpeningProjectDraft {
    return {
        id: project?.id,
        locationId: location.id,
        status: project?.status || '준비중',
        targetOpenDate: project?.targetOpenDate || location.openedAt || '',
        memo: project?.memo || '',
        tasks: project?.tasks || buildDefaultOpeningProjectTasks()
    };
}

export function patchOpeningProjectTask(
    tasks: readonly OpeningProjectTask[],
    taskId: string,
    patch: Parameters<typeof updateOpeningProjectTask>[2]
) {
    return updateOpeningProjectTask(tasks, taskId, patch);
}

async function readJsonPayload(response: Response): Promise<unknown> {
    const payload: unknown = await response.json().catch(error => {
        if (error instanceof SyntaxError) return {};
        throw error;
    });
    if (!response.ok) throw new Error(readApiError(payload));
    return payload;
}

export async function fetchContractStoreLocation({
    leadId,
    userId,
    companyName
}: {
    readonly leadId: string;
    readonly userId: string;
    readonly companyName: string;
}): Promise<FranchiseLocation | null> {
    const params = new URLSearchParams({ requesterId: userId, contractLeadId: leadId });
    if (companyName) params.set('company', companyName);
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-locations?${params.toString()}`, { cache: 'no-store', headers });
    const payload = await readJsonPayload(response);
    const data = unwrapApiData<LocationResponse>(payload);
    return data.locations?.[0] || null;
}

export async function fetchOpeningProject({
    locationId,
    userId,
    companyName
}: {
    readonly locationId: string;
    readonly userId: string;
    readonly companyName: string;
}): Promise<FranchiseOpeningProject | null> {
    const params = new URLSearchParams({ requesterId: userId, locationId });
    if (companyName) params.set('company', companyName);
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-opening-projects?${params.toString()}`, { cache: 'no-store', headers });
    const payload = await readJsonPayload(response);
    const data = unwrapApiData<OpeningProjectResponse>(payload);
    return data.projects?.[0] || null;
}

export async function saveOpeningProjectDraft({
    draft,
    userId,
    companyName
}: {
    readonly draft: OpeningProjectDraft;
    readonly userId: string;
    readonly companyName: string;
}): Promise<FranchiseOpeningProject> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-opening-projects', {
        method: draft.id ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({ ...draft, requesterId: userId, companyName })
    });
    const payload = await readJsonPayload(response);
    const savedProject = unwrapApiData<OpeningProjectResponse>(payload).project;
    if (!savedProject) throw new Error('오픈 준비 프로젝트 응답이 비어 있습니다.');
    return savedProject;
}
