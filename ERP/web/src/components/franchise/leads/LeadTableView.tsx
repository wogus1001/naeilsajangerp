"use client";

import type { ReactNode } from 'react';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    LEAD_TABLE_CHECKBOX_COLUMN_WIDTH,
    LEAD_TABLE_COLUMNS,
    LEAD_TABLE_COLUMN_WIDTHS
} from './leadTableConfig';
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
    readonly onReturnSelectedToRawIntake: () => void;
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

const CENTER_ALIGNED_COLUMN_KEYS: ReadonlySet<LeadTableColumnKey> = new Set([
    'priority',
    'status',
    'disclosure',
    'manager',
    'source',
    'lastContactedAt',
    'nextContactAt',
    'actions'
]);

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
    onReturnSelectedToRawIntake,
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
    const activeColumns = LEAD_TABLE_COLUMNS.filter(column => visibleColumns.includes(column.key));
    const emptyColumnSpan = activeColumns.length + 2;
    const tableMinWidth = LEAD_TABLE_CHECKBOX_COLUMN_WIDTH
        + activeColumns.reduce((sum, column) => sum + LEAD_TABLE_COLUMN_WIDTHS[column.key], 0);

    return (
        <>
            <LeadTableBulkActions
                leadDbLayer={leadDbLayer}
                selectedCount={selectedLeadIds.length}
                bulkNextContactAt={bulkNextContactAt}
                isBulkUpdating={isBulkUpdating}
                onBulkNextContactAtChange={onBulkNextContactAtChange}
                onApplyBulkNextContact={onApplyBulkNextContact}
                onReturnSelectedToRawIntake={onReturnSelectedToRawIntake}
                onClearSelected={onClearSelected}
            />
            <div className={styles.tableScroll}>
                <table className={styles.leadTable} style={{ minWidth: `${tableMinWidth}px` }}>
                    <colgroup>
                        <col style={{ width: LEAD_TABLE_CHECKBOX_COLUMN_WIDTH }} />
                        {activeColumns.map(column => (
                            <col key={column.key} style={{ width: LEAD_TABLE_COLUMN_WIDTHS[column.key] }} />
                        ))}
                        <col />
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
                                    className={
                                        column.key === 'budget'
                                            ? styles.rightColumnHeader
                                            : CENTER_ALIGNED_COLUMN_KEYS.has(column.key)
                                                ? styles.centerColumnHeader
                                                : undefined
                                    }
                                >
                                    {column.key === 'actions' ? '' : column.label}
                                </th>
                            ))}
                            <th className={styles.tableFillerCell} aria-hidden="true" />
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
