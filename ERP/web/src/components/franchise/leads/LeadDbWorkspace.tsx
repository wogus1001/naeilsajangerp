"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    FRANCHISE_LEAD_STATUSES
} from '@/lib/franchise-leads';
import {
    LEAD_DB_LAYER_OPTIONS,
    VIEW_OPTIONS
} from './constants';
import { LeadContractChecklistWorkspace } from './LeadContractChecklistWorkspace';
import { LeadPipelineBoard } from './LeadPipelineBoard';
import { LeadTableControls } from './LeadTableControls';
import { LeadTableView } from './LeadTableView';
import { LeadTaskBoard } from './LeadTaskBoard';
import { useLeadContractChecklistSummaries } from './useLeadContractChecklistSummaries';
import type { LeadDbLayer, LeadViewMode } from './types';
import type { LeadDbWorkspaceProps } from './LeadDbWorkspace.types';

function getTableTitle(leadDbLayer: LeadDbLayer, viewMode: LeadViewMode, isContractOwnersWorkspace: boolean) {
    if (isContractOwnersWorkspace) return '계약 전 체크리스트';
    if (leadDbLayer === 'raw_intake') return '1차 유입 DB';
    if (viewMode === 'pipeline') return '상태별 파이프라인';
    if (viewMode === 'tasks') return '연락 관리';
    return '가맹 희망자 목록';
}

function getTableDescription(
    leadDbLayer: LeadDbLayer,
    viewMode: LeadViewMode,
    listPolicyText: string,
    isContractOwnersWorkspace: boolean
) {
    if (isContractOwnersWorkspace) return '계약완료 점주의 계약 전 확인 항목만 빠르게 점검합니다.';
    if (leadDbLayer === 'raw_intake') return 'Meta 광고, 엑셀 업로드 등 원천 유입을 먼저 모아두고 의사가 확인된 DB만 가맹 희망자로 승격합니다.';
    if (viewMode === 'pipeline') return '상태별 카드에서 상담 흐름을 빠르게 이동합니다.';
    if (viewMode === 'tasks') return '내 담당 지연 연락, 오늘 연락, 무응답 가맹 희망자를 우선 정리합니다.';
    return listPolicyText;
}

