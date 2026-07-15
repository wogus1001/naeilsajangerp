import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    insertCorrectiveActions,
    readPhotoAttachments,
    reconcileSubmittedSupervisionReport,
    syncSupervisionReportWorkflow
} from './reportRouteSupport.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const approverId = '33333333-3333-4333-8333-333333333333';
const reportId = '44444444-4444-4444-8444-444444444444';

function fakeSupabase(managerIds: readonly string[]) {
    const calls: Array<{ readonly name: string; readonly args: Record<string, unknown> }> = [];
    const profileQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        async returns() { return { data: managerIds.map(id => ({ id })), error: null }; }
    };
    const notificationQuery = {
        eq() { return this; },
        in() { return this; },
        update() { return this; },
        async upsert() { return { error: null }; },
        then(resolve: (result: { readonly error: null }) => void) { resolve({ error: null }); }
    };
    return {
        calls,
        client: {
            from(table: string) {
                if (table === 'profiles') return profileQuery;
                assert.equal(table, 'franchise_notifications');
                return notificationQuery;
            },
            async rpc(name: string, args: Record<string, unknown>) {
                calls.push({ name, args });
                return { data: { report_id: reportId }, error: null };
            }
        }
    };
}

test('Given a supervision report submission When syncing Then report persistence and approval use one RPC', async () => {
    const fake = fakeSupabase([actorId, approverId]);
    await syncSupervisionReportWorkflow({
        actorProfileId: actorId,
        companyId,
        eventType: '제출',
        locationName: '강남점',
        reportId,
        reportWrite: {
            create: false,
            expectedUpdatedAt: '2026-07-13T00:00:00.000Z',
            inspectionItems: [{ id: 'item-1' }],
            locationId: '55555555-5555-4555-8555-555555555555',
            photoAttachments: [],
            reviewedAt: null,
            reviewedBy: null,
            status: '제출',
            submittedAt: '2026-07-13T00:01:00.000Z'
        },
        specialNote: '이상 없음',
        supervisorProfileId: actorId,
        supabaseAdmin: fake.client as never,
        templateId: null,
        visitId: '66666666-6666-4666-8666-666666666666'
    });

    const reportCall = fake.calls.find(call => call.name === 'save_supervision_report_with_approval');
    const scheduleCall = fake.calls.find(call => call.name === 'upsert_franchise_schedule_from_payload');
    assert.equal(fake.calls.length, 2);
    assert.equal(reportCall?.args.p_approver_profile_id, approverId);
    assert.equal(reportCall?.args.p_report_status, '제출');
    assert.equal(reportCall?.args.p_expected_updated_at, '2026-07-13T00:00:00.000Z');
    assert.equal(scheduleCall?.name, 'upsert_franchise_schedule_from_payload');
});

test('Given no independent approver When submitting Then the report is rejected before persistence', async () => {
    const fake = fakeSupabase([actorId]);
    await assert.rejects(() => syncSupervisionReportWorkflow({
        actorProfileId: actorId,
        companyId,
        eventType: '제출',
        locationName: '강남점',
        reportId,
        reportWrite: {
            create: true,
            inspectionItems: [],
            locationId: '55555555-5555-4555-8555-555555555555',
            photoAttachments: [],
            reviewedAt: null,
            reviewedBy: null,
            status: '제출',
            submittedAt: '2026-07-13T00:01:00.000Z'
        },
        supervisorProfileId: actorId,
        supabaseAdmin: fake.client as never
    }), /회사 팀장/);
    assert.equal(fake.calls.length, 0);
});

test('Given photo paths from another report When reading attachments Then only this report prefix remains', () => {
    const attachments = readPhotoAttachments([
        { name: 'valid.jpg', path: `franchise-supervision/${companyId}/${reportId}/valid.jpg`, storageBucket: 'franchise-supervision-private', size: 10 },
        { name: 'other.jpg', path: `franchise-supervision/${companyId}/other-report/other.jpg`, storageBucket: 'franchise-supervision-private', size: 20 },
        { name: 'other-company.jpg', path: `franchise-supervision/other-company/${reportId}/other.jpg`, storageBucket: 'franchise-supervision-private', size: 30 },
        { name: 'traversal.jpg', path: `franchise-supervision/${companyId}/${reportId}/../../other/private.jpg`, storageBucket: 'franchise-supervision-private', size: 40 },
        { name: 'encoded-traversal.jpg', path: `franchise-supervision/${companyId}/${reportId}/%2e%2e/private.jpg`, storageBucket: 'franchise-supervision-private', size: 50 }
    ], { companyId, reportId });

    assert.deepEqual(attachments.map(attachment => attachment.name), ['valid.jpg']);
});

