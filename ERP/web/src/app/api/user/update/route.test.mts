import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROFILE_UPDATE_SELECTS } from './route.js';

test('Given profile update completes When final profile is reloaded Then company relation uses explicit company_id foreign key', () => {
    assert.equal(PROFILE_UPDATE_SELECTS.withLogo, '*, company:companies!company_id(name, logo_url)');
    assert.equal(PROFILE_UPDATE_SELECTS.fallback, '*, company:companies!company_id(name)');
});
