import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMetaIssueGuidance } from './metaIntegrationGuidance.js';

test('Meta issue guidance maps known issue codes to an actionable message', () => {
    assert.equal(
        getMetaIssueGuidance('META_DEFAULT_MANAGER_REQUIRED', 'fallback'),
        '기본 담당자를 선택한 뒤 다시 가져와주세요.'
    );
});

test('Meta issue guidance uses a safe fallback for unknown issues', () => {
    assert.equal(getMetaIssueGuidance('PRIVATE_PROVIDER_ERROR', '연결 상태를 확인해주세요.'), '연결 상태를 확인해주세요.');
    assert.equal(getMetaIssueGuidance(null, 'fallback'), null);
});
