"use client";

import type { ReactNode } from 'react';
import {
    CheckCircle2,
    Megaphone,
    MessageSquare,
    Pencil,
    Star,
    Trash2,
    UserCheck
} from 'lucide-react';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ENABLE_LEAD_CUSTOMER_DB_LINKING } from './constants';
import { LeadDisclosureStatusCell } from './LeadDisclosureStatusCell';
import { LeadPrivateTableValue } from './LeadPrivateTableValue';
import { formatLeadTableMobile, formatLeadTableName, formatLeadTableText } from './leadTableDisplay';
import type { LeadTableColumnKey } from './leadTableTypes';
import type { FranchiseLead } from './types';
import {
    formatBudget,
    formatDate,
    formatDateTime,
    getLeadSourceBadgeLabel,
    getLeadSourceTitle,
    isDueToday,
    isMetaLeadSource,
    isPastDue,
    isRawIntakeLead
} from './utils';

type LeadTableRowProps = {
    readonly lead: FranchiseLead;
    readonly isSelected: boolean;
    readonly convertingLeadId: string;
    readonly statusOptions: readonly FranchiseLeadStatus[];
    readonly visibleColumns: readonly LeadTableColumnKey[];
    readonly renderManagerOptions: (selectedManagerId?: string) => ReactNode;
    readonly getManagerName: (managerId?: string) => string;
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
};

function parseStatus(value: string, statusOptions: readonly FranchiseLeadStatus[]) {
    return statusOptions.find(status => status === value) || null;
}

