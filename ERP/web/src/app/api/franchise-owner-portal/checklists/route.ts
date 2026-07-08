import { fail, ok } from '@/lib/api-response';
import {
    DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS,
    cleanOwnerText,
    isOwnerRecord,
    mergeOwnerPortalChecklistTasksIntoLocationData,
    normalizeOwnerPortalChecklistTasks,
    readOwnerPortalChecklistTasksFromLocationData,
    type OwnerPortalChecklistTask
} from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerPortalSchemaError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth,
    type OwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

type LocationChecklistRow = {
    readonly id: string;
    readonly company_id: string;
    readonly name: string | null;
    readonly address: string | null;
    readonly region: string | null;
    readonly status: string | null;
    readonly data: unknown;
};

type LocationChecklistPayload = {
    readonly locationId: string;
    readonly locationName: string;
    readonly address: string;
    readonly status: string;
    readonly tasks: readonly OwnerPortalChecklistTask[];
};

function toChecklistPayload(location: LocationChecklistRow): LocationChecklistPayload {
    return {
        locationId: location.id,
        locationName: location.name || '운영점',
        address: location.address || location.region || '',
        status: location.status || '',
        tasks: readOwnerPortalChecklistTasksFromLocationData(location.data)
    };
}

function readLocationIds(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value
        .map(item => cleanOwnerText(item))
        .filter(item => item.length > 0)));
}

async function fetchCompanyLocations(
    request: Request
): Promise<
    | {
        readonly ok: true;
        readonly auth: OwnerPortalStaffAuth;
        readonly companyId: string;
    }
    | { readonly ok: false; readonly response: Response }
> {
    const authResult = await resolveOwnerPortalStaffAuth(request);
    if (!authResult.ok) return authResult;
    const { searchParams } = new URL(request.url);
    const companyScope = await resolveOwnerPortalCompanyScope(
        authResult.auth,
        searchParams.get('companyId'),
        searchParams.get('company')
    );
    if (!companyScope.ok) return companyScope;
    return { ok: true, auth: authResult.auth, companyId: companyScope.scope.companyId };
}

export async function GET(request: Request) {
    try {
        const scope = await fetchCompanyLocations(request);
        if (!scope.ok) return scope.response;
        const { data, error } = await scope.auth.supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, name, address, region, status, data')
            .eq('company_id', scope.companyId)
            .order('created_at', { ascending: false })
            .returns<LocationChecklistRow[]>();
        if (error) throw error;
        return ok({ checklists: (data || []).map(toChecklistPayload) });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return ok({ checklists: [], schemaReady: false });
        console.error('Owner portal checklists GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 체크리스트를 불러오지 못했습니다.');
    }
}

export async function PUT(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '점주 체크리스트를 수정할 권한이 없습니다.');
        }
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '체크리스트 정보가 필요합니다.');
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            cleanOwnerText(body.companyId),
            cleanOwnerText(body.companyName)
        );
        if (!companyScope.ok) return companyScope.response;
        const locationIds = readLocationIds(body.locationIds);
        if (locationIds.length === 0) return fail(400, 'VALIDATION_ERROR', '운영점을 선택해주세요.');
        const tasks = normalizeOwnerPortalChecklistTasks(body.tasks);
        const nextTasks = tasks.length > 0 ? tasks : DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS;

        const { data: locations, error: locationError } = await authResult.auth.supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, name, address, region, status, data')
            .eq('company_id', companyScope.scope.companyId)
            .in('id', locationIds)
            .returns<LocationChecklistRow[]>();
        if (locationError) throw locationError;
        if (!locations || locations.length !== locationIds.length) {
            return fail(404, 'NOT_FOUND', '선택한 운영점 중 확인할 수 없는 항목이 있습니다.');
        }

        for (const location of locations) {
            const { error } = await authResult.auth.supabaseAdmin
                .from('franchise_locations')
                .update({
                    data: mergeOwnerPortalChecklistTasksIntoLocationData(location.data, nextTasks),
                    updated_at: new Date().toISOString()
                })
                .eq('id', location.id)
                .eq('company_id', companyScope.scope.companyId);
            if (error) throw error;
        }
        return ok({ checklists: locations.map(location => ({ ...toChecklistPayload(location), tasks: nextTasks })) });
    } catch (error) {
        console.error('Owner portal checklists PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 체크리스트를 저장하지 못했습니다.');
    }
}
