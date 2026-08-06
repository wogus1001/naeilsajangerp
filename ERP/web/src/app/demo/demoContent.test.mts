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
import {
    buildDemoSidebarSections,
    DEMO_PATH_TO_SCREEN,
    isDemoFeaturePathAllowed
} from './_components/DemoErpShellConfig';
import { DEMO_FEATURE_SURFACES } from './_components/DemoFranchiseFeatureConfig';
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
        assert.ok(scenario.tourSteps.length <= 9);
        assert.equal(new Set(scenario.tourSteps.map(step => step.id)).size, scenario.tourSteps.length);
        assert.equal(scenario.tourSteps.every(step => step.targetId.length > 0), true);
    }
});

test('Given the manager and admin demos When opening the workspace Then the lead dashboard is introduced first', () => {
    const renderedKpiSelector = '[data-demo-id="franchise-dashboard"] section[aria-label="가맹 운영 주요 건수"]';
    const leadKpiSelector = '[data-demo-id="dashboard-kpis"]';

    assert.equal(DEMO_SCREEN_GUIDES.dashboard.steps[0]?.targetSelector, renderedKpiSelector);
    for (const role of ['manager', 'admin'] as const) {
        assert.equal(DEMO_SCENARIOS[role].defaultScreen, 'leadDb');
        assert.equal(DEMO_SCENARIOS[role].tourSteps[0]?.targetSelector, leadKpiSelector);
    }
    assert.equal(DEMO_SCENARIOS.partner.tourSteps[0]?.targetSelector, renderedKpiSelector);
});

test('Given demo screen guides When measuring spotlights Then broad workspaces resolve to focused controls', () => {
    assert.deepEqual(
        DEMO_SCREEN_GUIDES.dashboard.steps.map(step => step.targetSelector),
        [
            '[data-demo-id="franchise-dashboard"] section[aria-label="가맹 운영 주요 건수"]',
            '[data-demo-id="franchise-dashboard"] section[aria-label="예정된 일정"]',
            '[data-demo-id="franchise-dashboard"] section[aria-label="공지사항"]',
            '[data-demo-id="franchise-dashboard"] section[aria-label="간편 메모"]'
        ]
    );
    assert.deepEqual(
        DEMO_SCREEN_GUIDES.leadDb.steps.map(step => step.targetSelector),
        [
            '[data-demo-id="dashboard-kpis"]',
            '[data-demo-id="dashboard-pipeline"]',
            '[aria-label="모객 DB 작업 영역"] button:nth-of-type(2)',
            '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 상담 이력"]',
            '[class*="leadTable"] [class*="rowActions"]:has([aria-label$="가맹 희망자 승격"])',
            '[class*="leadLayerTabs"] button:nth-of-type(2)'
        ]
    );
    assert.deepEqual(
        DEMO_SCREEN_GUIDES.location.steps.map(step => step.targetSelector),
        [
            '[data-demo-id="location-workspace-tabs"] [aria-label="출점 후보지 작업 영역"]',
            '[data-demo-id="location-view-tabs"] [aria-label="출점 후보지 보기 방식"]',
            '[data-demo-id="location-master"] [aria-label="후보지 목록 등록 전환"] button:nth-of-type(2)',
            '[data-demo-id="location-master"] tbody tr:first-child [aria-label$="후보지 수정"]'
        ]
    );
    assert.deepEqual(
        DEMO_SCREEN_GUIDES.locationMap.steps.map(step => step.targetSelector),
        [
            '[data-demo-id="location-map-page"] [aria-label="물건지 지도 필터"]',
            '[data-demo-id="location-map-page"] [aria-label="물건지 지도"]',
            '[data-demo-id="location-map-page"] [aria-label="지도 분석 도구"]'
        ]
    );
    assert.deepEqual(
        DEMO_SCREEN_GUIDES.operations.steps.slice(0, 2).map(step => step.targetSelector),
        [
            '[data-demo-id="operations-panel"] [class*="marketSummaryCards"]',
            '[data-demo-id="operations-panel"] [aria-label="가맹 운영 보기"] button:nth-of-type(2)'
        ]
    );
    assert.equal(DEMO_SCREEN_GUIDES.operations.steps[2]?.targetId, 'nav-locationMap');
});

