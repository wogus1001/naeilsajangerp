import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approvalDetailFromWire } from './approvalDocumentAdapters.js';

test('Given a parallel approval step When adapting the document Then every assignee is visible', () => {
    const detail = approvalDetailFromWire({
        document: {
            id: 'document-1',
            title: '병렬 합의 문서',
            status: 'in_review',
            updatedAt: '2026-07-14T09:00:00+09:00'
        },
        steps: [{
            action: 'agreement',
            id: 'step-1',
            order: 1,
            status: 'active',
            targets: [
                { profile_name: '김합의', unit_name: '운영팀' },
                { profile_name: '박합의', unit_name: '재무팀' }
            ]
        }]
    }, []);

    assert.equal(detail.approvalLine[0]?.assigneeName, '김합의, 박합의');
    assert.equal(detail.approvalLine[0]?.assigneeDepartment, '운영팀, 재무팀');
});
