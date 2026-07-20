import assert from 'node:assert/strict';
import test from 'node:test';
import {
    handleDeletedWorkIntakeRecordDELETE,
    type PermanentDeleteDependencies
} from './deleted-records/[id]/route.js';

const RECORD_ID = '11111111-1111-4111-8111-111111111111';

function request(): Request {
    return new Request(`http://localhost/api/franchise-work-intake/deleted-records/${RECORD_ID}`, {
        method: 'DELETE'
    });
}

function context(id = RECORD_ID) {
    return { params: Promise.resolve({ id }) };
}

test('Given a non-admin requester When permanently deleting a history record Then access is denied', async () => {
    let deleteCalled = false;
    const dependencies: PermanentDeleteDependencies = {
        getRequester: async () => ({ id: 'staff-1', role: 'staff', company_id: 'company-1', status: 'active' }),
        deleteRecord: async () => {
            deleteCalled = true;
            return 'deleted';
        }
    };

    const response = await handleDeletedWorkIntakeRecordDELETE(request(), context(), dependencies);

    assert.equal(response.status, 403);
    assert.equal(deleteCalled, false);
});

test('Given no authenticated requester When permanently deleting a history record Then authentication is required', async () => {
    let deleteCalled = false;
    const dependencies: PermanentDeleteDependencies = {
        getRequester: async () => null,
        deleteRecord: async () => {
            deleteCalled = true;
            return 'deleted';
        }
    };

    const response = await handleDeletedWorkIntakeRecordDELETE(request(), context(), dependencies);

    assert.equal(response.status, 401);
    assert.equal(deleteCalled, false);
});

test('Given an admin requester When permanently deleting a history record Then the record is removed', async () => {
    let deletedId = '';
    const dependencies: PermanentDeleteDependencies = {
        getRequester: async () => ({ id: 'admin-1', role: 'admin', company_id: null, status: 'active' }),
        deleteRecord: async id => {
            deletedId = id;
            return 'deleted';
        }
    };

    const response = await handleDeletedWorkIntakeRecordDELETE(request(), context(), dependencies);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(deletedId, RECORD_ID);
    assert.deepEqual(payload, { data: { success: true }, success: true });
});

test('Given an unknown deletion history id When permanently deleting Then not found is returned', async () => {
    const dependencies: PermanentDeleteDependencies = {
        getRequester: async () => ({ id: 'admin-1', role: 'admin', company_id: null, status: 'active' }),
        deleteRecord: async () => 'not_found'
    };

    const response = await handleDeletedWorkIntakeRecordDELETE(request(), context(), dependencies);

    assert.equal(response.status, 404);
});

test('Given an invalid deletion history id When permanently deleting Then validation fails before deletion', async () => {
    let deleteCalled = false;
    const dependencies: PermanentDeleteDependencies = {
        getRequester: async () => ({ id: 'admin-1', role: 'admin', company_id: null, status: 'active' }),
        deleteRecord: async () => {
            deleteCalled = true;
            return 'deleted';
        }
    };

    const response = await handleDeletedWorkIntakeRecordDELETE(request(), context('invalid-id'), dependencies);

    assert.equal(response.status, 400);
    assert.equal(deleteCalled, false);
});

test('Given a database failure When permanently deleting Then a localized server error is returned', async () => {
    const dependencies: PermanentDeleteDependencies = {
        getRequester: async () => ({ id: 'admin-1', role: 'admin', company_id: null, status: 'active' }),
        deleteRecord: async () => {
            throw new Error('database unavailable');
        }
    };

    const response = await handleDeletedWorkIntakeRecordDELETE(request(), context(), dependencies);
    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.message, '완전삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
});
