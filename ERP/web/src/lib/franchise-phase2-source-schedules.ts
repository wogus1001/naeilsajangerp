import { dateKeyFromScheduleValue, kstDateKey, type WorkflowScheduleStatus } from './franchise-workflow';
import { buildOwnerSubmissionSla } from './franchise-owner-automation';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules';

export const SUPERVISION_VISIT_SOURCE_TYPE = 'supervision-visit';
export const SUPERVISION_REPORT_SOURCE_TYPE = 'supervision-report';
export const SUPERVISION_CORRECTIVE_ACTION_SOURCE_TYPE = 'supervision-corrective-action';
export const OPENING_PROJECT_SOURCE_TYPE = 'opening-project';
export const OWNER_GENERAL_REQUEST_SOURCE_TYPE = 'owner-general-request';
export const OWNER_FACILITY_REQUEST_SOURCE_TYPE = 'owner-facility-request';
export const OWNER_CHECKLIST_COMPLETION_SOURCE_TYPE = 'owner-checklist-completion';

type VisitScheduleInput = {
    readonly companyId: string;
    readonly locationName: string;
    readonly purpose: string;
    readonly status: string;
    readonly supervisorProfileId: string;
    readonly visitDate: string | null;
    readonly visitId: string;
};

type ReportScheduleInput = {
    readonly companyId: string;
    readonly locationName: string;
    readonly managerProfileId: string | null;
    readonly reportId: string;
    readonly status: string;
    readonly supervisorProfileId: string;
    readonly taskDate: string | null;
};

type CorrectiveActionScheduleInput = {
    readonly actionId: string;
    readonly assigneeProfileId: string;
    readonly companyId: string;
    readonly completedAt?: string | null;
    readonly dueDate: string | null;
    readonly locationName: string;
    readonly status: string;
    readonly title: string;
};

type OpeningProjectScheduleInput = {
    readonly companyId: string;
    readonly leadId?: string | null;
    readonly locationName: string;
    readonly managerProfileId: string | null;
    readonly projectId: string;
    readonly previousTargetOpenDate?: string | null;
    readonly status: string;
    readonly targetOpenDate: string | null;
};

type OwnerSubmissionScheduleInput = {
    readonly companyId: string;
    readonly locationName: string;
    readonly managerProfileId: string | null;
    readonly status: string;
    readonly submissionId: string;
    readonly submissionType: string;
    readonly submittedAt: string | Date;
    readonly title: string;
};

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function activeStatus(date: string, now: Date, planned: WorkflowScheduleStatus = '예정'): WorkflowScheduleStatus {
    return date < kstDateKey(now) ? '지연' : planned;
}

function dayEnd(date: string): string {
    return `${date}T23:59:59+09:00`;
}

function validCore(input: { readonly companyId: string; readonly sourceId: string }): boolean {
    return Boolean(cleanText(input.companyId) && cleanText(input.sourceId));
}

export function buildSupervisionVisitSourceSchedule(
    input: VisitScheduleInput,
    now: Date = new Date()
): FranchiseSourceScheduleInput | null {
    const date = dateKeyFromScheduleValue(input.visitDate);
    if (!validCore({ companyId: input.companyId, sourceId: input.visitId }) || !date) return null;
    const terminal = input.status === '완료' || input.status === '취소';
    const status = input.status === '취소'
        ? '취소'
        : input.status === '완료'
            ? '완료'
            : activeStatus(date, now, input.status === '진행중' || input.status === '보고서대기' || input.status === '승인대기' ? '진행중' : '예정');

    return {
        assigneeProfileId: cleanText(input.supervisorProfileId) || null,
        color: '#3182f6',
        companyId: input.companyId,
        completedAt: terminal && input.status === '완료' ? now.toISOString() : null,
        date,
        details: `${cleanText(input.locationName) || '운영점'} 슈퍼바이징 방문 일정입니다.`,
        dueAt: dayEnd(date),
        metadata: { actionUrl: `/dashboard/franchise-supervision?visitId=${encodeURIComponent(input.visitId)}`, visitId: input.visitId },
        sourceId: input.visitId,
        sourceType: SUPERVISION_VISIT_SOURCE_TYPE,
        status,
        title: `${cleanText(input.locationName) || '운영점'} ${cleanText(input.purpose) || '운영점검'}`,
        type: '슈퍼바이징',
        userId: cleanText(input.supervisorProfileId) || null
    };
}

