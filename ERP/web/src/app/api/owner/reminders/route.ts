import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { isOwnerRecord } from '@/lib/franchise-owner-portal';
import { isMissingOwnerPortalSchemaError } from '@/lib/franchise-owner-portal-api';
import { cleanOwnerPhase3Text } from '@/lib/franchise-owner-phase3';
import {
    OWNER_REMINDER_SELECT,
    readOwnerReminderId,
    shouldIncludeAcknowledgedOwnerReminders,
    type OwnerReminderRow
} from '@/lib/franchise-owner-reminders';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const PHASE3_SCHEMA_MESSAGE = '점주 포털 3단계 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_phase3_migration.sql을 적용한 뒤 다시 시도해주세요.';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        let query = supabaseAdmin
            .from('franchise_owner_reminders')
            .select(OWNER_REMINDER_SELECT)
            .eq('company_id', context.account.company_id)
            .eq('location_id', context.location.id)
            .eq('owner_account_id', context.account.id);
        if (!shouldIncludeAcknowledgedOwnerReminders(new URL(request.url).searchParams)) query = query.is('acknowledged_at', null);
        const { data: reminders, error } = await query
            .order('sent_at', { ascending: false })
            .order('id', { ascending: false })
            .returns<OwnerReminderRow[]>();
        if (error) throw error;
        return ok({ reminders: reminders || [] });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return fail(424, 'VALIDATION_ERROR', PHASE3_SCHEMA_MESSAGE);
        console.error('Owner reminders GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 리마인더를 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        const action = isOwnerRecord(body) ? cleanOwnerPhase3Text(body.action) : '';
        if (action && action !== 'acknowledge') return fail(400, 'VALIDATION_ERROR', '지원하지 않는 리마인더 처리 방식입니다.');
        const searchParams = new URL(request.url).searchParams;
        const reminderId = readOwnerReminderId(body) || cleanOwnerPhase3Text(searchParams.get('id'));
        if (!reminderId) return fail(400, 'VALIDATION_ERROR', '확인할 리마인더를 선택해주세요.');
        const { data, error } = await supabaseAdmin.rpc('acknowledge_franchise_owner_reminder', {
            p_company_id: context.account.company_id,
            p_location_id: context.location.id,
            p_owner_account_id: context.account.id,
            p_reminder_id: reminderId
        });
        if (error) throw error;
        const reminder = data as OwnerReminderRow | null;
        if (!reminder) return fail(404, 'NOT_FOUND', '내 리마인더를 찾을 수 없습니다.');
        return ok({ reminder, acknowledged: Boolean(reminder.acknowledged_at) });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return fail(424, 'VALIDATION_ERROR', PHASE3_SCHEMA_MESSAGE);
        const text = error && typeof error === 'object' ? String(Reflect.get(error, 'message') || '') : '';
        if (text.includes('OWNER_REMINDER_NOT_FOUND')) return fail(404, 'NOT_FOUND', '내 리마인더를 찾을 수 없습니다.');
        console.error('Owner reminders PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '리마인더를 확인 처리하지 못했습니다.');
    }
}
