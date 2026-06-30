import assert from 'node:assert/strict';
import test from 'node:test';

import {
    addMeetingToolCustomCostRow,
    calculateMeetingToolSummary,
    getMeetingToolDefaultsFromLocation,
    normalizeMeetingToolDraft,
    setMeetingToolActiveTarget,
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
