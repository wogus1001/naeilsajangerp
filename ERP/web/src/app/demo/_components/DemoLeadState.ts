import type { FranchiseLead, LeadFormState } from '@/components/franchise/leads/types';
import type { LeadTableFilters, LeadTableSortKey } from '@/components/franchise/leads/leadTableTypes';
import { filterLeadTableLeads, sortLeadTableLeads } from '@/components/franchise/leads/leadTableFilters';
import {
    formatLeadPhoneInput,
    normalizeLeadDesiredRegionValue
} from '@/components/franchise/leads/leadFormFormatters';
import { parseBudgetInputToWon } from '@/components/franchise/leads/utils';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';

export type DemoLeadFilterInput = {
    readonly layer?: 'raw_intake' | 'candidate';
    readonly searchTerm: string;
    readonly status: '전체' | FranchiseLeadStatus;
    readonly source: string;
    readonly managerId: string;
    readonly createdFrom: string;
    readonly createdTo: string;
    readonly tableFilters: LeadTableFilters;
    readonly tableSort: LeadTableSortKey;
};

export type DemoLeadSaveResult = {
    readonly leads: readonly FranchiseLead[];
    readonly lead: FranchiseLead;
};

export function rebaseDemoLeadDates(
    leads: readonly FranchiseLead[],
    now: Date
): readonly FranchiseLead[] {
    const newestCreatedAt = Math.max(...leads.map(lead => new Date(lead.createdAt).getTime()));
    if (!Number.isFinite(newestCreatedAt)) return leads;
    const targetNewestCreatedAt = now.getTime() - (2 * 24 * 60 * 60 * 1000);
    const offset = targetNewestCreatedAt - newestCreatedAt;
    const shift = (value?: string | null): string | null => {
        if (!value) return null;
        const timestamp = new Date(value).getTime();
        return Number.isNaN(timestamp) ? value : new Date(timestamp + offset).toISOString();
    };

    return leads.map(lead => ({
        ...lead,
        createdAt: shift(lead.createdAt) || lead.createdAt,
        updatedAt: shift(lead.updatedAt) || lead.updatedAt,
        nextContactAt: shift(lead.nextContactAt),
        lastContactedAt: shift(lead.lastContactedAt),
        activityLog: lead.activityLog?.map(activity => ({
            ...activity,
            createdAt: shift(activity.createdAt) || activity.createdAt
        })),
        locationLinks: lead.locationLinks?.map(link => ({
            ...link,
            createdAt: shift(link.createdAt) || link.createdAt,
            updatedAt: shift(link.updatedAt) || undefined
        })),
        disclosureSummary: lead.disclosureSummary ? {
            ...lead.disclosureSummary,
            latestSentAt: shift(lead.disclosureSummary.latestSentAt),
            openedAt: shift(lead.disclosureSummary.openedAt),
            confirmedAt: shift(lead.disclosureSummary.confirmedAt),
            contractEligibleAt: shift(lead.disclosureSummary.contractEligibleAt)
        } : undefined
    }));
}

function toDateBoundary(value: string, endOfDay: boolean): number | null {
    if (!value) return null;
    const suffix = endOfDay ? 'T23:59:59.999+09:00' : 'T00:00:00.000+09:00';
    const timestamp = new Date(`${value}${suffix}`).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function matchesSearch(lead: FranchiseLead, searchTerm: string): boolean {
    const query = searchTerm.trim().toLocaleLowerCase('ko-KR');
    if (!query) return true;
    return [
        lead.name,
        lead.mobile,
        lead.source,
        lead.desiredRegion,
        lead.interestedBrand,
        lead.memo
    ].some(value => value.toLocaleLowerCase('ko-KR').includes(query));
}

function matchesCreatedDate(lead: FranchiseLead, createdFrom: string, createdTo: string): boolean {
    const createdAt = new Date(lead.createdAt).getTime();
    if (Number.isNaN(createdAt)) return false;
    const start = toDateBoundary(createdFrom, false);
    const end = toDateBoundary(createdTo, true);
    return (start === null || createdAt >= start) && (end === null || createdAt <= end);
}

export function filterDemoLeads(
    leads: readonly FranchiseLead[],
    input: DemoLeadFilterInput
): readonly FranchiseLead[] {
    const toolbarFiltered = leads.filter(lead => (
        (!input.layer || lead.leadStage === input.layer)
        && matchesSearch(lead, input.searchTerm)
        && (input.status === '전체' || lead.status === input.status)
        && (input.source === '전체' || lead.source === input.source)
        && (input.managerId === '전체' || lead.managerId === input.managerId)
        && matchesCreatedDate(lead, input.createdFrom, input.createdTo)
    ));
    return sortLeadTableLeads(
        filterLeadTableLeads(toolbarFiltered, input.tableFilters),
        input.tableSort
    );
}

export function saveDemoLeadForm(
    leads: readonly FranchiseLead[],
    form: LeadFormState,
    leadId: string,
    now: string
): DemoLeadSaveResult {
    const current = form.id ? leads.find(lead => lead.id === form.id) : undefined;
    const targetId = current?.id || leadId;
    const lead: FranchiseLead = {
        ...current,
        id: targetId,
        companyId: current?.companyId || 'demo-company',
        name: form.name.trim(),
        mobile: formatLeadPhoneInput(form.mobile),
        mobileNormalized: form.mobile.replace(/\D/g, ''),
        source: form.source,
        status: form.status,
        grade: form.grade,
        leadStage: current?.leadStage || 'candidate',
        desiredRegion: normalizeLeadDesiredRegionValue(form.desiredRegion),
        budgetMin: parseBudgetInputToWon(form.budgetMin),
        budgetMax: parseBudgetInputToWon(form.budgetMax),
        interestedBrand: form.interestedBrand.trim(),
        managerId: form.managerId || current?.managerId,
        nextContactAt: form.nextContactAt ? new Date(form.nextContactAt).toISOString() : null,
        lastContactedAt: current?.lastContactedAt || null,
        memo: form.memo.trim(),
        createdAt: current?.createdAt || now,
        updatedAt: now
    };
    return {
        lead,
        leads: current
            ? leads.map(item => item.id === current.id ? lead : item)
            : [lead, ...leads]
    };
}
