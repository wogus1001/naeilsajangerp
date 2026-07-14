import { fail, ok } from '@/lib/api-response';
import {
    assertAssignableProfile,
    cleanString,
    fetchActiveRequester,
    hasOwn,
    isManagerRole,
    isManualSchedule,
    isRecord,
    parseScheduleVisibility,
    readBody,
    transformSchedule,
    valueFor,
    type FranchiseScheduleRouteDependencies,
    type JsonRecord,
    type ScheduleRow
} from './support';

function canMutateManualSchedule(
    requester: { readonly id: string; readonly company_id: string | null; readonly role: string | null },
    schedule: Pick<ScheduleRow, 'assignee_profile_id' | 'company_id' | 'creator_profile_id' | 'source_id' | 'source_type' | 'visibility'>
): Response | null {
    if (requester.company_id !== schedule.company_id) return fail(403, 'FORBIDDEN', 'cross-company access denied');
    if (!isManualSchedule(schedule)) return fail(403, 'FORBIDDEN', 'source schedules must be managed through their workflow');
    if (schedule.visibility === 'personal' && schedule.creator_profile_id !== requester.id) {
        return fail(403, 'FORBIDDEN', 'personal schedules can only be changed by their creator');
    }
    if (isManagerRole(requester.role)) return null;
    if (schedule.creator_profile_id === requester.id || schedule.assignee_profile_id === requester.id) return null;
    return fail(403, 'FORBIDDEN', 'staff can only update their own manual schedules');
}

async function fetchSchedule(
    dependencies: FranchiseScheduleRouteDependencies,
    id: string
): Promise<{ readonly row: ScheduleRow | null; readonly error: unknown }> {
    const { data, error } = await dependencies
        .getSupabaseAdmin()
        .from('franchise_schedules')
        .select('*')
        .eq('id', id)
        .maybeSingle<ScheduleRow>();
    return { error, row: data || null };
}

