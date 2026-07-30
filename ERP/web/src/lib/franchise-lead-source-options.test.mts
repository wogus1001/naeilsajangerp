import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS,
    canEditFranchiseLeadSourceOption,
    canManageFranchiseLeadSourceOptions,
    getFranchiseLeadSourceOptionLabel,
    getLabeledFranchiseLeadSourceCounts,
    getSelectableFranchiseLeadSourceOptions,
    mergeFranchiseLeadSourceOptions,
    normalizeFranchiseLeadSourceOptionLabel,
    validateFranchiseLeadSourceOptionLabel
} from './franchise-lead-source-options.js';

test('Given automatic sources, when checking edit permission, then they stay protected', () => {
    const protectedCodes = [
        'Meta Lead Ads',
        '고객DB',
        '명함DB',
        '가맹 희망자 등록',
        '프랜차이즈 매칭 요청'
    ];

    protectedCodes.forEach(code => {
        const option = DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS.find(item => item.code === code);
        assert.ok(option);
        assert.equal(canEditFranchiseLeadSourceOption(option), false);
    });
});

test('Given manual default sources, when checking edit permission, then they are editable', () => {
    const editableCodes = ['네이버폼', '랜딩페이지', '박람회', '소개', '광고', '전화문의'];

    editableCodes.forEach(code => {
        const option = DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS.find(item => item.code === code);
        assert.ok(option);
        assert.equal(canEditFranchiseLeadSourceOption(option), true);
    });
});

test('Given a renamed custom source, when resolving its label, then the stable code uses the saved label', () => {
    const options = [
        {
            id: 'source-1',
            companyId: 'company-1',
            code: 'custom:source-1',
            label: '인스타그램 광고',
            kind: 'custom',
            isActive: true,
            sortOrder: 10,
            persisted: true
        }
    ] as const;

    assert.equal(getFranchiseLeadSourceOptionLabel('custom:source-1', options), '인스타그램 광고');
    assert.equal(getFranchiseLeadSourceOptionLabel('unknown-source', options), 'unknown-source');
});

test('Given a source label with extra whitespace, when normalizing it, then whitespace is collapsed', () => {
    assert.equal(normalizeFranchiseLeadSourceOptionLabel('  지역   박람회  '), '지역 박람회');
});

test('Given saved company options, when merging defaults, then saved settings win and missing defaults remain available', () => {
    const options = mergeFranchiseLeadSourceOptions([
        {
            id: 'saved-naver',
            company_id: 'company-1',
            code: '네이버폼',
            label: '네이버 신청',
            is_system: false,
            is_active: false,
            sort_order: 70
        }
    ]);

    const naver = options.find(option => option.code === '네이버폼');
    const meta = options.find(option => option.code === 'Meta Lead Ads');
    assert.deepEqual(naver, {
        id: 'saved-naver',
        companyId: 'company-1',
        code: '네이버폼',
        label: '네이버 신청',
        kind: 'custom',
        isActive: false,
        sortOrder: 70,
        persisted: true
    });
    assert.ok(meta);
    assert.equal(meta.kind, 'system');
});

test('Given requester roles, when checking source-management permission, then only managers and admins can change settings', () => {
    assert.equal(canManageFranchiseLeadSourceOptions('admin'), true);
    assert.equal(canManageFranchiseLeadSourceOptions('manager'), true);
    assert.equal(canManageFranchiseLeadSourceOptions('sub_manager'), true);
    assert.equal(canManageFranchiseLeadSourceOptions('staff'), false);
    assert.equal(canManageFranchiseLeadSourceOptions(null), false);
});

test('Given source labels, when validating input, then blank and oversized labels are rejected', () => {
    assert.deepEqual(validateFranchiseLeadSourceOptionLabel('  지역   박람회 '), {
        ok: true,
        label: '지역 박람회'
    });
    assert.deepEqual(validateFranchiseLeadSourceOptionLabel('   '), {
        ok: false,
        message: '유입경로 이름을 입력해주세요.'
    });
    assert.equal(validateFranchiseLeadSourceOptionLabel('가'.repeat(41)).ok, false);
});

test('Given an inactive source on an existing lead, when opening the edit form, then the saved source remains selectable', () => {
    const options = DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS.map(option => (
        option.code === '네이버폼' ? { ...option, isActive: false } : option
    ));

    assert.equal(
        getSelectableFranchiseLeadSourceOptions(options, '').some(option => option.code === '네이버폼'),
        false
    );
    assert.equal(
        getSelectableFranchiseLeadSourceOptions(options, '네이버폼').some(option => option.code === '네이버폼'),
        true
    );
});

test('Given source counts keyed by stable code, when preparing a chart, then counts use company labels', () => {
    const options = [
        {
            id: 'source-1',
            companyId: 'company-1',
            code: 'custom:source-1',
            label: '인스타그램 광고',
            kind: 'custom',
            isActive: true,
            sortOrder: 10,
            persisted: true
        }
    ] as const;

    assert.deepEqual(
        getLabeledFranchiseLeadSourceCounts({ 'custom:source-1': 3, unknown: 2 }, options),
        { '인스타그램 광고': 3, unknown: 2 }
    );
});
