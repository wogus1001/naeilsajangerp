import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIDEBAR_SECTIONS } from './SidebarMenuConfig.js';
import { isSidebarItemActive } from './sidebarPathState.js';

test('dashboard is active only on the dashboard root', () => {
    const section = SIDEBAR_SECTIONS.find(candidate => candidate.key === 'dashboard');
    const item = section?.items[0];

    assert.ok(item);
    assert.equal(isSidebarItemActive(item, '/dashboard', section.items), true);
    assert.equal(isSidebarItemActive(item, '/dashboard/franchise-leads/labor-planning', section.items), false);
});

test('approvals remains active on approval child routes', () => {
    const section = SIDEBAR_SECTIONS.find(candidate => candidate.key === 'approvals');
    const item = section?.items[0];

    assert.ok(item);
    assert.equal(isSidebarItemActive(item, '/approvals/documents/document-1', section.items), true);
});
