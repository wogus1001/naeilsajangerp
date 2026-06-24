import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CompanyTemplateSummary } from './companyTemplatesClient.js';
import { getCompanyTemplateUsageState } from './companyTemplateTableState.js';

const linkedTemplate = {
    id: 'template-linked',
    companyId: 'company-1',
    name: '연결된 템플릿',
    description: '',
    status: 'active',
    activeVersionId: 'version-linked',
    createdAt: '2026-06-23T00:00:00.000Z',
    updatedAt: '2026-06-23T00:00:00.000Z',
    createdByName: '관리자',
    latestVersion: {
        id: 'version-linked',
        versionNumber: 1,
        status: 'active',
        sourceFileName: 'contract.pdf',
        sourceFileUrl: '',
        sourceFileSize: 1000,
        pageCount: 1,
        ucansignTemplateId: 'ucansign-template-1'
    }
} satisfies CompanyTemplateSummary;

const unlinkedTemplate = {
    ...linkedTemplate,
    id: 'template-unlinked',
    name: '연결 전 템플릿',
    status: 'draft',
    latestVersion: {
        ...linkedTemplate.latestVersion,
        id: 'version-unlinked',
        ucansignTemplateId: ''
    }
} satisfies CompanyTemplateSummary;

test('Given a linked company template When deriving table state Then document creation is available', () => {
    const state = getCompanyTemplateUsageState(linkedTemplate);

    assert.equal(state.statusLabel, '발송 가능');
    assert.equal(state.createLabel, '문서 작성');
    assert.equal(state.editLabel, '수정');
    assert.equal(state.canCreateContract, true);
});

test('Given an unlinked company template When deriving table state Then UCanSign connection copy explains the next step', () => {
    const state = getCompanyTemplateUsageState(unlinkedTemplate);

    assert.equal(state.statusLabel, 'UCanSign 연결 필요');
    assert.equal(state.createLabel, '연결 후 작성');
    assert.equal(state.editLabel, '연결하기');
    assert.equal(state.canCreateContract, false);
});
