import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
import {
    createDemoLocationRuntime,
    DEMO_ADDRESS_LOOKUP_SOURCE,
    DEMO_BRAND_SEARCH_SOURCE
} from './DemoLocationRuntime.js';

test('Given an empty location When a request is recorded Then its local summary becomes actionable', async () => {
    // Given
    const runtime = createDemoLocationRuntime();

    // When
    const result = await runtime.createMessage({
        userId: 'demo-manager',
        locationId: 'demo-location-empty',
        body: '임대 조건 재확인',
        kind: 'request'
    });

    // Then
    assert.equal(result.message.requestStatus, 'open');
    assert.equal(result.summary.totalCount, 1);
    assert.equal(result.summary.openRequestCount, 1);
});

test('Given a seeded open request When it is completed Then local request status and summary change', async () => {
    // Given
    const runtime = createDemoLocationRuntime();

    // When
    const result = await runtime.updateRequestStatus({
        userId: 'demo-manager',
        messageId: 'demo-message-request-gangnam',
        requestStatus: 'done'
    });

    // Then
    assert.equal(result.message.requestStatus, 'done');
    assert.equal(result.summary.openRequestCount, 0);
});

test('Given a report draft When it is saved Then the local runtime returns the persisted draft', async () => {
    // Given
    const runtime = createDemoLocationRuntime();
    const draft = { ...normalizeMeetingToolDraft(null), reportMemo: '현장 재확인' };

    // When
    const saved = await runtime.saveMeetingTool({ locationId: 'demo-location-report', meetingTool: draft });

    // Then
    assert.equal(saved.reportMemo, '현장 재확인');
    assert.ok(saved.updatedAt);
});

test('Given a report draft When it is saved as a preset Then the preset is locally queryable', async () => {
    // Given
    const runtime = createDemoLocationRuntime();
    const draft = normalizeMeetingToolDraft(null);

    // When
    const saved = await runtime.savePreset({
        companyId: 'demo-company',
        name: '보수안',
        meetingTool: draft
    });

    // Then
    assert.equal(saved.name, '보수안');
    assert.equal((await runtime.fetchPresets({ companyId: 'demo-company' }))[0]?.id, saved.id);
});

test('Given a seeded preset When it is deleted Then it is removed from local preset results', async () => {
    // Given
    const runtime = createDemoLocationRuntime();

    // When
    await runtime.deletePreset({ presetId: 'demo-preset-standard' });

    // Then
    assert.equal((await runtime.fetchPresets({ companyId: 'demo-company' })).length, 0);
});

test('Given a report draft When a version is saved Then version history increments in memory', async () => {
    // Given
    const runtime = createDemoLocationRuntime();
    const draft = normalizeMeetingToolDraft(null);

    // When
    const saved = await runtime.saveVersion({
        locationId: 'demo-location-version',
        title: '2차 검토',
        meetingTool: draft
    });

    // Then
    assert.equal(saved.versionNumber, 1);
    assert.equal((await runtime.fetchVersions('demo-location-version'))[0]?.id, saved.id);
});

test('Given a fixture address query When it is searched Then local address results are returned', async () => {
    // Given
    const query = '강남';

    // When
    const results = await DEMO_ADDRESS_LOOKUP_SOURCE.search({ query, requesterId: 'demo-manager' });

    // Then
    assert.ok(results.length > 0);
    assert.match(results[0]?.address || '', /강남/);
});

test('Given a fixture brand query When it is searched Then local brand results are returned', async () => {
    // Given
    const query = '미카도';

    // When
    const results = await DEMO_BRAND_SEARCH_SOURCE.search({
        requesterId: 'demo-manager',
        companyName: '민티아',
        query,
        includeDisclosure: false
    });

    // Then
    assert.equal(results[0]?.brandName, '미카도');
});
