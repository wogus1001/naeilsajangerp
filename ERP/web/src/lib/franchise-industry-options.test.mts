import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_FRANCHISE_INDUSTRY_OPTIONS,
    buildFranchiseIndustryOptionGroups,
    buildFranchiseIndustryOptions,
    getFranchiseIndustryCategoriesForBusinessType,
    getFranchiseIndustryDetailsForCategory
} from './franchise-industry-options.js';

test('Given saved brand categories and custom categories When building industry options Then they are merged with defaults', () => {
    const options = buildFranchiseIndustryOptions([
        {
            industry: '외식',
            businessType: '프랜차이즈',
            categoryMajor: '요식업',
            categoryMiddle: '라멘',
            categorySmall: '일식 라멘'
        }
    ], ['수제버거', '라멘']);

    assert.equal(options[0], '');
    assert.ok(options.includes('커피'));
    assert.ok(options.includes('수제버거'));
    assert.ok(options.includes('라멘'));
    assert.ok(options.includes('일식 라멘'));
    assert.equal(options.filter(option => option === '라멘').length, 1);
    assert.equal(DEFAULT_FRANCHISE_INDUSTRY_OPTIONS.includes('요식업'), true);
});

test('Given default taxonomy When reading categories for a business type Then middle industry options are complete', () => {
    const groups = buildFranchiseIndustryOptionGroups();
    const foodCategories = getFranchiseIndustryCategoriesForBusinessType(groups, '요식업');

    assert.ok(groups.businessTypes.includes('요식업'));
    assert.ok(foodCategories.includes('커피'));
    assert.ok(foodCategories.includes('치킨'));
    assert.ok(foodCategories.includes('기타외식'));
    assert.equal(foodCategories.includes('커피전문점'), false);
});

test('Given a source with only industry When building grouped options Then industry is inferred into taxonomy path', () => {
    const groups = buildFranchiseIndustryOptionGroups([{ industry: '커피전문점' }]);
    const foodCategories = getFranchiseIndustryCategoriesForBusinessType(groups, '요식업');
    const coffeeDetails = getFranchiseIndustryDetailsForCategory(groups, '요식업', '커피');

    assert.ok(foodCategories.includes('커피'));
    assert.ok(coffeeDetails.includes('커피전문점'));
    assert.equal(groups.businessTypes.includes('커피전문점'), false);
});

test('Given legacy business type values When building grouped options Then unknown majors do not pollute business types', () => {
    const groups = buildFranchiseIndustryOptionGroups([{
        businessType: '외식',
        categoryMajor: '외식',
        industry: '커피'
    }], ['기타']);

    assert.ok(groups.businessTypes.includes('요식업'));
    assert.equal(groups.businessTypes.includes('외식'), false);
    assert.equal(groups.businessTypes.includes('기타'), false);
    assert.ok(getFranchiseIndustryCategoriesForBusinessType(groups, '요식업').includes('커피'));
});
