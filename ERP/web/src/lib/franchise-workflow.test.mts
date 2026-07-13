import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildWorkflowNotificationSourceId,
    dateKeyFromScheduleValue,
    isMissingWorkflowSchemaError,
    isWorkflowScheduleLate,
    nextApprovalDocumentStatus,
    normalizeApprovalDocumentStatus,
    normalizeWorkflowScheduleStatus
} from './franchise-workflow.js';

void test('Given legacy schedule statuses When normalizing Then workflow statuses are returned', () => {
    assert.equal(normalizeWorkflowScheduleStatus('scheduled'), '예정');
    assert.equal(normalizeWorkflowScheduleStatus('progress'), '진행중');
    assert.equal(normalizeWorkflowScheduleStatus('done'), '완료');
    assert.equal(normalizeWorkflowScheduleStatus('cancelled'), '취소');
    assert.equal(normalizeWorkflowScheduleStatus('late'), '지연');
});

void test('Given due dates in KST When checking late state Then terminal tasks are ignored', () => {
    const now = new Date('2026-07-09T03:00:00.000Z');

    assert.equal(isWorkflowScheduleLate({ status: '예정', dueAt: '2026-07-08T14:59:59.000Z', now }), true);
    assert.equal(isWorkflowScheduleLate({ status: '예정', dueAt: '2026-07-09T00:00:00.000Z', now }), false);
    assert.equal(isWorkflowScheduleLate({ status: '완료', dueAt: '2026-07-08', now }), false);
    assert.equal(dateKeyFromScheduleValue('2026-07-09T00:00:00.000Z'), '2026-07-09');
    assert.equal(dateKeyFromScheduleValue(new Date('2026-07-09T00:00:00.000Z')), '2026-07-09');
});

void test('Given approval actions When transitioning Then invalid status jumps are blocked', () => {
    assert.deepEqual(nextApprovalDocumentStatus('임시저장', 'submit'), { ok: true, status: '제출', eventType: '제출' });
    assert.deepEqual(nextApprovalDocumentStatus('반려', 'submit'), { ok: true, status: '제출', eventType: '재제출' });
    assert.deepEqual(nextApprovalDocumentStatus('제출', 'approve'), { ok: true, status: '승인', eventType: '승인' });
    assert.deepEqual(nextApprovalDocumentStatus('제출', 'reject'), { ok: true, status: '반려', eventType: '반려' });
    assert.deepEqual(nextApprovalDocumentStatus('승인', 'complete'), { ok: true, status: '완료처리', eventType: '완료처리' });

    const result = nextApprovalDocumentStatus('승인', 'reject');
    assert.equal(result.ok, false);
});

void test('Given unknown approval state and workflow notification event When normalizing Then safe defaults are used', () => {
    assert.equal(normalizeApprovalDocumentStatus('unknown'), '임시저장');
    assert.equal(buildWorkflowNotificationSourceId('report-1', 'approve'), 'report-1:approve');
});

void test('Given Supabase schema cache errors When checking workflow readiness Then new workflow tables are detected', () => {
    assert.equal(isMissingWorkflowSchemaError({ code: 'PGRST205', message: 'Could not find the approval_documents table in the schema cache' }), true);
    assert.equal(isMissingWorkflowSchemaError({ code: '42703', message: "column schedules.source_type does not exist" }), true);
    assert.equal(isMissingWorkflowSchemaError({ code: 'PGRST202', message: 'Could not find the function public.perform_approval_document_action in the schema cache' }), true);
    assert.equal(isMissingWorkflowSchemaError({ code: '42883', message: 'function perform_approval_document_action(uuid) does not exist' }), true);
    assert.equal(isMissingWorkflowSchemaError({ code: 'PGRST202', message: 'Could not find the function public.sync_supervision_report_approval in the schema cache' }), true);
    assert.equal(isMissingWorkflowSchemaError({ code: 'PGRST202', message: 'Could not find the function public.save_supervision_report_with_approval in the schema cache' }), true);
    assert.equal(isMissingWorkflowSchemaError({ code: 'PGRST205', message: 'Could not find the profiles table in the schema cache' }), false);
});
