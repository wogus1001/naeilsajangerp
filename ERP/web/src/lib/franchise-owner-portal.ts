import {
    mergeOpeningProjectTasks,
    normalizeOpeningProjectTaskStatus,
    type OpeningProjectTask
} from '@/lib/franchise-opening-projects';

export const OWNER_SUBMISSION_TYPES = [
    'store_info',
    'opening_task_completion',
    'facility_request',
    'general_request'
] as const;

export const OWNER_SUBMISSION_STATUSES = ['submitted', 'approved', 'rejected', 'resolved'] as const;

export type OwnerSubmissionType = typeof OWNER_SUBMISSION_TYPES[number];
export type OwnerSubmissionStatus = typeof OWNER_SUBMISSION_STATUSES[number];
export type OwnerSubmissionReviewMode = 'approval' | 'resolution' | 'acknowledge' | 'none';

export type OwnerProvidedBasics = {
    readonly businessNumber: string;
    readonly representativeName: string;
    readonly contactPhone: string;
    readonly deposit: string;
    readonly monthlyRent: string;
    readonly maintenanceFee: string;
    readonly areaSize: string;
    readonly tableCount: string;
    readonly seatCount: string;
    readonly memo: string;
};

export type OwnerSubmissionRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly owner_account_id: string;
    readonly submission_type: string;
    readonly title: string;
    readonly body: string | null;
    readonly payload: unknown;
    readonly status: string;
    readonly review_note: string | null;
    readonly reviewed_at: string | null;
    readonly created_at: string | null;
};

export type OwnerFileRow = {
    readonly id: string;
    readonly submission_id: string | null;
    readonly file_name: string;
    readonly mime_type: string;
    readonly file_size: number | null;
    readonly storage_bucket: string;
    readonly storage_path: string;
    readonly public_url: string | null;
    readonly created_at: string | null;
};

export type OwnerNoticeRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string | null;
    readonly title: string;
    readonly body: string;
    readonly status: string | null;
    readonly created_at: string | null;
};

export type OwnerNoticeRecipient = {
    readonly ownerAccountId: string;
    readonly locationId: string;
    readonly ownerName: string;
    readonly loginId: string;
    readonly status: string;
    readonly readAt: string | null;
};

export type OwnerNoticeWithReadStatus = OwnerNoticeRow & {
    readonly targetCount: number;
    readonly readCount: number;
    readonly unreadCount: number;
    readonly recipients: readonly OwnerNoticeRecipient[];
};

export function cleanOwnerText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function isOwnerRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toOwnerSubmissionType(value: unknown): OwnerSubmissionType {
    return OWNER_SUBMISSION_TYPES.find(type => type === value) || 'general_request';
}

export function toOwnerSubmissionStatus(value: unknown): OwnerSubmissionStatus {
    return OWNER_SUBMISSION_STATUSES.find(status => status === value) || 'submitted';
}

export function normalizeOwnerProvidedBasics(value: unknown): OwnerProvidedBasics {
    const record = isOwnerRecord(value) ? value : {};
    return {
        businessNumber: cleanOwnerText(record.businessNumber),
        representativeName: cleanOwnerText(record.representativeName),
        contactPhone: cleanOwnerText(record.contactPhone),
        deposit: cleanOwnerText(record.deposit),
        monthlyRent: cleanOwnerText(record.monthlyRent),
        maintenanceFee: cleanOwnerText(record.maintenanceFee),
        areaSize: cleanOwnerText(record.areaSize),
        tableCount: cleanOwnerText(record.tableCount),
        seatCount: cleanOwnerText(record.seatCount),
        memo: cleanOwnerText(record.memo)
    };
}

export function readOwnerProvidedBasicsFromLocationData(value: unknown): OwnerProvidedBasics {
    const record = isOwnerRecord(value) ? value : {};
    return normalizeOwnerProvidedBasics(record.ownerProvidedBasics);
}

export function mergeOwnerProvidedBasicsIntoLocationData(locationData: unknown, basics: OwnerProvidedBasics): Record<string, unknown> {
    const current = isOwnerRecord(locationData) ? locationData : {};
    return { ...current, ownerProvidedBasics: basics };
}

export function buildOwnerSubmissionTitle(type: OwnerSubmissionType, fallback: string): string {
    if (type === 'store_info') return '매장 정보 입력';
    if (type === 'opening_task_completion') return '오픈 체크리스트 완료 요청';
    if (type === 'facility_request') return '시설/고장 문의';
    return fallback || '점주 요청';
}

export function canReviewOwnerSubmission(status: string): boolean {
    return toOwnerSubmissionStatus(status) === 'submitted';
}

export function getOwnerSubmissionReviewMode(type: string, status: string): OwnerSubmissionReviewMode {
    if (!canReviewOwnerSubmission(status)) return 'none';
    const normalizedType = toOwnerSubmissionType(type);
    if (normalizedType === 'opening_task_completion') return 'approval';
    if (normalizedType === 'store_info') return 'acknowledge';
    return 'resolution';
}

export function applyOwnerOpeningTaskDecision(
    tasks: readonly OpeningProjectTask[],
    taskId: string,
    approved: boolean
): readonly OpeningProjectTask[] {
    return mergeOpeningProjectTasks(
        tasks.map(task => task.id === taskId
            ? {
                ...task,
                status: normalizeOpeningProjectTaskStatus(approved ? '완료' : '진행중'),
                memo: approved ? `${task.memo || ''}`.trim() : `${task.memo || ''}\n점주 완료 요청 반려`.trim()
            }
            : task)
    );
}
