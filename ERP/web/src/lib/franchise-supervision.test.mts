import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildCorrectiveActionSeeds,
    mergeInspectionItems,
    nextReportStatus,
    normalizeVisitPurpose,
    summarizeSupervision
} from './franchise-supervision.js';

void test('Given saved inspection item values When merging with defaults Then missing template items are restored', () => {
    const items = mergeInspectionItems([
        { id: 'cleanliness', label: '청결', result: '개선필요', memo: '냉장고 하단 청소 필요' },
        { id: 'unknown', label: '임시항목', result: '주의', memo: '기타' }
    ]);

    assert.equal(items.length, 6);
    assert.equal(items[0]?.label, '매출/객수 확인');
    assert.equal(items[1]?.id, 'cleanliness');
    assert.equal(items[1]?.result, '개선필요');
    assert.equal(items[1]?.memo, '냉장고 하단 청소 필요');
    assert.equal(items.some(item => item.id === 'unknown'), false);
});

void test('Given a submitted report When approving or rejecting Then only submitted reports change status', () => {
    assert.equal(nextReportStatus('임시저장', { kind: 'approve' }), '임시저장');
    assert.equal(nextReportStatus('제출', { kind: 'approve' }), '승인');
    assert.equal(nextReportStatus('제출', { kind: 'reject' }), '반려');
    assert.equal(nextReportStatus('승인', { kind: 'submit' }), '제출');
});

void test('Given inspection items When only improvement-needed items exist Then corrective action seeds are created for those items', () => {
    const seeds = buildCorrectiveActionSeeds('report-1', [
        { id: 'sales-traffic', label: '매출/객수 확인', result: '양호', memo: '' },
        { id: 'quality', label: '품질', result: '개선필요', memo: '소스 계량 재교육' },
        { id: 'service', label: '서비스', result: '주의', memo: '응대 속도 확인' }
    ]);

    assert.deepEqual(seeds, [
        {
            reportId: 'report-1',
            itemId: 'quality',
            title: '품질',
            memo: '소스 계량 재교육'
        }
    ]);
});

void test('Given visits reports and actions When summarizing Then operational counts follow supervision workflow', () => {
    const summary = summarizeSupervision({
        today: new Date('2026-07-02T09:00:00+09:00'),
        visits: [
            { visitDate: '2026-07-02', status: '예정' },
            { visitDate: '2026-07-03', status: '보고서대기' },
            { visitDate: '2026-07-09', status: '예정' },
            { visitDate: '2026-07-02', status: '취소' }
        ],
        reports: [
            { status: '제출' },
            { status: '승인' }
        ],
        correctiveActions: [
            { status: '요청' },
            { status: '진행중' },
            { status: '완료' }
        ]
    });

    assert.deepEqual(summary, {
        todayVisitCount: 1,
        weekVisitCount: 2,
        missingReportCount: 1,
        pendingApprovalCount: 1,
        activeCorrectiveActionCount: 2
    });
});

void test('Given an unknown visit purpose When normalizing Then regular inspection is used', () => {
    assert.equal(normalizeVisitPurpose('기타'), '정기점검');
});
