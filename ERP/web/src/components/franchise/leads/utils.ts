import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadSourceLabel
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
    const days = range === '최근 7일' ? 7 : range === '최근 30일' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days + 1);
    return toDateInputValue(date);
}

export function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const { month, day } = getKoreanDateParts(date);
    return `${month}. ${day}.`;
}

export function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const { month, day, hour, minute } = getKoreanDateParts(date);
    const period = Number(hour) < 12 ? '오전' : '오후';
    const hour12 = String(Number(hour) % 12 || 12).padStart(2, '0');
    return `${month}. ${day}. ${period} ${hour12}:${minute}`;
}

export function formatFullDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const { year, month, day, hour, minute } = getKoreanDateParts(date);
    const period = Number(hour) < 12 ? '오전' : '오후';
    const hour12 = String(Number(hour) % 12 || 12).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${period} ${hour12}:${minute}`;
}

function getKoreanDateParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return {
        year: values.year || '0000',
        month: values.month || '00',
        day: values.day || '00',
        hour: values.hour || '00',
        minute: values.minute || '00'
    };
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

export type LeadTrendMode = 'daily' | 'weekly' | 'monthly';

export type LeadTrendDatum = {
    readonly date: string;
    readonly count: number;
};

export type LeadTrendSeriesData = Record<LeadTrendMode, readonly LeadTrendDatum[]>;

function sumCreatedCountByDateRange(summary: LeadSummary, startDate: Date, dayCount: number) {
    let count = 0;
    for (let i = 0; i < dayCount; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        count += summary.createdByDate[toDateInputValue(date)] || 0;
    }
    return count;
}

function getWeekStart(date: Date) {
    const start = new Date(date);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    return start;
}

function buildDailyTrendData(summary: LeadSummary): readonly LeadTrendDatum[] {
    const items: LeadTrendDatum[] = [];
    for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = toDateInputValue(date);
        items.push({
            date: key.slice(5).replace('-', '.'),
            count: summary.createdByDate[key] || 0
        });
    }
    return items;
}

function buildWeeklyTrendData(summary: LeadSummary): readonly LeadTrendDatum[] {
    const items: LeadTrendDatum[] = [];
    const currentWeekStart = getWeekStart(new Date());
    for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() - i * 7);
        const key = toDateInputValue(weekStart);
        items.push({
            date: `${key.slice(5).replace('-', '.')}주`,
            count: sumCreatedCountByDateRange(summary, weekStart, 7)
        });
    }
    return items;
}

function buildMonthlyTrendData(summary: LeadSummary): readonly LeadTrendDatum[] {
    const items: LeadTrendDatum[] = [];
    const currentMonth = new Date();
    currentMonth.setDate(1);
    for (let i = 5; i >= 0; i--) {
        const month = new Date(currentMonth);
        month.setMonth(currentMonth.getMonth() - i);
        const keyPrefix = toDateInputValue(month).slice(0, 7);
        const count = Object.entries(summary.createdByDate)
            .filter(([key]) => key.startsWith(keyPrefix))
            .reduce((sum, [, value]) => sum + value, 0);
        items.push({
            date: keyPrefix.slice(2).replace('-', '.'),
            count
        });
    }
    return items;
}

export function buildTrendSeriesData(summary: LeadSummary): LeadTrendSeriesData {
    return {
        daily: buildDailyTrendData(summary),
        weekly: buildWeeklyTrendData(summary),
        monthly: buildMonthlyTrendData(summary)
    };
}

export function buildTrendData(summary: LeadSummary) {
    return buildDailyTrendData(summary);
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
    return isMetaLeadSource(lead) ? 'Meta Lead Ads' : getFranchiseLeadSourceLabel(lead.source);
}

export function getLeadSourceBadgeLabel(lead: FranchiseLead) {
    const source = getLeadSourceTitle(lead);
    if (source === 'Meta Lead Ads') return 'Meta';
    if (source.includes('랜딩')) return '랜딩';
    if (source.includes('전화')) return '전화';
    if (source.includes('고객')) return '고객DB';
    return source;
}
