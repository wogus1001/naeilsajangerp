import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    filterLeadsByManagerScope,
    normalizeLeadManagerScopeIds
} from './leadTaskScope.js';

type TestLead = {
    readonly id: string;
    readonly managerId?: string | null;
};

test('normalizeLeadManagerScopeIds removes empty and duplicate manager ids', () => {
    const scopeIds = normalizeLeadManagerScopeIds(['manager-1', ' ', 'manager-1', 'uuid-1']);

    assert.deepEqual(scopeIds, ['manager-1', 'uuid-1']);
});

test('filterLeadsByManagerScope keeps only leads assigned to the current manager scope', () => {
    const leads: readonly TestLead[] = [
        { id: 'mine-by-id', managerId: 'manager-1' },
        { id: 'mine-by-uuid', managerId: 'uuid-1' },
        { id: 'other', managerId: 'manager-2' },
        { id: 'unassigned', managerId: '' },
        { id: 'missing' }
    ];

    const scopedLeads = filterLeadsByManagerScope(leads, ['manager-1', 'uuid-1']);

    assert.deepEqual(scopedLeads.map(lead => lead.id), ['mine-by-id', 'mine-by-uuid']);
});

test('filterLeadsByManagerScope returns no leads when the current manager scope is unknown', () => {
    const leads: readonly TestLead[] = [
        { id: 'lead-1', managerId: 'manager-1' }
    ];

    const scopedLeads = filterLeadsByManagerScope(leads, []);

    assert.deepEqual(scopedLeads, []);
});
