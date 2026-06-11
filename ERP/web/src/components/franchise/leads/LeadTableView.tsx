"use client";

import type { ReactNode } from 'react';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
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
    readonly pageRangeText: string;
    readonly safeCurrentPage: number;
    readonly totalPages: number;
    readonly renderManagerOptions: (selectedManagerId?: string) => ReactNode;
    readonly onBulkNextContactAtChange: (value: string) => void;
    readonly onApplyBulkNextContact: () => void;
    readonly onClearSelected: () => void;
    readonly onToggleSelectAllVisible: (checked: boolean) => void;
    readonly onToggleSelectLead: (leadId: string, checked: boolean) => void;
    readonly onSelectLead: (leadId: string) => void;
    readonly onStatusChange: (lead: FranchiseLead, status: FranchiseLeadStatus) => void;
    readonly onManagerChange: (lead: FranchiseLead, managerId: string) => void;
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
    pageRangeText,
    safeCurrentPage,
    totalPages,
    renderManagerOptions,
    onBulkNextContactAtChange,
    onApplyBulkNextContact,
    onClearSelected,
    onToggleSelectAllVisible,
    onToggleSelectLead,
    onSelectLead,
    onStatusChange,
    onManagerChange,
    onPromoteLeadToCandidate,
    onConvertLead,
    onOpenQuickActivityModal,
    onOpenEditModal,
    onRequestDelete,
    onPreviousPage,
    onNextPage
}: LeadTableViewProps) {
    const selectedLeadSet = new Set(selectedLeadIds);

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
                <table className={styles.leadTable}>
                    <colgroup>
                        <col className={styles.colCheck} />
                        <col className={styles.colCandidate} />
                        <col className={styles.colPhone} />
                        <col className={styles.colStatus} />
                        <col className={styles.colManager} />
                        <col className={styles.colSource} />
                        <col className={styles.colRegion} />
                        <col className={styles.colBudget} />
                        <col className={styles.colBrand} />
                        <col className={styles.colNextContact} />
                        <col className={styles.colMemo} />
                        <col className={styles.colLink} />
                        <col className={styles.colActions} />
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
                            <th>후보자</th>
                            <th>연락처</th>
                            <th>상태</th>
                            <th>담당자</th>
                            <th>유입</th>
                            <th>희망지역</th>
                            <th>예산</th>
                            <th>브랜드</th>
                            <th>다음 연락</th>
                            <th>메모</th>
                            <th>연결</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={13} className={styles.emptyRow}>모객 DB를 불러오고 있습니다.</td>
                            </tr>
                        ) : visibleLeadCount === 0 ? (
                            <tr>
                                <td colSpan={13} className={styles.emptyRow}>
                                    {leadDbLayer === 'raw_intake' ? '1차 유입 DB에 쌓인 원천 DB가 없습니다.' : '조건에 맞는 후보자가 없습니다.'}
                                </td>
                            </tr>
                        ) : paginatedLeads.map(lead => (
                            <LeadTableRow
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedLeadSet.has(lead.id)}
                                convertingLeadId={convertingLeadId}
                                statusOptions={statusOptions}
                                renderManagerOptions={renderManagerOptions}
                                onToggleSelectLead={onToggleSelectLead}
                                onSelectLead={onSelectLead}
                                onStatusChange={onStatusChange}
                                onManagerChange={onManagerChange}
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
                pageRangeText={pageRangeText}
                safeCurrentPage={safeCurrentPage}
                totalPages={totalPages}
                onPreviousPage={onPreviousPage}
                onNextPage={onNextPage}
            />
        </>
    );
}
