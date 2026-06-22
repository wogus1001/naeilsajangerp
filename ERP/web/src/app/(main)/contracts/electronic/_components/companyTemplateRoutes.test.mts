import assert from 'node:assert/strict';
import test from 'node:test';
import { companyTemplateCreateHref } from './companyTemplateRoutes.js';

test('Given a company template id When building create href Then it opens the company template contract writer', () => {
    const href = companyTemplateCreateHref('template 111');

    assert.equal(href, '/contracts/electronic/create?companyTemplateId=template+111');
});
