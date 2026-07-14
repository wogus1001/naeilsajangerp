import assert from 'node:assert/strict';
import { test } from 'node:test';
import { organizationDeleteBlockerMessage, parseOrganizationDeleteEntity } from './organization-deletion.js';

test('Given any linked membership When deleting an organization Then deletion is blocked regardless of active state', () => {
    assert.match(organizationDeleteBlockerMessage({ children: 0, memberships: 1, roles: 0 }), /소속 구성원/);
});

test('Given linked data in several groups When deleting an organization Then the first actionable dependency is reported', () => {
    assert.match(organizationDeleteBlockerMessage({ children: 1, memberships: 2, roles: 3 }), /하위 조직/);
});

test('Given no linked data When deleting an organization Then deletion can proceed', () => {
    assert.equal(organizationDeleteBlockerMessage({ children: 0, memberships: 0, roles: 0 }), '');
});

test('Given a deletion target When parsing the request Then only supported organization records are accepted', () => {
    assert.equal(parseOrganizationDeleteEntity(null), 'unit');
    assert.equal(parseOrganizationDeleteEntity('membership'), 'membership');
    assert.equal(parseOrganizationDeleteEntity('role'), 'role');
    assert.equal(parseOrganizationDeleteEntity('profile'), null);
});
