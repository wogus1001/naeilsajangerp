import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterApprovalInboxDocuments } from './inbox-filtering.js';

const documents = [
    {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: '7월 지출 품의',
        documentNumber: 'DOC-AAAA',
        authorName: '김재현',
        departmentName: '재무팀',
        templateName: '지출결의서',
        status: 'in_review',
        submittedAt: '2026-07-14T15:20:00.000Z',
        updatedAt: '2026-07-14T15:20:00.000Z'
    },
    {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: '계약 검토 보고',
        documentNumber: 'DOC-BBBB',
        authorName: '박유진',
        departmentName: '개발팀',
        templateName: '계약보고서',
        status: 'approved',
        submittedAt: '2026-07-01T02:00:00.000Z',
        updatedAt: '2026-07-02T02:00:00.000Z'
    },
    {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        title: '주간 업무 초안',
        documentNumber: 'DOC-CCCC',
        authorName: '이민지',
        departmentName: '운영팀',
        templateName: '일반 업무보고',
        status: 'draft',
        submittedAt: null,
        updatedAt: '2026-06-30T16:00:00.000Z'
    }
] as const;

test('Given a document search When filtering Then title, author, department, template, and number are searchable', () => {
    for (const query of ['지출', '김재현', '재무팀', '지출결의서', 'doc-aaaa']) {
        assert.deepEqual(filterApprovalInboxDocuments(documents, { query, status: 'all', from: '', to: '' }).map(item => item.id), [documents[0].id]);
    }
});

test('Given status and KST date criteria When filtering Then only matching documents remain', () => {
    const result = filterApprovalInboxDocuments(documents, {
        query: '',
        status: 'in_review',
        from: '2026-07-15',
        to: '2026-07-15'
    });
    assert.deepEqual(result.map(item => item.id), [documents[0].id]);
});

test('Given an unsubmitted draft When filtering by date Then updated date is used', () => {
    const result = filterApprovalInboxDocuments(documents, {
        query: '',
        status: 'draft',
        from: '2026-07-01',
        to: '2026-07-01'
    });
    assert.deepEqual(result.map(item => item.id), [documents[2].id]);
});
