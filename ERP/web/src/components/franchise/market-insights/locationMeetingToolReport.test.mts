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
    latitude: 37.5665,
    lease: {
        maintenanceFee: 30,
        memo: '',
        monthlyRent: 120
    },
    locationType: '예정점',
    longitude: 127.0012,
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
        marketReport: {
            demandEvidence: '점심 피크 유동인구 확인',
            riskNotes: '경쟁점 <2곳> 재확인',
            targetSalesBasis: '객단가 12,000원 x 예상 125건',
            tradeAreaSummary: '역세권 1층\n오피스 배후'
        },
        marketMap: {
            radiusMeters: 1000,
            measurementMode: 'distance',
            measurementPoints: [
                { lat: 37.5665, lng: 127.0012 },
                { lat: 37.5715, lng: 127.0082 }
            ]
        },
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
    assert.match(html, /상권분석·목표매출 근거/);
    assert.match(html, /객단가 12,000원 x 예상 125건/);
    assert.match(html, /경쟁점 &lt;2곳&gt; 재확인/);
    assert.match(html, /상권 지도/);
    assert.match(html, /meeting-tool-print-map/);
    assert.match(html, /dapi\.kakao\.com\/v2\/maps\/sdk\.js/);
    assert.match(html, /window\.kakao\.maps\.Circle/);
    assert.match(html, /window\.kakao\.maps\.Polyline/);
    assert.match(html, /print-map-dot/);
    assert.match(html, /mapMeasurementMode = "distance"/);
    assert.match(html, /tilesloaded/);
    assert.doesNotMatch(html, /표시 반경/);
    assert.doesNotMatch(html, /<span>위도<\/span>/);
    assert.match(html, /검토 의견/);
    assert.match(html, /상권 &lt;재확인&gt; 필요/);
    assert.match(html, /내부 검토 안내/);
    assert.match(html, /PDF 저장/);
    assert.ok(html.indexOf('현재 선택안 비용 구조') < html.indexOf('상권분석·목표매출 근거'));
    assert.ok(html.indexOf('상권분석·목표매출 근거') < html.indexOf('상권 지도'));
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

test('Given a geocoded dialog map position When building report HTML Then print map uses the resolved coordinates', () => {
    const draft = normalizeMeetingToolDraft({
        marketMap: { radiusMeters: 500 },
        targetSales: 4_500
    });
    const locationWithoutStoredCoordinates = {
        ...baseLocation,
        latitude: null,
        longitude: null
    } satisfies FranchiseLocation;

    const html = buildMeetingToolReportHtml({
        draft,
        location: locationWithoutStoredCoordinates,
        managerName: '김팀장',
        mapPosition: { lat: 37.4312, lng: 127.1296 },
        mode: 'print'
    });

    assert.match(html, /var mapLat = 37\.4312/);
    assert.match(html, /var mapLng = 127\.1296/);
});

test('Given script-like address text When building report HTML Then print script values are safely escaped', () => {
    const draft = normalizeMeetingToolDraft({
        marketMap: { radiusMeters: 500 },
        targetSales: 4_500
    });
    const html = buildMeetingToolReportHtml({
        draft,
        location: {
            ...baseLocation,
            address: '경기 테스트 </script><script>alert(1)</script>'
        },
        managerName: '김팀장',
        mode: 'print'
    });

    assert.doesNotMatch(html, /경기 테스트 <\/script><script>alert\(1\)<\/script>/);
    assert.match(html, /경기 테스트 \\u003C\/script\\u003E\\u003Cscript\\u003Ealert\(1\)\\u003C\/script\\u003E/);
});