export function buildSupervisionReportSourceSchedule(
    input: ReportScheduleInput,
    now: Date = new Date()
): FranchiseSourceScheduleInput | null {
    const date = dateKeyFromScheduleValue(input.taskDate);
    if (!validCore({ companyId: input.companyId, sourceId: input.reportId }) || !date) return null;
    const isApproved = input.status === '승인';
    const isDraft = input.status === '임시저장';
    const assigneeProfileId = input.status === '반려' || isDraft
        ? cleanText(input.supervisorProfileId)
        : cleanText(input.managerProfileId);
    const status: WorkflowScheduleStatus = isApproved
        ? '완료'
        : isDraft
            ? activeStatus(date, now, '진행중')
            : activeStatus(date, now, '진행중');

    return {
        assigneeProfileId: assigneeProfileId || null,
        color: '#8b5cf6',
        companyId: input.companyId,
        completedAt: isApproved ? now.toISOString() : null,
        date,
        details: input.status === '반려' ? '반려된 점검 보고서를 수정해 다시 제출합니다.' : '점검 보고서를 검토하고 처리합니다.',
        dueAt: dayEnd(date),
        managerProfileId: cleanText(input.managerProfileId) || null,
        metadata: { actionUrl: `/dashboard/franchise-supervision?reportId=${encodeURIComponent(input.reportId)}`, reportId: input.reportId },
        sourceId: input.reportId,
        sourceType: SUPERVISION_REPORT_SOURCE_TYPE,
        status,
        title: `${cleanText(input.locationName) || '운영점'} 점검 보고서 ${input.status === '반려' ? '수정' : '검토'}`,
        type: '점검 보고서',
        userId: assigneeProfileId || null
    };
}

export function buildSupervisionCorrectiveActionSourceSchedule(
    input: CorrectiveActionScheduleInput,
    now: Date = new Date()
): FranchiseSourceScheduleInput | null {
    const date = dateKeyFromScheduleValue(input.dueDate);
    if (!validCore({ companyId: input.companyId, sourceId: input.actionId }) || !date) return null;
    const completed = input.status === '완료';
    const status: WorkflowScheduleStatus = input.status === '취소'
        ? '취소'
        : completed
        ? '완료'
        : activeStatus(date, now, input.status === '진행중' || input.status === '보류' ? '진행중' : '예정');

    return {
        assigneeProfileId: cleanText(input.assigneeProfileId) || null,
        color: '#ef4444',
        companyId: input.companyId,
        completedAt: completed ? input.completedAt || now.toISOString() : null,
        date,
        details: `${cleanText(input.locationName) || '운영점'} 시정조치 마감 일정입니다.`,
        dueAt: dayEnd(date),
        metadata: { actionId: input.actionId, actionUrl: `/dashboard/franchise-supervision?actionId=${encodeURIComponent(input.actionId)}` },
        sourceId: input.actionId,
        sourceType: SUPERVISION_CORRECTIVE_ACTION_SOURCE_TYPE,
        status,
        title: `시정조치: ${cleanText(input.title) || '조치 항목'}`,
        type: '시정조치',
        userId: cleanText(input.assigneeProfileId) || null
    };
}

