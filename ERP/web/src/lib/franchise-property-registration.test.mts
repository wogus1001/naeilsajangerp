import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    PROPERTY_REGISTRATION_INITIAL_FORM,
    buildPropertyRegistrationSections,
    buildPropertyRegistrationPayload,
    updatePropertyRegistrationAttachments,
    type PropertyRegistrationForm
} from './franchise-property-registration.js';

test('buildPropertyRegistrationPayload maps franchise property form to properties core columns and data fields', () => {
    const form: PropertyRegistrationForm = {
        ...PROPERTY_REGISTRATION_INITIAL_FORM,
        desiredBrand: '미카도',
        desiredBusinessType: '요식업',
        desiredCategory: '커피',
        propertyName: '강남역 코너 매장',
        propertyAddress: '서울 강남구 테헤란로 12',
        propertyRegion: '서울 강남구',
        roadAddress: '서울 강남구 테헤란로 12',
        zoneNo: '06234',
        detailAddress: '1층 101호',
        privateArea: '20',
        privateAreaUnit: 'pyeong',
        deposit: '5,000',
        monthlyRent: '450',
        maintenanceFee: '40',
        premium: '12,000',
        fileNames: ['도면.pdf'],
        fileAttachments: [{ name: '도면.pdf', size: 1024, type: 'application/pdf' }],
        rentFreeAvailable: '가능',
        landlordSupportMemo: '간판 협의 가능',
        riskMemo: '권리금 재확인 필요'
    };

    const payload = buildPropertyRegistrationPayload(form, {
        requesterId: 'manager-1',
        companyName: '미카도'
    });

    assert.equal(payload.name, '강남역 코너 매장');
    assert.equal(payload.status, '공실');
    assert.equal(payload.operationType, '물건등록');
    assert.equal(payload.address, '서울 강남구 테헤란로 12');
    assert.equal(payload.region, '서울 강남구');
    assert.equal(payload.managerId, 'manager-1');
    assert.equal(payload.sourceType, 'franchise_property_registration');
    assert.equal(payload.desiredBrand, '미카도');
    assert.equal(payload.desiredBusinessType, '요식업');
    assert.equal(payload.businessType, '요식업');
    assert.equal(payload.desiredCategory, '커피');
    assert.equal(payload.category, '커피');
    assert.equal(payload.categoryMajor, '요식업');
    assert.equal(payload.categoryMiddle, '커피');
    assert.equal(payload.categorySmall, '');
    assert.equal(payload.industry, '커피');
    assert.equal(payload.detailAddress, '1층 101호');
    assert.equal(payload.zoneNo, '06234');
    assert.equal(payload.privateArea, '66.12');
    assert.equal(payload.privateAreaPyeong, '20');
    assert.equal(payload.deposit, '5000');
    assert.equal(payload.premium, '12000');
    assert.deepEqual(payload.fileNames, ['도면.pdf']);
    assert.deepEqual(payload.fileAttachments, [{ name: '도면.pdf', size: 1024, type: 'application/pdf' }]);
    assert.equal(payload.rentFreeAvailable, '가능');
    assert.equal(payload.riskMemo, '권리금 재확인 필요');
});

test('buildPropertyRegistrationSections injects business type and middle industry options only', () => {
    const sections = buildPropertyRegistrationSections(['', '커피', '치킨'], ['', '요식업', '서비스업']);
    const businessTypeField = sections
        .flatMap(section => section.fields)
        .find(field => field.key === 'desiredBusinessType');
    const categoryField = sections
        .flatMap(section => section.fields)
        .find(field => field.key === 'desiredCategory');

    assert.ok(businessTypeField);
    assert.equal(businessTypeField.label, '업태 (대분류)');
    assert.deepEqual(businessTypeField.options, ['', '요식업', '서비스업']);
    assert.equal(categoryField?.label, '업종 (중분류)');
    assert.deepEqual(categoryField?.options, ['', '커피', '치킨']);
});

test('updatePropertyRegistrationAttachments replaces attachments and syncs file names', () => {
    const updated = updatePropertyRegistrationAttachments({
        ...PROPERTY_REGISTRATION_INITIAL_FORM,
        fileNames: ['기존도면.pdf'],
        fileAttachments: [{ name: '기존도면.pdf', size: 1024, type: 'application/pdf' }]
    }, [
        { name: '새사진.png', size: 2048, type: 'image/png' },
        { name: '새도면.pdf', size: 4096, type: 'application/pdf' }
    ]);

    assert.deepEqual(updated.fileNames, ['새사진.png', '새도면.pdf']);
    assert.deepEqual(updated.fileAttachments, [
        { name: '새사진.png', size: 2048, type: 'image/png' },
        { name: '새도면.pdf', size: 4096, type: 'application/pdf' }
    ]);
});
