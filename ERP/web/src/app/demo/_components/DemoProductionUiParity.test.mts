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
    assert.match(leadDb, /LeadDashboard/);
    assert.match(leadDb, /LeadDetailPanel/);
    assert.match(leadDb, /LeadFormModal/);
    assert.match(leadDb, /LeadQuickActivityModal/);
    assert.match(leadDb, /LeadMetaIntegrationPanel/);
    assert.match(leadDb, /Meta 연동 설정/);
    assert.match(contractOwners, /LeadDetailPanel/);
    assert.match(contractOwners, /LeadFormModal/);
    assert.match(location, /LocationMasterSection/);
    assert.match(location, /MarketInsightWorkspaceTabs/);
    assert.match(location, /MarketInsightViewTabs/);
    assert.match(location, /MarketInsightOverview/);
    assert.match(location, /RealtyImportPanel/);
    assert.match(locationMap, /FranchiseLocationMapWorkspace/);
    assert.match(operations, /FranchiseOperationsWorkspace/);
});

test('demo guide transitions keep interactive targets visible before advancing', () => {
    const leadAdapter = readSource('./DemoLeadDbAdapter.tsx');
    const leadController = readSource('./useDemoLeadDbController.tsx');
    const locationList = readSource('../../../components/franchise/market-insights/LocationMasterList.tsx');
    const locationMessagePanel = readSource('../../../components/franchise/market-insights/LocationMessagePanel.tsx');

    assert.match(leadAdapter, /setWorkspaceTab\('dashboard'\)/);
    assert.match(leadAdapter, /setWorkspaceTab\('db'\)/);
    assert.match(leadAdapter, /DEMO_TOUR_STEP_ADVANCE_EVENT/);
    assert.match(leadController, /event\.detail\.toTargetId/);
    assert.match(leadController, /'lead-db-promote-action'/);
    assert.match(leadController, /startsWith\('lead-detail-'\)/);
    assert.match(leadController, /if \(detailLead\) setSelectedLeadId\(detailLead\.id\)/);
    assert.match(leadController, /setLeadDbLayer\('raw_intake'\)/);
    assert.match(leadController, /'lead-db-candidate-table'/);
    assert.match(leadController, /setLeadDbLayer\('candidate'\)/);
    assert.match(leadController, /isCandidateDetailTarget/);
    assert.match(leadController, /'lead-detail-location-link'/);
    assert.match(leadController, /lead\.leadStage === 'candidate'/);
    assert.match(leadController, /tourPromotedLeadIdRef\.current/);
    assert.match(leadController, /if \(!tourPromotedLeadIdRef\.current\)/);
    assert.doesNotMatch(leadController, /onSimulate\(`\$\{lead\.name\} 가맹 희망자 승격`\)/);
    assert.match(locationList, /aria-label=\{`\$\{location\.name\} 후보지 수정`\}/);
    assert.match(
        locationMessagePanel,
        /본사는 물건 검토에 필요한 요청사항과 확인 정보를 기록하고, 담당자는 요청을 확인해 처리합니다\./
    );
    assert.match(locationMessagePanel, /aria-label="물건 기록 안내"/);
});

