import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildStoreAssignmentRows,
    buildSupervisorAssignmentRows
} from './franchise-supervision-assignments.js';

void test('Given locations supervisors and assignments When building assignment views Then store and supervisor lists stay aligned', () => {
    const input = {
        locations: [
            { id: 'location-1', name: '강남점', brand: '테스트', address: '서울 강남구' },
            { id: 'location-2', name: '송파점', brand: '테스트', address: '서울 송파구' }
        ],
        supervisors: [
            { id: 'sv-1', name: '김SV', loginId: 'kim-manager', email: 'kim-manager@example.com', role: 'manager' },
            { id: 'sv-2', name: '박SV', loginId: 'park-staff', email: 'park-staff@example.com', role: 'staff' },
            { id: 'sv-3', name: '김SV', loginId: 'kim-sub', email: 'kim-sub@example.com', role: 'sub_manager' }
        ],
        assignments: [
            {
                id: 'assignment-1',
                locationId: 'location-1',
                locationName: '강남점',
                supervisorProfileId: 'sv-1',
                supervisorName: '김SV',
                memo: '신규 오픈 집중',
                active: true,
                assignedAt: '2026-07-01',
                endedAt: null
            },
            {
                id: 'assignment-old',
                locationId: 'location-1',
                locationName: '강남점',
                supervisorProfileId: 'sv-2',
                supervisorName: '박SV',
                memo: '',
                active: false,
                assignedAt: '2026-06-01',
                endedAt: '2026-06-30'
            }
        ]
    };

    const storeRows = buildStoreAssignmentRows(input);
    const supervisorRows = buildSupervisorAssignmentRows(input);

    assert.equal(storeRows.length, 2);
    assert.equal(storeRows[0]?.assignmentId, 'assignment-1');
    assert.equal(storeRows[0]?.supervisorName, '김SV');
    assert.equal(storeRows[0]?.historyCount, 2);
    assert.equal(storeRows[1]?.assigned, false);
    assert.equal(storeRows[1]?.supervisorName, 'SV 미배정');
    assert.deepEqual(supervisorRows.map(row => [row.supervisorName, row.activeStoreCount]), [['김SV', 1], ['박SV', 0], ['김SV', 0]]);
    assert.deepEqual(supervisorRows[0]?.storeNames, ['강남점']);
    assert.equal(supervisorRows[0]?.loginId, 'kim-manager');
    assert.equal(supervisorRows[2]?.email, 'kim-sub@example.com');
});
