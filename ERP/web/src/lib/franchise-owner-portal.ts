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

export type OwnerPortalChecklistTask = {
    readonly id: string;
    readonly title: string;
    readonly memo: string;
};

export type OwnerPortalChecklistIssue = {
    readonly id: string;
    readonly issuedAt: string | null;
    readonly tasks: readonly OwnerPortalChecklistTask[];
};

export { OWNER_NOTICE_ATTACHMENT_POLICY, OWNER_NOTICE_ATTACHMENT_STORAGE, buildOwnerNoticeAttachmentDownloadUrl, buildOwnerPortalNoticeAttachmentDownloadUrl, isAcceptedOwnerNoticeAttachmentBytes, isAcceptedOwnerNoticeAttachmentFileName, isAcceptedOwnerNoticeAttachmentMime, isOwnerNoticeAttachmentStoragePath, normalizeOwnerNoticeAttachments, resolveOwnerNoticeAttachmentsForCompany, selectOwnerNoticeAttachmentsForCompany } from './franchise-owner-portal-attachments';
export type { OwnerNoticeAttachment } from './franchise-owner-portal-attachments';

export const DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS: readonly OwnerPortalChecklistTask[] = [
    { id: 'store-basic-info', title: '매장 기본 정보 확인', memo: '사업자 정보, 연락처, 보증금/월세/관리비 등 운영 기본 정보를 점검합니다.' },
    { id: 'operation-hours', title: '영업시간 및 휴무일 확인', memo: '실제 영업시간, 휴무일, 브레이크타임이 본사 기록과 일치하는지 확인합니다.' },
    { id: 'menu-price-board', title: '메뉴판/가격표 최신화', memo: '매장 메뉴, 가격, 프로모션 안내가 최신 상태인지 확인합니다.' },
    { id: 'cleanliness', title: '위생·청결 상태 확인', memo: '홀, 주방, 창고, 화장실 등 주요 공간의 청결 상태를 점검합니다.' },
    { id: 'equipment-issue', title: '시설·장비 이상 여부 확인', memo: '냉장고, 포스, 간판, 주방 장비 등 시설 이상 여부를 확인합니다.' },
    { id: 'hq-support', title: '본사 지원 필요사항 확인', memo: '운영 중 본사 지원이나 후속 조치가 필요한 내용을 정리합니다.' }
];

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
    readonly submitted_at: string | null;
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
    readonly attachments?: unknown;
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

export function buildOwnerPortalLoginPath(input: {
    readonly companyId?: string | null;
    readonly companyName?: string | null;
}): string {
    const companyId = cleanOwnerText(input.companyId);
    return companyId ? `/owner/login/${encodeURIComponent(companyId)}` : '/owner/login';
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

function normalizeOwnerChecklistTask(value: unknown, index: number): OwnerPortalChecklistTask | null {
    if (!isOwnerRecord(value)) return null;
    const title = cleanOwnerText(value.title);
    if (!title) return null;
    const fallbackId = `owner-checklist-${index + 1}`;
    return {
        id: cleanOwnerText(value.id) || fallbackId,
        title,
        memo: cleanOwnerText(value.memo)
    };
}

export function normalizeOwnerPortalChecklistTasks(value: unknown): readonly OwnerPortalChecklistTask[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item, index) => normalizeOwnerChecklistTask(item, index))
        .filter((task): task is OwnerPortalChecklistTask => task !== null);
}

function normalizeOwnerChecklistIssue(value: unknown, index: number): OwnerPortalChecklistIssue | null {
    if (!isOwnerRecord(value)) return null;
    const tasks = normalizeOwnerPortalChecklistTasks(value.tasks);
    if (tasks.length === 0) return null;
    return {
        id: cleanOwnerText(value.id) || `owner-checklist-issue-${index + 1}`,
        issuedAt: cleanOwnerText(value.issuedAt) || null,
        tasks
    };
}

export function normalizeOwnerPortalChecklistIssues(value: unknown): readonly OwnerPortalChecklistIssue[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item, index) => normalizeOwnerChecklistIssue(item, index))
        .filter((issue): issue is OwnerPortalChecklistIssue => issue !== null)
        .slice(0, 50);
}

export function readOwnerPortalChecklistTasksFromLocationData(value: unknown): readonly OwnerPortalChecklistTask[] {
    const record = isOwnerRecord(value) ? value : {};
    return normalizeOwnerPortalChecklistTasks(record.ownerPortalChecklist);
}

export function readOwnerPortalChecklistIssuesFromLocationData(value: unknown): readonly OwnerPortalChecklistIssue[] {
    const record = isOwnerRecord(value) ? value : {};
    return normalizeOwnerPortalChecklistIssues(record.ownerPortalChecklistIssues);
}

export function mergeOwnerPortalChecklistTasksIntoLocationData(
    locationData: unknown,
    tasks: readonly OwnerPortalChecklistTask[],
    issue?: OwnerPortalChecklistIssue
): Record<string, unknown> {
    const current = isOwnerRecord(locationData) ? locationData : {};
    const normalizedTasks = normalizeOwnerPortalChecklistTasks(tasks);
    const currentIssues = readOwnerPortalChecklistIssuesFromLocationData(current);
    const nextIssue = normalizeOwnerChecklistIssue(issue, 0);
    const nextData: Record<string, unknown> = { ...current, ownerPortalChecklist: normalizedTasks };
    if (nextIssue || current.ownerPortalChecklistIssues !== undefined) {
        nextData.ownerPortalChecklistIssues = nextIssue
            ? [nextIssue, ...currentIssues.filter(currentIssue => currentIssue.id !== nextIssue.id)].slice(0, 50)
            : currentIssues;
    }
    return nextData;
}

export function buildOwnerSubmissionTitle(type: OwnerSubmissionType, fallback: string): string {
    if (type === 'store_info') return '매장 정보 입력';
    if (type === 'opening_task_completion') return '운영 체크리스트 완료 요청';
    if (type === 'facility_request') return '시설/고장 문의';
    return fallback || '점주 요청';
}

export function canReviewOwnerSubmission(status: string): boolean {
    return toOwnerSubmissionStatus(status) === 'submitted';
}

export function getOwnerSubmissionReviewMode(type: string, status: string): OwnerSubmissionReviewMode {
    if (!canReviewOwnerSubmission(status)) return 'none';
    const normalizedType = toOwnerSubmissionType(type);
    if (normalizedType === 'opening_task_completion') return 'none';
    if (normalizedType === 'store_info') return 'acknowledge';
    return 'resolution';
}

export function isOwnerChecklistCompletionSubmission(type: string): boolean {
    return toOwnerSubmissionType(type) === 'opening_task_completion';
}
