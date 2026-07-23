import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getPlatformOperationKindLabel,
    getPlatformOperationStatusLabel,
    summarizePlatformOperations,
    type PlatformOperationItem
} from './platform-operations.js';

const item = (status: PlatformOperationItem['status']): PlatformOperationItem => ({
    id: status,
    kind: 'schedule_sync',
    companyId: null,
    title: status,
    detail: '',
    status,
    attemptCount: 0,
    occurredAt: '2026-07-23T00:00:00.000Z',
    canRetry: status === 'failed'
});

test('운영 현황은 실패·차단과 처리 대기를 구분해 집계한다', () => {
    assert.deepEqual(
        summarizePlatformOperations([
            item('failed'), item('blocked'), item('pending'), item('processing'), item('completed')
        ]),
        { needsAttention: 2, failed: 1, pending: 2, blocked: 1 }
    );
});

test('운영 종류와 상태를 사용자용 한국어로 표시한다', () => {
    assert.equal(getPlatformOperationKindLabel('file_cleanup'), '파일 정리');
    assert.equal(getPlatformOperationStatusLabel('blocked'), '차단');
});
