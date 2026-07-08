import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildOwnerSubmissionTitle,
    canReviewOwnerSubmission,
    DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS,
    getOwnerSubmissionReviewMode,
    mergeOwnerProvidedBasicsIntoLocationData,
    mergeOwnerPortalChecklistTasksIntoLocationData,
    normalizeOwnerProvidedBasics,
    normalizeOwnerPortalChecklistTasks,
    readOwnerPortalChecklistTasksFromLocationData,
    readOwnerProvidedBasicsFromLocationData,
    toOwnerSubmissionStatus,
    toOwnerSubmissionType
} from './franchise-owner-portal.js';

void test('Given owner basics payload When normalizing Then only trimmed string fields are kept', () => {
    const basics = normalizeOwnerProvidedBasics({
        businessNumber: ' 123-45-67890 ',
        representativeName: ' 김점주 ',
        contactPhone: 1234,
        deposit: ' 3000 ',
        tableCount: ' 12 ',
        unknown: 'ignored'
    });

    assert.equal(basics.businessNumber, '123-45-67890');
    assert.equal(basics.representativeName, '김점주');
    assert.equal(basics.contactPhone, '');
    assert.equal(basics.deposit, '3000');
    assert.equal(basics.tableCount, '12');
    assert.equal(basics.memo, '');
});

void test('Given location data When merging owner basics Then existing data is preserved and owner basics can be read', () => {
    const basics = normalizeOwnerProvidedBasics({ monthlyRent: '200', seatCount: '32' });
    const merged = mergeOwnerProvidedBasicsIntoLocationData({ source: 'hq' }, basics);
    const readBack = readOwnerProvidedBasicsFromLocationData(merged);

    assert.equal(merged.source, 'hq');
    assert.equal(readBack.monthlyRent, '200');
    assert.equal(readBack.seatCount, '32');
});

void test('Given owner submission values When normalizing Then unsupported values fall back safely', () => {
    assert.equal(toOwnerSubmissionType('facility_request'), 'facility_request');
    assert.equal(toOwnerSubmissionType('unknown'), 'general_request');
    assert.equal(toOwnerSubmissionStatus('approved'), 'approved');
    assert.equal(toOwnerSubmissionStatus('unknown'), 'submitted');
    assert.equal(canReviewOwnerSubmission('submitted'), true);
    assert.equal(canReviewOwnerSubmission('approved'), false);
    assert.equal(buildOwnerSubmissionTitle('store_info', ''), '매장 정보 입력');
    assert.equal(buildOwnerSubmissionTitle('opening_task_completion', ''), '운영 체크리스트 완료 요청');
    assert.equal(buildOwnerSubmissionTitle('general_request', '문의'), '문의');
});

void test('Given owner submission type and status When deciding review mode Then only checklist completion needs approval', () => {
    assert.equal(getOwnerSubmissionReviewMode('opening_task_completion', 'submitted'), 'approval');
    assert.equal(getOwnerSubmissionReviewMode('facility_request', 'submitted'), 'resolution');
    assert.equal(getOwnerSubmissionReviewMode('general_request', 'submitted'), 'resolution');
    assert.equal(getOwnerSubmissionReviewMode('store_info', 'submitted'), 'acknowledge');
    assert.equal(getOwnerSubmissionReviewMode('store_info', 'resolved'), 'none');
    assert.equal(getOwnerSubmissionReviewMode('opening_task_completion', 'approved'), 'none');
});

void test('Given owner checklist tasks When normalizing and merging Then invalid rows are ignored and existing location data is preserved', () => {
    const tasks = normalizeOwnerPortalChecklistTasks([
        { id: 'custom-1', title: ' 청결 확인 ', memo: ' 주방 포함 ' },
        { id: '', title: '', memo: 'ignored' },
        { title: '시설 이상 확인' }
    ]);
    const merged = mergeOwnerPortalChecklistTasksIntoLocationData({ source: 'hq' }, tasks);
    const readBack = readOwnerPortalChecklistTasksFromLocationData(merged);

    assert.equal(merged.source, 'hq');
    assert.equal(tasks.length, 2);
    assert.equal(readBack[0]?.id, 'custom-1');
    assert.equal(readBack[0]?.title, '청결 확인');
    assert.equal(readBack[0]?.memo, '주방 포함');
    assert.equal(readBack[1]?.id, 'owner-checklist-3');
    assert.equal(DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS.length > 0, true);
});

void test('Given no owner portal checklist in location data When reading Then no opening-project defaults are injected', () => {
    const readBack = readOwnerPortalChecklistTasksFromLocationData({ source: 'hq' });

    assert.deepEqual(readBack, []);
});
