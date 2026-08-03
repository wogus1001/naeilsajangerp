import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(fileName: string): string {
    try {
        return readFileSync(new URL(fileName, import.meta.url), 'utf8');
    } catch {
        return '';
    }
}

test('Header delegates the production profile dropdown markup to HeaderProfileMenu', () => {
    // Given
    const headerSource = readSource('./Header.tsx');
    const profileMenuSource = readSource('./HeaderProfileMenu.tsx');

    // When
    const headerUsesSharedMenu = /<HeaderProfileMenu\b/.test(headerSource);
    const menuOwnsProfileAction = profileMenuSource.includes('개인정보수정');

    // Then
    assert.equal(headerUsesSharedMenu, true);
    assert.equal(menuOwnsProfileAction, true);
    assert.equal(headerSource.includes('개인정보수정'), false);
});

test('HeaderProfileMenu keeps operational fallbacks while allowing injected navigation actions', () => {
    // Given
    const profileMenuSource = readSource('./HeaderProfileMenu.tsx');
    const actionContracts = [
        /actions\?\.onProfile,\s*'\/profile'/,
        /actions\?\.onAdmin,\s*'\/admin'/,
        /actions\?\.onLogin,\s*'\/login'/,
        /void onLogout\(\)/
    ];

    // When / Then
    for (const contract of actionContracts) {
        assert.match(profileMenuSource, contract);
    }
});

test('Header wires breadcrumb, action, company, and notification overrides into the shared shell', () => {
    // Given
    const headerSource = readSource('./Header.tsx');

    // When
    const contracts = [
        /resolveHeaderBreadcrumb\(pathname,\s*breadcrumb\)/,
        /\{extraActions\}/,
        /showCompanySelector/,
        /companySelector\s*\?\?/,
        /dataSource=\{notificationDataSource\}/
    ];

    // Then
    for (const contract of contracts) {
        assert.match(headerSource, contract);
    }
});

test('NotificationBell routes controlled load and read operations through the injected data source', () => {
    // Given
    const notificationSource = readSource('./NotificationBell.tsx');

    // When
    const controlledOperations = [
        /dataSource\.load\(/,
        /dataSource\.markOneRead\(/,
        /dataSource\.markAllRead\(/,
        /dataSource\.navigate/
    ];

    // Then
    for (const operation of controlledOperations) {
        assert.match(notificationSource, operation);
    }
});
