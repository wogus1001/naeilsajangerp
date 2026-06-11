import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_STATUSES
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import {
    getLeadWorkQueueLabel,
    getLeadWorkQueueRank,
    isLeadContactActionDue,
    isLeadDueToday,
    isLeadPastDue
} from '@/lib/franchise-lead-workflow';
import { RANGE_OPTIONS, SOURCE_FILTER_OPTIONS } from './constants';
import type { FranchiseLead, LeadFormState, LeadSummary } from './types';

export function toRangeOption(value: string): typeof RANGE_OPTIONS[number] {
    return RANGE_OPTIONS.find(option => option === value) || '전체';
}

export function toSourceFilterOption(value: string): typeof SOURCE_FILTER_OPTIONS[number] {
    return SOURCE_FILTER_OPTIONS.find(option => option === value) || '전체';
}

export function createEmptySummary(): LeadSummary {
    return {
        total: 0,
        byStatus: FRANCHISE_LEAD_STATUSES.reduce<Record<string, number>>((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {}),
        bySource: {},
        hotCount: 0,
        nextContactCount: 0,
        createdByDate: {}
    };
}

export function toDateInputValue(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function buildDateFromRange(range: typeof RANGE_OPTIONS[number]) {
    if (range === '전체') return '';
    const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days + 1);
    return toDateInputValue(date);
}

export function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatFullDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatBudgetValue(value: number | null | undefined) {
    const manwonValue = toBudgetManwonValue(value);
    if (manwonValue === null) return '';
    return `${new Intl.NumberFormat('ko-KR').format(manwonValue)}만원`;
}

export function formatBudget(min: number | null, max: number | null) {
    const minText = formatBudgetValue(min);
    const maxText = formatBudgetValue(max);
    if (!minText && !maxText) return '-';
    if (minText && maxText) return `${minText} ~ ${maxText}`;
    return minText || maxText;
}

export function toBudgetManwonValue(value: number | null | undefined) {
    if (value === null || value === undefined) return null;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    if (Math.abs(numericValue) > 0 && Math.abs(numericValue) < 1_000_000) {
        return Math.round(numericValue);
    }
    return Math.round(numericValue / 10_000);
}

export function toBudgetInputValue(value: number | null | undefined) {
    const manwonValue = toBudgetManwonValue(value);
    return manwonValue === null ? '' : String(manwonValue);
}

export function parseBudgetInputToWon(value: string) {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return Math.abs(parsed) >= 1_000_000 ? parsed : parsed * 10_000;
}

export function toCustomerBudgetValue(value: number | null | undefined) {
    const manwonValue = toBudgetManwonValue(value);
    return manwonValue === null ? '' : String(manwonValue);
}

export function toDatetimeLocalValue(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function isPastDue(value?: string | null) {
    return isLeadPastDue(value);
}

export function isDueToday(value?: string | null) {
    return isLeadDueToday(value);
}

export function isContactActionDue(value?: string | null) {
    return isLeadContactActionDue(value);
}

export function createActivityId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getStatusIndex(status: FranchiseLeadStatus) {
    return FRANCHISE_LEAD_STATUSES.findIndex(item => item === status);
}

export function getAdjacentStatus(status: FranchiseLeadStatus, direction: 'prev' | 'next') {
    const index = getStatusIndex(status);
    if (index < 0) return null;
    const nextIndex = direction === 'next' ? index + 1 : index - 1;
    return FRANCHISE_LEAD_STATUSES[nextIndex] || null;
}

export function mapLeadStatusToCustomerStatus(status: FranchiseLeadStatus) {
    if (status === '계약완료') return '계약완료';
    if (status === '계약예정') return '계약진행';
    if (status === '보류/이탈') return '계약보류';
    if (status === '문의접수') return '물건문의';
    return '물건진행';
}

export function mapLeadGradeToCustomerGrade(grade: string) {
    if (grade === 'COLD') return 'manage';
    if (grade === 'HOT' || grade === 'WARM') return 'progress';
    return 'progress';
}

export function mapLeadGradeToCustomerClass(grade: string) {
    if (grade === 'HOT') return 'A';
    if (grade === 'WARM') return 'B';
    if (grade === 'COLD') return 'C';
    return 'A';
}

export function getLeadTaskLabel(lead: FranchiseLead) {
    return getLeadWorkQueueLabel(lead);
}

export function getLeadTaskRank(lead: FranchiseLead) {
    return getLeadWorkQueueRank(lead);
}

export function buildTrendData(summary: LeadSummary) {
    const items = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = toDateInputValue(date);
        items.push({
            date: key.slice(5),
            count: summary.createdByDate[key] || 0
        });
    }
    return items;
}

export function createFormFromLead(lead: FranchiseLead): LeadFormState {
    return {
        id: lead.id,
        name: lead.name || '',
        mobile: lead.mobile || '',
        source: lead.source || '',
        status: lead.status || DEFAULT_FRANCHISE_LEAD_STATUS,
        grade: lead.grade || '',
        desiredRegion: lead.desiredRegion || '',
        budgetMin: toBudgetInputValue(lead.budgetMin),
        budgetMax: toBudgetInputValue(lead.budgetMax),
        interestedBrand: lead.interestedBrand || '',
        managerId: lead.managerId || '',
        nextContactAt: toDatetimeLocalValue(lead.nextContactAt),
        memo: lead.memo || ''
    };
}

export function isRawIntakeLead(lead: FranchiseLead) {
    return lead.leadStage === 'raw_intake';
}

export function isMetaLeadSource(lead: FranchiseLead) {
    return lead.sourceType === 'meta-lead-ad' || lead.source === 'Meta Lead Ads';
}

export function getLeadSourceTitle(lead: FranchiseLead) {
    return isMetaLeadSource(lead) ? 'Meta Lead Ads' : lead.source || '유입 미지정';
}

export function getLeadSourceBadgeLabel(lead: FranchiseLead) {
    const source = getLeadSourceTitle(lead);
    if (source === 'Meta Lead Ads') return 'Meta';
    if (source.includes('랜딩')) return '랜딩';
    if (source.includes('전화')) return '전화';
    if (source.includes('고객')) return '고객DB';
    return source;
}
