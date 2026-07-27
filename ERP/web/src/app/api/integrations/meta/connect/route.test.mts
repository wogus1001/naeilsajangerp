import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

void test('Meta Lead Ads OAuth requests every permission required for lead retrieval and webhooks', async () => {
    // Given
    const routeSource = await readFile(new URL('./route.ts', import.meta.url), 'utf8');
    const requiredScopes = [
        'ads_management',
        'leads_retrieval',
        'pages_manage_ads',
        'pages_manage_metadata',
        'pages_read_engagement',
        'pages_show_list'
    ];

    // When
    const missingScopes = requiredScopes.filter(scope => !routeSource.includes(`'${scope}'`));

    // Then
    assert.deepEqual(missingScopes, []);
});
