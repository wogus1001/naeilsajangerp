import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
import type { FranchiseLocation } from './locationMasterTypes';
import { buildMeetingToolReportHtml } from './locationMeetingToolReport';

const baseLocation = {
    address: '경기 하남시 조정대로45',
    addressDetail: 'F922',
    brand: '미래치킨',
    companyId: '11111111-1111-1111-1111-111111111111',
    cost: {
        deposit: 1_000,
        memo: '',
        premium: 500
    },
    developmentStage: '개발중',
    fileAttachments: [],
    fileNames: [],
    id: '22222222-2222-2222-2222-222222222222',
    importance: '보통',
    landlord: {
        name: '임대인',
        phone: '',
        tendency: ''
    },
    latitude: null,
    lease: {
        maintenanceFee: 30,
        memo: '',
        monthlyRent: 120
    },
    locationType: '예정점',
    longitude: null,
    memo: '',
    name: '하남 미사 후보지',
    openedAt: null,
    region: '경기 하남시',
    siteCondition: {
        demolition: { memo: '', value: '미확인' },
        elevator: { memo: '', value: '미확인' },
        exclusiveAreaMemo: '',
        exclusiveAreaPyeong: 32.5,
        parking: { memo: '', value: '있음' },
        restroom: { memo: '', value: '있음' }
    },
    status: '검토중'
} satisfies FranchiseLocation;

test('Given three target scenarios When building report HTML Then the printout includes scenario comparison and review notice', () => {
    const draft = normalizeMeetingToolDraft({
        activeTargetKey: 'second',
        costRows: [
            { key: 'materialCost', amount: 1_750, ratio: 35, memo: '표준 원가' },
            { key: 'laborCost', amount: 1_000, ratio: 20, memo: '2인 기준' }
        ],
        reportMemo: '상권 <재확인> 필요',
        targetScenarios: [
            { key: 'first', label: '1차', targetSales: 4_500 },
            { key: 'second', label: '2차', targetSales: 5_000 },
            { key: 'third', label: '3차', targetSales: 5_500 }
        ]
    });

    const html = buildMeetingToolReportHtml({
        draft,
        location: baseLocation,
        managerName: '김팀장',
        mode: 'pdf'
    });

    assert.match(html, /목표매출 시나리오 비교/);
    assert.match(html, /1차/);
    assert.match(html, /2차/);
    assert.match(html, /3차/);
    assert.match(html, /검토 의견/);
    assert.match(html, /상권 &lt;재확인&gt; 필요/);
    assert.match(html, /내부 검토 안내/);
    assert.match(html, /PDF 저장/);
});

test('Given a generated report When rendering the header Then creation date is unlabeled date-only and internal badge is omitted', () => {
    const draft = normalizeMeetingToolDraft({
        reportMemo: '보고 메모',
        targetSales: 4_500
    });

    const html = buildMeetingToolReportHtml({
        draft,
        location: baseLocation,
        managerName: '김팀장',
        mode: 'print'
    });

    assert.doesNotMatch(html, /내부 검토 자료/);
    assert.doesNotMatch(html, /생성일/);
    assert.doesNotMatch(html, /오전|오후|\d{1,2}:\d{2}/);
    assert.match(html, /담당 김팀장/);
});
