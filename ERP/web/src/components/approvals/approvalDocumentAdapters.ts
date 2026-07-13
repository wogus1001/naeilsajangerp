import type {
    ApprovalAction,
    ApprovalDocumentDetail,
    ApprovalDocumentStatus,
    ApprovalDocumentSummary,
    ApprovalEvent,
    ApprovalField,
    ApprovalFieldValue,
    ApprovalFieldValues,
    ApprovalLineStep
} from './approvalTypes';

export function isApprovalRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function status(value: unknown): ApprovalDocumentStatus {
    switch (value) {
        case 'in_review':
        case 'approved':
        case 'rejected':
        case 'withdrawn':
        case 'canceled':
        case 'completed': return value;
        default: return 'draft';
    }
}

function approvalValue(value: unknown): ApprovalFieldValue {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
        if (value.every(item => typeof item === 'string')) return value;
        return value.flatMap(item => {
            if (!isApprovalRecord(item)) return [];
            const row = Object.fromEntries(Object.entries(item).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
            return [row];
        });
    }
    if (isApprovalRecord(value)) {
        return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    }
    return null;
}

function fieldValues(value: unknown): ApprovalFieldValues {
    if (!isApprovalRecord(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, approvalValue(item)]));
}

export function approvalSummaryFromWire(value: unknown): ApprovalDocumentSummary | null {
    if (!isApprovalRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') return null;
    const authorId = text(value.authorProfileId);
    return {
        id: value.id,
        documentNumber: text(value.documentNumber, `DOC-${value.id.slice(0, 8).toUpperCase()}`),
        title: value.title,
        templateName: text(value.templateName, text(value.category, '일반 결재')),
        authorName: text(value.authorName, authorId ? `${authorId.slice(0, 8)}…` : '기안자'),
        departmentName: text(value.departmentName, '소속 정보 없음'),
        status: status(value.status),
        submittedAt: text(value.submittedAt) || null,
        dueAt: text(value.dueAt) || null,
        updatedAt: text(value.updatedAt)
    };
}

function lineSteps(value: unknown): readonly ApprovalLineStep[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) => {
        if (!isApprovalRecord(item)) return [];
        const targets = Array.isArray(item.targets) ? item.targets : [];
        const target = targets.find(isApprovalRecord);
        const action = text(item.action);
        const kind = action === 'agreement' ? 'agreement' : action === 'acknowledgement' ? 'recipient' : 'approval';
        const stepStatus = text(item.status);
        const mappedStatus: ApprovalLineStep['status'] = stepStatus === 'approved' || stepStatus === 'rejected' || stepStatus === 'agreed' || stepStatus === 'disagreed' || stepStatus === 'acknowledged' || stepStatus === 'completed'
            ? stepStatus
            : 'waiting';
        return [{
            id: text(item.id, `step-${index + 1}`),
            kind,
            order: typeof item.order === 'number' ? item.order : index + 1,
            assigneeName: target ? text(target.profile_name, text(item.name, `${index + 1}단계`)) : text(item.name, `${index + 1}단계`),
            assigneeDepartment: target ? text(target.unit_name, '조직 자동 지정') : '조직 자동 지정',
            status: mappedStatus,
            actedAt: text(item.completedAt) || null
        }];
    });
}

function events(value: unknown): readonly ApprovalEvent[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) => {
        if (!isApprovalRecord(item)) return [];
        const actor = isApprovalRecord(item.actor) ? item.actor : {};
        const action = text(item.action, text(item.type, '처리'));
        return [{
            id: text(item.id, `event-${index + 1}`),
            type: action,
            actorName: text(actor.name, text(actor.profile_name, text(item.actorProfileId, '시스템'))),
            message: text(item.memo, `${action} 처리했습니다.`),
            createdAt: text(item.createdAt)
        }];
    });
}

function eligibleActions(value: unknown): readonly ApprovalAction[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ApprovalAction => {
        switch (item) {
            case 'approve':
            case 'reject':
            case 'agree':
            case 'disagree':
            case 'withdraw':
            case 'acknowledge':
            case 'complete': return true;
            default: return false;
        }
    });
}

function profileIds(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap(item => isApprovalRecord(item) && typeof item.profileId === 'string' ? [item.profileId] : []);
}

function stringIds(value: unknown): readonly string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function approvalDetailTemplateId(value: unknown): string {
    if (!isApprovalRecord(value) || !isApprovalRecord(value.document)) return '';
    return text(value.document.templateId);
}

export function approvalDetailFromWire(value: unknown, fields: readonly ApprovalField[]): ApprovalDocumentDetail {
    if (!isApprovalRecord(value) || !isApprovalRecord(value.document)) throw new TypeError('결재 문서 응답 형식을 확인할 수 없습니다.');
    const summary = approvalSummaryFromWire(value.document);
    if (!summary) throw new TypeError('결재 문서 기본 정보를 확인할 수 없습니다.');
    const version = isApprovalRecord(value.version) ? value.version : {};
    const body = isApprovalRecord(version.body) ? version.body : isApprovalRecord(value.document.body) ? value.document.body : {};
    const wireAttachments = Array.isArray(value.attachments) ? value.attachments : [];
    return {
        ...summary,
        editable: value.editable === true,
        templateId: text(value.document.templateId),
        templateName: text(body.templateName, summary.templateName),
        securityLevel: text(value.document.securityLevel, 'company'),
        retentionPeriod: text(body.retentionPeriod, text(value.document.retentionUntil, '-')),
        documentBox: text(body.documentBox, text(value.document.category, 'general')),
        fields,
        values: fieldValues(version.values ?? value.document.values),
        approvalLine: lineSteps(value.steps),
        attachments: wireAttachments.flatMap((attachment, index) => {
            if (!isApprovalRecord(attachment)) return [];
            return [{
                id: text(attachment.id, `attachment-${index + 1}`),
                name: text(attachment.name, '첨부 파일'),
                url: text(attachment.url) || undefined
            }];
        }),
        events: events(value.events),
        eligibleActions: eligibleActions(value.eligibleActions),
        readerProfileIds: profileIds(value.readers),
        receiverUnitIds: stringIds(body.receiver_unit_ids)
    };
}
