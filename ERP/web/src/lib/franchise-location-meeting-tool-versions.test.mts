import assert from 'node:assert/strict';
import test from 'node:test';

import {
    formatMeetingToolVersionDisplayTitle,
    makeMeetingToolVersionTitle,
    normalizeMeetingToolVersion
} from './franchise-location-meeting-tool-versions';

test('Given a valid meeting tool version row When normalizing Then the snapshot is returned with normalized meeting tool data', () => {
    const version = normalizeMeetingToolVersion({
        companyId: '11111111-1111-1111-1111-111111111111',
        createdAt: '2026-06-30T00:00:00.000Z',
        createdBy: '33333333-3333-3333-3333-333333333333',
        id: '44444444-4444-4444-4444-444444444444',
        locationId: '22222222-2222-2222-2222-222222222222',
        meetingTool: {
            costRows: [{ key: 'materialCost', amount: '1,750' }],
            reportMemo: '검토 메모',
            targetSales: '5,000'
        },
        title: '',
        versionNumber: 2
    });

    assert.ok(version);
    assert.equal(version.title, 'v2 검토안');
    assert.equal(version.meetingTool.targetSales, 5_000);
    assert.equal(version.meetingTool.reportMemo, '검토 메모');
});

test('Given invalid version identity fields When normalizing Then the row is ignored', () => {
    const version = normalizeMeetingToolVersion({
        companyId: '',
        id: 'version-id',
        locationId: 'location-id',
        versionNumber: 1
    });

    assert.equal(version, null);
});

test('Given a custom title When making version title Then the custom title is preserved', () => {
    assert.equal(makeMeetingToolVersionTitle(3, '  임원 보고안  '), '임원 보고안');
    assert.equal(makeMeetingToolVersionTitle(3, ''), 'v3 검토안');
});

test('Given a stored default title When formatting for display Then the version prefix is not duplicated', () => {
    assert.equal(formatMeetingToolVersionDisplayTitle(2, 'v2 검토안'), 'v2 검토안');
    assert.equal(formatMeetingToolVersionDisplayTitle(3, '임원 보고안'), 'v3 임원 보고안');
});
