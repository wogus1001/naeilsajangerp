import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIDEBAR_SECTIONS } from '../layout/SidebarMenuConfig.js';
import {
    getCompanyMenuFeatureForPath,
    getDefaultCompanyMenuFlags
} from '../../lib/company-menu-features.js';
import { APPROVAL_LOCAL_NAVIGATION, approvalDocumentHref } from './approvalsNavigation.js';

test('Given company approvals enabled When reading navigation Then the top-level route and local labels are stable', () => {
    const approvalsSection = SIDEBAR_SECTIONS.find(section => section.key === 'approvals');
    const feature = getCompanyMenuFeatureForPath('/approvals/templates');
    const flags = getDefaultCompanyMenuFlags();

    assert.equal(approvalsSection?.direct, true);
    assert.equal(approvalsSection?.title, '전자결재');
    assert.equal(approvalsSection?.items[0]?.url, '/approvals');
    assert.equal(approvalsSection?.items[0]?.featureKey, 'approvals');
    assert.equal(feature?.key, 'approvals');
    assert.equal(feature?.category, '전자결재');
    assert.equal(flags.approvals, true);
    assert.deepEqual(
        APPROVAL_LOCAL_NAVIGATION.map(item => [item.label, item.href]),
        [
            ['홈', '/approvals'],
            ['작성하기', '/approvals/write'],
            ['결재 대기', '/approvals/pending'],
            ['내 문서함', '/approvals/mine'],
            ['부서 문서함', '/approvals/department'],
            ['양식 관리', '/approvals/templates'],
            ['조직·결재 설정', '/approvals/settings']
        ]
    );
    assert.equal(approvalDocumentHref('document-1'), '/approvals/documents/document-1');
});
