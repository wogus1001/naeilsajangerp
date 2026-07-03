import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildDefaultReportTemplate,
    buildCorrectiveActionSeeds,
    buildSupervisionReportListItems,
    buildSupervisionScheduleInsert,
    isMissingSupervisionReportItem,
    mergeInspectionItems,
    nextReportStatus,
    normalizeVisitPurpose,
    summarizeSupervision
} from './franchise-supervision.js';
import { buildSupervisionOperationQueue } from './franchise-supervision-operation-queue.js';

void test('Given saved inspection item values When merging with defaults Then missing template items are restored', () => {
    const items = mergeInspectionItems([
        { id: 'cleanliness', label: '청결', result: '개선필요', memo: '냉장고 하단 청소 필요' },
        { id: 'unknown', label: '임시항목', result: '주의', memo: '기타' }
    ]);

    assert.equal(items.length, 8);
    assert.equal(items[0]?.label, '매출/객수 확인');
    assert.equal(items[1]?.id, 'cleanliness');
    assert.equal(items[1]?.result, '개선필요');
    assert.equal(items[1]?.memo, '냉장고 하단 청소 필요');
    assert.equal(items.some(item => item.id === 'unknown'), false);
});

void test('Given a company report template When merging inspection items Then custom template order is preserved', () => {
    const template = [
        { id: 'cleanliness', label: '청결' },
        { id: 'training-notice', label: '교육/공지 이행' }
    ];
    const items = mergeInspectionItems([
        { id: 'training-notice', label: '교육/공지 이행', result: '주의', memo: '신메뉴 공지 확인 필요' }
    ], template);

    assert.deepEqual(items.map(item => item.id), ['cleanliness', 'training-notice']);
    assert.equal(items[0]?.result, '양호');
    assert.equal(items[1]?.result, '주의');
});

void test('Given the default report template When building Then supervision v2 items include education and other checks', () => {
    const template = buildDefaultReportTemplate();

    assert.deepEqual(template.inspectionItems.map(item => item.label), [
        '매출/객수 확인',
        '청결',
        '서비스',
        '품질',
        '재고/물류',
        '본사 지원',
        '교육/공지 이행',
        '기타'
    ]);
});

void test('Given visits and inspection reports When building report list items Then missing and submitted states are visible by visit', () => {
    const items = buildSupervisionReportListItems({
        visits: [
            {
                id: 'visit-1',
                locationName: '테스트점',
                supervisorName: '김SV',
                visitDate: '2026-07-03',
                purpose: '정기점검',
                status: '보고서대기'
            },
            {
                id: 'visit-2',
                locationName: '제출점',
                supervisorName: '박SV',
                visitDate: '2026-07-04',
                purpose: '긴급방문',
                status: '승인대기'
            }
        ],
        reports: [
            {
                id: 'report-2',
                visitId: 'visit-2',
                status: '제출',
                inspectionItems: [
                    { id: 'cleanliness', label: '청결', result: '개선필요', memo: '재점검 필요' },
                    { id: 'service', label: '서비스', result: '양호', memo: '' }
                ],
                photoAttachments: [{ name: 'photo.jpg' }],
                specialNote: '본사 지원 요청',
                submittedAt: '2026-07-04T01:00:00.000Z',
                reviewedAt: null,
                updatedAt: '2026-07-04T01:00:00.000Z'
            }
        ]
    });

    assert.equal(items.length, 2);
    assert.equal(items[0]?.reportStatus, '미작성');
    assert.equal(items[1]?.reportId, 'report-2');
    assert.equal(items[1]?.reportStatus, '제출');
    assert.equal(items[1]?.improvementCount, 1);
    assert.equal(items[1]?.photoCount, 1);
    assert.equal(items[1]?.hasSpecialNote, true);
});

void test('Given future visits without reports When checking missing report filter Then only report-waiting visits are included', () => {
    const items = buildSupervisionReportListItems({
        visits: [
            {
                id: 'visit-future',
                locationName: '예정점',
                supervisorName: '김SV',
                visitDate: '2026-07-20',
                purpose: '정기점검',
                status: '예정'
            },
            {
                id: 'visit-waiting',
                locationName: '대기점',
                supervisorName: '박SV',
                visitDate: '2026-07-01',
                purpose: '정기점검',
                status: '보고서대기'
            }
        ],
        reports: []
    });

    assert.deepEqual(items.filter(isMissingSupervisionReportItem).map(item => item.visitId), ['visit-waiting']);
});

