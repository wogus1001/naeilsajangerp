import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { isMissingWorkflowSchemaError } from '@/lib/franchise-workflow';
import { canReadSchedule } from '@/lib/schedule-access';
import {
    completeWorkflowSchedule,
    upsertWorkflowSchedule,
    type JsonRecord,
    type WorkflowScheduleRow
} from '@/lib/franchise-workflow-store';

type ScheduleRow = WorkflowScheduleRow & {
    readonly customer_id?: string | null;
    readonly property_id?: string | null;
    readonly business_card_id?: string | null;
    readonly user?: { readonly name: string | null } | null;
    readonly company?: { readonly name: string | null } | null;
};

type ScheduleAccessRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly user_id: string | null;
    readonly scope: string | null;
    readonly source_type: string | null;
    readonly source_id: string | null;
    readonly assignee_profile_id: string | null;
    readonly manager_profile_id: string | null;
};

type ProfileScopeRow = {
    readonly company_id: string | null;
    readonly role: string | null;
    readonly status: string | null;
};

const PUBLIC_WORKFLOW_SOURCE_TYPES = new Set(['manual-workflow']);

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function hasOwn(body: JsonRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(body, key);
}

function transformSchedule(row: ScheduleRow | null) {
    if (!row) return null;

    return {
        id: row.id,
        title: row.title,
        date: row.date,
        scope: row.scope,
        status: row.status,
        type: row.type,
        color: row.color,
        details: row.details,
        customerId: row.customer_id,
        propertyId: row.property_id,
        businessCardId: row.business_card_id,
        userId: row.user_id,
        userName: row.user?.name || 'Unknown',
        companyName: row.company?.name || '',
        sourceType: row.source_type || '',
        sourceId: row.source_id || '',
        assigneeProfileId: row.assignee_profile_id || '',
        managerProfileId: row.manager_profile_id || '',
        dueAt: row.due_at,
        remindAt: row.remind_at,
        completedAt: row.completed_at,
        metadata: isRecord(row.metadata) ? row.metadata : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function failWorkflowSchema(error: unknown, fallbackMessage: string): Response {
    if (isMissingWorkflowSchemaError(error)) {
        return fail(500, 'INTERNAL_ERROR', '공통 일정/결재 SQL이 아직 적용되지 않았습니다. supabase_franchise_approval_calendar_migration.sql 등록이 필요합니다.');
    }
    return fail(500, 'INTERNAL_ERROR', fallbackMessage);
}

function canWriteSchedule(requester: RequesterProfile, schedule: { company_id: string | null; user_id: string | null; scope: string | null }) {
    if (isAdmin(requester)) return true;

    if (schedule.scope === 'personal') {
        return !!schedule.user_id && schedule.user_id === requester.id;
    }

    if (requester.company_id && schedule.company_id && requester.company_id === schedule.company_id) {
        return true;
    }

    return !!schedule.user_id && schedule.user_id === requester.id;
}

function canManageWorkflowSchedules(requester: RequesterProfile): boolean {
    return requester.role === 'admin' || requester.role === 'manager';
}

function isPublicWorkflowSourceType(sourceType: string): boolean {
    return PUBLIC_WORKFLOW_SOURCE_TYPES.has(sourceType);
}

function touchesWorkflowFields(body: JsonRecord): boolean {
    return ['sourceType', 'sourceId', 'assigneeProfileId', 'managerProfileId', 'dueAt', 'remindAt', 'metadata'].some(key => hasOwn(body, key));
}

function canCompleteSchedule(requester: RequesterProfile, schedule: ScheduleAccessRow): boolean {
    if (schedule.source_type === 'approval-document') return false;
    if (!schedule.source_type) return canWriteSchedule(requester, schedule);
    if (canManageWorkflowSchedules(requester) && canAccessCompanyScope(requester, schedule.company_id)) return true;
    return schedule.assignee_profile_id === requester.id ||
        schedule.manager_profile_id === requester.id ||
        schedule.user_id === requester.id;
}

async function fetchProfileScope(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    profileId: string
): Promise<ProfileScopeRow | null> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('company_id, role, status')
        .eq('id', profileId)
        .maybeSingle<ProfileScopeRow>();
    if (error) throw error;
    return data || null;
}

async function ensureActiveProfileInCompany(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    profileId: string | null,
    companyId: string,
    message: string,
    roleRestricted = false
): Promise<Response | null> {
    if (!profileId) return null;
    const profile = await fetchProfileScope(supabaseAdmin, profileId);
    if (!profile || profile.company_id !== companyId || profile.status !== 'active') {
        return fail(403, 'FORBIDDEN', message);
    }
    if (roleRestricted && profile.role !== 'admin' && profile.role !== 'manager') {
        return fail(403, 'FORBIDDEN', message);
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const company = searchParams.get('company');
        const userIdParam = searchParams.get('userId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const status = searchParams.get('status');
        const sourceType = searchParams.get('sourceType');
        const assigneeProfileId = searchParams.get('assigneeProfileId');
        const managerProfileId = searchParams.get('managerProfileId');

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const requestedUserId = userIdParam ? await resolveUserUuid(supabaseAdmin, userIdParam) : null;
        if (requestedUserId && !isAdmin(requesterProfile) && requestedUserId !== requesterProfile.id) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cannot query another user personal schedule');
        }

        let targetCompanyId: string | null = null;
        if (company) {
            targetCompanyId = await resolveCompanyIdByName(supabaseAdmin, company);
            if (!targetCompanyId) {
                return ok([]);
            }

            if (!isAdmin(requesterProfile) && requesterProfile.company_id !== targetCompanyId) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            }
        }

        let query = supabaseAdmin
            .from('schedules')
            .select('*, user:profiles(name), company:companies(name)')
            .order('date', { ascending: true })
            .order('created_at', { ascending: true });

        if (isAdmin(requesterProfile)) {
            if (targetCompanyId) {
                query = query.eq('company_id', targetCompanyId);
            }
        } else if (requesterProfile.company_id) {
            query = query.eq('company_id', requesterProfile.company_id);
        } else {
            query = query.eq('user_id', requesterProfile.id);
        }

        if (dateFrom) query = query.gte('date', dateFrom);
        if (dateTo) query = query.lte('date', dateTo);
        if (status) query = query.eq('status', status);
        if (sourceType) query = query.eq('source_type', sourceType);
        if (assigneeProfileId) query = query.eq('assignee_profile_id', assigneeProfileId);
        if (managerProfileId) query = query.eq('manager_profile_id', managerProfileId);

        const { data, error } = await query;
        if (error) throw error;

        let result = (data || []).filter((row: ScheduleRow) => canReadSchedule(requesterProfile, {
            assigneeProfileId: row.assignee_profile_id,
            companyId: row.company_id,
            metadata: row.metadata,
            scope: row.scope,
            sourceType: row.source_type,
            userId: row.user_id
        }));

        if (requestedUserId) {
            result = result.filter((row: ScheduleRow) => {
                if (row.scope === 'personal') {
                    return row.user_id === requestedUserId;
                }
                return true;
            });
        }

        return ok(result.map(transformSchedule));
    } catch (e) {
        console.error('Schedules GET Error:', e);
        return failWorkflowSchema(e, 'Failed to fetch schedules');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const parsed: unknown = await request.json().catch(() => ({}));
        const body = isRecord(parsed) ? parsed : {};

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            textValue(body.requesterId) || textValue(body.userId) || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const companyName = textValue(body.companyName);
        const userId = textValue(body.userId);
        const customerId = textValue(body.customerId);
        const propertyId = textValue(body.propertyId);
        const businessCardId = textValue(body.businessCardId);
        const directCompanyId = textValue(body.companyId);

        const userUuid = await resolveUserUuid(supabaseAdmin, userId || requesterProfile.id);
        let companyId = directCompanyId || null;

        if (!companyId && companyName) {
            companyId = await resolveCompanyIdByName(supabaseAdmin, companyName);
        }
        if (!companyId) {
            companyId = requesterProfile.company_id;
        }

        if (!companyId) {
            return fail(400, 'VALIDATION_ERROR', 'Invalid Company');
        }

        if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, companyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company create denied');
        }

        if (!userUuid) {
            return fail(400, 'VALIDATION_ERROR', 'Valid userId is required');
        }

        const { data: ownerProfile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', userUuid)
            .single();

        if (!ownerProfile || ownerProfile.company_id !== companyId) {
            return fail(403, 'FORBIDDEN', 'Forbidden: user/company mismatch');
        }

        const scope = textValue(body.scope) || 'company';
        if (!isAdmin(requesterProfile) && scope === 'personal' && userUuid !== requesterProfile.id) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cannot create personal schedule for another user');
        }

        const sourceType = textValue(body.sourceType);
        const sourceId = textValue(body.sourceId);

        if (sourceType || sourceId) {
            if (!sourceType || !sourceId) {
                return fail(400, 'VALIDATION_ERROR', 'sourceType and sourceId are both required');
            }
            if (!canManageWorkflowSchedules(requesterProfile)) {
                return fail(403, 'FORBIDDEN', 'Workflow schedule source fields require manager permission');
            }
            if (sourceType === 'approval-document') {
                return fail(403, 'FORBIDDEN', 'Approval schedules must be created through the approval workflow');
            }
            if (!isPublicWorkflowSourceType(sourceType)) {
                return fail(403, 'FORBIDDEN', 'Workflow source schedules must be created through module workflow APIs');
            }
            const assigneeProfileId = textValue(body.assigneeProfileId) || userUuid;
            const managerProfileId = textValue(body.managerProfileId) || null;
            const assigneeError = await ensureActiveProfileInCompany(supabaseAdmin, assigneeProfileId, companyId, 'Forbidden: assignee/company mismatch');
            if (assigneeError) return assigneeError;
            const managerError = await ensureActiveProfileInCompany(supabaseAdmin, managerProfileId, companyId, 'Forbidden: manager/company mismatch', true);
            if (managerError) return managerError;

            const schedule = await upsertWorkflowSchedule(supabaseAdmin, {
                companyId,
                sourceType,
                sourceId,
                title: textValue(body.title) || '일정',
                date: textValue(body.date) || null,
                status: textValue(body.status) || null,
                type: textValue(body.type) || null,
                details: textValue(body.details) || null,
                color: textValue(body.color) || null,
                assigneeProfileId,
                managerProfileId,
                userId: userUuid,
                dueAt: textValue(body.dueAt) || null,
                remindAt: textValue(body.remindAt) || null,
                metadata: isRecord(body.metadata) ? body.metadata : {}
            });
            return ok(transformSchedule(schedule), 201);
        }

        const { data, error } = await supabaseAdmin
            .from('schedules')
            .insert({
                id: randomUUID(),
                title: textValue(body.title),
                date: textValue(body.date),
                scope,
                status: textValue(body.status),
                type: textValue(body.type),
                color: textValue(body.color),
                details: textValue(body.details),
                company_id: companyId,
                user_id: userUuid,
                customer_id: customerId || null,
                property_id: propertyId || null,
                business_card_id: businessCardId || null,
                created_at: new Date().toISOString()
            })
            .select('*, user:profiles(name), company:companies(name)')
            .single<ScheduleRow>();

        if (error) throw error;
        return ok(transformSchedule(data), 201);
    } catch (e) {
        console.error('Schedules POST Error:', e);
        return failWorkflowSchema(e, 'Failed to create schedule');
    }
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const parsed: unknown = await request.json().catch(() => ({}));
        const body = isRecord(parsed) ? parsed : {};

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            textValue(body.requesterId) || textValue(body.userId) || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const id = textValue(body.id);
        const companyName = textValue(body.companyName);
        const userId = textValue(body.userId);
        const directCompanyId = textValue(body.companyId);
        const customerId = textValue(body.customerId);
        const propertyId = textValue(body.propertyId);
        const businessCardId = textValue(body.businessCardId);

        if (!id) {
            return fail(400, 'VALIDATION_ERROR', 'ID required');
        }

        const { data: existing, error: existingError } = await supabaseAdmin
            .from('schedules')
            .select('id, company_id, user_id, scope, source_type, source_id, assignee_profile_id, manager_profile_id')
            .eq('id', id)
            .single<ScheduleAccessRow>();

        if (existingError || !existing) {
            return fail(404, 'NOT_FOUND', 'Schedule not found');
        }

        if (!canWriteSchedule(requesterProfile, existing)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        if (existing.source_type === 'approval-document') {
            return fail(403, 'FORBIDDEN', 'Approval schedules must be managed through the approval workflow');
        }

        let targetCompanyId = existing.company_id;
        if (directCompanyId) {
            targetCompanyId = directCompanyId;
        } else if (companyName) {
            targetCompanyId = await resolveCompanyIdByName(supabaseAdmin, companyName);
        }

        const targetUserId = userId ? await resolveUserUuid(supabaseAdmin, userId) : existing.user_id;

        if (!isAdmin(requesterProfile) && targetCompanyId && !canAccessCompanyScope(requesterProfile, targetCompanyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company update denied');
        }

        if (textValue(body.action) === 'complete') {
            if (!canCompleteSchedule(requesterProfile, existing)) {
                return fail(403, 'FORBIDDEN', 'Approval schedules must be completed through the approval workflow');
            }
            await completeWorkflowSchedule(supabaseAdmin, {
                companyId: existing.company_id || '',
                scheduleId: id,
                completedAt: textValue(body.completedAt) || null
            });
            const { data: completed, error: completedError } = await supabaseAdmin
                .from('schedules')
                .select('*, user:profiles(name), company:companies(name)')
                .eq('id', id)
                .single<ScheduleRow>();
            if (completedError) throw completedError;
            return ok(transformSchedule(completed));
        }

        if (existing.source_type && !canManageWorkflowSchedules(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Source-linked schedules require manager permission');
        }

        if (hasOwn(body, 'sourceType') || hasOwn(body, 'sourceId')) {
            return fail(403, 'FORBIDDEN', 'Workflow source links cannot be changed through the public schedule API');
        }
        if (touchesWorkflowFields(body) && !canManageWorkflowSchedules(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Workflow schedule fields require manager permission');
        }

        const nextScope = textValue(body.scope) || existing.scope;
        if (!isAdmin(requesterProfile) && nextScope === 'personal' && targetUserId !== requesterProfile.id) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cannot manage another user personal schedule');
        }

        if (targetUserId && targetCompanyId) {
            const userMismatch = await ensureActiveProfileInCompany(supabaseAdmin, targetUserId, targetCompanyId, 'Forbidden: user/company mismatch');
            if (userMismatch) return userMismatch;
        }

        const nextAssigneeProfileId = hasOwn(body, 'assigneeProfileId') ? textValue(body.assigneeProfileId) || targetUserId : null;
        const nextManagerProfileId = hasOwn(body, 'managerProfileId') ? textValue(body.managerProfileId) || null : null;
        if (targetCompanyId) {
            const assigneeError = await ensureActiveProfileInCompany(supabaseAdmin, nextAssigneeProfileId, targetCompanyId, 'Forbidden: assignee/company mismatch');
            if (assigneeError) return assigneeError;
            const managerError = await ensureActiveProfileInCompany(supabaseAdmin, nextManagerProfileId, targetCompanyId, 'Forbidden: manager/company mismatch', true);
            if (managerError) return managerError;
        }

        const updates: JsonRecord = {
            updated_at: new Date().toISOString()
        };
        if (hasOwn(body, 'title')) updates.title = textValue(body.title);
        if (hasOwn(body, 'date')) updates.date = textValue(body.date);
        if (hasOwn(body, 'scope')) updates.scope = nextScope;
        if (hasOwn(body, 'status')) updates.status = textValue(body.status);
        if (hasOwn(body, 'type')) updates.type = textValue(body.type);
        if (hasOwn(body, 'color')) updates.color = textValue(body.color);
        if (hasOwn(body, 'details')) updates.details = textValue(body.details);
        if (hasOwn(body, 'customerId')) updates.customer_id = customerId || null;
        if (hasOwn(body, 'propertyId')) updates.property_id = propertyId || null;
        if (hasOwn(body, 'businessCardId')) updates.business_card_id = businessCardId || null;
        if (hasOwn(body, 'assigneeProfileId')) updates.assignee_profile_id = nextAssigneeProfileId;
        if (hasOwn(body, 'managerProfileId')) updates.manager_profile_id = nextManagerProfileId;
        if (hasOwn(body, 'dueAt')) updates.due_at = textValue(body.dueAt) || null;
        if (hasOwn(body, 'remindAt')) updates.remind_at = textValue(body.remindAt) || null;
        if (hasOwn(body, 'metadata')) updates.metadata = isRecord(body.metadata) ? body.metadata : {};

        const { data, error } = await supabaseAdmin
            .from('schedules')
            .update({
                ...updates,
                company_id: targetCompanyId,
                user_id: targetUserId
            })
            .eq('id', id)
            .select('*, user:profiles(name), company:companies(name)')
            .single<ScheduleRow>();

        if (error) throw error;

        return ok(transformSchedule(data));
    } catch (e) {
        console.error('Schedules PUT Error:', e);
        return failWorkflowSchema(e, 'Failed to update schedule');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return fail(400, 'VALIDATION_ERROR', 'ID required');
        }

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            searchParams.get('requesterId') || searchParams.get('userId') || null
        );

        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const { data: target, error: targetError } = await supabaseAdmin
            .from('schedules')
            .select('id, company_id, user_id, scope, source_type, source_id, assignee_profile_id, manager_profile_id')
            .eq('id', id)
            .single<ScheduleAccessRow>();

        if (targetError || !target) {
            return fail(404, 'NOT_FOUND', 'Schedule not found');
        }

        if (!canWriteSchedule(requesterProfile, target)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        if (target.source_type) {
            return fail(403, 'FORBIDDEN', 'Source-linked schedules must be managed through their source workflow');
        }

        const { error } = await supabaseAdmin
            .from('schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return ok({ success: true });
    } catch (e) {
        console.error('Schedules DELETE Error:', e);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete schedule');
    }
}
