import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CompanyTemplateSummary } from './companyTemplatesClient.js';
import { getCompanyTemplateSections } from './companyTemplateSections.js';

function templateFixture(input: {
    readonly id: string;
    readonly status: string;
    readonly ucansignTemplateId: string;
}): CompanyTemplateSummary {
    return {
        id: input.id,
        companyId: 'company-1',
        name: input.id,
        description: '',
        status: input.status,
        activeVersionId: `version-${input.id}`,
        createdAt: '2026-06-23T00:00:00.000Z',
        updatedAt: '2026-06-23T00:00:00.000Z',
        createdByName: '관리자',
        latestVersion: {
            id: `version-${input.id}`,
            versionNumber: 1,
            status: input.status,
            sourceFileName: 'contract.pdf',
            sourceFileUrl: '',
            sourceFileSize: 1000,
            pageCount: 1,
            ucansignTemplateId: input.ucansignTemplateId
        }
    };
}

test('Given mixed company templates When sectioning Then only linked active templates stay in the sending list', () => {
    const sections = getCompanyTemplateSections([
        templateFixture({ id: 'ready', status: 'active', ucansignTemplateId: 'ucansign-template-1' }),
        templateFixture({ id: 'interrupted-draft', status: 'draft', ucansignTemplateId: '' }),
        templateFixture({ id: 'interrupted-active', status: 'active', ucansignTemplateId: '' }),
        templateFixture({ id: 'archived', status: 'archived', ucansignTemplateId: 'ucansign-template-2' })
    ]);

    assert.deepEqual(sections.readyTemplates.map(template => template.id), ['ready']);
    assert.deepEqual(sections.connectionRequiredTemplates.map(template => template.id), ['interrupted-draft', 'interrupted-active']);
    assert.deepEqual(sections.archivedTemplates.map(template => template.id), ['archived']);
});
