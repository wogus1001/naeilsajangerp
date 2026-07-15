import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildOpeningProjectSourceSchedule,
    buildOwnerSubmissionSourceSchedule,
    buildSupervisionCorrectiveActionSourceSchedule,
    buildSupervisionReportSourceSchedule,
    buildSupervisionVisitSourceSchedule
} from './franchise-phase2-source-schedules.js';

const NOW = new Date('2026-07-15T03:00:00.000Z');

void test('Given an overdue SV visit When projecting it Then it becomes a franchise-operation late schedule', () => {
    const schedule = buildSupervisionVisitSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        purpose: '정기점검',
        status: '예정',
        supervisorProfileId: 'sv-1',
        visitDate: '2026-07-14',
        visitId: 'visit-1'
    }, NOW);

    assert.equal(schedule?.sourceType, 'supervision-visit');
    assert.equal(schedule?.status, '지연');
    assert.equal(schedule?.assigneeProfileId, 'sv-1');
    assert.equal(schedule?.metadata?.actionUrl, '/dashboard/franchise-supervision?visitId=visit-1');
});

void test('Given a submitted or rejected SV report When projecting it Then the active owner changes', () => {
    const submitted = buildSupervisionReportSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        reportId: 'report-1',
        status: '제출',
        supervisorProfileId: 'sv-1',
        taskDate: '2026-07-15'
    }, NOW);
    const rejected = buildSupervisionReportSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        reportId: 'report-1',
        status: '반려',
        supervisorProfileId: 'sv-1',
        taskDate: '2026-07-15'
    }, NOW);
    const resubmissionDraft = buildSupervisionReportSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        reportId: 'report-1',
        status: '임시저장',
        supervisorProfileId: 'sv-1',
        taskDate: '2026-07-15'
    }, NOW);

    assert.equal(submitted?.status, '진행중');
    assert.equal(submitted?.assigneeProfileId, 'manager-1');
    assert.equal(rejected?.status, '진행중');
    assert.equal(rejected?.assigneeProfileId, 'sv-1');
    assert.equal(resubmissionDraft?.status, '진행중');
    assert.equal(resubmissionDraft?.assigneeProfileId, 'sv-1');
});

void test('Given a dated corrective action When projecting it Then completion and KST overdue are preserved', () => {
    const late = buildSupervisionCorrectiveActionSourceSchedule({
        actionId: 'action-1',
        assigneeProfileId: 'sv-1',
        companyId: 'company-1',
        dueDate: '2026-07-14',
        locationName: '강남점',
        status: '요청',
        title: '간판 보수'
    }, NOW);
    const completed = buildSupervisionCorrectiveActionSourceSchedule({
        actionId: 'action-1',
        assigneeProfileId: 'sv-1',
        companyId: 'company-1',
        completedAt: '2026-07-15T04:00:00.000Z',
        dueDate: '2026-07-16',
        locationName: '강남점',
        status: '완료',
        title: '간판 보수'
    }, NOW);

    assert.equal(late?.status, '지연');
    assert.equal(completed?.status, '완료');
    assert.equal(completed?.completedAt, '2026-07-15T04:00:00.000Z');
});

void test('Given an opening project without a target date or cancelled status When projecting it Then lifecycle is preserved', () => {
    assert.equal(buildOpeningProjectSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        projectId: 'project-1',
        status: '준비중',
        targetOpenDate: null
    }, NOW), null);
    const cancelled = buildOpeningProjectSourceSchedule({
        companyId: 'company-1',
        leadId: 'lead-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        projectId: 'project-1',
        status: '취소',
        targetOpenDate: '2026-07-16'
    }, NOW);
    assert.equal(cancelled?.status, '취소');
    assert.equal(cancelled?.metadata?.actionUrl, '/dashboard/franchise-leads?leadId=lead-1&mode=contractChecklist');
    const dateRemoved = buildOpeningProjectSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        previousTargetOpenDate: '2026-07-16',
        projectId: 'project-1',
        status: '준비중',
        targetOpenDate: null
    }, NOW);
    assert.equal(dateRemoved?.date, '2026-07-16');
    assert.equal(dateRemoved?.status, '취소');
});

void test('Given owner submissions When projecting them Then facility work stays actionable and checklist completion is a record', () => {
    const facility = buildOwnerSubmissionSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        status: 'submitted',
        submissionId: 'submission-1',
        submissionType: 'facility_request',
        submittedAt: '2026-07-15T01:00:00.000Z',
        title: '냉장고 고장'
    }, NOW);
    const checklist = buildOwnerSubmissionSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        status: 'submitted',
        submissionId: 'submission-2',
        submissionType: 'opening_task_completion',
        submittedAt: '2026-07-15T01:00:00.000Z',
        title: '간판 설치 확인'
    }, NOW);
    const rejectedChecklist = buildOwnerSubmissionSourceSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-1',
        status: 'rejected',
        submissionId: 'submission-3',
        submissionType: 'opening_task_completion',
        submittedAt: '2026-07-15T01:00:00.000Z',
        title: '간판 설치 확인'
    }, NOW);

    assert.equal(facility?.sourceType, 'owner-facility-request');
    assert.equal(facility?.status, '진행중');
    assert.equal(facility?.metadata?.actionUrl, '/dashboard/franchise-operations/owner-portal?view=submissions&submissionId=submission-1');
    assert.equal(checklist?.sourceType, 'owner-checklist-completion');
    assert.equal(checklist?.status, '완료');
    assert.equal(checklist?.metadata?.actionUrl, '/dashboard/franchise-operations/owner-portal?view=checklists&checklistView=status');
    assert.equal(rejectedChecklist?.status, '취소');
});
