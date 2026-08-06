import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEMO_NAVIGATION_REQUEST_EVENT,
    isDemoFetchAllowed,
    isDemoNavigationAllowed
} from './DemoApiGuard';

const ORIGIN = 'https://demo.example.com';

test('Given demo fetches When classifying requests Then only same-origin non-API assets and demo access are allowed', () => {
    assert.equal(isDemoFetchAllowed(new URL(`${ORIGIN}/api/demo/access`), ORIGIN), true);
    assert.equal(isDemoFetchAllowed(new URL(`${ORIGIN}/demo/manager`), ORIGIN), true);
    assert.equal(isDemoFetchAllowed(new URL(`${ORIGIN}/_next/static/chunk.js`), ORIGIN), true);
    assert.equal(isDemoFetchAllowed(new URL(`${ORIGIN}/api/franchise-leads`), ORIGIN), false);
    assert.equal(isDemoFetchAllowed(new URL(`${ORIGIN}/contracts/vendor/register?_rsc=demo`), ORIGIN), false);
    assert.equal(isDemoFetchAllowed(new URL('https://dapi.kakao.com/v2/maps/sdk.js'), ORIGIN), false);
});

test('Given links or popups When classifying navigation Then only demo routes remain reachable', () => {
    assert.equal(DEMO_NAVIGATION_REQUEST_EVENT, 'demo-navigation-request');
    assert.equal(isDemoNavigationAllowed(new URL(`${ORIGIN}/demo`), ORIGIN), true);
    assert.equal(isDemoNavigationAllowed(new URL(`${ORIGIN}/demo/partner`), ORIGIN), true);
    assert.equal(isDemoNavigationAllowed(new URL(`${ORIGIN}/dashboard/franchise-operations`), ORIGIN), false);
    assert.equal(isDemoNavigationAllowed(new URL('https://example.com'), ORIGIN), false);
});
