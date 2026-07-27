import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestMetaAuthorizationUrl } from './metaIntegrationRequests.js';

void test('Meta OAuth starts with an authenticated JSON handoff before leaving the app', async () => {
    let receivedAuthorization = '';
    let requestUrl = '';

    const authorizationUrl = await requestMetaAuthorizationUrl({
        requesterId: 'profile-1',
        companyName: '테스트',
        redirectPath: '/dashboard/franchise-leads'
    }, {
        getHeaders: async () => new Headers({
            Accept: 'application/json',
            Authorization: 'Bearer test-access-token'
        }),
        fetcher: async (input, init) => {
            requestUrl = String(input);
            receivedAuthorization = new Headers(init.headers).get('Authorization') || '';
            return Response.json({
                authorizationUrl: 'https://www.facebook.com/v25.0/dialog/oauth?state=test'
            });
        }
    });

    const url = new URL(requestUrl, 'http://localhost:3000');
    assert.equal(url.pathname, '/api/integrations/meta/connect');
    assert.equal(url.searchParams.get('requesterId'), 'profile-1');
    assert.equal(url.searchParams.get('company'), '테스트');
    assert.equal(url.searchParams.get('redirect'), '/dashboard/franchise-leads');
    assert.equal(url.searchParams.get('response'), 'json');
    assert.equal(receivedAuthorization, 'Bearer test-access-token');
    assert.equal(authorizationUrl, 'https://www.facebook.com/v25.0/dialog/oauth?state=test');
});
