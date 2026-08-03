import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_BLOCKED_REQUEST_PREFIX } from './_components/DemoApiGuard';
import {
    DEMO_LOCATION_MASTER_ITEMS,
    DEMO_OPERATION_LOCATIONS,
    selectDemoLocationMasterItems,
    selectDemoOperationLocations
} from './_components/DemoFranchiseSampleData';
import { selectDemoContractLeads } from './_components/DemoLeadSampleData';
import { DEMO_ROLES, DEMO_SCENARIOS, DEMO_SCREEN_GUIDES, DEMO_SIMULATION_ACTIONS } from './demoContent';

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

test('Given demo navigation When checking guides Then every screen has guide content', () => {
    for (const scenario of Object.values(DEMO_SCENARIOS)) {
        for (const item of scenario.navItems) {
            const guide = DEMO_SCREEN_GUIDES[item.id];
            assert.ok(guide);
            assert.ok(guide.steps.length >= 3);
            assert.ok(guide.steps.every(step => step.targetSelector === undefined || step.targetSelector.length > 0));
            assert.ok(guide.steps.every(step => step.emphasisTargetIds === undefined || step.emphasisTargetIds.every(targetId => targetId.length > 0)));
            assert.ok(guide.steps.every(step => step.emphasisTargetSelectors === undefined || step.emphasisTargetSelectors.every(selector => selector.length > 0)));
            assert.ok(guide.actions.length >= 1);
        }
    }
});

test('Given demo roles When checking navigation Then partner visibility stays scoped while shared screens stay aligned', () => {
    const managerScreens = DEMO_SCENARIOS.manager.navItems.map(item => item.id);
    const adminScreens = DEMO_SCENARIOS.admin.navItems.map(item => item.id);
    const partnerScreens = DEMO_SCENARIOS.partner.navItems.map(item => item.id);

    assert.deepEqual(adminScreens, managerScreens);
    assert.deepEqual(partnerScreens, ['dashboard', 'contractOwners', 'location', 'locationMap', 'operations']);
    assert.equal(partnerScreens.some(screen => String(screen) === 'leadDb'), false);
});

test('Given role fixtures When selecting operational data Then partner rows stay isolated from manager rows', () => {
    const adminLocations = selectDemoLocationMasterItems('admin');
    const managerLocations = selectDemoLocationMasterItems('manager');
    const partnerLocations = selectDemoLocationMasterItems('partner');
    const adminOperations = selectDemoOperationLocations('admin');
    const managerOperations = selectDemoOperationLocations('manager');
    const partnerOperations = selectDemoOperationLocations('partner');

    assert.equal(adminLocations.length, DEMO_LOCATION_MASTER_ITEMS.length);
    assert.equal(adminOperations.length, DEMO_OPERATION_LOCATIONS.length);
    assert.ok(managerLocations.length > 0);
    assert.ok(partnerLocations.length > 0);
    assert.ok(managerOperations.length > 0);
    assert.ok(partnerOperations.length > 0);
    assert.equal(managerLocations.every(location => location.managerId === 'manager-kim'), true);
    assert.equal(partnerLocations.every(location => location.managerId === 'partner-kim'), true);
    assert.equal(managerOperations.every(location => location.managerId === 'manager-kim'), true);
    assert.equal(partnerOperations.every(location => location.managerId === 'partner-kim'), true);
    assert.equal(selectDemoContractLeads('partner').every(lead => lead.managerId === 'partner-kim'), true);
    assert.equal(selectDemoContractLeads('partner').some(lead => (
        selectDemoContractLeads('manager').some(managerLead => managerLead.id === lead.id)
    )), false);
    assert.equal(managerLocations.some(location => partnerLocations.some(partner => partner.id === location.id)), false);
    assert.equal(managerOperations.some(location => partnerOperations.some(partner => partner.id === location.id)), false);
    assert.ok(selectDemoContractLeads('admin').length >= selectDemoContractLeads('partner').length);
});

test('Given simulation actions When checking values Then no action encodes an API endpoint', () => {
    for (const action of DEMO_SIMULATION_ACTIONS) {
        assert.equal(action.includes(DEMO_BLOCKED_REQUEST_PREFIX), false);
        assert.equal(action.startsWith('http'), false);
        assert.equal(action.includes('fetch'), false);
    }
});