export function LeadDbWorkspace({
    isLoading,
    workspaceVariant = 'default',
    leadDbLayer,
    viewMode,
    rawIntakeCount,
    candidateCount,
    listPolicyText,
    contractChecklistRefreshKey = 0,
    pageSize,
    visibleLayerLeadCount,
    paginatedLeads,
    selectedLeadIds,
    allVisibleSelected,
    bulkNextContactAt,
    isBulkUpdating,
    convertingLeadId,
    tableFilters,
    tableSort,
    visibleTableColumns,
    pipelineColumns,
    taskQueueOptions,
    taskQueueFilter,
    taskLeads,
    safeCurrentPage,
    totalPages,
    renderManagerOptions,
    getManagerName,
    onLeadDbLayerChangeAction,
    onViewModeChangeAction,
    onPageSizeChangeAction,
    onTableFiltersChangeAction,
    onTableSortChangeAction,
    onVisibleTableColumnsChangeAction,
    onBulkNextContactAtChangeAction,
    onApplyBulkNextContactAction,
    onClearSelectedAction,
    onToggleSelectAllVisibleAction,
    onToggleSelectLeadAction,
    onSelectLeadAction,
    onStatusChangeAction,
    onManagerChangeAction,
    onTogglePriorityAction,
    onPromoteLeadToCandidateAction,
    onConvertLeadAction,
    onOpenQuickActivityModalAction,
    onOpenEditModalAction,
    onRequestDeleteAction,
    onPreviousPageAction,
    onNextPageAction,
    onTaskQueueFilterChangeAction,
    onCompleteTodayTaskAction
}: LeadDbWorkspaceProps) {
    const isContractOwnersWorkspace = workspaceVariant === 'contractOwners';
    const effectiveViewMode = isContractOwnersWorkspace ? 'table' : viewMode;
    const {
        errorMessage: contractChecklistErrorMessage,
        isLoading: isContractChecklistLoading,
        schemaReady: isContractChecklistSchemaReady,
        summaries: contractChecklistSummaries
    } = useLeadContractChecklistSummaries({
        leadIds: leadDbLayer === 'candidate' ? paginatedLeads.map(lead => lead.id) : [],
        refreshKey: contractChecklistRefreshKey
    });

    return (
        <section className={styles.tablePanel}>
            {!isContractOwnersWorkspace && <div className={styles.leadLayerTabs}>
                {LEAD_DB_LAYER_OPTIONS.map(option => {
                    const count = option.key === 'raw_intake' ? rawIntakeCount : candidateCount;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            className={leadDbLayer === option.key ? styles.leadLayerTabActive : styles.leadLayerTab}
                            onClick={() => onLeadDbLayerChangeAction(option.key)}
                        >
                            <strong>{option.label}</strong>
                            <span>{option.description}</span>
                            <b>{count.toLocaleString()}건</b>
                        </button>
                    );
                })}
            </div>}
            {isContractOwnersWorkspace && (
                <div className={styles.contractOwnerInlineSummary}>
                    <div>
                        <strong>계약완료 기준</strong>
                        <span>현재 조건에 맞는 계약 점주 {visibleLayerLeadCount.toLocaleString()}건</span>
                    </div>
                    <b>계약 관련 체크리스트만 표시</b>
                </div>
            )}
            <div className={styles.tableHeader}>
                <div>
                    <h2>{getTableTitle(leadDbLayer, effectiveViewMode, isContractOwnersWorkspace)}</h2>
                    <p>{getTableDescription(leadDbLayer, effectiveViewMode, listPolicyText, isContractOwnersWorkspace)}</p>
                </div>
                <div className={styles.tableHeaderActions}>
                    {!isContractOwnersWorkspace && <div className={styles.viewTabs} aria-label="모객 DB 보기 전환">
                        {VIEW_OPTIONS.filter(option => leadDbLayer === 'candidate' || option.mode === 'table').map(option => (
                            <button
                                key={option.mode}
                                className={viewMode === option.mode ? styles.viewTabActive : styles.viewTab}
                                onClick={() => onViewModeChangeAction(option.mode)}
                                title={option.description}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>}
                </div>
            </div>
            {isContractOwnersWorkspace && (
                <LeadContractChecklistWorkspace
                    isLoading={isLoading}
                    isSummaryLoading={isContractChecklistLoading}
                    schemaReady={isContractChecklistSchemaReady}
                    errorMessage={contractChecklistErrorMessage}
                    visibleLeadCount={visibleLayerLeadCount}
                    leads={paginatedLeads}
                    summaries={contractChecklistSummaries}
                    safeCurrentPage={safeCurrentPage}
                    totalPages={totalPages}
                    onOpenChecklistAction={onSelectLeadAction}
                    onPreviousPageAction={onPreviousPageAction}
                    onNextPageAction={onNextPageAction}
                />
            )}
            {!isContractOwnersWorkspace && effectiveViewMode === 'table' && (
                <>
                    <LeadTableControls
                        pageSize={pageSize}
                        filters={tableFilters}
                        sort={tableSort}
                        visibleColumns={visibleTableColumns}
                        onPageSizeChangeAction={onPageSizeChangeAction}
                        onFiltersChangeAction={onTableFiltersChangeAction}
                        onSortChangeAction={onTableSortChangeAction}
                        onVisibleColumnsChangeAction={onVisibleTableColumnsChangeAction}
                    />
                    <LeadTableView
                        isLoading={isLoading}
                        leadDbLayer={leadDbLayer}
                        visibleLeadCount={visibleLayerLeadCount}
                        paginatedLeads={paginatedLeads}
                        selectedLeadIds={selectedLeadIds}
                        allVisibleSelected={allVisibleSelected}
                        bulkNextContactAt={bulkNextContactAt}
                        isBulkUpdating={isBulkUpdating}
                        convertingLeadId={convertingLeadId}
                        statusOptions={FRANCHISE_LEAD_STATUSES}
                        safeCurrentPage={safeCurrentPage}
                        totalPages={totalPages}
                        visibleColumns={visibleTableColumns}
                        contractChecklistSummaries={contractChecklistSummaries}
                        renderManagerOptions={renderManagerOptions}
                        getManagerName={getManagerName}
                        onBulkNextContactAtChange={onBulkNextContactAtChangeAction}
                        onApplyBulkNextContact={onApplyBulkNextContactAction}
                        onClearSelected={onClearSelectedAction}
                        onToggleSelectAllVisible={onToggleSelectAllVisibleAction}
                        onToggleSelectLead={onToggleSelectLeadAction}
                        onSelectLead={onSelectLeadAction}
                        onStatusChange={onStatusChangeAction}
                        onManagerChange={onManagerChangeAction}
                        onTogglePriority={onTogglePriorityAction}
                        onPromoteLeadToCandidate={onPromoteLeadToCandidateAction}
                        onConvertLead={onConvertLeadAction}
                        onOpenQuickActivityModal={onOpenQuickActivityModalAction}
                        onOpenEditModal={onOpenEditModalAction}
                        onRequestDelete={onRequestDeleteAction}
                        onPreviousPage={onPreviousPageAction}
                        onNextPage={onNextPageAction}
                    />
                </>
            )}
            {!isContractOwnersWorkspace && viewMode === 'pipeline' && (
                <LeadPipelineBoard
                    isLoading={isLoading}
                    columns={pipelineColumns}
                    convertingLeadId={convertingLeadId}
                    getManagerName={getManagerName}
                    onSelectLead={onSelectLeadAction}
                    onStatusChange={onStatusChangeAction}
                    onConvertLead={onConvertLeadAction}
                />
            )}

            {!isContractOwnersWorkspace && viewMode === 'tasks' && (
                <LeadTaskBoard
                    isLoading={isLoading}
                    taskQueueOptions={taskQueueOptions}
                    taskQueueFilter={taskQueueFilter}
                    taskLeads={taskLeads}
                    convertingLeadId={convertingLeadId}
                    getManagerNameAction={getManagerName}
                    onTaskQueueFilterChangeAction={onTaskQueueFilterChangeAction}
                    onSelectLeadAction={onSelectLeadAction}
                    onCompleteTodayTaskAction={onCompleteTodayTaskAction}
                    onConvertLeadAction={onConvertLeadAction}
                />
            )}
        </section>
    );
}
