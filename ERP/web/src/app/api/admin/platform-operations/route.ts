import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    summarizePlatformOperations,
    type PlatformOperationItem,
    type PlatformOperationKind
} from '@/lib/platform-operations';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type ScheduleSyncRow = {
    readonly id: string;
    readonly company_id: string;
    readonly source_type: string;
    readonly source_id: string;
    readonly status: 'pending' | 'processing' | 'failed';
    readonly attempt_count: number;
    readonly last_error: string | null;
    readonly updated_at: string;
};

type FileCleanupRow = {
    readonly id: string;
    readonly company_id: string;
    readonly file_kind: string;
    readonly storage_path: string;
    readonly state: 'pending' | 'completed';
    readonly attempt_count: number;
    readonly last_error: string | null;
    readonly requested_at: string;
};

type AlimtalkFailureRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly scenario_key: string;
    readonly recipient_name: string | null;
    readonly status: 'failed' | 'blocked';
    readonly error_message: string | null;
    readonly sent_at: string;
};

type AuditEventRow = {
    readonly id: string;
    readonly request_id: string;
    readonly company_id: string | null;
    readonly actor_profile_id: string | null;
    readonly event_type: string;
    readonly resource_type: string;
    readonly resource_id: string | null;
    readonly action: string;
    readonly outcome: string;
    readonly occurred_at: string;
};

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingOperationsSchema(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = String(error.code || '');
    const message = String(error.message || '');
    return ['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42883'].includes(code)
        && /platform_audit_events|retry_platform_operation_job/i.test(message);
}

function mapScheduleSync(row: ScheduleSyncRow): PlatformOperationItem {
    return {
        id: row.id,
        kind: 'schedule_sync',
        companyId: row.company_id,
        title: `${row.source_type} 일정 동기화`,
        detail: row.last_error || `원천 ID ${row.source_id}`,
        status: row.status,
        attemptCount: row.attempt_count,
        occurredAt: row.updated_at,
        canRetry: row.status === 'failed'
    };
}

function mapFileCleanup(row: FileCleanupRow): PlatformOperationItem {
    const failed = Boolean(row.last_error);
    return {
        id: row.id,
        kind: 'file_cleanup',
        companyId: row.company_id,
        title: row.file_kind === 'settlement_file' ? '정산 파일 정리' : '점주 포털 첨부파일 정리',
        detail: row.last_error || row.storage_path,
        status: row.state === 'completed' ? 'completed' : failed ? 'failed' : 'pending',
        attemptCount: row.attempt_count,
        occurredAt: row.requested_at,
        canRetry: row.state === 'pending' && failed
    };
}

function mapAlimtalkFailure(row: AlimtalkFailureRow): PlatformOperationItem {
    return {
        id: row.id,
        kind: 'alimtalk',
        companyId: row.company_id,
        title: `${row.scenario_key} 알림톡`,
        detail: row.error_message || `${row.recipient_name || '수신자'} 발송 실패`,
        status: row.status,
        attemptCount: 1,
        occurredAt: row.sent_at,
        canRetry: false
    };
}

async function requireAdmin(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { requester: null, response: fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.') };
    if (!isAdmin(requester)) return { requester: null, response: fail(403, 'FORBIDDEN', '관리자 권한이 필요합니다.') };
    return { requester, response: null };
}

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const requestId = crypto.randomUUID();
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const [scheduleResult, fileResult, alimtalkResult, auditResult] = await Promise.all([
            supabaseAdmin
                .from('franchise_schedule_sync_jobs')
                .select('id, company_id, source_type, source_id, status, attempt_count, last_error, updated_at')
                .order('updated_at', { ascending: false })
                .limit(200)
                .returns<ScheduleSyncRow[]>(),
            supabaseAdmin
                .from('franchise_owner_file_deletion_outbox')
                .select('id, company_id, file_kind, storage_path, state, attempt_count, last_error, requested_at')
                .order('requested_at', { ascending: false })
                .limit(200)
                .returns<FileCleanupRow[]>(),
            supabaseAdmin
                .from('alimtalk_send_logs')
                .select('id, company_id, scenario_key, recipient_name, status, error_message, sent_at')
                .in('status', ['failed', 'blocked'])
                .order('sent_at', { ascending: false })
                .limit(200)
                .returns<AlimtalkFailureRow[]>(),
            supabaseAdmin
                .from('platform_audit_events')
                .select('id, request_id, company_id, actor_profile_id, event_type, resource_type, resource_id, action, outcome, occurred_at')
                .order('occurred_at', { ascending: false })
                .limit(200)
                .returns<AuditEventRow[]>()
        ]);

        if (auditResult.error && isMissingOperationsSchema(auditResult.error)) {
            return ok({ requestId, schemaReady: false, summary: null, operations: [], auditEvents: [] });
        }

        const firstError = [scheduleResult.error, fileResult.error, alimtalkResult.error, auditResult.error].find(Boolean);
        if (firstError) throw firstError;

        const operations = [
            ...(scheduleResult.data || []).map(mapScheduleSync),
            ...(fileResult.data || []).map(mapFileCleanup),
            ...(alimtalkResult.data || []).map(mapAlimtalkFailure)
        ].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));

        return ok({
            requestId,
            schemaReady: true,
            summary: summarizePlatformOperations(operations),
            operations,
            auditEvents: auditResult.data || []
        });
    } catch (error) {
        console.error(`[platform-operations:${requestId}] GET failed`, error);
        return fail(500, 'INTERNAL_ERROR', '운영 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
}

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    if (!auth.requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

    const requestId = crypto.randomUUID();
    let body: JsonRecord = {};
    try {
        const parsed: unknown = await request.json();
        body = isRecord(parsed) ? parsed : {};
    } catch {
        return fail(400, 'VALIDATION_ERROR', '재처리할 작업 정보가 올바르지 않습니다.');
    }

    const kind = body.kind;
    const jobId = String(body.jobId || '').trim();
    const retryableKinds: readonly PlatformOperationKind[] = ['schedule_sync', 'file_cleanup'];
    if (!retryableKinds.includes(kind as PlatformOperationKind) || !/^[0-9a-f-]{36}$/i.test(jobId)) {
        return fail(400, 'VALIDATION_ERROR', '재처리할 작업을 다시 선택해주세요.');
    }

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin.rpc('retry_platform_operation_job', {
            p_job_type: kind,
            p_job_id: jobId,
            p_actor_profile_id: auth.requester.id,
            p_request_id: requestId
        });
        if (error) throw error;

        return ok({ requestId, result: data });
    } catch (error) {
        if (isMissingOperationsSchema(error)) {
            return fail(424, 'INTERNAL_ERROR', '운영센터 SQL 적용이 필요합니다.');
        }
        console.error(`[platform-operations:${requestId}] retry failed`, error);
        return fail(500, 'INTERNAL_ERROR', '작업을 재처리 대기로 전환하지 못했습니다.');
    }
}
