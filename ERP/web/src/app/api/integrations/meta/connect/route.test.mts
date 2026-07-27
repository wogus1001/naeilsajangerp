import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

void test('Meta Lead Ads OAuth passes the Business Login configuration to the URL builder', async () => {
    // Given
    const routeSource = await readFile(new URL('./route.ts', import.meta.url), 'utf8');

    // When / Then
    assert.match(routeSource, /buildMetaOAuthAuthorizeUrl/);
    assert.match(routeSource, /businessLoginConfigId: process\.env\.META_BUSINESS_LOGIN_CONFIG_ID/);
});
