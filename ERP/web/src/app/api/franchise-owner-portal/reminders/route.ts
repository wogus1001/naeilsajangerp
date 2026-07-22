import type { SupabaseClient } from '@supabase/supabase-js';
import { fail, ok } from '@/lib/api-response';
import { cleanOwnerText, isOwnerRecord, readOwnerPortalChecklistIssuesFromLocationData } from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerPortalSchemaError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';
import {
    normalizeOwnerReminderLocationIds,
    OWNER_REMINDER_SELECT,
    OwnerReminderRequestError,
    parseOwnerReminderCreateInput,
    summarizeOwnerReminders,
    type OwnerReminderCreateInput,
    type OwnerReminderRow
} from '@/lib/franchise-owner-reminders';

export const dynamic = 'force-dynamic';

const PHASE3_SCHEMA_MESSAGE = '점주 포털 3단계 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_phase3_migration.sql을 적용한 뒤 다시 시도해주세요.';

type ReminderLocationRow = { readonly id: string; readonly company_id: string; readonly data: unknown };
type ReminderContentRow = { readonly id: string; readonly company_id: string; readonly location_id: string | null; readonly source_type: string; readonly title: string; readonly due_at: string | null; readonly status: string; readonly version: number };
type ReminderAccountRow = { readonly id: string; readonly company_id: string; readonly location_id: string };

function isReminderIdempotencyMismatch(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    return ['message', 'details', 'hint']
        .map(key => Reflect.get(error, key))
        .some(value => typeof value === 'string' && value.includes('OWNER_REMINDER_IDEMPOTENCY_MISMATCH'));
}

async function fetchOwnedLocations(options: { readonly supabaseAdmin: SupabaseClient; readonly companyId: string; readonly locationIds: readonly string[] }): Promise<readonly ReminderLocationRow[]> {
    const { data, error } = await options.supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, data')
        .eq('company_id', options.companyId)
        .in('id', options.locationIds)
        .returns<ReminderLocationRow[]>();
    if (error) throw error;
    if (!data || data.length !== options.locationIds.length) throw new OwnerReminderRequestError(403, 'FORBIDDEN', '회사 또는 운영점 범위가 일치하지 않습니다.');
    return data;
}

async function checkSourceOwnership(options: { readonly supabaseAdmin: SupabaseClient; readonly companyId: string; readonly input: OwnerReminderCreateInput }): Promise<{ readonly defaultMessage: string; readonly defaultDueAt: string | null }> {
    const locations = await fetchOwnedLocations({ supabaseAdmin: options.supabaseAdmin, companyId: options.companyId, locationIds: options.input.locationIds });
    if (options.input.sourceType === 'checklist_issue') {
        const ownedByAllLocations = locations.every(location => readOwnerPortalChecklistIssuesFromLocationData(location.data).some(issue => issue.id === options.input.sourceId));
        if (!ownedByAllLocations) throw new OwnerReminderRequestError(404, 'NOT_FOUND', '선택한 운영점에서 체크리스트 이슈를 찾을 수 없습니다.');
        return { defaultMessage: '체크리스트 확인이 필요합니다.', defaultDueAt: null };
    }
    const { data: content, error } = await options.supabaseAdmin
        .from('franchise_owner_content_items')
        .select('id, company_id, location_id, source_type, title, due_at, status, version')
        .eq('id', options.input.sourceId)
        .eq('company_id', options.companyId)
        .eq('source_type', 'content_item')
        .maybeSingle<ReminderContentRow>();
    if (error) throw error;
    if (!content) throw new OwnerReminderRequestError(404, 'NOT_FOUND', '회사 범위에 속한 콘텐츠를 찾을 수 없습니다.');
    if (content.status !== 'published' || content.version !== options.input.sourceVersion) {
        throw new OwnerReminderRequestError(409, 'CONFLICT', '콘텐츠 버전이 변경되었습니다. 새로고침 후 다시 시도해주세요.');
    }
    if (content.location_id && (options.input.locationIds.length !== 1 || options.input.locationIds[0] !== content.location_id)) {
        throw new OwnerReminderRequestError(403, 'FORBIDDEN', '콘텐츠가 속한 운영점 범위와 대상 운영점이 일치하지 않습니다.');
    }
    return { defaultMessage: content.title || '콘텐츠 확인이 필요합니다.', defaultDueAt: content.due_at };
}

