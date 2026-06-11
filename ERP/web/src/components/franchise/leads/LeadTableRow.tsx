"use client";

import type { ReactNode } from 'react';
import {
    CheckCircle2,
    Megaphone,
    MessageSquare,
    Pencil,
    Trash2,
    UserCheck
} from 'lucide-react';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
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
    readonly renderManagerOptions: (selectedManagerId?: string) => ReactNode;
    readonly onToggleSelectLead: (leadId: string, checked: boolean) => void;
    readonly onSelectLead: (leadId: string) => void;
    readonly onStatusChange: (lead: FranchiseLead, status: FranchiseLeadStatus) => void;
    readonly onManagerChange: (lead: FranchiseLead, managerId: string) => void;
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
    renderManagerOptions,
    onToggleSelectLead,
    onSelectLead,
    onStatusChange,
    onManagerChange,
    onPromoteLeadToCandidate,
    onConvertLead,
    onOpenQuickActivityModal,
    onOpenEditModal,
    onRequestDelete
}: LeadTableRowProps) {
    return (
        <tr>
            <td className={styles.checkboxCell}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => onToggleSelectLead(lead.id, event.target.checked)}
                    aria-label={`${lead.name} 선택`}
                />
            </td>
            <td>
                <button type="button" className={styles.nameButton} onClick={() => onSelectLead(lead.id)}>
                    <strong>{lead.name}</strong>
                    <span>{formatDate(lead.createdAt)} 등록</span>
                </button>
            </td>
            <td>
                <span className={styles.phone}>{lead.mobile || '-'}</span>
            </td>
            <td>
                <select
                    className={styles.statusSelect}
                    value={lead.status}
                    onChange={(event) => {
                        const nextStatus = parseStatus(event.target.value, statusOptions);
                        if (nextStatus) onStatusChange(lead, nextStatus);
                    }}
                >
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </td>
            <td>
                <select
                    className={styles.managerSelect}
                    value={lead.managerId || ''}
                    onChange={(event) => onManagerChange(lead, event.target.value)}
                >
                    <option value="">담당자 선택</option>
                    {renderManagerOptions(lead.managerId)}
                </select>
            </td>
            <td>
                {lead.source ? (
                    <span
                        className={isMetaLeadSource(lead) ? `${styles.sourceBadge} ${styles.sourceBadgeMeta}` : styles.sourceBadge}
                        title={getLeadSourceTitle(lead)}
                    >
                        <Megaphone size={12} aria-hidden="true" />
                        <span>{getLeadSourceBadgeLabel(lead)}</span>
                    </span>
                ) : '-'}
            </td>
            <td>{lead.desiredRegion || '-'}</td>
            <td>{formatBudget(lead.budgetMin, lead.budgetMax)}</td>
            <td>{lead.interestedBrand || '-'}</td>
            <td>
                <span className={isPastDue(lead.nextContactAt) ? styles.dueBadgeDanger : isDueToday(lead.nextContactAt) ? styles.dueBadge : undefined}>
                    {formatDateTime(lead.nextContactAt)}
                </span>
            </td>
            <td className={styles.memoCell}>{lead.memo || '-'}</td>
            <td>
                <div className={styles.linkBadges}>
                    {lead.linkedCustomerId && <span>고객</span>}
                    {lead.linkedBusinessCardId && <span>명함</span>}
                    {!lead.linkedCustomerId && !lead.linkedBusinessCardId && <small>-</small>}
                </div>
            </td>
            <td>
                <div className={styles.rowActions}>
                    {isRawIntakeLead(lead) && (
                        <button
                            type="button"
                            className={styles.promoteButton}
                            onClick={() => onPromoteLeadToCandidate(lead)}
                            aria-label={`${lead.name} 후보자 승격`}
                            data-tooltip="후보자 목록으로 승격"
                        >
                            후보자
                        </button>
                    )}
                    {!isRawIntakeLead(lead) && (
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
                                aria-label={`${lead.name} 고객 전환`}
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
                        aria-label={`${lead.name} 상담 이력 추가`}
                        data-tooltip="이력추가"
                    >
                        <MessageSquare size={15} />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onOpenEditModal(lead)}
                        aria-label={`${lead.name} 수정`}
                        data-tooltip="수정"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButtonDanger}
                        onClick={() => onRequestDelete(lead)}
                        aria-label={`${lead.name} 삭제`}
                        data-tooltip="삭제"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
