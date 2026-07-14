import {
    ApprovalInputError,
    hasOwn,
    isRecord,
    parseOptionalText,
    parseOptionalUuid,
    parseRecord,
    parseRequiredText,
    parseUuidArray,
    type JsonRecord
} from './boundary';
export {
    actorAlreadyResponded,
    actorAppearsInTargets,
    type ActiveApprovalDelegationGrant
} from '@/lib/approval-target-access';

export const DOCUMENT_SELECT = 'id, company_id, template_id, source_type, source_id, title, status, author_profile_id, approver_profile_id, reviewer_profile_id, values, reject_reason, category, security_level, retention_until, current_version_id, current_step_order, due_at, submitted_at, reviewed_at, completed_at, withdrawn_at, data, created_by, updated_by, created_at, updated_at';
export const DOCUMENT_VERSION_SELECT = 'id, document_id, version_number, template_version_id, title, values, body, organization_snapshot, steps_snapshot, submitted_at, created_at';
export const DOCUMENT_STEP_SELECT = 'id, document_id, document_version_id, step_order, step_key, name, action_kind, completion_mode, status, targets, responses, started_at, completed_at';
export const DOCUMENT_READER_SELECT = 'id, document_id, profile_id, can_download, first_read_at, created_at';
export const DOCUMENT_EVENT_SELECT = 'id, event_type, action_key, actor_profile_id, actor_snapshot, from_status, to_status, memo, payload, created_at';

export type ApprovalDocumentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly template_id: string | null;
    readonly source_type: string | null;
    readonly source_id: string | null;
    readonly title: string;
    readonly status: string;
    readonly author_profile_id: string | null;
    readonly approver_profile_id: string | null;
    readonly reviewer_profile_id: string | null;
    readonly values: unknown;
    readonly reject_reason: string | null;
    readonly category: string;
    readonly security_level: string;
    readonly retention_until: string | null;
    readonly current_version_id: string | null;
    readonly current_step_order: number | null;
    readonly due_at: string | null;
    readonly submitted_at: string | null;
    readonly reviewed_at: string | null;
    readonly completed_at: string | null;
    readonly withdrawn_at: string | null;
    readonly data: unknown;
    readonly created_by: string | null;
    readonly updated_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type ApprovalDocumentVersionRow = {
    readonly id: string;
    readonly document_id: string;
    readonly version_number: number;
    readonly template_version_id: string | null;
    readonly title: string;
    readonly values: unknown;
    readonly body: unknown;
    readonly organization_snapshot: unknown;
    readonly steps_snapshot: unknown;
    readonly submitted_at: string | null;
    readonly created_at: string;
};

export type ApprovalDocumentStepRow = {
    readonly id: string;
    readonly document_id: string;
    readonly document_version_id: string;
    readonly step_order: number;
    readonly step_key: string;
    readonly name: string;
    readonly action_kind: string;
    readonly completion_mode: string;
    readonly status: string;
    readonly targets: unknown;
    readonly responses: unknown;
    readonly started_at: string | null;
    readonly completed_at: string | null;
};

export type ApprovalDocumentReaderRow = {
    readonly id: string;
    readonly document_id: string;
    readonly profile_id: string;
    readonly can_download: boolean;
    readonly first_read_at: string | null;
    readonly created_at: string;
};

export type ApprovalDocumentEventRow = {
    readonly id: string;
    readonly event_type: string;
    readonly action_key: string | null;
    readonly actor_profile_id: string | null;
    readonly actor_snapshot: unknown;
    readonly from_status: string | null;
    readonly to_status: string | null;
    readonly memo: string;
    readonly payload: unknown;
    readonly created_at: string;
};

const STATUS_MAP: Readonly<Record<string, string>> = {
    '임시저장': 'draft', '제출': 'in_review', '승인': 'approved', '반려': 'rejected',
    '회수': 'withdrawn', '취소': 'canceled', '완료처리': 'completed'
};
const RAW_STATUS_MAP: Readonly<Record<string, string>> = {
    draft: '임시저장', in_review: '제출', approved: '승인', rejected: '반려',
    withdrawn: '회수', canceled: '취소', completed: '완료처리'
};
const SECURITY_LEVELS = ['company', 'restricted', 'confidential'] as const;

function optionalRecord(value: unknown, field: string): JsonRecord {
    return value === undefined || value === null ? {} : parseRecord(value, field);
}