export function buildOpeningProjectSourceSchedule(
    input: OpeningProjectScheduleInput,
    now: Date = new Date()
): FranchiseSourceScheduleInput | null {
    const currentDate = dateKeyFromScheduleValue(input.targetOpenDate);
    const previousDate = dateKeyFromScheduleValue(input.previousTargetOpenDate);
    const date = currentDate || previousDate;
    if (!validCore({ companyId: input.companyId, sourceId: input.projectId }) || !date) return null;
    const dateRemoved = !currentDate && Boolean(previousDate);
    const completed = input.status === '완료';
    const cancelled = input.status === '취소';
    const status: WorkflowScheduleStatus = cancelled || dateRemoved
        ? '취소'
        : completed
            ? '완료'
            : input.status === '지연'
            ? '지연'
            : activeStatus(date, now, input.status === '진행중' || input.status === '보류' ? '진행중' : '예정');

    const leadId = cleanText(input.leadId);
    return {
        assigneeProfileId: cleanText(input.managerProfileId) || null,
        color: '#10b981',
        companyId: input.companyId,
        completedAt: completed ? now.toISOString() : null,
        date,
        details: `${cleanText(input.locationName) || '운영점'} 오픈 준비 목표일입니다.`,
        dueAt: dayEnd(date),
        managerProfileId: cleanText(input.managerProfileId) || null,
        metadata: {
            actionUrl: leadId
                ? `/dashboard/franchise-leads?leadId=${encodeURIComponent(leadId)}&mode=contractChecklist`
                : '/dashboard/franchise-operations/schedule',
            leadId: leadId || null,
            projectId: input.projectId
        },
        sourceId: input.projectId,
        sourceType: OPENING_PROJECT_SOURCE_TYPE,
        status,
        title: `${cleanText(input.locationName) || '운영점'} 오픈 준비`,
        type: '오픈 준비',
        userId: cleanText(input.managerProfileId) || null
    };
}

export function buildOwnerSubmissionSourceSchedule(
    input: OwnerSubmissionScheduleInput,
    now: Date = new Date()
): FranchiseSourceScheduleInput | null {
    const sourceType = input.submissionType === 'general_request'
        ? OWNER_GENERAL_REQUEST_SOURCE_TYPE
        : input.submissionType === 'facility_request'
            ? OWNER_FACILITY_REQUEST_SOURCE_TYPE
        : input.submissionType === 'opening_task_completion'
            ? OWNER_CHECKLIST_COMPLETION_SOURCE_TYPE
            : null;
    const date = dateKeyFromScheduleValue(input.submittedAt);
    if (!sourceType || !validCore({ companyId: input.companyId, sourceId: input.submissionId }) || !date) return null;
    const checklistCompletion = sourceType === OWNER_CHECKLIST_COMPLETION_SOURCE_TYPE;
    const terminal = input.status === 'approved' || input.status === 'resolved';
    const rejected = input.status === 'rejected';
    const submissionSla = buildOwnerSubmissionSla({
        createdAt: input.submittedAt instanceof Date ? input.submittedAt.toISOString() : input.submittedAt,
        reviewedAt: terminal || rejected ? now.toISOString() : null,
        status: input.status,
        submissionType: input.submissionType
    }, now);
    const status: WorkflowScheduleStatus = rejected
        ? '취소'
        : checklistCompletion || terminal
            ? '완료'
            : submissionSla?.isOverdue
                ? '지연'
                : '진행중';

    const actionUrl = checklistCompletion
        ? '/dashboard/franchise-operations/owner-portal?view=checklists&checklistView=status'
        : `/dashboard/franchise-operations/owner-portal?view=submissions&submissionId=${encodeURIComponent(input.submissionId)}`;
    return {
        assigneeProfileId: cleanText(input.managerProfileId) || null,
        color: checklistCompletion ? '#14b8a6' : sourceType === OWNER_GENERAL_REQUEST_SOURCE_TYPE ? '#3b82f6' : '#f97316',
        companyId: input.companyId,
        completedAt: status === '완료' ? now.toISOString() : null,
        date,
        details: checklistCompletion
            ? '점주가 체크리스트 완료 요청을 보냈습니다.'
            : sourceType === OWNER_GENERAL_REQUEST_SOURCE_TYPE
                ? '점주 문의를 확인하고 처리합니다.'
                : '점주 시설 문의를 확인하고 처리합니다.',
        dueAt: submissionSla?.dueAt || dayEnd(date),
        managerProfileId: cleanText(input.managerProfileId) || null,
        metadata: {
            actionUrl,
            submissionId: input.submissionId
        },
        sourceId: input.submissionId,
        sourceType,
        status,
        title: `${cleanText(input.locationName) || '운영점'} ${cleanText(input.title) || (checklistCompletion ? '체크리스트 완료 요청' : '시설 문의')}`,
        type: checklistCompletion ? '점주 체크리스트' : '점주 문의',
        userId: cleanText(input.managerProfileId) || null
    };
}
