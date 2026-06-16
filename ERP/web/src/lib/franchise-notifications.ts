import type { LeadDisclosureSummary } from './franchise-lead-disclosure-summary';

export const FRANCHISE_NOTIFICATION_SEVERITIES = ['info', 'warning', 'danger', 'success'] as const;
export const FRANCHISE_NOTIFICATION_SOURCE_TYPES = [
    'disclosure-missing', 'disclosure-failed', 'disclosure-due', 'disclosure-eligible',
    'contact-overdue', 'contact-today', 'hot-lead-followup'
] as const;

export type FranchiseNotificationSeverity = typeof FRANCHISE_NOTIFICATION_SEVERITIES[number];
export type FranchiseNotificationSourceType = typeof FRANCHISE_NOTIFICATION_SOURCE_TYPES[number];

export type FranchiseNotificationCandidate = {
    readonly companyId: string;
    readonly recipientProfileId: string;
    readonly sourceType: FranchiseNotificationSourceType;
    readonly sourceId: string;
    readonly leadId: string;
    readonly severity: FranchiseNotificationSeverity;
    readonly title: string;
    readonly body: string;
    readonly actionUrl: string;
    readonly dueAt: string | null;
    readonly data: Record<string, unknown>;
};

export type FranchiseNotification = FranchiseNotificationCandidate & {
    readonly id: string;
    readonly readAt: string | null;
    readonly dismissedAt: string | null;
    readonly deliveryChannel: string;
    readonly kakaoTemplateKey: string;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type NotificationLead = {
    readonly id: string;
    readonly companyId?: string | null;
    readonly managerId?: string | null;
    readonly name: string;
    readonly status: string;
    readonly grade: string;
    readonly nextContactAt?: string | null;
    readonly disclosureSummary?: LeadDisclosureSummary | null;
};

export type FranchiseNotificationRow = {
    readonly id: string;
    readonly company_id: string;
    readonly recipient_profile_id: string;
    readonly source_type: string;
    readonly source_id: string;
    readonly lead_id: string | null;
    readonly severity: string | null;
    readonly title: string | null;
    readonly body: string | null;
    readonly action_url: string | null;
    readonly due_at: string | null;
    readonly read_at: string | null;
    readonly dismissed_at: string | null;
    readonly delivery_channel: string | null;
    readonly kakao_template_key: string | null;
    readonly data: unknown;
    readonly created_at: string;
    readonly updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function toIsoOrNull(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isToday(value: string | null | undefined, now: Date): boolean {
    const date = toIsoOrNull(value);
    if (!date) return false;
    const target = new Date(date);
    return target.toDateString() === now.toDateString();
}

function isPast(value: string | null | undefined, now: Date): boolean {
    const date = toIsoOrNull(value);
    if (!date) return false;
    return new Date(date).getTime() < now.getTime() && !isToday(date, now);
}

function buildLeadActionUrl(leadId: string): string {
    return `/dashboard/franchise-leads?leadId=${encodeURIComponent(leadId)}`;
}

function createCandidate(
    lead: NotificationLead,
    sourceType: FranchiseNotificationSourceType,
    severity: FranchiseNotificationSeverity,
    title: string,
    body: string,
    dueAt: string | null,
    data: Record<string, unknown> = {}
): FranchiseNotificationCandidate | null {
    const companyId = cleanString(lead.companyId);
    const recipientProfileId = cleanString(lead.managerId);
    if (!companyId || !recipientProfileId) return null;

    return {
        companyId,
        recipientProfileId,
        sourceType,
        sourceId: `${lead.id}:${sourceType}:${data.remainingDays ?? ''}`,
        leadId: lead.id,
        severity,
        title,
        body,
        actionUrl: buildLeadActionUrl(lead.id),
        dueAt,
        data: {
            leadName: lead.name,
            ...data
        }
    };
}

export function buildAutomaticFranchiseNotifications(
    leads: readonly NotificationLead[],
    now: Date = new Date()
): readonly FranchiseNotificationCandidate[] {
    return leads.flatMap(lead => {
        const items: FranchiseNotificationCandidate[] = [];
        const disclosure = lead.disclosureSummary;

        if (!disclosure || disclosure.state === 'none') {
            const candidate = createCandidate(
                lead,
                'disclosure-missing',
                'warning',
                '정보공개서 발송 필요',
                `${lead.name}님에게 아직 정보공개서 발송 이력이 없습니다.`,
                null
            );
            if (candidate) items.push(candidate);
        } else if (disclosure.state === 'failed') {
            const candidate = createCandidate(
                lead,
                'disclosure-failed',
                'danger',
                '정보공개서 발송 실패',
                `${lead.name}님의 최근 정보공개서 발송이 실패했습니다.`,
                disclosure.latestSentAt,
                { deliveryId: disclosure.latestDeliveryId }
            );
            if (candidate) items.push(candidate);
        } else if (disclosure.remainingDays === 3 || disclosure.remainingDays === 1) {
            const candidate = createCandidate(
                lead,
                'disclosure-due',
                'warning',
                `정보공개서 D-${disclosure.remainingDays}`,
                `${lead.name}님의 계약 가능일까지 ${disclosure.remainingDays}일 남았습니다.`,
                disclosure.contractEligibleAt,
                { remainingDays: disclosure.remainingDays, deliveryId: disclosure.latestDeliveryId }
            );
            if (candidate) items.push(candidate);
        } else if (disclosure.remainingDays === 0) {
            const candidate = createCandidate(
                lead,
                'disclosure-eligible',
                'success',
                '계약 진행 가능',
                `${lead.name}님은 정보공개서 14일 기준을 충족했습니다.`,
                disclosure.contractEligibleAt,
                { deliveryId: disclosure.latestDeliveryId }
            );
            if (candidate) items.push(candidate);
        }

        if (isPast(lead.nextContactAt, now)) {
            const candidate = createCandidate(
                lead,
                'contact-overdue',
                'danger',
                '연락 지연',
                `${lead.name}님의 다음 연락 예정일이 지났습니다.`,
                toIsoOrNull(lead.nextContactAt)
            );
            if (candidate) items.push(candidate);
        } else if (isToday(lead.nextContactAt, now)) {
            const candidate = createCandidate(
                lead,
                'contact-today',
                'info',
                '오늘 연락',
                `${lead.name}님에게 오늘 연락이 예정되어 있습니다.`,
                toIsoOrNull(lead.nextContactAt)
            );
            if (candidate) items.push(candidate);
        }

        if (lead.grade === 'HOT' && !lead.nextContactAt && lead.status !== '계약완료') {
            const candidate = createCandidate(
                lead,
                'hot-lead-followup',
                'info',
                '중요 희망자 후속 관리',
                `${lead.name}님은 중요 희망자입니다. 다음 연락 일정을 지정해주세요.`,
                null
            );
            if (candidate) items.push(candidate);
        }

        return items;
    });
}

function normalizeSeverity(value: string | null): FranchiseNotificationSeverity {
    return FRANCHISE_NOTIFICATION_SEVERITIES.find(item => item === value) || 'info';
}

function normalizeSourceType(value: string): FranchiseNotificationSourceType {
    return FRANCHISE_NOTIFICATION_SOURCE_TYPES.find(item => item === value) || 'hot-lead-followup';
}

export function transformFranchiseNotification(row: FranchiseNotificationRow): FranchiseNotification {
    return {
        id: row.id,
        companyId: row.company_id,
        recipientProfileId: row.recipient_profile_id,
        sourceType: normalizeSourceType(row.source_type),
        sourceId: row.source_id,
        leadId: row.lead_id || '',
        severity: normalizeSeverity(row.severity),
        title: row.title || '',
        body: row.body || '',
        actionUrl: row.action_url || '',
        dueAt: row.due_at,
        readAt: row.read_at,
        dismissedAt: row.dismissed_at,
        deliveryChannel: row.delivery_channel || 'in_app',
        kakaoTemplateKey: row.kakao_template_key || '',
        data: isRecord(row.data) ? row.data : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
