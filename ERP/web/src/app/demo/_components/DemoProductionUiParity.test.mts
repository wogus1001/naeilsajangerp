import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(fileName: string) {
    return readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

test('manager demo adapters compose production operational surfaces', () => {
    const dashboard = readSource('./DemoFranchiseDashboardAdapter.tsx');
    const leadDb = readSource('./DemoLeadDbAdapter.tsx');
    const contractOwners = readSource('./DemoContractOwnersAdapter.tsx');
    const location = readSource('./DemoLocationAdapter.tsx');
    const locationMap = readSource('./DemoLocationMapAdapter.tsx');
    const operations = readSource('./DemoOperationsAdapter.tsx');

    assert.match(dashboard, /MainDashboardTypeA/);
    assert.match(dashboard, /DashboardNoticeDialog/);
    assert.match(leadDb, /LeadDetailPanel/);
    assert.match(leadDb, /LeadFormModal/);
    assert.match(leadDb, /LeadQuickActivityModal/);
    assert.match(contractOwners, /LeadDetailPanel/);
    assert.match(location, /LocationMasterSection/);
    assert.match(locationMap, /FranchiseLocationMapWorkspace/);
    assert.match(operations, /FranchiseOperationsWorkspace/);
});

test('manager demo adapters do not retain bespoke substitutes for production UI', () => {
    const sources = [
        './DemoFranchiseDashboardAdapter.tsx',
        './DemoLeadDbAdapter.tsx',
        './DemoContractOwnersAdapter.tsx',
        './DemoLocationAdapter.tsx',
        './DemoLocationMapAdapter.tsx',
        './DemoOperationsAdapter.tsx',
        './DemoErpShell.tsx'
    ].map(readSource).join('\n');

    assert.doesNotMatch(sources, /DemoRecordDrawer/);
    assert.doesNotMatch(sources, /DemoHeaderPopover/);
    assert.doesNotMatch(sources, /DemoMainKpiCard/);
    assert.doesNotMatch(sources, /staticMapCanvas/);
});

test('dashboard adapter keeps production controlled seams and demo-local notice state', () => {
    const dashboard = readSource('./DemoFranchiseDashboardAdapter.tsx');
    const productionDashboard = readSource('../../(main)/dashboard/page.tsx');

    assert.match(dashboard, /MainDashboardTypeA/);
    assert.match(dashboard, /DashboardNoticeDialog/);
    assert.match(dashboard, /DashboardWelcomeHeader/);
    assert.match(productionDashboard, /DashboardWelcomeHeader/);
    assert.match(dashboard, /metrics=\{/);
    assert.match(dashboard, /schedules=\{/);
    assert.match(dashboard, /notices=\{/);
    assert.match(dashboard, /onOpenNoticeModal=/);
    assert.match(dashboard, /onDraftChange=/);
    assert.match(dashboard, /setNotices/);
    assert.doesNotMatch(dashboard, /DemoMainKpiCard/);
    assert.doesNotMatch(dashboard, /DemoMainSectionHeader/);
});

test('demo shell delegates header surfaces and controlled notification navigation to production components', () => {
    const shell = readSource('./DemoErpShell.tsx');

    assert.match(shell, /from ['"]@\/components\/layout\/Header['"]/);
    assert.match(shell, /from ['"]@\/components\/layout\/Sidebar['"]/);
    assert.match(shell, /<Sidebar/);
    assert.match(shell, /runtime="demo"/);
    assert.match(shell, /notificationDataSource/);
    assert.match(shell, /markOneRead/);
    assert.match(shell, /markAllRead/);
    assert.match(shell, /navigate:/);
    assert.match(shell, /showCompanySelector=\{false\}/);
    assert.match(shell, /HeaderProfileActions/);
    assert.doesNotMatch(shell, /DemoHeaderPopover/);
    assert.doesNotMatch(shell, /DemoErpSidebar/);
    assert.doesNotMatch(shell, /<Bell\b/);
    assert.doesNotMatch(shell, /<User[^>]*className=.*profile/);
});

test('demo tour behaves like an accessible modal popup', () => {
    const tour = readSource('./DemoTourOverlay.tsx');

    assert.match(tour, /aria-modal="true"/);
    assert.match(tour, /aria-labelledby=\{titleId\}/);
    assert.match(tour, /event\.key === 'Escape'/);
    assert.match(tour, /event\.key !== 'Tab'/);
    assert.match(tour, /previouslyFocusedRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
    assert.match(tour, /MutationObserver/);
    assert.match(tour, /setIsSuspended\(hasProductionDialog\)/);
    assert.match(tour, /hidden=\{isSuspended\}/);
    assert.match(tour, /aria-modal=\{isSuspended \? undefined : 'true'\}/);
});

test('role workspaces share production adapters while partner navigation excludes lead DB', () => {
    const roleWorkspace = readSource('./DemoRoleWorkspace.tsx');
    const managerWorkspace = readSource('./ManagerDemoWorkspace.tsx');
    const partnerWorkspace = readSource('./PartnerDemoWorkspace.tsx');
    const shell = readSource('./DemoShell.tsx');

    assert.match(roleWorkspace, /DEMO_ROLE_DASHBOARD_METRICS/);
    for (const adapter of [
        'DemoFranchiseDashboardAdapter',
        'DemoContractOwnersAdapter',
        'DemoLocationAdapter',
        'DemoLocationMapAdapter',
        'DemoOperationsAdapter'
    ]) {
        assert.match(managerWorkspace, new RegExp(adapter));
        assert.match(partnerWorkspace, new RegExp(adapter));
    }
    assert.doesNotMatch(partnerWorkspace, /DemoLeadDbAdapter/);
    assert.match(shell, /scenario\.navItems\.some\(item => item\.id === screen\)/);
});

test('demo workspaces keep every allowed production surface mounted so local edits survive navigation', () => {
    const managerWorkspace = readSource('./ManagerDemoWorkspace.tsx');
    const partnerWorkspace = readSource('./PartnerDemoWorkspace.tsx');

    for (const workspace of [managerWorkspace, partnerWorkspace]) {
        assert.match(workspace, /surfaces\.map/);
        assert.match(workspace, /hidden=\{/);
        assert.match(workspace, /aria-hidden=\{/);
        assert.match(workspace, /data-demo-surface=/);
        assert.doesNotMatch(workspace, /switch \(activeScreen\)/);
    }
});

test('demo guard blocks live APIs and navigation outside the demo workspace', () => {
    const guard = readSource('./DemoApiGuard.tsx');

    assert.match(guard, /requestUrl\.origin !== currentOrigin/);
    assert.match(guard, /window\.open =/);
    assert.match(guard, /blockOperationalNavigation/);
    assert.match(guard, /isDemoNavigationAllowed/);
});
