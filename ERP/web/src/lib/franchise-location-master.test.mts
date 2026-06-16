import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getAcquisitionCostTotal,
    mergeFranchiseLocationData,
    normalizeFranchiseLocationMasterData,
    parseLocationDecimal,
    parseLocationMoney
} from './franchise-location-master.js';

test('parseLocationMoney normalizes comma separated manwon inputs', () => {
    assert.equal(parseLocationMoney(' 12,300 '), 12300);
    assert.equal(parseLocationMoney(''), null);
    assert.equal(parseLocationMoney('not-a-number'), null);
});

test('parseLocationDecimal preserves one decimal place for exclusive area', () => {
    assert.equal(parseLocationDecimal('32.45'), 32.5);
    assert.equal(parseLocationDecimal('0'), 0);
});

test('getAcquisitionCostTotal calculates deposit plus premium', () => {
    const normalized = normalizeFranchiseLocationMasterData({
        cost: {
            deposit: '5,000',
            premium: '12,000',
            memo: '  권리금 협의 가능  '
        }
    });

    assert.equal(getAcquisitionCostTotal(normalized.cost), 17000);
    assert.equal(normalized.cost.memo, '권리금 협의 가능');
});

test('normalizeFranchiseLocationMasterData keeps structured site and landlord fields', () => {
    const normalized = normalizeFranchiseLocationMasterData({
        developmentStage: '물건화 완료',
        importance: '높음',
        siteCondition: {
            exclusiveAreaPyeong: '42',
            restroom: { value: '있음', memo: '매장 내부' },
            elevator: { value: '없음', memo: '1층' },
            demolition: { value: '미확인', memo: '임대인 확인 필요' },
            parking: { value: '있음', memo: '공용 2대' }
        },
        landlord: {
            name: '김임대',
            phone: '010-0000-0000',
            tendency: '  협의 빠름  '
        }
    });

    assert.equal(normalized.developmentStage, '물건화 완료');
    assert.equal(normalized.importance, '높음');
    assert.equal(normalized.siteCondition.exclusiveAreaPyeong, 42);
    assert.equal(normalized.siteCondition.restroom.memo, '매장 내부');
    assert.equal(normalized.landlord.tendency, '협의 빠름');
});

test('mergeFranchiseLocationData preserves unrelated existing JSON fields', () => {
    const merged = mergeFranchiseLocationData(
        {
            competitionScan: {
                totalCount: 12
            },
            brandId: 'brand-1'
        },
        {
            developmentStage: '물건화 완료',
            cost: {
                deposit: '3,000',
                premium: '4,000'
            }
        }
    );

    assert.deepEqual(merged.competitionScan, { totalCount: 12 });
    assert.equal(merged.brandId, 'brand-1');
    assert.equal(merged.developmentStage, '물건화 완료');
    assert.equal(merged.cost.deposit, 3000);
    assert.equal(merged.cost.premium, 4000);
});
