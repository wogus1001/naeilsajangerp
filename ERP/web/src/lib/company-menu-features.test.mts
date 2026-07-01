import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_COMPANY_DASHBOARD_MODE,
    getCompanyMenuFeatureForPath,
    getDefaultCompanyMenuFlags,
    isCompanyDashboardMode,
    normalizeCompanyDashboardMode,
    normalizeCompanyMenuFlags
} from './company-menu-features.js';
import { SIDEBAR_SECTIONS } from '../components/layout/SidebarMenuConfig.js';

test('Given no saved company dashboard mode When normalizing Then A type is the default', () => {
    assert.equal(DEFAULT_COMPANY_DASHBOARD_MODE, 'a');
    assert.equal(normalizeCompanyDashboardMode(null), 'a');
    assert.equal(normalizeCompanyDashboardMode(''), 'a');
});

test('Given work intake path When resolving company menu feature Then 진행현황 owns the route', () => {
    const feature = getCompanyMenuFeatureForPath('/dashboard/franchise-leads/work-intake');

    assert.equal(feature?.key, 'franchiseWorkIntake');
    assert.equal(feature?.title, '진행현황');
});

test('Given dashboard and franchise paths When resolving company menu feature Then labels match the sidebar structure', () => {
    const dashboard = getCompanyMenuFeatureForPath('/dashboard');
    const franchiseLeads = getCompanyMenuFeatureForPath('/dashboard/franchise-leads');
    const marketInsights = getCompanyMenuFeatureForPath('/dashboard/franchise-leads/market-insights');
    const franchiseLocations = getCompanyMenuFeatureForPath('/dashboard/franchise-locations');
    const franchiseOperations = getCompanyMenuFeatureForPath('/dashboard/franchise-operations');

    assert.equal(dashboard?.category, '대시보드');
    assert.equal(dashboard?.title, '대시보드');
    assert.equal(franchiseLeads?.category, '프랜차이즈');
    assert.equal(marketInsights?.category, '프랜차이즈');
    assert.equal(franchiseLocations?.category, '가맹 운영');
    assert.equal(franchiseLocations?.title, '물건지 지도');
    assert.equal(franchiseOperations?.category, '프랜차이즈');
});

test('Given sidebar sections When reading navigation Then dashboard is top-level and franchise owns the franchise links', () => {
    const dashboardSection = SIDEBAR_SECTIONS[0];
    const franchiseSection = SIDEBAR_SECTIONS[1];

    assert.equal(dashboardSection?.key, 'dashboard');
    assert.equal(dashboardSection?.direct, true);
    assert.deepEqual(dashboardSection?.items.map(item => item.title), ['대시보드']);
    assert.equal(franchiseSection?.key, 'franchise');
    assert.deepEqual(franchiseSection?.items.map(item => item.title), ['모객 DB', '출점 후보지', '가맹 운영', '물건지 지도', '전자계약', '업체 계약함']);
    assert.equal(franchiseSection?.items.find(item => item.title === '물건지 지도')?.depth, undefined);
    assert.equal(franchiseSection?.items.find(item => item.title === '물건지 지도')?.category, '가맹 운영');
});

test('Given a saved company dashboard mode When normalizing Then only A and B are accepted', () => {
    assert.equal(isCompanyDashboardMode('a'), true);
    assert.equal(isCompanyDashboardMode('b'), true);
    assert.equal(isCompanyDashboardMode('staff'), false);
    assert.equal(normalizeCompanyDashboardMode('b'), 'b');
    assert.equal(normalizeCompanyDashboardMode('staff'), 'a');
});

test('Given default company menu flags When reading franchise intake features Then visible intake menus are enabled separately', () => {
    const flags = getDefaultCompanyMenuFlags();

    assert.equal(flags.franchiseMatchingRequest, true);
    assert.equal(flags.franchisePropertyRegistration, true);
    assert.equal(flags.franchiseWorkIntake, true);
    assert.equal(flags.propertyRegister, true);
});

test('Given partial saved company menu rows When normalizing Then missing menu features stay disabled', () => {
    const flags = normalizeCompanyMenuFlags([
        { feature_key: 'dashboard', enabled: true },
        { feature_key: 'electronicPremiumContracts', enabled: true },
        { feature_key: 'companyStaff', enabled: true }
    ]);

    assert.equal(flags.dashboard, true);
    assert.equal(flags.electronicPremiumContracts, true);
    assert.equal(flags.companyStaff, true);
    assert.equal(flags.franchiseLeads, false);
    assert.equal(flags.franchiseOperations, false);
});

test('Given no saved company menu rows When normalizing Then legacy companies keep default access', () => {
    const flags = normalizeCompanyMenuFlags([
        { feature_key: 'dashboard_mode_a', enabled: true }
    ]);

    assert.equal(flags.dashboard, true);
    assert.equal(flags.franchiseLeads, true);
    assert.equal(flags.companyStaff, true);
});

test('Given electronic premium contract route When resolving company menu feature Then new contract feature owns it', () => {
    const feature = getCompanyMenuFeatureForPath('/contracts/electronic/create');
    const franchiseSection = SIDEBAR_SECTIONS.find(section => section.key === 'franchise');

    assert.equal(feature?.key, 'electronicPremiumContracts');
    assert.equal(feature?.category, '프랜차이즈');
    assert.equal(feature?.title, '전자계약');
    assert.equal(franchiseSection?.items.find(item => item.title === '전자계약')?.featureKey, 'electronicPremiumContracts');
    assert.equal(franchiseSection?.items.find(item => item.title === '전자계약')?.icon, 'fileSignature');
});

test('Given vendor contract route When resolving company menu feature Then vendor contract feature owns it', () => {
    const feature = getCompanyMenuFeatureForPath('/contracts/vendor');
    const franchiseSection = SIDEBAR_SECTIONS.find(section => section.key === 'franchise');

    assert.equal(feature?.key, 'vendorContracts');
    assert.equal(feature?.category, '프랜차이즈');
    assert.equal(feature?.title, '업체 계약함');
    assert.equal(franchiseSection?.items.at(-1)?.featureKey, 'vendorContracts');
    assert.equal(franchiseSection?.items.at(-1)?.icon, 'fileSignature');
});