async function validateMutableTarget(
    request: Request,
    body: JsonRecord,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<{
    readonly requester: { readonly id: string; readonly company_id: string | null; readonly role: string | null };
    readonly row: ScheduleRow;
    readonly response: Response | null;
}> {
    const supabaseAdmin = dependencies.getSupabaseAdmin();
    const access = await fetchActiveRequester(supabaseAdmin, request, dependencies);
    if (access.response) return { requester: { company_id: null, id: '', role: null }, response: access.response, row: nullRow() };
    const requester = access.requester;
    if (!requester) {
        return {
            requester: { company_id: null, id: '', role: null },
            response: fail(401, 'AUTH_REQUIRED', 'authenticated session is required'),
            row: nullRow()
        };
    }
    const id = cleanString(body.id);
    if (!id) return { requester, response: fail(400, 'VALIDATION_ERROR', 'id is required'), row: nullRow() };
    const { row, error } = await fetchSchedule(dependencies, id);
    if (error) throw error;
    if (!row) return { requester, response: fail(404, 'NOT_FOUND', 'schedule not found'), row: nullRow() };
    const mutationError = canMutateManualSchedule(requester, row);
    return { requester, response: mutationError, row };
}

function nullRow(): ScheduleRow {
    return {
        assignee_profile_id: null,
        color: null,
        company_id: null,
        completed_at: null,
        created_at: null,
        creator_profile_id: null,
        date: null,
        details: null,
        due_at: null,
        id: '',
        manager_profile_id: null,
        metadata: null,
        remind_at: null,
        source_id: null,
        source_type: null,
        status: null,
        title: null,
        type: null,
        updated_at: null,
        visibility: null
    };
}

export async function updateSchedule(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<Response> {
    const body = await readBody(request);
    const target = await validateMutableTarget(request, body, dependencies);
    if (target.response) return target.response;
    if (cleanString(valueFor(body, 'sourceType', 'source_type')) || cleanString(valueFor(body, 'sourceId', 'source_id'))) {
        return fail(403, 'FORBIDDEN', 'source links cannot be changed through the public API');
    }
    const canAssign = isManagerRole(target.requester.role);
    const companyId = target.row.company_id || '';
    const visibility = hasOwn(body, 'visibility')
        ? parseScheduleVisibility(body.visibility)
        : parseScheduleVisibility(target.row.visibility) || 'shared';
    if (!visibility) return fail(400, 'VALIDATION_ERROR', 'visibility must be shared or personal');
    if (visibility === 'personal' && target.row.creator_profile_id !== target.requester.id) {
        return fail(403, 'FORBIDDEN', 'only the creator can make a schedule personal');
    }
    const creatorId = visibility === 'personal'
        ? target.requester.id
        : hasOwn(body, 'creatorProfileId') || hasOwn(body, 'creator_profile_id')
        ? cleanString(valueFor(body, 'creatorProfileId', 'creator_profile_id')) || target.row.creator_profile_id
        : target.row.creator_profile_id;
    const assigneeId = visibility === 'personal'
        ? target.requester.id
        : hasOwn(body, 'assigneeProfileId') || hasOwn(body, 'assignee_profile_id')
        ? cleanString(valueFor(body, 'assigneeProfileId', 'assignee_profile_id')) || target.row.assignee_profile_id
        : target.row.assignee_profile_id;
    const managerId = visibility === 'personal'
        ? null
        : hasOwn(body, 'managerProfileId') || hasOwn(body, 'manager_profile_id')
        ? cleanString(valueFor(body, 'managerProfileId', 'manager_profile_id')) || null
        : target.row.manager_profile_id;
    if (!canAssign && (creatorId !== target.requester.id || assigneeId !== target.requester.id || managerId)) {
        return fail(403, 'FORBIDDEN', 'staff can only update their own manual schedules');
    }
    for (const [profileId, managerOnly] of [[creatorId, false], [assigneeId, false], [managerId, true]] as const) {
        const profileError = await assertAssignableProfile(dependencies.getSupabaseAdmin(), profileId, companyId, managerOnly);
        if (profileError) return profileError;
    }
    const updates: JsonRecord = { updated_at: new Date().toISOString() };
    if (hasOwn(body, 'title')) updates.title = cleanString(body.title);
    if (hasOwn(body, 'date')) updates.date = cleanString(body.date);
    if (hasOwn(body, 'status')) updates.status = cleanString(body.status);
    if (hasOwn(body, 'type')) updates.type = cleanString(body.type) || null;
    if (hasOwn(body, 'color')) updates.color = cleanString(body.color) || null;
    if (hasOwn(body, 'details')) updates.details = cleanString(body.details) || null;
    if (hasOwn(body, 'dueAt') || hasOwn(body, 'due_at')) updates.due_at = cleanString(valueFor(body, 'dueAt', 'due_at')) || null;
    if (hasOwn(body, 'remindAt') || hasOwn(body, 'remind_at')) updates.remind_at = cleanString(valueFor(body, 'remindAt', 'remind_at')) || null;
    if (hasOwn(body, 'metadata')) updates.metadata = isRecord(body.metadata) ? body.metadata : {};
    updates.visibility = visibility;
    updates.creator_profile_id = creatorId;
    updates.assignee_profile_id = assigneeId;
    updates.manager_profile_id = managerId;
    const { data, error } = await dependencies.getSupabaseAdmin()
        .from('franchise_schedules')
        .update(updates)
        .eq('id', target.row.id)
        .select('*')
        .single<ScheduleRow>();
    if (error) throw error;
    return ok(transformSchedule(data));
}

export async function completeSchedule(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<Response> {
    const body = await readBody(request);
    const target = await validateMutableTarget(request, body, dependencies);
    if (target.response) return target.response;
    const { data, error } = await dependencies.getSupabaseAdmin()
        .from('franchise_schedules')
        .update({
            completed_at: cleanString(valueFor(body, 'completedAt', 'completed_at')) || new Date().toISOString(),
            status: '완료',
            updated_at: new Date().toISOString()
        })
        .eq('id', target.row.id)
        .select('*')
        .single<ScheduleRow>();
    if (error) throw error;
    return ok(transformSchedule(data));
}

export async function deleteSchedule(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const body: JsonRecord = { id: cleanString(searchParams.get('id')) };
    const target = await validateMutableTarget(request, body, dependencies);
    if (target.response) return target.response;
    const { error } = await dependencies.getSupabaseAdmin()
        .from('franchise_schedules')
        .delete()
        .eq('id', target.row.id);
    if (error) throw error;
    return ok({ deleted: true });
}
