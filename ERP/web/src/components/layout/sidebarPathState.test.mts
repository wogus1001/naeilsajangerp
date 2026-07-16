import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIDEBAR_MENU_ITEMS, SIDEBAR_SECTIONS } from './SidebarMenuConfig.js';
import { isSidebarItemActive } from './sidebarPathState.js';

test('dashboard is active only on the dashboard root', () => {
    const section = SIDEBAR_SECTIONS.find(candidate => candidate.key === 'dashboard');
    const item = section?.items[0];

    assert.ok(item);
    assert.equal(isSidebarItemActive(item, '/dashboard'), true);
    assert.equal(isSidebarItemActive(item, '/dashboard/franchise-leads/labor-planning'), false);
});

test('approvals remains active on approval child routes', () => {
    const section = SIDEBAR_SECTIONS.find(candidate => candidate.key === 'approvals');
    const item = section?.items[0];

    assert.ok(item);
    assert.equal(isSidebarItemActive(item, '/approvals/documents/document-1'), true);
});

test('work intake activates only the 업무 진행현황 item, not the 모객 DB parent path', () => {
    const leadDb = SIDEBAR_MENU_ITEMS.find(item => item.title === '모객 DB');
    const workIntake = SIDEBAR_MENU_ITEMS.find(item => item.title === '진행현황');

    assert.ok(leadDb);
    assert.ok(workIntake);
    assert.equal(isSidebarItemActive(leadDb, '/dashboard/franchise-leads/work-intake'), false);
    assert.equal(isSidebarItemActive(workIntake, '/dashboard/franchise-leads/work-intake'), true);
});

test('a hidden child route does not suppress its visible parent', () => {
    const leadDb = SIDEBAR_MENU_ITEMS.find(item => item.title === '모객 DB');
    const workIntake = SIDEBAR_MENU_ITEMS.find(item => item.title === '진행현황');

    assert.ok(leadDb);
    assert.ok(workIntake);
    assert.equal(isSidebarItemActive(leadDb, '/dashboard/franchise-leads/work-intake', [leadDb]), true);
    assert.equal(isSidebarItemActive(leadDb, '/dashboard/franchise-leads/work-intake', [leadDb, workIntake]), false);
});
