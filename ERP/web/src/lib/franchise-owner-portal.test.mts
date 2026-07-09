import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildOwnerPortalLoginPath,
    buildOwnerSubmissionTitle,
    canReviewOwnerSubmission,
    DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS,
    getOwnerSubmissionReviewMode,
    isAcceptedOwnerNoticeAttachmentFileName,
    isOwnerChecklistCompletionSubmission,
    mergeOwnerProvidedBasicsIntoLocationData,
    mergeOwnerPortalChecklistTasksIntoLocationData,
    normalizeOwnerNoticeAttachments,
    normalizeOwnerPortalChecklistIssues,
    normalizeOwnerProvidedBasics,
    normalizeOwnerPortalChecklistTasks,
    readOwnerPortalChecklistIssuesFromLocationData,
    readOwnerPortalChecklistTasksFromLocationData,
    readOwnerProvidedBasicsFromLocationData,
    toOwnerSubmissionStatus,
    toOwnerSubmissionType
} from './franchise-owner-portal.js';
import {
    isMissingOwnerNoticeAttachmentsColumnError,
    isMissingOwnerPortalSchemaError
} from './franchise-owner-portal-api.js';

void test('Given company context When building owner portal login path Then a path-based company link is returned', () => {
    const path = buildOwnerPortalLoginPath({ companyId: 'company-123', companyName: '내일' });

    assert.equal(path, '/owner/login/company-123');
    assert.equal(path.includes('company='), false);
});

void test('Given no company context When building owner portal login path Then base login path is returned', () => {
    assert.equal(buildOwnerPortalLoginPath({ companyId: '', companyName: ' ' }), '/owner/login');
});

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

void test('Given owner submission type and status When deciding review mode Then checklist completion is tracked without approval', () => {
    assert.equal(getOwnerSubmissionReviewMode('opening_task_completion', 'submitted'), 'none');
    assert.equal(getOwnerSubmissionReviewMode('facility_request', 'submitted'), 'resolution');
    assert.equal(getOwnerSubmissionReviewMode('general_request', 'submitted'), 'resolution');
    assert.equal(getOwnerSubmissionReviewMode('store_info', 'submitted'), 'acknowledge');
    assert.equal(getOwnerSubmissionReviewMode('store_info', 'resolved'), 'none');
    assert.equal(getOwnerSubmissionReviewMode('opening_task_completion', 'approved'), 'none');
});

void test('Given owner submission type When checking checklist completion Then only operating checklist requests match', () => {
    assert.equal(isOwnerChecklistCompletionSubmission('opening_task_completion'), true);
    assert.equal(isOwnerChecklistCompletionSubmission('facility_request'), false);
    assert.equal(isOwnerChecklistCompletionSubmission('store_info'), false);
    assert.equal(isOwnerChecklistCompletionSubmission('unknown'), false);
});

void test('Given notice attachment payloads When normalizing Then downloadable file metadata is kept safely', () => {
    const attachments = normalizeOwnerNoticeAttachments([
        {
            name: ' 공문.pdf ',
            mimeType: ' application/pdf ',
            size: '1,024',
            storageBucket: 'property-documents',
            storagePath: 'franchise-owner-notices/company/notice.pdf',
            publicUrl: ' https://example.test/notice.pdf '
        },
        { name: '원본 없음.png', publicUrl: '' },
        'invalid'
    ]);

    assert.equal(attachments.length, 1);
    assert.equal(attachments[0]?.name, '공문.pdf');
    assert.equal(attachments[0]?.mimeType, 'application/pdf');
    assert.equal(attachments[0]?.size, 1024);
    assert.equal(attachments[0]?.storageBucket, 'property-documents');
    assert.equal(attachments[0]?.storagePath, 'franchise-owner-notices/company/notice.pdf');
    assert.equal(attachments[0]?.publicUrl, 'https://example.test/notice.pdf');
});

void test('Given notice attachment filenames When checking extension Then images and documents are accepted', () => {
    assert.equal(isAcceptedOwnerNoticeAttachmentFileName('안내문.pdf'), true);
    assert.equal(isAcceptedOwnerNoticeAttachmentFileName('현장사진.webp'), true);
    assert.equal(isAcceptedOwnerNoticeAttachmentFileName('공문.hwpx'), true);
    assert.equal(isAcceptedOwnerNoticeAttachmentFileName('실행파일.exe'), false);
});

void test('Given Supabase schema errors When checking owner portal schema readiness Then plain objects are detected', () => {
    assert.equal(isMissingOwnerPortalSchemaError({ message: 'Could not find the franchise_owner_notices table in the schema cache' }), true);
    assert.equal(isMissingOwnerNoticeAttachmentsColumnError({
        message: "Could not find the 'attachments' column of 'franchise_owner_notices' in the schema cache"
    }), true);
    assert.equal(isMissingOwnerNoticeAttachmentsColumnError({ message: 'franchise_owner_notices table does not exist' }), false);
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

void test('Given owner checklist issue When merging Then current tasks and sent issue history are both readable', () => {
    const tasks = normalizeOwnerPortalChecklistTasks([
        { id: 'task-1', title: '매장 정보 확인', memo: '계약 정보와 비교' }
    ]);
    const merged = mergeOwnerPortalChecklistTasksIntoLocationData(
        { source: 'hq' },
        tasks,
        { id: 'issue-1', issuedAt: '2026-07-09T01:00:00.000Z', tasks }
    );
    const readTasks = readOwnerPortalChecklistTasksFromLocationData(merged);
    const readIssues = readOwnerPortalChecklistIssuesFromLocationData(merged);

    assert.equal(merged.source, 'hq');
    assert.equal(readTasks[0]?.id, 'task-1');
    assert.equal(readIssues.length, 1);
    assert.equal(readIssues[0]?.id, 'issue-1');
    assert.equal(readIssues[0]?.issuedAt, '2026-07-09T01:00:00.000Z');
    assert.equal(readIssues[0]?.tasks[0]?.title, '매장 정보 확인');
});

void test('Given owner checklist issue history When normalizing Then invalid issues are ignored and latest entries are kept', () => {
    const issues = normalizeOwnerPortalChecklistIssues([
        { id: 'issue-1', issuedAt: '2026-07-09T01:00:00.000Z', tasks: [{ id: 'task-1', title: ' 확인 ', memo: ' 메모 ' }] },
        { id: 'empty', tasks: [] },
        { id: '', issuedAt: '', tasks: [{ title: '추가 확인' }] }
    ]);

    assert.equal(issues.length, 2);
    assert.equal(issues[0]?.id, 'issue-1');
    assert.equal(issues[0]?.tasks[0]?.title, '확인');
    assert.equal(issues[1]?.id, 'owner-checklist-issue-3');
    assert.equal(issues[1]?.issuedAt, null);
});

void test('Given no owner portal checklist in location data When reading Then no opening-project defaults are injected', () => {
    const readBack = readOwnerPortalChecklistTasksFromLocationData({ source: 'hq' });

    assert.deepEqual(readBack, []);
});
