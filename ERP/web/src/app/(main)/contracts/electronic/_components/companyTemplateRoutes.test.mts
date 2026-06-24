import assert from 'node:assert/strict';
import test from 'node:test';
import { companyTemplateCreateHref } from './companyTemplateRoutes.js';

test('Given a company template id When building create href Then it opens the company template contract writer', () => {
    const href = companyTemplateCreateHref('template 111');

    assert.equal(href, '/contracts/electronic/create?companyTemplateId=template+111');
});

test('Given lead checklist context When building create href Then it preserves document linking params', () => {
    const href = companyTemplateCreateHref('template 111', {
        leadId: 'lead-1',
        checklistStepKey: 'privacy-consent'
    });

    assert.equal(
        href,
        '/contracts/electronic/create?companyTemplateId=template+111&leadId=lead-1&checklistStepKey=privacy-consent'
    );
});
