import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    companyId,
    createDependencies,
    createGetRequest,
    createPostRequest,
    createState,
    createVersionConflictError,
    isJsonRecord,
    locationId,
    managerId,
    otherCompanyId,
    otherLocationId,
    partnerRequester,
    readPayload
} from './route-test-support.mjs';
import {
    handleMeetingToolVersionsGET,
    handleMeetingToolVersionsPOST
} from './route.js';

test('Given no authenticated requester When loading versions Then the route rejects legacy access', async () => {
    const state = createState();
    const response = await handleMeetingToolVersionsGET(createGetRequest(locationId), createDependencies(state, null));
    const payload = await readPayload(response);

    assert.equal(response.status, 401);
    assert.equal(payload.code, 'AUTH_REQUIRED');
});

test('Given malformed location id When loading versions Then validation fails before Supabase filters', async () => {
    const state = createState();
    const response = await handleMeetingToolVersionsGET(createGetRequest('not-a-uuid'), createDependencies(state));

    assert.equal(response.status, 400);
    assert.equal(state.tableCalls.length, 0);
});

test('Given an accessible location When saving a version Then the route increments and stores a normalized snapshot', async () => {
    const state = createState({
        versions: [{
            company_id: companyId,
            created_at: '2026-06-29T00:00:00.000Z',
            created_by: managerId,
            id: '88888888-8888-8888-8888-888888888888',
            location_id: locationId,
            meeting_tool: {},
            title: '이전안',
            version_number: 2
        }]
    });
    const response = await handleMeetingToolVersionsPOST(createPostRequest({
        locationId,
        meetingTool: {
            costRows: [{ key: 'materialCost', amount: '1,750' }],
            reportMemo: '검토 메모',
            targetSales: '5,000'
        },
        title: '임원 보고안'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 200);
    assert.equal(state.inserts.length, 1);
    const insert = state.inserts[0];
    assert.ok(insert);
    assert.equal(insert.company_id, companyId);
    assert.equal(insert.location_id, locationId);
    assert.equal(insert.created_by, managerId);
    assert.equal(insert.version_number, 3);
    assert.equal(insert.title, '임원 보고안');
    assert.ok(isJsonRecord(insert.meeting_tool));
    assert.equal(insert.meeting_tool.targetSales, 5_000);
    assert.equal(insert.meeting_tool.reportMemo, '검토 메모');
    assert.ok(isJsonRecord(payload.data));
    assert.ok(isJsonRecord(payload.data.version));
    assert.equal(payload.data.version.versionNumber, 3);
});

test('Given saved versions When loading Then only the selected location history is returned in newest-first order', async () => {
    const state = createState({
        versions: [
            {
                company_id: companyId,
                created_at: '2026-06-29T00:00:00.000Z',
                created_by: managerId,
                id: '88888888-8888-8888-8888-888888888888',
                location_id: locationId,
                meeting_tool: { targetSales: 4_500 },
                title: '초안',
                version_number: 1
            },
            {
                company_id: companyId,
                created_at: '2026-06-30T00:00:00.000Z',
                created_by: managerId,
                id: '99999999-9999-9999-9999-999999999999',
                location_id: locationId,
                meeting_tool: { targetSales: 5_000 },
                title: '수정안',
                version_number: 2
            },
            {
                company_id: companyId,
                created_at: '2026-06-30T00:00:00.000Z',
                created_by: managerId,
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                location_id: otherLocationId,
                meeting_tool: { targetSales: 9_000 },
                title: '다른 후보지',
                version_number: 1
            }
        ]
    });
    const response = await handleMeetingToolVersionsGET(createGetRequest(locationId), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 200);
    assert.ok(isJsonRecord(payload.data));
    assert.ok(Array.isArray(payload.data.versions));
    assert.deepEqual(payload.data.versions.map(version => version.versionNumber), [2, 1]);
});

test('Given a cross-company location When saving a version Then the route blocks mutation', async () => {
    const state = createState({
        locations: [{
            company_id: otherCompanyId,
            created_by: '99999999-9999-9999-9999-999999999999',
            id: locationId,
            manager_id: null
        }]
    });
    const response = await handleMeetingToolVersionsPOST(createPostRequest({
        locationId,
        meetingTool: { targetSales: 5_000 },
        title: '교차 회사'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 403);
    assert.equal(payload.code, 'FORBIDDEN');
    assert.equal(state.inserts.length, 0);
});

test('Given a partner vendor did not create the location When loading versions Then creator-only access is enforced', async () => {
    const state = createState({
        locations: [{
            company_id: companyId,
            created_by: managerId,
            id: locationId,
            manager_id: null
        }]
    });
    const response = await handleMeetingToolVersionsGET(createGetRequest(locationId), createDependencies(state, partnerRequester));

    assert.equal(response.status, 403);
});

test('Given the version table is missing When loading versions Then SQL setup is reported', async () => {
    const state = createState({ missingVersionsTable: true });
    const response = await handleMeetingToolVersionsGET(createGetRequest(locationId), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 424);
    assert.equal(payload.code, 'VALIDATION_ERROR');
});

test('Given a concurrent version save When the DB unique key is hit Then the route asks the user to retry', async () => {
    const state = createState({ insertError: createVersionConflictError() });
    const response = await handleMeetingToolVersionsPOST(createPostRequest({
        locationId,
        meetingTool: { targetSales: 5_000 },
        title: '동시 저장'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 409);
    assert.equal(payload.code, 'CONFLICT');
    assert.equal(state.inserts.length, 0);
});
