import type { ManualPromotedLocationDraft, ManualPromotedOperationProperty } from '@/lib/manual-promoted-operations';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { OpeningProjectTask } from '@/lib/franchise-opening-projects';
import type {
    AuthUser,
    FranchiseLocation,
    FranchiseLocationStatus,
    FranchiseOpeningProject,
    LocationFormState,
    OpeningProjectDraft
} from './types';

type RequestScope = {
    readonly userId: string;
    readonly companyName: string;
};

type SaveBrandMasterParams = RequestScope & {
    readonly form: LocationFormState;
};

type SaveLocationParams = RequestScope & {
    readonly form: LocationFormState;
};

type CreateManualPromotedLocationParams = RequestScope & {
    readonly draft: ManualPromotedLocationDraft;
};

type UpdateLocationStatusParams = RequestScope & {
    readonly locationId: string;
    readonly status: FranchiseLocationStatus;
};

type DeleteLocationParams = RequestScope & {
    readonly locationId: string;
};

type ScanLocationCompetitorsParams = RequestScope & {
    readonly locationId: string;
    readonly query: string;
};

type SaveOpeningProjectParams = RequestScope & {
    readonly draft: OpeningProjectDraft;
};

type UpdateOpeningProjectTaskParams = RequestScope & {
    readonly projectId: string;
    readonly tasks: readonly OpeningProjectTask[];
};

type DeleteOpeningProjectParams = RequestScope & {
    readonly projectId: string;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
}

async function readJsonSafely(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch (error) {
        if (error instanceof SyntaxError) return {};
        throw error;
    }
}

async function readResponsePayload(response: Response): Promise<unknown> {
    const payload = await readJsonSafely(response);
    if (!response.ok) throw new Error(readApiError(payload));
    return payload;
}

export function readStoredUser(): AuthUser {
    const stored = localStorage.getItem('user');
    if (!stored) return {};
    try {
        const parsed: unknown = JSON.parse(stored);
        if (!isRecord(parsed)) return {};
        return {
            id: readStringField(parsed, 'id'),
            uid: readStringField(parsed, 'uid'),
            role: readStringField(parsed, 'role'),
            companyName: readStringField(parsed, 'companyName'),
            company_name: readStringField(parsed, 'company_name')
        };
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Failed to parse stored user:', error);
            return {};
        }
        throw error;
    }
}

export async function fetchFranchiseLocations(scope: RequestScope): Promise<FranchiseLocation[]> {
    const params = new URLSearchParams({ requesterId: scope.userId });
    if (scope.companyName) params.set('company', scope.companyName);
    const response = await fetch(`/api/franchise-locations?${params.toString()}`, { cache: 'no-store' });
    const payload = await readResponsePayload(response);
    const data = unwrapApiData<{ locations: FranchiseLocation[] }>(payload);
    return data.locations || [];
}

export async function fetchOpeningProjects(scope: RequestScope): Promise<FranchiseOpeningProject[]> {
    const params = new URLSearchParams({ requesterId: scope.userId });
    if (scope.companyName) params.set('company', scope.companyName);
    const response = await fetch(`/api/franchise-opening-projects?${params.toString()}`, { cache: 'no-store' });
    const payload = await readResponsePayload(response);
    const data = unwrapApiData<{ projects: FranchiseOpeningProject[] }>(payload);
    return data.projects || [];
}

export async function fetchManualPromotedProperties(scope: RequestScope): Promise<ManualPromotedOperationProperty[]> {
    const params = new URLSearchParams({ requesterId: scope.userId, limit: 'all' });
    if (scope.companyName) params.set('company', scope.companyName);
    const response = await fetch(`/api/properties?${params.toString()}`, { cache: 'no-store' });
    const payload = await readResponsePayload(response);
    return unwrapApiData<ManualPromotedOperationProperty[]>(payload) || [];
}

export async function saveBrandMaster({ userId, companyName, form }: SaveBrandMasterParams): Promise<void> {
    if (!form.brand.trim()) return;
    const response = await fetch('/api/franchise-brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requesterId: userId,
            companyName,
            brandName: form.brand,
            industry: form.industry,
            businessType: form.businessType,
            categoryMajor: form.categoryMajor,
            categoryMiddle: form.categoryMiddle,
            categorySmall: form.categorySmall,
            recommendedKeywords: form.competitionKeyword ? [form.competitionKeyword] : []
        })
    });
    if (!response.ok) console.error('Failed to save brand master:', readApiError(await readJsonSafely(response)));
}

export async function saveFranchiseLocation({ userId, companyName, form }: SaveLocationParams): Promise<void> {
    const response = await fetch('/api/franchise-locations', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, requesterId: userId, companyName })
    });
    await readResponsePayload(response);
}

export async function saveOpeningProject({ userId, companyName, draft }: SaveOpeningProjectParams): Promise<FranchiseOpeningProject> {
    const response = await fetch('/api/franchise-opening-projects', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, requesterId: userId, companyName })
    });
    const payload = await readResponsePayload(response);
    return unwrapApiData<{ project: FranchiseOpeningProject }>(payload).project;
}

export async function updateOpeningProjectTasks({
    userId,
    projectId,
    tasks
}: UpdateOpeningProjectTaskParams): Promise<FranchiseOpeningProject> {
    const response = await fetch('/api/franchise-opening-projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, requesterId: userId, tasks })
    });
    const payload = await readResponsePayload(response);
    return unwrapApiData<{ project: FranchiseOpeningProject }>(payload).project;
}

export async function deleteOpeningProject({ userId, projectId }: DeleteOpeningProjectParams): Promise<void> {
    const params = new URLSearchParams({ id: projectId, requesterId: userId });
    const response = await fetch(`/api/franchise-opening-projects?${params.toString()}`, { method: 'DELETE' });
    await readResponsePayload(response);
}

export async function createManualPromotedLocation({
    userId,
    companyName,
    draft
}: CreateManualPromotedLocationParams): Promise<void> {
    const response = await fetch('/api/franchise-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, requesterId: userId, companyName })
    });
    await readResponsePayload(response);
}

export async function updateFranchiseLocationStatus({
    userId,
    locationId,
    status
}: UpdateLocationStatusParams): Promise<void> {
    const response = await fetch('/api/franchise-locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: locationId, requesterId: userId, status })
    });
    await readResponsePayload(response);
}

export async function deleteFranchiseLocation({ userId, locationId }: DeleteLocationParams): Promise<void> {
    const params = new URLSearchParams({ id: locationId, requesterId: userId });
    const response = await fetch(`/api/franchise-locations?${params.toString()}`, { method: 'DELETE' });
    await readResponsePayload(response);
}

export async function scanFranchiseLocationCompetitors({
    userId,
    locationId,
    query
}: ScanLocationCompetitorsParams): Promise<void> {
    const response = await fetch('/api/franchise-locations/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: userId, locationId, query, radius: 700 })
    });
    await readResponsePayload(response);
}
