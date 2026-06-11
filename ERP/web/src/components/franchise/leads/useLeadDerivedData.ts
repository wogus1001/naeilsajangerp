import React from 'react';
import { FRANCHISE_LEAD_STATUSES } from '@/lib/franchise-leads';
import {
    getLeadWorkQueueSummary,
    matchesLeadWorkQueue,
    type LeadWorkQueueKey
} from '@/lib/franchise-lead-workflow';
import { WORK_QUEUE_OPTIONS } from './constants';
import { hasActiveLeadTableFilters } from './leadTableConfig';
import { filterLeadTableLeads, sortLeadTableLeads } from './leadTableFilters';
import type {
    FranchiseLead,
    LeadDbLayer,
    LeadSummary,
    MetaIntegrationState
} from './types';
import type { LeadTableFilters, LeadTableSortKey } from './leadTableTypes';
import {
    buildTrendSeriesData,
    getLeadTaskRank,
    isRawIntakeLead
} from './utils';

type UseLeadDerivedDataArgs = {
    readonly leads: readonly FranchiseLead[];
    readonly pipelineStageLeads: readonly FranchiseLead[];
    readonly summary: LeadSummary;
    readonly metaState: MetaIntegrationState;
    readonly leadDbLayer: LeadDbLayer;
    readonly taskQueueFilter: LeadWorkQueueKey;
    readonly tableFilters: LeadTableFilters;
    readonly tableSort: LeadTableSortKey;
    readonly searchTerm: string;
    readonly pageSize: number;
    readonly currentPage: number;
    readonly selectedLeadIds: readonly string[];
};

export function useLeadDerivedData({
    leads,
    pipelineStageLeads,
    summary,
    metaState,
    leadDbLayer,
    taskQueueFilter,
    tableFilters,
    tableSort,
    searchTerm,
    pageSize,
    currentPage,
    selectedLeadIds
}: UseLeadDerivedDataArgs) {
    const rawIntakeLeads = leads.filter(isRawIntakeLead);
    const candidateLeads = leads.filter(lead => !isRawIntakeLead(lead));
    const pipelineStageCandidateLeads = pipelineStageLeads.filter(lead => !isRawIntakeLead(lead));
    const sourceLayerLeads = leadDbLayer === 'raw_intake' ? rawIntakeLeads : candidateLeads;
    const visibleLayerLeads = sortLeadTableLeads(filterLeadTableLeads(sourceLayerLeads, tableFilters), tableSort);
    const stageData = FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        count: pipelineStageCandidateLeads.filter(lead => lead.status === status).length
    }));
    const sourceChartData = Object.entries(summary.bySource || {})
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    const metaEnabledForms = metaState.forms.filter(form => form.enabled);
    const metaErrorCount = metaState.connections.filter(connection => connection.lastError || connection.subscribeError).length +
        metaState.forms.filter(form => form.lastError).length +
        metaState.imports.filter(item => item.status === 'error').length;
    const metaLastSyncAt = [
        ...metaState.connections.map(connection => connection.lastSyncAt || connection.lastWebhookAt || ''),
        ...metaState.forms.map(form => form.lastSyncedAt || '')
    ].filter(Boolean).sort().at(-1) || null;
    const trendSeriesData = buildTrendSeriesData(summary);
    const contractReadyCount = candidateLeads.filter(lead => lead.status === '계약예정' || lead.status === '계약완료').length;
    const conversionRate = candidateLeads.length > 0 ? Math.round((contractReadyCount / candidateLeads.length) * 1000) / 10 : 0;
    const activeFollowupLeads = candidateLeads.filter(lead => !lead.convertedCustomerId && lead.status !== '계약완료' && lead.status !== '보류/이탈');
    const workQueueSummary = getLeadWorkQueueSummary(activeFollowupLeads);
    const dueContactCount = workQueueSummary.today;
    const overdueContactCount = workQueueSummary.overdue;
    const pipelineColumns = FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        leads: candidateLeads.filter(lead => lead.status === status)
    }));
    const taskLeads = [...activeFollowupLeads]
        .filter(lead => matchesLeadWorkQueue(lead, taskQueueFilter))
        .sort((a, b) => {
            const rankDiff = getLeadTaskRank(a) - getLeadTaskRank(b);
            if (rankDiff !== 0) return rankDiff;
            const aTime = a.nextContactAt ? new Date(a.nextContactAt).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.nextContactAt ? new Date(b.nextContactAt).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
    const taskQueueOptions = WORK_QUEUE_OPTIONS.map(option => {
        const count = option.key === 'all'
            ? workQueueSummary.actionable
            : option.key === 'no_response'
                ? workQueueSummary.noResponse
                : workQueueSummary[option.key];
        return { ...option, count };
    });
    const listPolicyText = tableSort === 'priority_only'
        ? `중요 희망자: ${visibleLayerLeads.length.toLocaleString()}건 · 별표 표시된 가맹 희망자만 표시합니다.`
        : hasActiveLeadTableFilters(tableFilters)
        ? `필터 적용: ${visibleLayerLeads.length.toLocaleString()}건 · 지역/예산 조건을 반영했습니다.`
        : searchTerm.trim()
            ? `검색 중에는 전체 데이터 범위에서 찾고, 화면에는 ${pageSize}건씩 표시합니다.`
            : `기본 조회: 최신 500건 · 화면 표시: ${pageSize}건씩 · 검색 시 전체 범위 조회`;
    const totalPages = Math.max(1, Math.ceil(visibleLayerLeads.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStartIndex = visibleLayerLeads.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
    const paginatedLeads = React.useMemo(
        () => visibleLayerLeads.slice(pageStartIndex, pageStartIndex + pageSize),
        [pageSize, pageStartIndex, visibleLayerLeads]
    );
    const selectedLeadSet = React.useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
    const selectedLeads = React.useMemo(
        () => paginatedLeads.filter(lead => selectedLeadSet.has(lead.id)),
        [paginatedLeads, selectedLeadSet]
    );
    const allVisibleSelected = paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedLeadSet.has(lead.id));
    return {
        rawIntakeLeads,
        candidateLeads,
        visibleLayerLeads,
        stageData,
        sourceChartData,
        metaEnabledForms,
        metaErrorCount,
        metaLastSyncAt,
        trendSeriesData,
        conversionRate,
        dueContactCount,
        overdueContactCount,
        pipelineColumns,
        taskLeads,
        taskQueueOptions,
        listPolicyText,
        totalPages,
        safeCurrentPage,
        paginatedLeads,
        selectedLeads,
        allVisibleSelected
    };
}
