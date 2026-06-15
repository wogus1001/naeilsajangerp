import { canAccessCompanyResource, canAccessCompanyScope } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildOpeningProjectPayload,
    buildOpeningProjectUpdates,
    cleanString,
    fetchOpeningReadyLocation,
    getFirst,
    getOpeningProjectRequester,
    readOpeningProjectBody,
    resolveOpeningProjectCompanyScope,
    resolveOpeningProjectManagerId,
    transformOpeningProject,
    type OpeningProjectRow
} from '@/lib/franchise-opening-project-api';

export const dynamic = 'force-dynamic';

function getErrorCode(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) return '';
    return typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object' || !('message' in error)) return '';
    return typeof error.message === 'string' ? error.message : '';
}

function isMissingOpeningProjectSchemaError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_opening_projects/i.test(message);
}

function handleOpeningProjectError(error: unknown, action: string) {
    console.error(`Franchise opening projects ${action} error:`, error);
    if (isMissingOpeningProjectSchemaError(error)) {
        return fail(
            424,
            'VALIDATION_ERROR',
            '오픈 준비 프로젝트 테이블이 아직 적용되지 않았습니다. supabase_franchise_opening_projects_migration.sql 적용 후 다시 확인해주세요.'
        );
    }
    return fail(500, 'INTERNAL_ERROR', `Failed to ${action.toLowerCase()} opening project${action === 'GET' ? 's' : ''}`);
}

export async function GET(request: Request) {
    try {
        const { supabaseAdmin, requester } = await getOpeningProjectRequester(request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (id) {
            const { data, error } = await supabaseAdmin
                .from('franchise_opening_projects')
                .select('*')
                .eq('id', id)
                .single();
            const project = data as OpeningProjectRow | null;
            if (error || !project) return fail(404, 'NOT_FOUND', 'Opening project not found');
            if (!canAccessCompanyResource(requester, project)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            return ok({ project: transformOpeningProject(project) });
        }

        const scope = await resolveOpeningProjectCompanyScope(supabaseAdmin, requester, searchParams.get('company'));
        if (scope.error) return scope.error;
        if (scope.empty) return ok({ projects: [] });

        let query = supabaseAdmin
            .from('franchise_opening_projects')
            .select('*')
            .order('target_open_date')
            .order('updated_at', { ascending: false });
        if (scope.companyId) query = query.eq('company_id', scope.companyId);
        if (scope.managerId) query = query.eq('manager_id', scope.managerId);
        if (searchParams.get('locationId')) query = query.eq('location_id', searchParams.get('locationId'));

        const { data, error } = await query;
        if (error) throw error;
        return ok({ projects: ((data || []) as OpeningProjectRow[]).map(transformOpeningProject) });
    } catch (error) {
        return handleOpeningProjectError(error, 'GET');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readOpeningProjectBody(request);
        const { supabaseAdmin, requester } = await getOpeningProjectRequester(request, body);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const locationId = cleanString(getFirst(body, ['locationId', 'location_id']));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', 'locationId is required');

        const locationResult = await fetchOpeningReadyLocation(supabaseAdmin, locationId, requester);
        if (locationResult.error) return locationResult.error;
        const location = locationResult.location;
        if (!canAccessCompanyScope(requester, location.company_id)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');

        const managerResult = await resolveOpeningProjectManagerId(supabaseAdmin, body, requester, location);
        if (managerResult.error) return managerResult.error;

        const { data: existing } = await supabaseAdmin
            .from('franchise_opening_projects')
            .select('*')
            .eq('company_id', location.company_id)
            .eq('location_id', location.id)
            .maybeSingle();
        const existingProject = existing as OpeningProjectRow | null;
        const payload = buildOpeningProjectPayload(body, location, managerResult.managerId, existingProject);
        const requestBuilder = existingProject
            ? supabaseAdmin.from('franchise_opening_projects').update(payload).eq('id', existingProject.id)
            : supabaseAdmin.from('franchise_opening_projects').insert({ ...payload, created_at: payload.updated_at });
        const { data: saved, error } = await requestBuilder.select().single();
        if (error) throw error;
        return ok({ project: transformOpeningProject(saved as OpeningProjectRow) }, existingProject ? 200 : 201);
    } catch (error) {
        return handleOpeningProjectError(error, 'SAVE');
    }
}

export async function PUT(request: Request) {
    try {
        const body = await readOpeningProjectBody(request);
        const { supabaseAdmin, requester } = await getOpeningProjectRequester(request, body);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const id = cleanString(getFirst(body, ['id']));
        if (!id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_opening_projects')
            .select('*')
            .eq('id', id)
            .single();
        const project = existing as OpeningProjectRow | null;
        if (fetchError || !project) return fail(404, 'NOT_FOUND', 'Opening project not found');
        if (!canAccessCompanyResource(requester, project)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        const { data: updated, error } = await supabaseAdmin
            .from('franchise_opening_projects')
            .update(buildOpeningProjectUpdates(body, project))
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return ok({ project: transformOpeningProject(updated as OpeningProjectRow) });
    } catch (error) {
        return handleOpeningProjectError(error, 'UPDATE');
    }
}

export async function DELETE(request: Request) {
    try {
        const { supabaseAdmin, requester } = await getOpeningProjectRequester(request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const id = new URL(request.url).searchParams.get('id');
        if (!id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_opening_projects')
            .select('id, company_id, manager_id')
            .eq('id', id)
            .single();
        const project = existing as Pick<OpeningProjectRow, 'id' | 'company_id' | 'manager_id'> | null;
        if (fetchError || !project) return fail(404, 'NOT_FOUND', 'Opening project not found');
        if (!canAccessCompanyResource(requester, project)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company delete denied');

        const { error } = await supabaseAdmin.from('franchise_opening_projects').delete().eq('id', id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        return handleOpeningProjectError(error, 'DELETE');
    }
}
