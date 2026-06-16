"use client";

import type { ReactNode } from 'react';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LEAD_TABLE_COLUMNS } from './leadTableConfig';
import type { LeadTableColumnKey } from './leadTableTypes';
import type { FranchiseLead, LeadDbLayer } from './types';
import { LeadTableBulkActions } from './LeadTableBulkActions';
import { LeadTablePagination } from './LeadTablePagination';
import { LeadTableRow } from './LeadTableRow';

type LeadTableViewProps = {
    readonly isLoading: boolean;
    readonly leadDbLayer: LeadDbLayer;
    readonly visibleLeadCount: number;
    readonly paginatedLeads: readonly FranchiseLead[];
    readonly selectedLeadIds: readonly string[];
    readonly allVisibleSelected: boolean;
    readonly bulkNextContactAt: string;
    readonly isBulkUpdating: boolean;
    readonly convertingLeadId: string;
    readonly statusOptions: readonly FranchiseLeadStatus[];
    readonly safeCurrentPage: number;
    readonly totalPages: number;
    readonly visibleColumns: readonly LeadTableColumnKey[];
    readonly renderManagerOptions: (selectedManagerId?: string) => ReactNode;
    readonly getManagerName: (managerId?: string) => string;
    readonly onBulkNextContactAtChange: (value: string) => void;
    readonly onApplyBulkNextContact: () => void;
    readonly onClearSelected: () => void;
    readonly onToggleSelectAllVisible: (checked: boolean) => void;
    readonly onToggleSelectLead: (leadId: string, checked: boolean) => void;
    readonly onSelectLead: (leadId: string) => void;
    readonly onStatusChange: (lead: FranchiseLead, status: FranchiseLeadStatus) => void;
    readonly onManagerChange: (lead: FranchiseLead, managerId: string) => void;
    readonly onTogglePriority: (lead: FranchiseLead) => void;
    readonly onPromoteLeadToCandidate: (lead: FranchiseLead) => void;
    readonly onConvertLead: (lead: FranchiseLead) => void;
    readonly onOpenQuickActivityModal: (lead: FranchiseLead) => void;
    readonly onOpenEditModal: (lead: FranchiseLead) => void;
    readonly onRequestDelete: (lead: FranchiseLead) => void;
    readonly onPreviousPage: () => void;
    readonly onNextPage: () => void;
};

export function LeadTableView({
    isLoading,
    leadDbLayer,
    visibleLeadCount,
    paginatedLeads,
    selectedLeadIds,
    allVisibleSelected,
    bulkNextContactAt,
    isBulkUpdating,
    convertingLeadId,
    statusOptions,
    safeCurrentPage,
    totalPages,
    visibleColumns,
    renderManagerOptions,
    getManagerName,
    onBulkNextContactAtChange,
    onApplyBulkNextContact,
    onClearSelected,
    onToggleSelectAllVisible,
    onToggleSelectLead,
    onSelectLead,
    onStatusChange,
    onManagerChange,
    onTogglePriority,
    onPromoteLeadToCandidate,
    onConvertLead,
    onOpenQuickActivityModal,
    onOpenEditModal,
    onRequestDelete,
    onPreviousPage,
    onNextPage
}: LeadTableViewProps) {
    const selectedLeadSet = new Set(selectedLeadIds);
    const columnClassNames: Record<LeadTableColumnKey, string> = {
        priority: styles.colPriority,
        name: styles.colCandidate,
        mobile: styles.colPhone,
        status: styles.colStatus,
        disclosure: styles.colDisclosure,
        manager: styles.colManager,
        source: styles.colSource,
        desiredRegion: styles.colRegion,
        budget: styles.colBudget,
        interestedBrand: styles.colBrand,
        nextContactAt: styles.colNextContact,
        memo: styles.colMemo,
        links: styles.colLink,
        actions: styles.colActions
    };
    const columnWidths: Record<LeadTableColumnKey, number> = {
        priority: 64,
        name: 160,
        mobile: 142,
        status: 136,
        disclosure: 154,
        manager: 152,
        source: 108,
        desiredRegion: 150,
        budget: 184,
        interestedBrand: 132,
        nextContactAt: 142,
        memo: 250,
        links: 92,
        actions: 168
    };
    const activeColumns = LEAD_TABLE_COLUMNS.filter(column => visibleColumns.includes(column.key));
    const emptyColumnSpan = activeColumns.length + 1;
    const tableWidth = `${44 + activeColumns.reduce((sum, column) => sum + columnWidths[column.key], 0)}px`;

    return (
        <>
            <LeadTableBulkActions
                selectedCount={selectedLeadIds.length}
                bulkNextContactAt={bulkNextContactAt}
                isBulkUpdating={isBulkUpdating}
                onBulkNextContactAtChange={onBulkNextContactAtChange}
                onApplyBulkNextContact={onApplyBulkNextContact}
                onClearSelected={onClearSelected}
            />
            <div className={styles.tableScroll}>
                <table className={styles.leadTable} style={{ width: tableWidth, minWidth: tableWidth }}>
                    <colgroup>
                        <col className={styles.colCheck} />
                        {activeColumns.map(column => (
                            <col key={column.key} className={columnClassNames[column.key]} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th className={styles.checkboxCell}>
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={(event) => onToggleSelectAllVisible(event.target.checked)}
                                    disabled={paginatedLeads.length === 0 || isLoading}
                                    aria-label="현재 페이지 전체 선택"
                                />
                            </th>
                            {activeColumns.map(column => (
                                <th
                                    key={column.key}
                                    className={column.key === 'status' || column.key === 'manager' ? styles.centerColumnHeader : undefined}
                                >
                                    {column.key === 'actions' ? '' : column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={emptyColumnSpan} className={styles.emptyRow}>모객 DB를 불러오고 있습니다.</td>
                            </tr>
                        ) : visibleLeadCount === 0 ? (
                            <tr>
                                <td colSpan={emptyColumnSpan} className={styles.emptyRow}>
                                    {leadDbLayer === 'raw_intake' ? '1차 유입 DB에 쌓인 원천 DB가 없습니다.' : '조건에 맞는 가맹 희망자가 없습니다.'}
                                </td>
                            </tr>
                        ) : paginatedLeads.map(lead => (
                            <LeadTableRow
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedLeadSet.has(lead.id)}
                                convertingLeadId={convertingLeadId}
                                statusOptions={statusOptions}
                                visibleColumns={visibleColumns}
                                renderManagerOptions={renderManagerOptions}
                                getManagerName={getManagerName}
                                onToggleSelectLead={onToggleSelectLead}
                                onSelectLead={onSelectLead}
                                onStatusChange={onStatusChange}
                                onManagerChange={onManagerChange}
                                onTogglePriority={onTogglePriority}
                                onPromoteLeadToCandidate={onPromoteLeadToCandidate}
                                onConvertLead={onConvertLead}
                                onOpenQuickActivityModal={onOpenQuickActivityModal}
                                onOpenEditModal={onOpenEditModal}
                                onRequestDelete={onRequestDelete}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            <LeadTablePagination
                visibleLeadCount={visibleLeadCount}
                safeCurrentPage={safeCurrentPage}
                totalPages={totalPages}
                onPreviousPage={onPreviousPage}
                onNextPage={onNextPage}
            />
        </>
    );
}
