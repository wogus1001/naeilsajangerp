"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    FRANCHISE_LEAD_STATUSES
} from '@/lib/franchise-leads';
import {
    LEAD_DB_LAYER_OPTIONS,
    VIEW_OPTIONS
} from './constants';
import { LeadPipelineBoard } from './LeadPipelineBoard';
import { LeadTableControls } from './LeadTableControls';
import { LeadTableView } from './LeadTableView';
import { LeadTaskBoard } from './LeadTaskBoard';
import type { LeadDbLayer, LeadViewMode } from './types';
import type { LeadDbWorkspaceProps } from './LeadDbWorkspace.types';

function getTableTitle(leadDbLayer: LeadDbLayer, viewMode: LeadViewMode) {
    if (leadDbLayer === 'raw_intake') return '1차 유입 DB';
    if (viewMode === 'pipeline') return '상태별 파이프라인';
    if (viewMode === 'tasks') return '업무 큐';
    return '가맹 희망자 목록';
}

function getTableDescription(leadDbLayer: LeadDbLayer, viewMode: LeadViewMode, listPolicyText: string) {
    if (leadDbLayer === 'raw_intake') return 'Meta 광고, 엑셀 업로드 등 원천 유입을 먼저 모아두고 의사가 확인된 DB만 가맹 희망자로 승격합니다.';
    if (viewMode === 'pipeline') return '상태별 카드에서 상담 흐름을 빠르게 이동합니다.';
    if (viewMode === 'tasks') return '연락 지연, 오늘 연락, 무응답 리드를 우선 처리합니다.';
    return listPolicyText;
}

export function LeadDbWorkspace({
    isLoading,
    leadDbLayer,
    viewMode,
    rawIntakeCount,
    candidateCount,
    listPolicyText,
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
    return (
        <section className={styles.tablePanel}>
            <div className={styles.leadLayerTabs}>
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
            </div>
            <div className={styles.tableHeader}>
                <div>
                    <h2>{getTableTitle(leadDbLayer, viewMode)}</h2>
                    <p>{getTableDescription(leadDbLayer, viewMode, listPolicyText)}</p>
                </div>
                <div className={styles.tableHeaderActions}>
                    <div className={styles.viewTabs} aria-label="모객 DB 보기 전환">
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
                    </div>
                </div>
            </div>
            {viewMode === 'table' && (
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
            {viewMode === 'pipeline' && (
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

            {viewMode === 'tasks' && (
                <LeadTaskBoard
                    isLoading={isLoading}
                    taskQueueOptions={taskQueueOptions}
                    taskQueueFilter={taskQueueFilter}
                    taskLeads={taskLeads}
                    convertingLeadId={convertingLeadId}
                    getManagerName={getManagerName}
                    onTaskQueueFilterChange={onTaskQueueFilterChangeAction}
                    onSelectLead={onSelectLeadAction}
                    onCompleteTodayTask={onCompleteTodayTaskAction}
                    onConvertLead={onConvertLeadAction}
                />
            )}
        </section>
    );
}
