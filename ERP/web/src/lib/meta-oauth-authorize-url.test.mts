import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildMetaOAuthAuthorizeUrl,
    META_LEAD_ADS_OAUTH_SCOPES
} from './meta-oauth-authorize-url.js';

const baseInput = {
    appId: 'meta-app-id',
    redirectUri: 'https://example.com/api/integrations/meta/callback',
    state: 'oauth-state',
    graphVersion: 'v25.0'
};

test('buildMetaOAuthAuthorizeUrl uses the Business Login configuration without legacy scopes', () => {
    // Given
    const businessLoginConfigId = '2544160309378539';

    // When
    const url = buildMetaOAuthAuthorizeUrl({
        ...baseInput,
        businessLoginConfigId
    });

    // Then
    assert.equal(url.searchParams.get('config_id'), businessLoginConfigId);
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('override_default_response_type'), 'true');
    assert.equal(url.searchParams.has('scope'), false);
    assert.equal(url.searchParams.has('auth_type'), false);
});

test('buildMetaOAuthAuthorizeUrl keeps the legacy scope flow when no configuration is set', () => {
    // Given / When
    const url = buildMetaOAuthAuthorizeUrl(baseInput);

    // Then
    assert.equal(url.searchParams.has('config_id'), false);
    assert.equal(url.searchParams.get('auth_type'), 'rerequest');
    assert.deepEqual(
        url.searchParams.get('scope')?.split(','),
        [...META_LEAD_ADS_OAUTH_SCOPES]
    );
});
