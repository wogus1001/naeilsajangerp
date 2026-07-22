const OWNER_SUBMISSION_SLA_HOURS = 24;
const RECENT_ACTIVITY_DAYS = 7;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type OwnerSubmissionActivityInput = {
    readonly createdAt: string | null;
    readonly reviewedAt: string | null;
    readonly status: string;
    readonly submissionType: string;
};

export type OwnerSubmissionSla = {
    readonly dueAt: string;
    readonly isOverdue: boolean;
    readonly resolutionHours: number | null;
};

export type OwnerSubmissionActivitySummary = {
    readonly averageResolutionHours: number | null;
    readonly completedLast7Days: number;
    readonly overdueCount: number;
    readonly pendingCount: number;
};

function readCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOwnerSubmissionActivitySummary(value: unknown): OwnerSubmissionActivitySummary {
    if (!isRecord(value)) {
        return { averageResolutionHours: null, completedLast7Days: 0, overdueCount: 0, pendingCount: 0 };
    }
    const average = value.averageResolutionHours;
    return {
        averageResolutionHours: typeof average === 'number' && Number.isFinite(average) && average >= 0 ? average : null,
        completedLast7Days: readCount(value.completedLast7Days),
        overdueCount: readCount(value.overdueCount),
        pendingCount: readCount(value.pendingCount)
    };
}

function readTimestamp(value: string | null): number | null {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function isHeadquartersProcessingTarget(submissionType: string): boolean {
    return submissionType === 'general_request' || submissionType === 'facility_request';
}

function isPending(status: string): boolean {
    return status === 'submitted';
}

function isCompleted(status: string): boolean {
    return status === 'approved' || status === 'rejected' || status === 'resolved';
}

export function buildOwnerSubmissionSla(
    submission: OwnerSubmissionActivityInput,
    now: Date = new Date()
): OwnerSubmissionSla | null {
    if (!isHeadquartersProcessingTarget(submission.submissionType)) return null;
    const createdAt = readTimestamp(submission.createdAt);
    if (createdAt === null) return null;
    const dueAt = createdAt + OWNER_SUBMISSION_SLA_HOURS * HOUR_MS;
    const reviewedAt = readTimestamp(submission.reviewedAt);
    const resolutionHours = reviewedAt === null || !isCompleted(submission.status)
        ? null
        : Math.max(0, Math.round(((reviewedAt - createdAt) / HOUR_MS) * 10) / 10);
    return {
        dueAt: new Date(dueAt).toISOString(),
        isOverdue: isPending(submission.status) && now.getTime() >= dueAt,
        resolutionHours
    };
}

export function summarizeOwnerSubmissionActivity(
    submissions: readonly OwnerSubmissionActivityInput[],
    now: Date = new Date()
): OwnerSubmissionActivitySummary {
    let pendingCount = 0;
    let overdueCount = 0;
    let completedLast7Days = 0;
    const resolutionHours: number[] = [];
    const recentBoundary = now.getTime() - RECENT_ACTIVITY_DAYS * DAY_MS;

    for (const submission of submissions) {
        const sla = buildOwnerSubmissionSla(submission, now);
        if (!sla) continue;
        if (isPending(submission.status)) {
            pendingCount += 1;
            if (sla.isOverdue) overdueCount += 1;
        }
        const reviewedAt = readTimestamp(submission.reviewedAt);
        if (isCompleted(submission.status) && reviewedAt !== null && reviewedAt >= recentBoundary && reviewedAt <= now.getTime()) {
            completedLast7Days += 1;
        }
        const createdAt = readTimestamp(submission.createdAt);
        if (isCompleted(submission.status) && createdAt !== null && reviewedAt !== null) {
            resolutionHours.push(Math.max(0, (reviewedAt - createdAt) / HOUR_MS));
        }
    }

    const averageResolutionHours = resolutionHours.length === 0
        ? null
        : Math.round((resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length) * 10) / 10;
    return { averageResolutionHours, completedLast7Days, overdueCount, pendingCount };
}
