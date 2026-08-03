import assert from 'node:assert/strict';
import test from 'node:test';
import type { FranchiseLead, LeadFormState } from '@/components/franchise/leads/types';
import { EMPTY_LEAD_TABLE_FILTERS } from '@/components/franchise/leads/leadTableConfig';
import { filterDemoLeads, rebaseDemoLeadDates, saveDemoLeadForm } from './DemoLeadState.js';

const BASE_LEAD: FranchiseLead = {
    id: 'lead-a',
    companyId: 'demo-company',
    managerId: 'manager-kim',
    name: '김민준',
    mobile: '010-1111-2222',
    source: '소개',
    status: '상담중',
    grade: 'WARM',
    leadStage: 'candidate',
    desiredRegion: '서울 강남구',
    budgetMin: 100_000_000,
    budgetMax: 150_000_000,
    interestedBrand: '미카도',
    memo: '강남 상권',
    nextContactAt: null,
    lastContactedAt: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z'
};

test('Given toolbar and table filters When demo leads are derived Then every active filter changes the visible rows', () => {
    // Given
    const leads = [
        BASE_LEAD,
        {
            ...BASE_LEAD,
            id: 'lead-b',
            name: '박서연',
            managerId: 'manager-lee',
            source: '광고',
            status: '문의접수',
            desiredRegion: '부산 해운대구',
            budgetMin: 60_000_000,
            budgetMax: 80_000_000,
            createdAt: '2026-06-10T00:00:00.000Z'
        }
    ] satisfies readonly FranchiseLead[];

    // When
    const visible = filterDemoLeads(leads, {
        layer: 'candidate',
        searchTerm: '민준',
        status: '상담중',
        source: '소개',
        managerId: 'manager-kim',
        createdFrom: '2026-07-01',
        createdTo: '2026-07-31',
        tableFilters: { ...EMPTY_LEAD_TABLE_FILTERS, regionQuery: '강남', budgetMin: '9000' },
        tableSort: 'created_desc'
    });

    // Then
    assert.deepEqual(visible.map(lead => lead.id), ['lead-a']);
});

test('Given create and edit forms When they are saved Then demo lead rows change locally with normalized values', () => {
    // Given
    const createForm: LeadFormState = {
        name: '  신규 희망자  ',
        mobile: '010-3333-4444',
        source: '박람회',
        status: '문의접수',
        grade: 'HOT',
        desiredRegion: '서울 마포구',
        budgetMin: '9,000',
        budgetMax: '12,000',
        interestedBrand: '미카도',
        managerId: 'manager-lee',
        nextContactAt: '2026-08-01T10:00',
        memo: '  현장 상담 요청  '
    };

    // When
    const created = saveDemoLeadForm([BASE_LEAD], createForm, 'lead-new', '2026-07-30T00:00:00.000Z');
    const editForm = { ...createForm, id: 'lead-a', name: '김민준 수정', budgetMin: '11,000' };
    const edited = saveDemoLeadForm(created.leads, editForm, 'unused', '2026-07-30T01:00:00.000Z');

    // Then
    assert.equal(created.lead.id, 'lead-new');
    assert.equal(created.lead.name, '신규 희망자');
    assert.equal(created.lead.budgetMin, 90_000_000);
    assert.equal(created.lead.leadStage, 'candidate');
    assert.equal(edited.leads.find(lead => lead.id === 'lead-a')?.name, '김민준 수정');
    assert.equal(edited.leads.find(lead => lead.id === 'lead-a')?.budgetMin, 110_000_000);
});

test('Given dated demo fixtures When they are rebased Then the newest row stays inside the default recent range', () => {
    // Given
    const now = new Date('2026-07-30T03:00:00.000Z');

    // When
    const [rebased] = rebaseDemoLeadDates([BASE_LEAD], now);

    // Then
    assert.ok(rebased);
    assert.equal(rebased.createdAt, '2026-07-28T03:00:00.000Z');
});
