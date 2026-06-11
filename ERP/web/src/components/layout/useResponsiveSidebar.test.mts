import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSidebarOpenByDefault } from './useResponsiveSidebar.js';

test('isSidebarOpenByDefault closes the sidebar on mobile viewport widths', () => {
    assert.equal(isSidebarOpenByDefault(390), false);
    assert.equal(isSidebarOpenByDefault(720), false);
});

test('isSidebarOpenByDefault opens the sidebar on desktop viewport widths', () => {
    assert.equal(isSidebarOpenByDefault(721), true);
    assert.equal(isSidebarOpenByDefault(1440), true);
});
