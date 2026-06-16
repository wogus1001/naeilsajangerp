import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    mergeDeepLinkedLead,
    parseLeadDetailDeepLinkId,
    resolveLeadDetailDeepLinkTarget
} from './leadDetailDeepLink.js';
import type { FranchiseLead } from './types.js';

const baseLead: FranchiseLead = {
    id: 'lead-1',
    name: '김희망',
    mobile: '',
    source: '소개',
    status: '상담중',
    grade: 'HOT',
    desiredRegion: '',
    budgetMin: null,
    budgetMax: null,
    interestedBrand: '',
    memo: '',
    nextContactAt: null,
    lastContactedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
};

test('parseLeadDetailDeepLinkId returns trimmed lead id from search string', () => {
    assert.equal(parseLeadDetailDeepLinkId('?tab=db&leadId=lead-1'), 'lead-1');
});

test('resolveLeadDetailDeepLinkTarget opens raw intake lead in DB table layer', () => {
    assert.deepEqual(resolveLeadDetailDeepLinkTarget({ ...baseLead, leadStage: 'raw_intake' }), {
        leadId: 'lead-1',
        workspaceTab: 'db',
        leadDbLayer: 'raw_intake',
        viewMode: 'table'
    });
});

test('mergeDeepLinkedLead replaces existing lead and prepends missing lead', () => {
    const updatedLead = { ...baseLead, name: '김수정' };

    assert.deepEqual(mergeDeepLinkedLead([baseLead], updatedLead), [updatedLead]);
    assert.deepEqual(mergeDeepLinkedLead([], updatedLead), [updatedLead]);
});
