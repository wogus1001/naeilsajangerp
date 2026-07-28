import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    areMetaFieldMappingsEqual,
    assignMetaQuestion,
    findMetaFieldMappingConflicts,
    getMetaFormReadiness,
    isEligibleMetaFormManager,
    normalizeFieldMapping,
    normalizeMetaLeadQuestions,
    mapMetaLeadToFranchiseLead,
    planMetaFormDiscoveryWrite,
    suggestMetaFieldMapping
} from './meta-leads.js';

void test('areMetaFieldMappingsEqual clears dirty state after a mapping is restored', () => {
    const saved = normalizeFieldMapping({
        name: ['full_name'],
        mobile: ['phone_primary', 'phone_secondary']
    });
    const changed = assignMetaQuestion(saved, 'phone_primary', 'memo');
    const restored = assignMetaQuestion(changed, 'phone_primary', 'mobile');

    assert.equal(areMetaFieldMappingsEqual(saved, changed), false);
    assert.equal(areMetaFieldMappingsEqual(saved, restored), true);
});

void test('normalizeFieldMapping preserves an explicitly disconnected ERP field', () => {
    // Given
    const savedMapping = {
        name: [],
        mobile: ['phone_number']
    };

    // When
    const normalized = normalizeFieldMapping(savedMapping);

    // Then
    assert.deepEqual(normalized.name, []);
    assert.deepEqual(normalized.mobile, ['phone_number']);
});

void test('normalizeFieldMapping bounds authorized mapping payload size', () => {
    const normalized = normalizeFieldMapping({
        name: Array.from({ length: 120 }, (_, index) => `question-${index}`),
        mobile: ['x'.repeat(400)]
    });

    assert.equal(normalized.name.length, 100);
    assert.equal(normalized.mobile[0].length, 300);
});

void test('suggestMetaFieldMapping connects actual Meta question keys to ERP fields', () => {
    // Given
    const questions = normalizeMetaLeadQuestions([
        { id: 'q1', key: 'applicant_name', label: '성명', type: 'CUSTOM' },
        { id: 'q2', key: 'contact_phone', label: '휴대폰', type: 'PHONE' },
        { id: 'q3', key: 'startup_area', label: '희망지역', type: 'CUSTOM' },
        { id: 'q4', key: 'privacy_agree', label: '개인정보 동의', type: 'CUSTOM' }
    ]);

    // When
    const suggested = suggestMetaFieldMapping(questions);

    // Then
    assert.deepEqual(suggested.name, ['applicant_name']);
    assert.deepEqual(suggested.mobile, ['contact_phone']);
    assert.deepEqual(suggested.desiredRegion, ['startup_area']);
    assert.equal(Object.values(suggested).flat().includes('privacy_agree'), false);
});

void test('mapMetaLeadToFranchiseLead combines split Meta name questions', () => {
    // Given
    const lead = {
        field_data: [
            { name: 'first_name', values: ['재현'] },
            { name: 'last_name', values: ['김'] },
            { name: 'phone_number', values: ['010-1234-5678'] }
        ]
    };

    // When
    const mapped = mapMetaLeadToFranchiseLead(lead, {
        ...normalizeFieldMapping(null),
        name: ['first_name', 'last_name']
    });

    // Then
    assert.equal(mapped.name, '재현 김');
});

void test('assignMetaQuestion moves a source question instead of creating conflicting mappings', () => {
    // Given
    const mapping = normalizeFieldMapping({
        name: ['full_name'],
        mobile: ['phone_number'],
        desiredRegion: [],
        budget: [],
        budgetMin: [],
        budgetMax: [],
        interestedBrand: [],
        memo: []
    });

    // When
    const reassigned = assignMetaQuestion(mapping, 'phone_number', 'memo');

    // Then
    assert.deepEqual(reassigned.mobile, []);
    assert.deepEqual(reassigned.memo, ['phone_number']);
});