void test('Given duplicate reports for one visit When building report list items Then the latest report is selected', () => {
    const items = buildSupervisionReportListItems({
        visits: [
            {
                id: 'visit-1',
                locationName: '중복점',
                supervisorName: '김SV',
                visitDate: '2026-07-03',
                purpose: '정기점검',
                status: '승인대기'
            }
        ],
        reports: [
            {
                id: 'report-old',
                visitId: 'visit-1',
                status: '임시저장',
                inspectionItems: [],
                photoAttachments: [],
                specialNote: '',
                submittedAt: null,
                reviewedAt: null,
                updatedAt: '2026-07-03T01:00:00.000Z'
            },
            {
                id: 'report-new',
                visitId: 'visit-1',
                status: '제출',
                inspectionItems: [],
                photoAttachments: [],
                specialNote: '',
                submittedAt: '2026-07-03T02:00:00.000Z',
                reviewedAt: null,
                updatedAt: '2026-07-03T02:00:00.000Z'
            }
        ]
    });

    assert.equal(items[0]?.reportId, 'report-new');
    assert.equal(items[0]?.reportStatus, '제출');
});

void test('Given a supervision visit When creating a shared schedule Then required text id is included', () => {
    const row = buildSupervisionScheduleInsert({
        scheduleId: 'schedule-uuid',
        companyId: 'company-uuid',
        locationName: '테스트점',
        supervisorProfileId: 'profile-uuid',
        visitDate: '2026-07-03',
        purpose: '정기점검',
        createdAt: '2026-07-03T00:00:00.000Z'
    });

    assert.equal(row.id, 'schedule-uuid');
    assert.equal(row.company_id, 'company-uuid');
    assert.equal(row.user_id, 'profile-uuid');
    assert.equal(row.title, '테스트점 정기점검');
    assert.equal(row.date, '2026-07-03');
    assert.equal(row.scope, 'company');
    assert.equal(row.type, '슈퍼바이징');
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'updated_at'), false);
});

void test('Given a submitted report When approving or rejecting Then only submitted reports change status', () => {
    assert.equal(nextReportStatus('임시저장', { kind: 'approve' }), '임시저장');
    assert.equal(nextReportStatus('제출', { kind: 'approve' }), '승인');
    assert.equal(nextReportStatus('제출', { kind: 'reject' }), '반려');
    assert.equal(nextReportStatus('승인', { kind: 'submit' }), '승인');
    assert.equal(nextReportStatus('제출', { kind: 'saveDraft' }), '제출');
    assert.equal(nextReportStatus('반려', { kind: 'submit' }), '제출');
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

void test('Given supervision visits reports and actions When building operation queue Then urgent items are ordered before routine visits', () => {
    const queue = buildSupervisionOperationQueue({
        today: new Date('2026-07-02T09:00:00+09:00'),
        visits: [
            {
                id: 'visit-today',
                locationId: 'location-1',
                locationName: '테스트점',
                supervisorName: '김SV',
                visitDate: '2026-07-02',
                status: '예정'
            },
            {
                id: 'visit-missing',
                locationId: 'location-2',
                locationName: '미제출점',
                supervisorName: '박SV',
                visitDate: '2026-07-01',
                status: '보고서대기'
            },
            {
                id: 'visit-tomorrow',
                locationId: 'location-3',
                locationName: '내일점',
                supervisorName: '이SV',
                visitDate: '2026-07-03',
                status: '예정'
            }
        ],
        reports: [
            {
                id: 'report-pending',
                visitId: 'visit-today',
                locationId: 'location-1',
                locationName: '테스트점',
                supervisorName: '김SV',
                status: '제출'
            }
        ],
        correctiveActions: [
            {
                id: 'action-overdue',
                locationId: 'location-2',
                locationName: '미제출점',
                assigneeName: '박SV',
                status: '진행중',
                dueDate: '2026-06-30'
            }
        ]
    });

    assert.deepEqual(queue.map(item => item.type), [
        'actionOverdue',
        'reportMissing',
        'visitTomorrow',
        'visitToday',
        'approvalPending'
    ]);
    assert.equal(queue[0]?.severity, '긴급');
    assert.equal(queue[1]?.target, 'reports');
    assert.equal(queue[3]?.target, 'visits');
});

void test('Given an unknown visit purpose When normalizing Then regular inspection is used', () => {
    assert.equal(normalizeVisitPurpose('기타'), '정기점검');
});