test('Given a duplicate report submission When reconciling Then the immutable report still reaches the workflow RPC', async () => {
    const fake = fakeSupabase([actorId, approverId]);
    await reconcileSubmittedSupervisionReport({
        actorProfileId: actorId,
        report: {
            company_id: companyId,
            created_by: actorId,
            id: reportId,
            inspection_items: [{ id: 'locked-item' }],
            location_id: '55555555-5555-4555-8555-555555555555',
            photo_attachments: [{ name: 'locked.jpg' }],
            reject_reason: null,
            reviewed_at: null,
            reviewed_by: null,
            special_note: 'locked note',
            status: '제출',
            submitted_at: '2026-07-13T00:01:00.000Z',
            supervisor_profile_id: actorId,
            template_id: null,
            updated_at: '2026-07-13T00:02:00.000Z',
            visit_id: null
        },
        supabaseAdmin: fake.client as never,
        visit: null
    });

    const reportCall = fake.calls.find(call => call.name === 'save_supervision_report_with_approval');
    assert.equal(fake.calls.length, 2);
    assert.deepEqual(reportCall?.args.p_inspection_items, [{ id: 'locked-item' }]);
    assert.deepEqual(reportCall?.args.p_photo_attachments, [{ name: 'locked.jpg' }]);
    assert.equal(reportCall?.args.p_special_note, 'locked note');
});

test('Given an existing corrective action When a report is submitted again Then its franchise schedule is resynchronized', async () => {
    const scheduleCalls: Array<{ readonly name: string; readonly args: Record<string, unknown> }> = [];
    let upsertCount = 0;
    const correctiveQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        upsert() { upsertCount += 1; return this; },
        async returns() {
            return {
                data: [{
                    assignee_profile_id: actorId,
                    due_date: '2026-07-16',
                    id: 'action-1',
                    inspection_item_id: 'item-1',
                    status: '완료',
                    title: '간판 보수'
                }],
                error: null
            };
        }
    };
    const notificationQuery = {
        update() { return this; },
        eq() { return this; },
        in() { return this; },
        async upsert() { return { error: null }; },
        then(resolve: (result: { readonly error: null }) => void) { resolve({ error: null }); }
    };
    const profileQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        async returns() { return { data: [{ id: actorId }], error: null }; }
    };
    const client = {
        from(table: string) {
            if (table === 'franchise_corrective_actions') return correctiveQuery;
            if (table === 'profiles') return profileQuery;
            assert.equal(table, 'franchise_notifications');
            return notificationQuery;
        },
        async rpc(name: string, args: Record<string, unknown>) {
            scheduleCalls.push({ name, args });
            return { data: null, error: null };
        }
    };

    await insertCorrectiveActions({
        assigneeProfileId: actorId,
        companyId,
        createdBy: actorId,
        items: [{ id: 'item-1', label: '간판 보수', memo: '', result: '개선필요' }],
        locationId: '55555555-5555-4555-8555-555555555555',
        locationName: '강남점',
        reportId,
        supabaseAdmin: client as never
    });

    const schedulePayload = scheduleCalls.find(call => call.name === 'upsert_franchise_schedule_from_payload')?.args.schedule_payload;
    assert.equal(upsertCount, 0);
    assert.equal(typeof schedulePayload === 'object' && schedulePayload !== null && 'status' in schedulePayload ? schedulePayload.status : null, '완료');
    assert.equal(typeof schedulePayload === 'object' && schedulePayload !== null && 'date' in schedulePayload ? schedulePayload.date : null, '2026-07-16');
});
