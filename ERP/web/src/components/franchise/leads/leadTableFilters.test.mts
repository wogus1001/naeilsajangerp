import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterLeadTableLeads, sortLeadTableLeads } from './leadTableFilters.js';
import type { LeadTableFilterableLead } from './leadTableFilters.js';

type TestLead = LeadTableFilterableLead & {
    readonly id: string;
};

function createLead(overrides: Partial<TestLead>): TestLead {
    return {
        id: 'lead-1',
        desiredRegion: '',
        budgetMin: null,
        budgetMax: null,
        createdAt: '2026-06-11T00:00:00.000Z',
        grade: '',
        ...overrides
    };
}

test('filterLeadTableLeads matches desired region text', () => {
    const leads = [
        createLead({ id: 'a', desiredRegion: '서울 강남구, 경기 성남시' }),
        createLead({ id: 'b', desiredRegion: '부산 해운대구' })
    ];

    assert.deepEqual(
        filterLeadTableLeads(leads, { regionQuery: '성남', budgetMin: '', budgetMax: '' }).map(lead => lead.id),
        ['a']
    );
});

test('filterLeadTableLeads treats comma-separated regions as OR terms', () => {
    const leads = [
        createLead({ id: 'a', desiredRegion: '서울 송파구' }),
        createLead({ id: 'b', desiredRegion: '제주 제주시' }),
        createLead({ id: 'c', desiredRegion: '경기 성남시' })
    ];

    assert.deepEqual(
        filterLeadTableLeads(leads, { regionQuery: '송파, 제주', budgetMin: '', budgetMax: '' }).map(lead => lead.id),
        ['a', 'b']
    );
});

test('filterLeadTableLeads keeps leads whose budget range overlaps the filter range', () => {
    const leads = [
        createLead({ id: 'a', budgetMin: 100_000_000, budgetMax: 200_000_000 }),
        createLead({ id: 'b', budgetMin: 300_000_000, budgetMax: 400_000_000 }),
        createLead({ id: 'c', budgetMin: null, budgetMax: null })
    ];

    assert.deepEqual(
        filterLeadTableLeads(leads, { regionQuery: '', budgetMin: '15000', budgetMax: '25000' }).map(lead => lead.id),
        ['a']
    );
});

test('sortLeadTableLeads sorts by registration and budget', () => {
    const leads = [
        createLead({ id: 'a', createdAt: '2026-06-10T00:00:00.000Z', budgetMin: 300_000_000 }),
        createLead({ id: 'b', createdAt: '2026-06-11T00:00:00.000Z', budgetMin: 100_000_000 }),
        createLead({ id: 'c', createdAt: '2026-06-09T00:00:00.000Z', budgetMin: 200_000_000 })
    ];

    assert.deepEqual(sortLeadTableLeads(leads, 'created_desc').map(lead => lead.id), ['b', 'a', 'c']);
    assert.deepEqual(sortLeadTableLeads(leads, 'budget_asc').map(lead => lead.id), ['b', 'c', 'a']);
    assert.deepEqual(sortLeadTableLeads(leads, 'budget_desc').map(lead => lead.id), ['a', 'c', 'b']);
});

test('sortLeadTableLeads filters important leads when priority-only option is selected', () => {
    const leads = [
        createLead({ id: 'a', createdAt: '2026-06-10T00:00:00.000Z', grade: 'HOT' }),
        createLead({ id: 'b', createdAt: '2026-06-11T00:00:00.000Z', grade: 'WARM' }),
        createLead({ id: 'c', createdAt: '2026-06-09T00:00:00.000Z', grade: 'HOT' })
    ];

    assert.deepEqual(sortLeadTableLeads(leads, 'priority_only').map(lead => lead.id), ['a', 'c']);
});

test('sortLeadTableLeads prioritizes disclosure actions', () => {
    const leads = [
        createLead({
            id: 'sent',
            disclosureSummary: {
                state: 'sent',
                label: 'D-5',
                latestDeliveryId: 'd1',
                latestSentAt: '2026-06-01T00:00:00.000Z',
                latestDocumentTitle: '',
                latestDocumentVersion: '',
                latestSendStatus: 'sent',
                recipientEmail: '',
                openedAt: null,
                confirmedAt: null,
                contractEligibleAt: '2026-06-15T00:00:00.000Z',
                remainingDays: 5,
                waitDays: 14
            }
        }),
        createLead({
            id: 'missing',
            disclosureSummary: {
                state: 'none',
                label: '미발송',
                latestDeliveryId: null,
                latestSentAt: null,
                latestDocumentTitle: '',
                latestDocumentVersion: '',
                latestSendStatus: null,
                recipientEmail: '',
                openedAt: null,
                confirmedAt: null,
                contractEligibleAt: null,
                remainingDays: null,
                waitDays: 14
            }
        }),
        createLead({
            id: 'd1',
            disclosureSummary: {
                state: 'sent',
                label: 'D-1',
                latestDeliveryId: 'd2',
                latestSentAt: '2026-06-10T00:00:00.000Z',
                latestDocumentTitle: '',
                latestDocumentVersion: '',
                latestSendStatus: 'sent',
                recipientEmail: '',
                openedAt: null,
                confirmedAt: null,
                contractEligibleAt: '2026-06-24T00:00:00.000Z',
                remainingDays: 1,
                waitDays: 14
            }
        })
    ];

    assert.deepEqual(sortLeadTableLeads(leads, 'disclosure_action').map(lead => lead.id), ['missing', 'd1', 'sent']);
});
