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
import {
    getActionRequiredInspectionItems,
    summarizeInspectionItems
} from '../components/franchise/operations/SupervisionReportSummary.js';
import {
    applySupervisionReportAiSummary,
    buildFallbackSupervisionReportAiSummary,
    extractSupervisionReportAiSummaryFromText,
    validateSupervisionAiTranscript
} from './franchise-supervision-ai-summary.js';

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

void test('Given inspection items with good memos When summarizing report Then only warning and improvement items require action', () => {
    const items = [
        { id: 'sales-traffic', label: '매출/객수 확인', result: '양호' as const, memo: '전월 대비 3% 상승' },
        { id: 'cleanliness', label: '청결', result: '주의' as const, memo: '주방 하부 재확인' },
        { id: 'quality', label: '품질', result: '개선필요' as const, memo: '소스 계량 재교육' }
    ];

    const summary = summarizeInspectionItems(items);
    const actionRequiredItems = getActionRequiredInspectionItems(items);

    assert.equal(summary.completionRate, 33);
    assert.equal(summary.warningCount, 1);
    assert.equal(summary.improvementCount, 1);
    assert.deepEqual(actionRequiredItems.map(item => item.id), ['cleanliness', 'quality']);
});

void test('Given AI report JSON When extracting Then supervision summary fields are normalized', () => {
    const summary = extractSupervisionReportAiSummaryFromText(`\`\`\`json
{
  "overallNote": "청결 개선 확인 필요",
  "specialNote": "냉장고 하부 청소 후 사진 공유",
  "inspectionItems": [
    { "id": "cleanliness", "label": "청결", "result": "개선필요", "memo": "냉장고 하부 오염 확인" },
    { "id": "service", "label": "서비스", "result": "양호", "memo": "응대 양호" }
  ]
}
\`\`\``);

    assert.equal(summary?.overallNote, '청결 개선 확인 필요');
    assert.equal(summary?.inspectionItems[0]?.result, '개선필요');
    assert.equal(summary?.inspectionItems[1]?.memo, '응대 양호');
});

void test('Given AI report JSON with leading model text When extracting Then the JSON object is still parsed', () => {
    const summary = extractSupervisionReportAiSummaryFromText(`</think>
정리 결과입니다.
{
  "overallNote": "주방 청결 재확인 필요",
  "specialNote": "3일 뒤 청소 사진 확인",
  "inspectionItems": [
    { "id": "cleanliness", "label": "청결", "result": "주의", "memo": "튀김기 옆 기름때 확인" }
  ]
}
필요 시 저장 전 검토하세요.`);

    assert.equal(summary?.overallNote, '주방 청결 재확인 필요');
    assert.equal(summary?.inspectionItems[0]?.id, 'cleanliness');
    assert.equal(summary?.inspectionItems[0]?.result, '주의');
});

void test('Given AI report JSON with alternate keys When extracting Then summary is normalized', () => {
    const summary = extractSupervisionReportAiSummaryFromText(JSON.stringify({
        summary: 'POS 교육과 주방 청결 재확인이 필요합니다.',
        followUp: '금요일 직원 교육 완료 여부와 청소 사진 확인',
        items: [
            { item_id: 'cleanliness', item: '청결', status: '주의', note: '냉장고 하부 기름때 확인' },
            { item_id: 'hq-support', item: '본사 지원', status: '개선필요', note: 'POS 교육 자료와 배달 리뷰 이벤트 문구 필요' }
        ]
    }));

    assert.equal(summary?.overallNote, 'POS 교육과 주방 청결 재확인이 필요합니다.');
    assert.equal(summary?.specialNote, '금요일 직원 교육 완료 여부와 청소 사진 확인');
    assert.deepEqual(summary?.inspectionItems.map(item => [item.id, item.label, item.result, item.memo]), [
        ['cleanliness', '청결', '주의', '냉장고 하부 기름때 확인'],
        ['hq-support', '본사 지원', '개선필요', 'POS 교육 자료와 배달 리뷰 이벤트 문구 필요']
    ]);
});

void test('Given AI report summary When applying Then matching checklist items and special note are updated', () => {
    const applied = applySupervisionReportAiSummary({
        specialNote: '',
        inspectionItems: [
            { id: 'cleanliness', label: '청결', result: '양호', memo: '' },
            { id: 'quality', label: '품질', result: '양호', memo: '기존 메모' }
        ],
        summary: {
            overallNote: '전체 요약',
            specialNote: '본사 지원 요청',
            inspectionItems: [
                { id: 'cleanliness', label: '청결', result: '주의', memo: '마감 청소 확인 필요' }
            ]
        }
    });

    assert.equal(applied.specialNote, '본사 지원 요청');
    assert.deepEqual(applied.inspectionItems, [
        { id: 'cleanliness', label: '청결', result: '주의', memo: '마감 청소 확인 필요' },
        { id: 'quality', label: '품질', result: '양호', memo: '기존 메모' }
    ]);
});

void test('Given AI response cannot be parsed When building fallback summary Then field memo is mapped to checklist items', () => {
    const summary = buildFallbackSupervisionReportAiSummary({
        transcript: [
            '주방 쪽 튀김기 옆이랑 냉장고 일부에 기름때가 보여서 마감 청소 체크리스트를 다시 주기로 했습니다.',
            '신규 직원이 POS를 아직 잘 못 다뤄서 점심 피크 때 주문 입력이 조금 밀렸습니다.',
            '본사에 POS 교육 자료와 배달 리뷰 이벤트 문구 예시를 요청했습니다.',
            '금요일까지 교육 완료 여부와 청소 사진을 확인하기로 했습니다.'
        ].join('\n'),
        inspectionItems: mergeInspectionItems([])
    });

    const cleanliness = summary.inspectionItems.find(item => item.id === 'cleanliness');
    const training = summary.inspectionItems.find(item => item.id === 'training-notice');
    const support = summary.inspectionItems.find(item => item.id === 'hq-support');

    assert.equal(cleanliness?.result, '개선필요');
    assert.match(cleanliness?.memo || '', /기름때/);
    assert.equal(training?.result, '개선필요');
    assert.match(training?.memo || '', /POS|교육/);
    assert.equal(support?.result, '주의');
    assert.match(summary.specialNote, /금요일|교육 완료|청소 사진/);
});

void test('Given oversized AI transcript When validating Then a readable validation error is raised', () => {
    assert.throws(
        () => validateSupervisionAiTranscript('가'.repeat(12_001)),
        /12,000자 이하/
    );
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

void test('Given visits without submitted reports When checking missing report filter Then waiting and overdue visits are included', () => {
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
            },
            {
                id: 'visit-overdue',
                locationName: '기한초과점',
                supervisorName: '이SV',
                visitDate: '2026-07-03',
                purpose: '정기점검',
                status: '예정'
            }
        ],
        reports: []
    });

    assert.deepEqual(
        items.filter(item => isMissingSupervisionReportItem(item, '2026-07-06')).map(item => item.visitId),
        ['visit-waiting', 'visit-overdue']
    );
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
