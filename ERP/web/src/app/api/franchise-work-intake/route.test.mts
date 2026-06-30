import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORK_INTAKE_PROPERTY_SELECT } from './route.js';

test('Given work intake properties are loaded When selecting rows Then manager_id is included for author display', () => {
    assert.match(WORK_INTAKE_PROPERTY_SELECT, /(?:^|, )manager_id(?:,|$)/);
});