void test('findMetaFieldMappingConflicts reports a Meta question assigned to multiple ERP fields', () => {
    // Given
    const mapping = {
        name: ['customer_answer'],
        mobile: [],
        desiredRegion: [],
        budget: [],
        budgetMin: [],
        budgetMax: [],
        interestedBrand: [],
        memo: ['customer_answer']
    };

    // When
    const conflicts = findMetaFieldMappingConflicts(mapping);

    // Then
    assert.deepEqual(conflicts, ['customer_answer']);
});

void test('getMetaFormReadiness requires discovered questions, name, mobile, and a manager', () => {
    // Given
    const questions = normalizeMetaLeadQuestions([
        { key: 'full_name', label: '이름' },
        { key: 'phone_number', label: '연락처' }
    ]);
    const mapping = suggestMetaFieldMapping(questions);

    // When
    const ready = getMetaFormReadiness({ questions, mapping, defaultManagerId: 'manager-1' });
    const missingManager = getMetaFormReadiness({ questions, mapping, defaultManagerId: null });

    // Then
    assert.deepEqual(ready, { ready: true, missing: [] });
    assert.deepEqual(missingManager, { ready: false, missing: ['manager'] });
});

void test('isEligibleMetaFormManager rejects inactive and cross-company stored managers', () => {
    assert.equal(
        isEligibleMetaFormManager({ company_id: 'company-a', status: 'active' }, 'company-a'),
        true
    );
    assert.equal(
        isEligibleMetaFormManager({ company_id: 'company-a', status: 'inactive' }, 'company-a'),
        false
    );
    assert.equal(
        isEligibleMetaFormManager({ company_id: 'company-b', status: 'active' }, 'company-a'),
        false
    );
});

void test('planMetaFormDiscoveryWrite preserves operator settings when an existing Form is rediscovered', () => {
    // Given
    const existing = {
        enabled: true,
        default_manager_id: 'manager-custom',
        field_mapping: {
            name: ['custom_name'],
            mobile: ['custom_phone']
        },
        data: {
            operatorNote: 'keep'
        }
    };
    const discoveredForm = {
        id: 'form-1',
        name: '상담 신청',
        status: 'ACTIVE',
        created_time: '2026-07-01T00:00:00+0000',
        questions: [
            { key: 'full_name', label: '이름' },
            { key: 'phone_number', label: '연락처' }
        ]
    };

    // When
    const write = planMetaFormDiscoveryWrite({
        companyId: 'company-1',
        connectionId: 'connection-1',
        connectedBy: 'manager-reconnect',
        discoveredForm,
        existingForm: existing
    });

    // Then
    assert.equal(write.kind, 'update');
    assert.equal(Object.hasOwn(write.values, 'enabled'), false);
    assert.equal(Object.hasOwn(write.values, 'default_manager_id'), false);
    assert.equal(Object.hasOwn(write.values, 'field_mapping'), false);
    assert.deepEqual(write.values.data.operatorNote, 'keep');
    assert.equal(write.values.data.questions.length, 2);
});

void test('planMetaFormDiscoveryWrite initializes a new company Form with suggested mappings', () => {
    // Given
    const discoveredForm = {
        id: 'form-new',
        name: '창업 문의',
        questions: [
            { id: 'q1', key: 'applicant_name', label: '성명', type: 'FULL_NAME' },
            { id: 'q2', key: 'contact_phone', label: '연락처', type: 'PHONE' }
        ]
    };

    // When
    const write = planMetaFormDiscoveryWrite({
        companyId: 'company-a',
        connectionId: 'connection-a',
        connectedBy: 'manager-a',
        discoveredForm
    });

    // Then
    assert.equal(write.kind, 'insert');
    assert.equal(write.values.company_id, 'company-a');
    assert.equal(write.values.default_manager_id, 'manager-a');
    assert.equal(write.values.enabled, false);
    assert.deepEqual(write.values.field_mapping, {
        name: ['applicant_name'],
        mobile: ['contact_phone'],
        desiredRegion: [],
        budget: [],
        budgetMin: [],
        budgetMax: [],
        interestedBrand: [],
        memo: []
    });
});
