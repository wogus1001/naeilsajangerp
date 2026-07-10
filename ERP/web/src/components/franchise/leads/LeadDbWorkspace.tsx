"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    FRANCHISE_LEAD_STATUSES
} from '@/lib/franchise-leads';
import { ExportActions } from '@/components/franchise/ExportActions';
import {
    buildLeadExportColumns,
    buildLeadExportRows
} from '@/components/franchise/franchiseDbExport';
import {
    buildDatedExportFilename,
    downloadTableAsXlsx,
    openPrintableTable,
    type TableExportPayload
} from '@/utils/tableExport';
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
    if (isContractOwnersWorkspace) return '구비서류';
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
    if (viewMode === 'tasks') return '내 담당 연락 지연, 오늘 연락, 무응답 확인 대상을 우선 정리합니다.';
    return listPolicyText;
}

export function LeadDbWorkspace({
    isLoading,
    workspaceVariant = 'default',
    userId,
    leadDbLayer,
    viewMode,
    rawIntakeCount,
    candidateCount,
    listPolicyText,
    contractChecklistRefreshKey = 0,
    pageSize,
    visibleLayerLeadCount,
    exportLeads,
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
    onLoadExportLeadsAction,
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
        leadIds: isContractOwnersWorkspace && leadDbLayer === 'candidate' ? paginatedLeads.map(lead => lead.id) : [],
        refreshKey: contractChecklistRefreshKey,
        userId
    });
    const exportTitle = leadDbLayer === 'raw_intake' ? '모객 DB - 1차 유입 DB' : '모객 DB - 가맹 희망자';
    const exportFilePrefix = leadDbLayer === 'raw_intake' ? '모객DB_1차유입' : '모객DB_가맹희망자';

    const buildExportPayload = async (): Promise<TableExportPayload> => {
        const leadsForExport = onLoadExportLeadsAction ? await onLoadExportLeadsAction() : exportLeads;
        const columns = buildLeadExportColumns(visibleTableColumns);
        const rows = buildLeadExportRows(leadsForExport, columns, getManagerName);
        return {
            title: exportTitle,
            filename: buildDatedExportFilename(exportFilePrefix),
            sheetName: leadDbLayer === 'raw_intake' ? '1차 유입 DB' : '가맹 희망자',
            columns,
            rows,
            filterSummary: `현재 필터/정렬 기준 ${rows.length.toLocaleString()}건`
        };
    };

    const runExportAction = async (action: (payload: TableExportPayload) => void | Promise<void>) => {
        try {
            await action(await buildExportPayload());
        } catch (error) {
            console.error('Failed to export franchise leads:', error);
            window.alert(error instanceof Error ? error.message : '모객 DB 추출에 실패했습니다.');
        }
    };

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
            <div className={styles.tableHeader}>
                <div>
                    <h2>{getTableTitle(leadDbLayer, effectiveViewMode, isContractOwnersWorkspace)}</h2>
                    <p>{getTableDescription(leadDbLayer, effectiveViewMode, listPolicyText, isContractOwnersWorkspace)}</p>
                </div>
                <div className={styles.tableHeaderActions}>
                    {!isContractOwnersWorkspace && effectiveViewMode === 'table' && (
                        <ExportActions
                            rowCount={visibleLayerLeadCount}
                            allowEmptyExport={Boolean(onLoadExportLeadsAction)}
                            disabled={isLoading}
                            onExcelAction={() => runExportAction(downloadTableAsXlsx)}
                            onPdfAction={() => runExportAction(payload => openPrintableTable(payload, 'pdf'))}
                            onPrintAction={() => runExportAction(payload => openPrintableTable(payload, 'print'))}
                        />
                    )}
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
