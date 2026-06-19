import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_BLOCKED_REQUEST_PREFIX } from './_components/DemoApiGuard';
import { DEMO_ROLES, DEMO_SCENARIOS, DEMO_SIMULATION_ACTIONS } from './demoContent';

test('Given public demo roles When checking links Then every role has a matching scenario', () => {
    for (const role of DEMO_ROLES) {
        assert.ok(role.href.startsWith('/demo/'));
        assert.equal(Boolean(DEMO_SCENARIOS[role.id]), true);
    }
});

test('Given demo tour steps When checking ids Then step ids and target ids are usable', () => {
    for (const scenario of Object.values(DEMO_SCENARIOS)) {
        assert.ok(scenario.tourSteps.length >= 3);
        assert.ok(scenario.tourSteps.length <= 5);
        assert.equal(new Set(scenario.tourSteps.map(step => step.id)).size, scenario.tourSteps.length);
        assert.equal(scenario.tourSteps.every(step => step.targetId.length > 0), true);
    }
});

test('Given simulation actions When checking values Then no action encodes an API endpoint', () => {
    for (const action of DEMO_SIMULATION_ACTIONS) {
        assert.equal(action.includes(DEMO_BLOCKED_REQUEST_PREFIX), false);
        assert.equal(action.startsWith('http'), false);
        assert.equal(action.includes('fetch'), false);
    }
});
