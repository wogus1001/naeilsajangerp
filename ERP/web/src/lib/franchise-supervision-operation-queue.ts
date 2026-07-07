import {
    kstDateKey,
    type CorrectiveActionStatus,
    type SupervisionReportStatus,
    type SupervisionVisitStatus
} from './franchise-supervision';

export const SUPERVISION_OPERATION_QUEUE_TYPES = [
    'visitToday',
    'visitTomorrow',
    'reportMissing',
    'approvalPending',
    'actionOverdue'
] as const;
export const SUPERVISION_OPERATION_QUEUE_SEVERITIES = ['확인', '주의', '긴급'] as const;
export const SUPERVISION_OPERATION_QUEUE_TARGETS = ['visits', 'reports', 'review'] as const;

export type SupervisionOperationQueueType = typeof SUPERVISION_OPERATION_QUEUE_TYPES[number];
export type SupervisionOperationQueueSeverity = typeof SUPERVISION_OPERATION_QUEUE_SEVERITIES[number];
export type SupervisionOperationQueueTarget = typeof SUPERVISION_OPERATION_QUEUE_TARGETS[number];

export type SupervisionOperationQueueItem = {
    readonly id: string;
    readonly type: SupervisionOperationQueueType;
    readonly severity: SupervisionOperationQueueSeverity;
    readonly title: string;
    readonly description: string;
    readonly dueDate: string | null;
    readonly locationId: string | null;
    readonly locationName: string;
    readonly ownerName: string;
    readonly sourceId: string;
    readonly target: SupervisionOperationQueueTarget;
};

export type SupervisionOperationQueueInput = {
    readonly today: Date;
    readonly visits: readonly {
        readonly id: string;
        readonly locationId: string | null;
        readonly locationName: string;
        readonly supervisorName: string;
        readonly visitDate: string | null;
        readonly status: SupervisionVisitStatus;
    }[];
    readonly reports: readonly {
        readonly id: string;
        readonly visitId: string | null;
        readonly locationId: string | null;
        readonly locationName: string;
        readonly supervisorName: string;
        readonly status: SupervisionReportStatus;
    }[];
    readonly correctiveActions: readonly {
        readonly id: string;
        readonly locationId: string | null;
        readonly locationName: string;
        readonly assigneeName: string;
        readonly status: CorrectiveActionStatus;
        readonly dueDate: string | null;
    }[];
};

function addKstDays(date: Date, days: number): Date {
    const todayKey = kstDateKey(date);
    const nextDate = new Date(`${todayKey}T00:00:00+09:00`);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function hasSubmittedReportForVisit(
    reportsByVisitId: ReadonlyMap<string, readonly SupervisionOperationQueueInput['reports'][number][]>,
    visitId: string
): boolean {
    const reports = reportsByVisitId.get(visitId) || [];
    return reports.some(report => report.status === '제출' || report.status === '승인');
}

function buildReportsByVisitId(
    reports: readonly SupervisionOperationQueueInput['reports'][number][]
): ReadonlyMap<string, readonly SupervisionOperationQueueInput['reports'][number][]> {
    const reportsByVisitId = new Map<string, SupervisionOperationQueueInput['reports'][number][]>();
    reports.forEach(report => {
        if (!report.visitId) return;
        const existingReports = reportsByVisitId.get(report.visitId) || [];
        reportsByVisitId.set(report.visitId, [...existingReports, report]);
    });
    return reportsByVisitId;
}

function sortOperationQueueItems(
    items: readonly SupervisionOperationQueueItem[]
): readonly SupervisionOperationQueueItem[] {
    const severityOrder: Record<SupervisionOperationQueueSeverity, number> = {
        긴급: 0,
        주의: 1,
        확인: 2
    };
    return [...items].sort((first, second) => {
        const severityDiff = severityOrder[first.severity] - severityOrder[second.severity];
        if (severityDiff !== 0) return severityDiff;
        const dateDiff = String(first.dueDate || '9999-12-31').localeCompare(String(second.dueDate || '9999-12-31'));
        if (dateDiff !== 0) return dateDiff;
        return first.title.localeCompare(second.title, 'ko-KR');
    });
}

export function buildSupervisionOperationQueue(
    input: SupervisionOperationQueueInput
): readonly SupervisionOperationQueueItem[] {
    const todayKey = kstDateKey(input.today);
    const tomorrowKey = kstDateKey(addKstDays(input.today, 1));
    const reportsByVisitId = buildReportsByVisitId(input.reports);
    const activeVisitStatuses = new Set<SupervisionVisitStatus>(['예정', '진행중', '보고서대기', '승인대기']);
    const actionableItems: SupervisionOperationQueueItem[] = [];

    input.visits.forEach(visit => {
        if (!visit.visitDate || visit.status === '취소' || visit.status === '완료') return;
        if (visit.visitDate === todayKey) {
            actionableItems.push({
                id: `visit-today-${visit.id}`,
                type: 'visitToday',
                severity: '확인',
                title: '오늘 방문 예정',
                description: `${visit.locationName} · ${visit.status}`,
                dueDate: visit.visitDate,
                locationId: visit.locationId,
                locationName: visit.locationName,
                ownerName: visit.supervisorName,
                sourceId: visit.id,
                target: 'visits'
            });
        }
        if (visit.visitDate === tomorrowKey && activeVisitStatuses.has(visit.status)) {
            actionableItems.push({
                id: `visit-tomorrow-${visit.id}`,
                type: 'visitTomorrow',
                severity: '주의',
                title: '내일 방문 준비',
                description: `${visit.locationName} · ${visit.status}`,
                dueDate: visit.visitDate,
                locationId: visit.locationId,
                locationName: visit.locationName,
                ownerName: visit.supervisorName,
                sourceId: visit.id,
                target: 'visits'
            });
        }
        if (
            (visit.status === '보고서대기' || visit.visitDate < todayKey)
            && activeVisitStatuses.has(visit.status)
            && !hasSubmittedReportForVisit(reportsByVisitId, visit.id)
        ) {
            actionableItems.push({
                id: `report-missing-${visit.id}`,
                type: 'reportMissing',
                severity: '긴급',
                title: '점검 보고서 미제출',
                description: `${visit.locationName} 방문 후 보고서 제출이 필요합니다.`,
                dueDate: visit.visitDate,
                locationId: visit.locationId,
                locationName: visit.locationName,
                ownerName: visit.supervisorName,
                sourceId: visit.id,
                target: 'reports'
            });
        }
    });

    input.reports.forEach(report => {
        if (report.status !== '제출') return;
        actionableItems.push({
            id: `approval-pending-${report.id}`,
            type: 'approvalPending',
            severity: '확인',
            title: '보고서 승인 대기',
            description: `${report.locationName} 점검 보고서를 검토해주세요.`,
            dueDate: null,
            locationId: report.locationId,
            locationName: report.locationName,
            ownerName: report.supervisorName,
            sourceId: report.id,
            target: 'review'
        });
    });

    input.correctiveActions.forEach(action => {
        if (!action.dueDate || action.dueDate >= todayKey || action.status === '완료' || action.status === '보류') return;
        actionableItems.push({
            id: `action-overdue-${action.id}`,
            type: 'actionOverdue',
            severity: '긴급',
            title: '시정요청 기한 초과',
            description: `${action.locationName} 시정요청 처리가 지연됐습니다.`,
            dueDate: action.dueDate,
            locationId: action.locationId,
            locationName: action.locationName,
            ownerName: action.assigneeName,
            sourceId: action.id,
            target: 'review'
        });
    });

    return sortOperationQueueItems(actionableItems);
}