async function createReminders(options: { readonly supabaseAdmin: SupabaseClient; readonly companyId: string; readonly createdBy: string; readonly input: OwnerReminderCreateInput }) {
    const locationIds = normalizeOwnerReminderLocationIds(options.input.locationIds);
    if (locationIds.length !== options.input.locationIds.length || locationIds.length === 0) throw new OwnerReminderRequestError(400, 'VALIDATION_ERROR', '대상 운영점을 하나 이상 선택해주세요.');
    const input = { ...options.input, locationIds };
    const source = await checkSourceOwnership({ supabaseAdmin: options.supabaseAdmin, companyId: options.companyId, input });
    const { data: accounts, error: accountError } = await options.supabaseAdmin
        .from('franchise_owner_accounts')
        .select('id, company_id, location_id')
        .eq('company_id', options.companyId)
        .eq('status', 'active')
        .in('location_id', locationIds)
        .returns<ReminderAccountRow[]>();
    if (accountError) throw accountError;
    const targets = (accounts || []).filter(account => account.company_id === options.companyId && locationIds.includes(account.location_id));
    const { data, error } = await options.supabaseAdmin.rpc('create_franchise_owner_reminder_deliveries', {
        p_company_id: options.companyId,
        p_created_by: options.createdBy,
        p_due_at: input.dueAt || source.defaultDueAt,
        p_message: input.message || source.defaultMessage,
        p_reminder_kind: input.reminderKind,
        p_request_idempotency_key: input.requestIdempotencyKey,
        p_source_id: input.sourceId,
        p_source_type: input.sourceType,
        p_source_version: input.sourceVersion,
        p_target_location_ids: locationIds,
        p_targets: targets.map(account => ({ locationId: account.location_id, ownerAccountId: account.id }))
    });
    if (error) throw error;
    return { ...(data as Readonly<Record<string, unknown>>), sourceType: input.sourceType, sourceId: input.sourceId };
}

async function listReminderStats(options: { readonly supabaseAdmin: SupabaseClient; readonly companyId: string }) {
    const { data, error } = await options.supabaseAdmin
        .from('franchise_owner_reminders')
        .select(OWNER_REMINDER_SELECT)
        .eq('company_id', options.companyId)
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false })
        .returns<OwnerReminderRow[]>();
    if (error) throw error;
    const reminders = data || [];
    return { reminders, stats: summarizeOwnerReminders(reminders) };
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '리마인더 현황을 조회할 권한이 없습니다.');
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;
        return ok(await listReminderStats({ supabaseAdmin: authResult.auth.supabaseAdmin, companyId: companyScope.scope.companyId }));
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return fail(424, 'VALIDATION_ERROR', PHASE3_SCHEMA_MESSAGE);
        console.error('Owner portal reminders GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 리마인더 현황을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '리마인더를 발송할 권한이 없습니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '리마인더 정보를 입력해주세요.');
        const input = parseOwnerReminderCreateInput(body);
        if (!input) return fail(400, 'VALIDATION_ERROR', 'sourceType, sourceId, locationIds를 확인해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            cleanOwnerText(body.companyId),
            cleanOwnerText(body.companyName)
        );
        if (!companyScope.ok) return companyScope.response;
        return ok(await createReminders({
            supabaseAdmin: authResult.auth.supabaseAdmin,
            companyId: companyScope.scope.companyId,
            createdBy: authResult.auth.requester.id,
            input
        }), 201);
    } catch (error) {
        if (error instanceof OwnerReminderRequestError) return fail(error.status, error.code, error.message);
        if (isReminderIdempotencyMismatch(error)) {
            return fail(409, 'CONFLICT', '같은 발송 요청 키에 다른 내용이나 대상이 사용되었습니다. 새 요청으로 다시 발송해주세요.');
        }
        if (isMissingOwnerPortalSchemaError(error)) return fail(424, 'VALIDATION_ERROR', PHASE3_SCHEMA_MESSAGE);
        console.error('Owner portal reminders POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 리마인더를 발송하지 못했습니다.');
    }
}
