export type WorkflowScheduleStatus = '예정' | '진행중' | '완료' | '지연' | '취소';
export type ApprovalDocumentStatus = '임시저장' | '제출' | '승인' | '반려' | '완료처리';
export type ApprovalDocumentAction = 'saveDraft' | 'submit' | 'approve' | 'reject' | 'complete';
export type ApprovalDocumentEventType = '임시저장' | '제출' | '승인' | '반려' | '재제출' | '완료처리';

export type ApprovalTransitionResult =
    | {
        readonly ok: true;
        readonly status: ApprovalDocumentStatus;
        readonly eventType: ApprovalDocumentEventType;
    }
    | {
        readonly ok: false;
        readonly reason: string;
    };

const WORKFLOW_SCHEMA_PATTERN = /source_type|source_id|assignee_profile_id|manager_profile_id|due_at|remind_at|completed_at|metadata|approval_templates|approval_documents|approval_document_events|perform_approval_document_action|sync_supervision_report_approval|save_supervision_report_with_approval/i;

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeWorkflowScheduleStatus(value: unknown): WorkflowScheduleStatus {
    const normalized = cleanText(value).toLowerCase();
    if (['완료', 'done', 'completed', 'complete'].includes(normalized)) return '완료';
    if (['취소', 'cancelled', 'canceled', 'cancel'].includes(normalized)) return '취소';
    if (['지연', 'overdue', 'late', 'delayed'].includes(normalized)) return '지연';
    if (['진행중', 'progress', 'in_progress', 'processing'].includes(normalized)) return '진행중';
    return '예정';
}

export function isTerminalWorkflowScheduleStatus(status: WorkflowScheduleStatus): boolean {
    return status === '완료' || status === '취소';
}

export function kstDateKey(value: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(value);
}

export function dateKeyFromScheduleValue(value: unknown): string | null {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return kstDateKey(value);
    }

    const text = cleanText(value);
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return kstDateKey(parsed);
}

export function isWorkflowScheduleLate(input: {
    readonly status: unknown;
    readonly dueAt?: unknown;
    readonly date?: unknown;
    readonly now?: Date;
}): boolean {
    const status = normalizeWorkflowScheduleStatus(input.status);
    if (isTerminalWorkflowScheduleStatus(status)) return false;
    const dueKey = dateKeyFromScheduleValue(input.dueAt) || dateKeyFromScheduleValue(input.date);
    if (!dueKey) return false;
    return dueKey < kstDateKey(input.now || new Date());
}

export function nextApprovalDocumentStatus(
    currentStatus: unknown,
    action: ApprovalDocumentAction
): ApprovalTransitionResult {
    const current = normalizeApprovalDocumentStatus(currentStatus);
    if (action === 'saveDraft') {
        if (current === '임시저장' || current === '반려') return { ok: true, status: '임시저장', eventType: '임시저장' };
        return { ok: false, reason: '제출 이후 문서는 임시저장으로 되돌릴 수 없습니다.' };
    }

    if (action === 'submit') {
        if (current === '임시저장') return { ok: true, status: '제출', eventType: '제출' };
        if (current === '반려') return { ok: true, status: '제출', eventType: '재제출' };
        return { ok: false, reason: '제출 가능한 문서 상태가 아닙니다.' };
    }

    if (action === 'approve') {
        if (current === '제출') return { ok: true, status: '승인', eventType: '승인' };
        return { ok: false, reason: '승인 가능한 문서 상태가 아닙니다.' };
    }

    if (action === 'reject') {
        if (current === '제출') return { ok: true, status: '반려', eventType: '반려' };
        return { ok: false, reason: '반려 가능한 문서 상태가 아닙니다.' };
    }

    if (current === '승인') return { ok: true, status: '완료처리', eventType: '완료처리' };
    return { ok: false, reason: '완료 처리 가능한 문서 상태가 아닙니다.' };
}

export function normalizeApprovalDocumentStatus(value: unknown): ApprovalDocumentStatus {
    const normalized = cleanText(value);
    if (normalized === '제출' || normalized === '승인' || normalized === '반려' || normalized === '완료처리') return normalized;
    return '임시저장';
}

export function buildWorkflowNotificationSourceId(sourceId: string, eventKey: string): string {
    return `${sourceId}:${eventKey}`;
}

export function isMissingWorkflowSchemaError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = cleanText(error.code);
    const message = cleanText(error.message);
    return ['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(code) && WORKFLOW_SCHEMA_PATTERN.test(message);
}
