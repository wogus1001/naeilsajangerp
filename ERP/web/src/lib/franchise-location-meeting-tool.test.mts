import assert from 'node:assert/strict';
import test from 'node:test';

import {
    addMeetingToolCustomCostRow,
    applyMeetingToolPreset,
    calculateMeetingToolSummary,
    getMeetingToolDefaultsFromLocation,
    normalizeMeetingToolDraft,
    normalizeMeetingToolPreset,
    setMeetingToolActiveTarget,
    toMeetingToolPresetData,
    updateMeetingToolCostAmount,
    updateMeetingToolCostRatio,
    updateMeetingToolTargetSales
} from './franchise-location-meeting-tool';

test('normalizes partial meeting tool draft into fixed cost rows in manwon units', () => {
    const draft = normalizeMeetingToolDraft({
        targetSales: '4,500',
        costRows: [
            { key: 'materialCost', amount: '1575', memo: '35%' },
            { key: 'unknown', amount: 1000 }
        ],
        reportMemo: '  내부 검토  '
    });

    assert.equal(draft.targetSales, 4_500);
    assert.equal(draft.costRows.length, 5);
    assert.deepEqual(draft.costRows.map(row => row.label), ['재료비', '인건비', '관리비·공과금', '기타잡비', '로열티']);
    assert.deepEqual(draft.costRows[0], {
        key: 'materialCost',
        label: '재료비',
        amount: 1_575,
        ratio: 35,
        memo: '35%',
        custom: false
    });
    assert.equal(draft.reportMemo, '내부 검토');
});

test('preserves candidate-specific market report evidence while normalizing meeting tool draft', () => {
    const draft = normalizeMeetingToolDraft({
        targetSales: '4,500',
        marketReport: {
            tradeAreaSummary: '  역세권 1층\n오피스 배후  ',
            demandEvidence: '점심 피크 유동인구 확인',
            targetSalesBasis: '객단가 12,000원 x 예상 125건',
            riskNotes: '경쟁점 <2곳> 재확인'
        }
    });

    assert.deepEqual(draft.marketReport, {
        tradeAreaSummary: '역세권 1층\n오피스 배후',
        demandEvidence: '점심 피크 유동인구 확인',
        targetSalesBasis: '객단가 12,000원 x 예상 125건',
        riskNotes: '경쟁점 <2곳> 재확인'
    });
});

test('normalizes candidate market map radius for Kakao map preview', () => {
    const draft = normalizeMeetingToolDraft({
        marketMap: {
            radiusMeters: '1000',
            measurementMode: 'distance',
            measurementPoints: [
                { lat: '37.4', lng: '127.1' },
                { lat: 37.5, lng: 127.2 },
                { lat: null, lng: 127.3 }
            ]
        }
    });

    assert.deepEqual(draft.marketMap, {
        radiusMeters: 1000,
        measurementMode: 'distance',
        measurementPoints: [
            { lat: 37.4, lng: 127.1 },
            { lat: 37.5, lng: 127.2 }
        ]
    });
});

test('falls back to 500m for unsupported market map radius', () => {
    const draft = normalizeMeetingToolDraft({
        marketMap: { radiusMeters: 750 }
    });

    assert.deepEqual(draft.marketMap, {
        radiusMeters: 500,
        measurementMode: 'none',
        measurementPoints: []
    });
});

test('clears market map measurement points when measurement mode is unsupported', () => {
    const draft = normalizeMeetingToolDraft({
        marketMap: {
            radiusMeters: 500,
            measurementMode: 'legacy-line',
            measurementPoints: [
                { lat: 37.4, lng: 127.1 },
                { lat: 37.5, lng: 127.2 }
            ]
        }
    });

    assert.deepEqual(draft.marketMap, {
        radiusMeters: 500,
        measurementMode: 'none',
        measurementPoints: []
    });
});

test('excludes candidate-specific market report evidence from company shared preset data', () => {
    const presetData = toMeetingToolPresetData({
        targetSales: 4_500,
        marketReport: {
            tradeAreaSummary: '이 후보지 전용 상권 근거',
            demandEvidence: '프리셋에 저장되면 안 됨'
        },
        marketMap: { radiusMeters: 1000 },
        reportMemo: '이 후보지 전용 검토 메모'
    });

    assert.equal(Object.hasOwn(presetData, 'marketReport'), false);
    assert.equal(Object.hasOwn(presetData, 'marketMap'), false);
    assert.equal(Object.hasOwn(presetData, 'reportMemo'), false);
});

test('prefills rent and maintenance from location master data', () => {
    const defaults = getMeetingToolDefaultsFromLocation({
        lease: {
            monthlyRent: 300,
            maintenanceFee: 60,
            memo: ''
        }
    });
    const draft = normalizeMeetingToolDraft({ targetSales: 4_500 }, defaults);
    const rentRow = draft.costRows.find(row => row.key === 'rentAndMaintenance');

    assert.equal(rentRow?.amount, 360);
    assert.equal(rentRow?.ratio, 8);
});

