import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import {
    parseAlimtalkTemplateStatus,
    summarizeAlimtalkOperations,
    type AlimtalkCompanyRow,
    type AlimtalkCompanySettingRow,
    type AlimtalkScenarioRow,
    type AlimtalkSendLogRow,
    type AlimtalkTemplateRow
} from '@/lib/alimtalk-operations';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JsonRecord = { readonly [key: string]: unknown };
type UpdateEntity = 'template' | 'scenario' | 'company';

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
}

function parseNullableInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.floor(parsed);
}

function parseEntity(value: unknown): UpdateEntity | null {
    if (value === 'template' || value === 'scenario' || value === 'company') return value;
    return null;
}

function isMissingAlimtalkSchemaError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = typeof error.code === 'string' ? error.code : '';
    const message = typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /alimtalk_/i.test(message);
}

async function readBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed: unknown = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

async function requireAdmin(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { requester: null, response: fail(401, 'AUTH_REQUIRED', 'authenticated session is required') };
    if (!isAdmin(requester)) return { requester: null, response: fail(403, 'FORBIDDEN', 'Admin access required') };
    return { requester, response: null };
}

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const [
            companiesResult,
            templatesResult,
            scenariosResult,
            settingsResult,
            logsResult
        ] = await Promise.all([
            supabaseAdmin.from('companies').select('id, name').order('name', { ascending: true }).returns<AlimtalkCompanyRow[]>(),
            supabaseAdmin.from('alimtalk_templates').select('template_key, name, template_id, channel_id, status, enabled, content, variables, review_note, updated_at').order('name', { ascending: true }).returns<AlimtalkTemplateRow[]>(),
            supabaseAdmin.from('alimtalk_scenarios').select('scenario_key, template_key, name, trigger_label, recipient_label, enabled, fallback_channel, memo, updated_at').order('name', { ascending: true }).returns<AlimtalkScenarioRow[]>(),
            supabaseAdmin.from('alimtalk_company_settings').select('company_id, enabled, monthly_limit, warning_threshold').returns<AlimtalkCompanySettingRow[]>(),
            supabaseAdmin.from('alimtalk_send_logs').select('id, company_id, scenario_key, template_key, recipient_name, recipient_phone, status, error_message, sent_at').order('sent_at', { ascending: false }).limit(1000).returns<AlimtalkSendLogRow[]>()
        ]);

        const firstError = [
            companiesResult.error,
            templatesResult.error,
            scenariosResult.error,
            settingsResult.error,
            logsResult.error
        ].find(Boolean);
        if (firstError) throw firstError;

        const summary = summarizeAlimtalkOperations({
            companies: companiesResult.data || [],
            templates: templatesResult.data || [],
            scenarios: scenariosResult.data || [],
            companySettings: settingsResult.data || [],
            sendLogs: logsResult.data || []
        });

        return ok({
            schemaReady: true,
            templates: templatesResult.data || [],
            scenarios: scenariosResult.data || [],
            sendLogs: logsResult.data || [],
            ...summary
        });
    } catch (error) {
        if (isMissingAlimtalkSchemaError(error)) {
            return ok({
                schemaReady: false,
                templates: [],
                scenarios: [],
                sendLogs: [],
                overview: null,
                companyUsage: []
            });
        }
        console.error('AlimTalk operations GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '알림톡 운영 정보를 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    if (!auth.requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

    const body = await readBody(request);
    const entity = parseEntity(body.entity);
    const key = cleanString(body.key || body.companyId);
    if (!entity || !key) return fail(400, 'VALIDATION_ERROR', 'update entity and key are required');

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();
    try {
        if (entity === 'template') {
            const status = parseAlimtalkTemplateStatus(cleanString(body.status));
            const { error } = await supabaseAdmin
                .from('alimtalk_templates')
                .update({
                    template_id: cleanString(body.templateId),
                    channel_id: cleanString(body.channelId),
                    status,
                    enabled: status === 'approved' && parseBoolean(body.enabled, false),
                    updated_by: auth.requester.id,
                    updated_at: now
                })
                .eq('template_key', key);
            if (error) throw error;
        } else if (entity === 'scenario') {
            const { error } = await supabaseAdmin
                .from('alimtalk_scenarios')
                .update({
                    enabled: parseBoolean(body.enabled, false),
                    fallback_channel: cleanString(body.fallbackChannel) === 'sms' ? 'sms' : 'none',
                    updated_by: auth.requester.id,
                    updated_at: now
                })
                .eq('scenario_key', key);
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin
                .from('alimtalk_company_settings')
                .upsert({
                    company_id: key,
                    enabled: parseBoolean(body.enabled, true),
                    monthly_limit: parseNullableInteger(body.monthlyLimit),
                    warning_threshold: parseNullableInteger(body.warningThreshold),
                    updated_by: auth.requester.id,
                    updated_at: now
                }, { onConflict: 'company_id' });
            if (error) throw error;
        }

        return ok({ saved: true });
    } catch (error) {
        if (isMissingAlimtalkSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '알림톡 운영 SQL이 아직 적용되지 않았습니다.');
        }
        console.error('AlimTalk operations PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '알림톡 운영 설정을 저장하지 못했습니다.');
    }
}