function parseApprovalLineSelections(value: unknown): JsonRecord {
    if (value === undefined || value === null) return {};
    const record = parseRecord(value, 'body.approvalLineSelections');
    if (Object.keys(record).length > 30) {
        throw new ApprovalInputError('body.approvalLineSelections', '결재 단계는 30개 이하로 설정해 주세요.');
    }
    return Object.fromEntries(Object.entries(record).map(([stepId, profileIds]) => [
        stepId,
        parseUuidArray(profileIds, `body.approvalLineSelections.${stepId}`, 30)
    ]));
}

function optionalDateTime(value: unknown, field: string): string | null {
    const text = parseOptionalText(value, field, 40);
    if (!text) return null;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new ApprovalInputError(field, `${field} must be an ISO date-time`);
    return date.toISOString();
}

function securityLevel(value: unknown): (typeof SECURITY_LEVELS)[number] {
    const text = parseRequiredText(value, 'securityLevel', 20);
    const parsed = SECURITY_LEVELS.find(candidate => candidate === text);
    if (!parsed) throw new ApprovalInputError('securityLevel', 'securityLevel is not supported');
    return parsed;
}

export function parseDocumentDraft(body: JsonRecord) {
    const receiverUnitIds = parseUuidArray(body.receiverUnitIds, 'receiverUnitIds', 100);
    const receiverProfileIds = parseUuidArray(body.receiverProfileIds, 'receiverProfileIds', 100);
    const documentBody = optionalRecord(body.body ?? body.data, 'body');
    return {
        template_id: parseOptionalUuid(body.templateId, 'templateId'),
        approver_profile_id: parseOptionalUuid(body.approverProfileId, 'approverProfileId'),
        title: parseRequiredText(body.title, 'title', 200),
        values: optionalRecord(body.values, 'values'),
        data: {
            ...documentBody,
            approvalLineSelections: parseApprovalLineSelections(documentBody.approvalLineSelections),
            receiver_unit_ids: receiverUnitIds,
            receiver_profile_ids: receiverProfileIds
        },
        readerProfileIds: parseUuidArray(body.readerProfileIds, 'readerProfileIds', 200),
        source_type: parseOptionalText(body.sourceType, 'sourceType', 80) || null,
        source_id: parseOptionalText(body.sourceId, 'sourceId', 200) || null,
        category: parseOptionalText(body.category, 'category', 80) || 'general',
        security_level: body.securityLevel === undefined ? 'company' : securityLevel(body.securityLevel),
        due_at: optionalDateTime(body.dueAt, 'dueAt')
    };
}

export function approvalLineProfileIds(data: unknown): readonly string[] {
    if (!isRecord(data) || !isRecord(data.approvalLineSelections)) return [];
    return [...new Set(Object.values(data.approvalLineSelections).flatMap(value => (
        Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
    )))];
}

export function hasProtectedDocumentSourceFields(body: JsonRecord): boolean {
    return hasOwn(body, 'sourceType') || hasOwn(body, 'sourceId');
}

export function documentStatus(status: string): string {
    return STATUS_MAP[status] || status;
}

export function rawDocumentStatus(status: string): string | null {
    return RAW_STATUS_MAP[status] || (STATUS_MAP[status] ? status : null);
}

export function documentView(row: ApprovalDocumentRow) {
    return {
        id: row.id, companyId: row.company_id, templateId: row.template_id,
        sourceType: row.source_type, sourceId: row.source_id, title: row.title,
        status: documentStatus(row.status), rawStatus: row.status,
        authorProfileId: row.author_profile_id, approverProfileId: row.approver_profile_id,
        reviewerProfileId: row.reviewer_profile_id, values: row.values, body: row.data,
        rejectReason: row.reject_reason, category: row.category, securityLevel: row.security_level,
        retentionUntil: row.retention_until, currentVersionId: row.current_version_id,
        currentStepOrder: row.current_step_order, dueAt: row.due_at, submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at, completedAt: row.completed_at, withdrawnAt: row.withdrawn_at,
        createdBy: row.created_by, updatedBy: row.updated_by, createdAt: row.created_at, updatedAt: row.updated_at
    };
}

export function receiverIds(data: unknown): { readonly profileIds: readonly string[]; readonly unitIds: readonly string[] } {
    if (!isRecord(data)) return { profileIds: [], unitIds: [] };
    return {
        profileIds: Array.isArray(data.receiver_profile_ids)
            ? data.receiver_profile_ids.filter((value): value is string => typeof value === 'string')
            : [],
        unitIds: Array.isArray(data.receiver_unit_ids)
            ? data.receiver_unit_ids.filter((value): value is string => typeof value === 'string')
            : []
    };
}

export function isApprovalRetentionExpired(retentionUntil: string | null, now = new Date()): boolean {
    if (!retentionUntil) return false;
    const expiresAt = new Date(`${retentionUntil}T23:59:59.999Z`);
    return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < now.getTime();
}