export function LeadTableRow({
    lead,
    isSelected,
    convertingLeadId,
    statusOptions,
    visibleColumns,
    renderManagerOptions,
    getManagerName,
    onToggleSelectLead,
    onSelectLead,
    onStatusChange,
    onManagerChange,
    onTogglePriority,
    onPromoteLeadToCandidate,
    onConvertLead,
    onOpenQuickActivityModal,
    onOpenEditModal,
    onRequestDelete
}: LeadTableRowProps) {
    const visibleColumnSet = new Set(visibleColumns);
    const isPriorityLead = lead.grade === 'HOT';
    const leadDisplayName = formatLeadTableName(lead.name);
    const leadDisplayMobile = formatLeadTableMobile(lead.mobile);
    const leadDisplayRegion = formatLeadTableText(lead.desiredRegion);
    const leadDisplayBrand = formatLeadTableText(lead.interestedBrand);
    const leadDisplayMemo = formatLeadTableText(lead.memo);

    return (
        <tr>
            <td className={styles.checkboxCell}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => onToggleSelectLead(lead.id, event.target.checked)}
                    aria-label={`${leadDisplayName} 선택`}
                />
            </td>
            {visibleColumnSet.has('priority') && <td className={styles.priorityCell}>
                <button
                    type="button"
                    className={isPriorityLead ? styles.priorityButtonActive : styles.priorityButton}
                    onClick={() => onTogglePriority(lead)}
                    aria-label={isPriorityLead ? `${leadDisplayName} 중요 표시 해제` : `${leadDisplayName} 중요 표시`}
                    title={isPriorityLead ? '중요 표시 해제' : '중요 표시'}
                >
                    <Star size={16} fill={isPriorityLead ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
            </td>}
            {visibleColumnSet.has('name') && <td>
                <button type="button" className={styles.nameButton} onClick={() => onSelectLead(lead.id)}>
                    <strong>{leadDisplayName}</strong>
                    <span>{formatDate(lead.createdAt)} 등록</span>
                </button>
            </td>}
            {visibleColumnSet.has('mobile') && <td>
                <LeadPrivateTableValue className={styles.phone} value={leadDisplayMobile} />
            </td>}
            {visibleColumnSet.has('status') && <td className={styles.selectCell}>
                <span className={styles.tableSelectWrap}>
                    <select
                        className={styles.statusSelect}
                        value={lead.status}
                        aria-label={`${leadDisplayName} 상태 변경`}
                        onChange={(event) => {
                            const nextStatus = parseStatus(event.target.value, statusOptions);
                            if (nextStatus) onStatusChange(lead, nextStatus);
                        }}
                    >
                        {statusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <span className={styles.tableSelectValue} aria-hidden="true">{lead.status}</span>
                </span>
            </td>}
            {visibleColumnSet.has('disclosure') && <td className={styles.centerColumnCell}>
                <LeadDisclosureStatusCell summary={lead.disclosureSummary} />
            </td>}
            {visibleColumnSet.has('manager') && <td className={styles.selectCell}>
                <span className={`${styles.tableSelectWrap} ${styles.managerSelectWrap}`}>
                    <select
                        className={styles.managerSelect}
                        value={lead.managerId || ''}
                        aria-label={`${leadDisplayName} 담당자 변경`}
                        onChange={(event) => onManagerChange(lead, event.target.value)}
                    >
                        <option value="">담당자 선택</option>
                        {renderManagerOptions(lead.managerId)}
                    </select>
                    <span className={styles.tableSelectValue} aria-hidden="true">{lead.managerId ? getManagerName(lead.managerId) : '담당자 선택'}</span>
                </span>
            </td>}
            {visibleColumnSet.has('source') && <td className={styles.centerColumnCell}>
                {lead.source ? (
                    <span
                        className={isMetaLeadSource(lead) ? `${styles.sourceBadge} ${styles.sourceBadgeMeta}` : styles.sourceBadge}
                        title={getLeadSourceTitle(lead)}
                    >
                        <Megaphone size={12} aria-hidden="true" />
                        <span>{getLeadSourceBadgeLabel(lead)}</span>
                    </span>
                ) : '-'}
            </td>}
            {visibleColumnSet.has('desiredRegion') && <td className={styles.tableTextCell}>
                <LeadPrivateTableValue value={leadDisplayRegion} />
            </td>}
            {visibleColumnSet.has('budget') && <td className={styles.rightColumnCell}>
                {formatBudget(lead.budgetMin, lead.budgetMax)}
            </td>}
            {visibleColumnSet.has('interestedBrand') && <td className={styles.tableTextCell}>
                <LeadPrivateTableValue value={leadDisplayBrand} />
            </td>}
            {visibleColumnSet.has('nextContactAt') && <td className={styles.centerColumnCell}>
                <span className={isPastDue(lead.nextContactAt) ? styles.dueBadgeDanger : isDueToday(lead.nextContactAt) ? styles.dueBadge : undefined}>
                    {formatDateTime(lead.nextContactAt)}
                </span>
            </td>}
            {visibleColumnSet.has('memo') && <td className={styles.memoCell}>
                <LeadPrivateTableValue value={leadDisplayMemo} />
            </td>}
            {ENABLE_LEAD_CUSTOMER_DB_LINKING && visibleColumnSet.has('links') && <td>
                <div className={styles.linkBadges}>
                    {lead.linkedCustomerId && <span>고객</span>}
                    {lead.linkedBusinessCardId && <span>명함</span>}
                    {!lead.linkedCustomerId && !lead.linkedBusinessCardId && <small>-</small>}
                </div>
            </td>}
            {visibleColumnSet.has('actions') && <td className={styles.centerColumnCell}>
                <div className={styles.rowActions}>
                    {isRawIntakeLead(lead) && (
                        <button
                            type="button"
                            className={styles.promoteButton}
                            onClick={() => onPromoteLeadToCandidate(lead)}
                            aria-label={`${leadDisplayName} 가맹 희망자 승격`}
                            data-tooltip="가맹 희망자 목록으로 승격"
                        >
                            승격
                        </button>
                    )}
                    {ENABLE_LEAD_CUSTOMER_DB_LINKING && !isRawIntakeLead(lead) && (
                        lead.convertedCustomerId ? (
                            <span className={styles.convertedActionPill} data-tooltip="고객 DB 전환 완료">
                                <CheckCircle2 size={14} />
                                완료
                            </span>
                        ) : (
                            <button
                                type="button"
                                className={styles.iconButton}
                                onClick={() => onConvertLead(lead)}
                                disabled={convertingLeadId === lead.id}
                                aria-label={`${leadDisplayName} 고객 전환`}
                                data-tooltip="고객전환"
                            >
                                <UserCheck size={15} />
                            </button>
                        )
                    )}
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onOpenQuickActivityModal(lead)}
                        aria-label={`${leadDisplayName} 상담 이력 추가`}
                        data-tooltip="이력추가"
                    >
                        <MessageSquare size={15} />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onOpenEditModal(lead)}
                        aria-label={`${leadDisplayName} 수정`}
                        data-tooltip="수정"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButtonDanger}
                        onClick={() => onRequestDelete(lead)}
                        aria-label={`${leadDisplayName} 삭제`}
                        data-tooltip="삭제"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </td>}
            <td className={styles.tableFillerCell} aria-hidden="true" />
        </tr>
    );
}