test('Given the core manager journey When advancing Then it reaches acquisition, site, contract, and operations screens', () => {
    const expectedScreens = ['leadDb', 'location', 'contractOwners', 'operations'];
    for (const role of ['manager', 'admin'] as const) {
        const screens = Array.from(new Set(DEMO_SCENARIOS[role].tourSteps.map(step => step.screen)));
        assert.deepEqual(screens, expectedScreens);
        const story = DEMO_SCENARIOS[role].tourSteps.map(step => step.description).join(' ');
        assert.match(story, /후보지/);
        assert.match(story, /계약|오픈/);
    }
});

test('Given the core journey reaches site and contract work When advancing Then stable workspace targets keep the guide moving', () => {
    for (const role of ['manager', 'admin'] as const) {
        const siteStep = DEMO_SCENARIOS[role].tourSteps.find(step => step.screen === 'location');
        const locationLinkStep = DEMO_SCENARIOS[role].tourSteps.find(step => step.targetId === 'lead-detail-location-link');
        const contractStep = DEMO_SCENARIOS[role].tourSteps.find(step => step.screen === 'contractOwners');

        assert.equal(siteStep?.targetSelector, '[data-demo-id="location-master"] tbody tr:first-child');
        assert.equal(locationLinkStep?.screen, 'leadDb');
        assert.equal(
            locationLinkStep?.targetSelector,
            '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 후보지 연결"]'
        );
        assert.equal(contractStep?.targetSelector, '[data-demo-id="contract-owner-list"]');
        assert.deepEqual(
            DEMO_SCENARIOS[role].tourSteps.slice(5, 8).map(step => step.targetId),
            ['location-master', 'lead-detail-location-link', 'contract-owner-list']
        );
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

test('Given the production franchise menu When checking demo coverage Then every leaf menu opens a real surface', () => {
    const productionFranchiseLeaves = buildDemoSidebarSections('manager')
        .find(section => section.key === 'franchise')
        ?.items
        .filter(item => !item.group && item.url)
        .map(item => item.url as string) ?? [];
    const coveredPaths = new Set([
        ...Object.keys(DEMO_PATH_TO_SCREEN),
        ...Object.keys(DEMO_FEATURE_SURFACES)
    ]);

    assert.deepEqual(
        productionFranchiseLeaves.filter(path => !coveredPaths.has(path)),
        []
    );
});

test('Given demo roles When checking navigation Then partner visibility stays scoped while shared screens stay aligned', () => {
    const managerScreens = DEMO_SCENARIOS.manager.navItems.map(item => item.id);
    const adminScreens = DEMO_SCENARIOS.admin.navItems.map(item => item.id);
    const partnerScreens = DEMO_SCENARIOS.partner.navItems.map(item => item.id);

    assert.deepEqual(adminScreens, managerScreens);
    assert.deepEqual(partnerScreens, ['dashboard', 'contractOwners', 'location', 'locationMap', 'operations']);
    assert.equal(partnerScreens.some(screen => String(screen) === 'leadDb'), false);
    const partnerMenuUrls = buildDemoSidebarSections('partner')
        .flatMap(section => section.items)
        .flatMap(item => item.url ? [item.url] : []);
    assert.deepEqual(partnerMenuUrls, [
        '/dashboard',
        '/dashboard/franchise-leads/market-insights',
        '/dashboard/franchise-locations',
        '/dashboard/franchise-operations'
    ]);
    assert.equal(isDemoFeaturePathAllowed('partner', '/contracts/vendor'), false);
    assert.equal(isDemoFeaturePathAllowed('manager', '/contracts/vendor/register'), true);
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
