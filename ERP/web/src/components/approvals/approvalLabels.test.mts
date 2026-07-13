import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    approvalCategoryLabel,
    approvalDocumentBoxLabel,
    approvalRetentionLabel,
    approvalRoleLabel,
    approvalSecurityLabel
} from './approvalLabels.js';

test('Given stored approval keys When rendered Then user-facing Korean labels are returned', () => {
    assert.equal(approvalCategoryLabel('contract'), '계약');
    assert.equal(approvalDocumentBoxLabel('finance'), '재무·지출');
    assert.equal(approvalRetentionLabel('5y'), '5년');
    assert.equal(approvalRoleLabel('approval_admin'), '전자결재 관리자');
    assert.equal(approvalSecurityLabel('company'), '일반');
});

test('Given unknown stored approval keys When rendered Then raw keys are not exposed', () => {
    assert.equal(approvalCategoryLabel('legacy_key'), '기타');
    assert.equal(approvalDocumentBoxLabel('legacy_key'), '일반 품의');
    assert.equal(approvalRetentionLabel('legacy_key'), '별도 지정');
    assert.equal(approvalRoleLabel('legacy_key'), '결재 담당자');
    assert.equal(approvalSecurityLabel('legacy_key'), '일반');
});