test('lead detail guide exposes production sections and remains visible over the detail dialog', () => {
    const tour = readSource('./DemoTourOverlay.tsx');
    const demoStyles = readSource('../demo.module.css');
    const basicInfo = readSource('../../../components/franchise/leads/LeadBasicInfoSection.tsx');
    const activity = readSource('../../../components/franchise/leads/LeadActivitySection.tsx');
    const workflow = readSource('../../../components/franchise/LeadWorkflowSection.tsx');
    const disclosure = readSource('../../../components/franchise/LeadDisclosureSection.tsx');
    const locationLink = readSource('../../../components/franchise/LeadLocationLinkSection.tsx');

    assert.match(tour, /targetInsideProductionDialog/);
    assert.match(tour, /hasProductionDialog && !targetInsideProductionDialog/);
    assert.match(tour, /onStepAdvanceAction\?\.\(step, previousStep\)/);
    assert.match(demoStyles, /\.tourLayer\s*\{[\s\S]*?z-index:\s*6000;/);
    assert.match(basicInfo, /aria-label="가맹 희망자 기본정보"/);
    assert.match(activity, /aria-label="가맹 희망자 상담 이력"/);
    assert.match(workflow, /aria-label="가맹 희망자 업무 관리"/);
    assert.match(disclosure, /aria-label="가맹 희망자 정보공개서"/);
    assert.match(locationLink, /aria-label="가맹 희망자 후보지 연결"/);
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
    const productionDashboardTypeA = readSource('../../../components/dashboard/MainDashboardTypeA.tsx');

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
    for (const label of ['예정된 일정', '간편 메모', '공지사항']) {
        assert.match(productionDashboardTypeA, new RegExp(`aria-label="${label}"`));
    }
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
    assert.match(shell, /현재 데모에서는 핵심 프랜차이즈 흐름을 먼저 확인해 주세요/);
    assert.doesNotMatch(shell, /경로를 확인했습니다/);
    assert.doesNotMatch(shell, /DemoHeaderPopover/);
    assert.doesNotMatch(shell, /DemoErpSidebar/);
    assert.doesNotMatch(shell, /<Bell\b/);
    assert.doesNotMatch(shell, /<User[^>]*className=.*profile/);
});

test('demo franchise sidebar keeps the production menu hierarchy', () => {
    const config = readSource('./DemoErpShellConfig.ts');
    const shell = readSource('./DemoErpShell.tsx');
    const demoShell = readSource('./DemoShell.tsx');
    const featureSurface = readSource('./DemoFranchiseFeatureSurface.tsx');
    const featureConfig = readSource('./DemoFranchiseFeatureConfig.ts');
    const featureGuides = readSource('./DemoFranchiseFeatureGuides.ts');
    const fixtureApi = readSource('./DemoFeatureApiFixtures.ts');

    assert.match(config, /SIDEBAR_SECTIONS/);
    assert.match(config, /section\.key === 'dashboard'/);
    assert.match(config, /section\.key === 'franchise'/);
    assert.doesNotMatch(config, /section\.key === 'franchiseWork'/);
    assert.doesNotMatch(config, /title: '출점 후보지'/);
    for (const path of [
        '/dashboard/franchise-leads/labor-planning',
        '/dashboard/franchise-operations/schedule',
        '/dashboard/franchise-supervision',
        '/dashboard/franchise-operations/owner-portal',
        '/contracts/electronic',
        '/dashboard/franchise-vendors',
        '/contracts/vendor',
        '/contracts/vendor/register'
    ]) {
        assert.match(featureConfig, new RegExp(path.replaceAll('/', '\\/')));
        assert.match(featureGuides, new RegExp(path.replaceAll('/', '\\/')));
    }
    assert.match(shell, /onPreviewPathChange\(pathname\)/);
    assert.match(demoShell, /<DemoFranchiseFeatureSurface/);
    assert.match(demoShell, /DEMO_FEATURE_GUIDES\[activeFeaturePath\]/);
    assert.doesNotMatch(demoShell, /화면은 실제 화면과 같은 메뉴를 직접 눌러 확인해 주세요/);
    assert.match(featureSurface, /<LaborPlanningPanel/);
    assert.match(featureSurface, /<FranchiseSchedulePage/);
    assert.match(featureSurface, /<SupervisionPanel/);
    assert.match(featureSurface, /<OwnerPortalPanel/);
    assert.match(featureSurface, /<ElectronicContractsPage/);
    assert.match(featureSurface, /<FranchiseVendorsPage/);
    assert.match(featureSurface, /<VendorContractsPage/);
    assert.match(featureSurface, /<VendorContractRegisterPage/);
    assert.match(fixtureApi, /getDemoFeatureApiResponse/);
    assert.doesNotMatch(featureSurface, /featurePreviewTable/);
});

test('demo tour behaves like an accessible non-modal coach mark', () => {
    const tour = readSource('./DemoTourOverlay.tsx');
    const shell = readSource('./DemoShell.tsx');
    const experience = readSource('./DemoExperienceDialog.tsx');
    const experienceContent = readSource('./DemoExperienceContent.tsx');
    const tourExperience = readSource('./DemoTourExperience.tsx');
    const tourController = readSource('./useDemoTourController.ts');

    assert.match(tour, /role="region"/);
    assert.match(tour, /aria-labelledby=\{titleId\}/);
    assert.match(tour, /event\.key === 'Escape'/);
    assert.doesNotMatch(tour, /event\.key !== 'Tab'/);
    assert.match(tour, /previouslyFocusedRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
    assert.match(tour, /MutationObserver/);
    assert.match(tour, /setIsSuspended\(hasProductionDialog && !targetInsideProductionDialog\)/);
    assert.match(tour, /hidden=\{isSuspended\}/);
    assert.doesNotMatch(tour, /aria-modal=\{isSuspended/);
    assert.match(readSource('../demo.module.css'), /\.tourLayer\s*\{[\s\S]*?pointer-events:\s*none;/);
    assert.match(tour, /Math\.min\(rect\.right \+ SPOTLIGHT_PADDING, window\.innerWidth\)/);
    assert.match(tour, /Math\.min\(rect\.bottom \+ SPOTLIGHT_PADDING, window\.innerHeight\)/);
    assert.match(tour, /onCompleteAction/);
    assert.doesNotMatch(tour, /styles\.spotlight/);
    assert.match(experienceContent, /3분 핵심 체험/);
    assert.match(experience, /자유롭게 둘러보기/);
    assert.match(experience, /다른 기능 둘러보기/);
    assert.match(experience, /처음부터 다시 체험/);
    assert.match(experience, /도입 문의하기/);
    assert.match(experience, /useModalFocusTrap/);
    assert.match(tourController, /tourMode === 'core'/);
    assert.match(tourController, /tourMode === 'story'/);
    assert.match(tourExperience, /mode !== 'core' && mode !== 'story' && mode !== 'screen'/);
    assert.doesNotMatch(shell, /activeGuide\.actions\.find/);
    assert.doesNotMatch(tourExperience, /finalAction=\{mode === 'screen'/);
    assert.match(tour, /'설명 마치기'/);
    assert.match(tourController, /beginTour\('core', coreSteps\)/);
    assert.match(tourController, /dispatchTourTarget\(screenSteps\[0\], activeScreen\)/);
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
    assert.match(shell, /isDemoFeaturePathAllowed\(role/);
});

test('demo feature requests never read the browser real Supabase session', () => {
    const authHeaders = readSource('../../../utils/apiAuthHeaders.ts');
    const featureSurface = readSource('./DemoFranchiseFeatureSurface.tsx');

    assert.match(authHeaders, /window\.location\.pathname === '\/demo'/);
    assert.match(authHeaders, /return headers;[\s\S]*NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(featureSurface, /id: `demo-\$\{role\}`/);
    assert.match(featureSurface, /role,/);
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
    assert.match(guard, /window\.history\.pushState =/);
    assert.match(guard, /window\.history\.replaceState =/);
    assert.match(guard, /blockOperationalNavigation/);
    assert.match(guard, /isDemoNavigationAllowed/);
});
