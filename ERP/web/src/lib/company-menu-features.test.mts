import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_COMPANY_DASHBOARD_MODE,
    getCompanyMenuFeatureForPath,
    getDefaultCompanyMenuFlags,
    isCompanyDashboardMode,
    normalizeCompanyDashboardMode
} from './company-menu-features.js';

test('Given no saved company dashboard mode When normalizing Then A type is the default', () => {
    assert.equal(DEFAULT_COMPANY_DASHBOARD_MODE, 'a');
    assert.equal(normalizeCompanyDashboardMode(null), 'a');
    assert.equal(normalizeCompanyDashboardMode(''), 'a');
});

test('Given work intake path When resolving company menu feature Then 업무 목록 owns the route', () => {
    const feature = getCompanyMenuFeatureForPath('/dashboard/franchise-leads/work-intake');

    assert.equal(feature?.key, 'franchiseWorkIntake');
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
