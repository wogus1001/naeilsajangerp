import type { LeadActivity } from './types';

const META_TEST_VALUE_PATTERN = /^<test lead:\s*dummy data for [^>]+>$/i;

export function formatLeadTableName(value: string): string {
    return META_TEST_VALUE_PATTERN.test(value.trim()) ? 'Meta 테스트 신청자' : value;
}

export function formatLeadTableText(value?: string | null): string {
    if (!value || META_TEST_VALUE_PATTERN.test(value.trim())) return '-';
    return value;
}

export const formatLeadTableMobile = formatLeadTableText;

export function formatLatestLeadActivity(activity?: LeadActivity): string {
    return activity ? `${activity.type} · ${activity.content}` : '-';
}