test('updates amount and ratio both directions', () => {
    const initial = normalizeMeetingToolDraft({ targetSales: 4_500 });
    const withAmount = updateMeetingToolCostAmount(initial, 'laborCost', 900);
    const laborRow = withAmount.costRows.find(row => row.key === 'laborCost');

    assert.equal(laborRow?.amount, 900);
    assert.equal(laborRow?.ratio, 20);

    const withRatio = updateMeetingToolCostRatio(withAmount, 'royalty', 4);
    const royaltyRow = withRatio.costRows.find(row => row.key === 'royalty');

    assert.equal(royaltyRow?.amount, 180);
    assert.equal(royaltyRow?.ratio, 4);
});

test('keeps decimal cost ratios for meeting calculations', () => {
    const initial = normalizeMeetingToolDraft({ targetSales: 4_500 });
    const updated = updateMeetingToolCostRatio(initial, 'royalty', 4.5);
    const royaltyRow = updated.costRows.find(row => row.key === 'royalty');

    assert.equal(royaltyRow?.amount, 203);
    assert.equal(royaltyRow?.ratio, 4.5);
});

test('recalculates ratios when target sales changes and summarizes profit', () => {
    const initial = normalizeMeetingToolDraft({ targetSales: 3_000 });
    const withAmount = updateMeetingToolCostAmount(initial, 'materialCost', 900);
    const changed = updateMeetingToolTargetSales(withAmount, 4_500);
    const materialRow = changed.costRows.find(row => row.key === 'materialCost');
    const summary = calculateMeetingToolSummary(changed);

    assert.equal(materialRow?.ratio, 20);
    assert.equal(summary.totalCost, 900);
    assert.equal(summary.preTaxProfit, 3_600);
    assert.equal(summary.profitRatio, 80);
});

test('stores three target sales scenarios and switches active target', () => {
    const initial = normalizeMeetingToolDraft({ targetSales: 4_500 });
    const withMaterial = updateMeetingToolCostAmount(initial, 'materialCost', 1_575);
    const second = setMeetingToolActiveTarget(withMaterial, 'second');
    const withSecondTarget = updateMeetingToolTargetSales(second, 5_000);
    const backToFirst = setMeetingToolActiveTarget(withSecondTarget, 'first');
    const materialRow = backToFirst.costRows.find(row => row.key === 'materialCost');

    assert.equal(withSecondTarget.targetSales, 5_000);
    assert.equal(withSecondTarget.targetScenarios.find(scenario => scenario.key === 'second')?.targetSales, 5_000);
    assert.equal(backToFirst.targetSales, 4_500);
    assert.equal(materialRow?.ratio, 35);
});

test('adds custom cost row for meeting-specific expense items', () => {
    const initial = normalizeMeetingToolDraft({ targetSales: 4_500 });
    const withCustom = addMeetingToolCustomCostRow(initial, '배달수수료·광고비');
    const addedRow = withCustom.costRows.find(row => row.custom);
    assert.ok(addedRow);

    const updated = updateMeetingToolCostRatio(withCustom, addedRow.key, 5);
    const customRow = updated.costRows.find(row => row.key === addedRow.key);

    assert.equal(customRow?.label, '배달수수료·광고비');
    assert.equal(customRow?.custom, true);
    assert.equal(customRow?.amount, 225);
});

test('applies company shared preset without overwriting meeting-specific report memo', () => {
    const draft = normalizeMeetingToolDraft({
        targetSales: 3_000,
        costRows: [{ key: 'materialCost', amount: 900 }],
        marketReport: {
            targetSalesBasis: '이 후보지 전용 목표매출 근거',
            tradeAreaSummary: '역세권 1층'
        },
        marketMap: { radiusMeters: 1000 },
        reportMemo: '이 후보지 전용 검토 메모'
    });
    const preset = normalizeMeetingToolPreset({
        id: 'preset-1',
        name: '기본 수익비율',
        activeTargetKey: 'second',
        targetScenarios: [
            { key: 'first', label: '1차', targetSales: 4_500 },
            { key: 'second', label: '2차', targetSales: 5_000 },
            { key: 'third', label: '3차', targetSales: null }
        ],
        costRows: [
            { key: 'materialCost', label: '재료비', amount: 1_750, ratio: 35, memo: '표준', custom: false },
            { key: 'laborCost', label: '인건비', amount: 1_000, ratio: 20, memo: '', custom: false }
        ],
        createdAt: '2026-06-30T00:00:00.000Z',
        updatedAt: '2026-06-30T00:00:00.000Z'
    });

    assert.ok(preset);
    const applied = applyMeetingToolPreset(draft, preset);
    const materialRow = applied.costRows.find(row => row.key === 'materialCost');

    assert.equal(applied.activeTargetKey, 'second');
    assert.equal(applied.targetSales, 5_000);
    assert.equal(materialRow?.amount, 1_750);
    assert.equal(applied.marketReport.targetSalesBasis, '이 후보지 전용 목표매출 근거');
    assert.equal(applied.marketReport.tradeAreaSummary, '역세권 1층');
    assert.deepEqual(applied.marketMap, {
        radiusMeters: 1000,
        measurementMode: 'none',
        measurementPoints: []
    });
    assert.equal(applied.reportMemo, '이 후보지 전용 검토 메모');
});
