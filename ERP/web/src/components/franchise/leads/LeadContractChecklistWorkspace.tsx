"use client";

import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import {
    LEAD_CONTRACT_CHECKLIST_DEFINITIONS,
    type LeadContractChecklistSummaryView
} from '@/lib/franchise-lead-contract-checklist';
import type { FranchiseLead } from './types';
import styles from './LeadContractChecklistWorkspace.module.css';

type LeadContractChecklistWorkspaceProps = {
    readonly isLoading: boolean;
    readonly isSummaryLoading: boolean;
    readonly schemaReady: boolean;
    readonly errorMessage: string;
    readonly visibleLeadCount: number;
    readonly leads: readonly FranchiseLead[];
    readonly summaries: Record<string, LeadContractChecklistSummaryView>;
    readonly safeCurrentPage: number;
    readonly totalPages: number;
    readonly onOpenChecklistAction: (leadId: string) => void;
    readonly onPreviousPageAction: () => void;
    readonly onNextPageAction: () => void;
};

type ChecklistDisplayState = {
    readonly completed: number;
    readonly total: number;
    readonly progressPercent: number;
    readonly remainingLabels: readonly string[];
    readonly isComplete: boolean;
};

const DEFAULT_TOTAL = LEAD_CONTRACT_CHECKLIST_DEFINITIONS.length;
const DEFAULT_REMAINING_LABELS = LEAD_CONTRACT_CHECKLIST_DEFINITIONS.map(definition => definition.label);

function getChecklistDisplayState(
    summary: LeadContractChecklistSummaryView | undefined,
    schemaReady: boolean
): ChecklistDisplayState {
    if (!schemaReady || summary?.schemaReady === false) {
        return {
            completed: 0,
            total: DEFAULT_TOTAL,
            progressPercent: 0,
            remainingLabels: ['SQL 적용 필요'],
            isComplete: false
        };
    }

    const total = summary?.total || DEFAULT_TOTAL;
    const completed = summary?.completed || 0;
    const remainingLabels = summary?.remainingLabels?.length
        ? summary.remainingLabels
        : completed >= total
            ? []
            : DEFAULT_REMAINING_LABELS;

    return {
        completed,
        total,
        progressPercent: summary?.progressPercent || 0,
        remainingLabels,
        isComplete: total > 0 && completed >= total
    };
}

export function LeadContractChecklistWorkspace({
    isLoading,
    isSummaryLoading,
    schemaReady,
    errorMessage,
    visibleLeadCount,
    leads,
    summaries,
    safeCurrentPage,
    totalPages,
    onOpenChecklistAction,
    onPreviousPageAction,
    onNextPageAction
}: LeadContractChecklistWorkspaceProps) {
    if (isLoading) {
        return <div className={styles.emptyState}>계약 전 체크리스트를 불러오는 중입니다.</div>;
    }

    if (leads.length === 0) {
        return <div className={styles.emptyState}>현재 조건에 맞는 계약완료 점주가 없습니다.</div>;
    }

    return (
        <div className={styles.workspace}>
            {errorMessage && <div className={styles.notice}>{errorMessage}</div>}
            <div className={styles.list} aria-busy={isSummaryLoading}>
                {leads.map(lead => {
                    const checklist = getChecklistDisplayState(summaries[lead.id], schemaReady);
                    const visibleRemainingLabels = checklist.remainingLabels.slice(0, 4);
                    const hiddenRemainingCount = Math.max(0, checklist.remainingLabels.length - visibleRemainingLabels.length);

                    return (
                        <article key={lead.id} className={styles.card}>
                            <div className={styles.person}>
                                <button type="button" onClick={() => onOpenChecklistAction(lead.id)}>
                                    {lead.name}
                                </button>
                                <span>{lead.mobile || '-'}</span>
                            </div>

                            <div className={styles.checkSummary}>
                                <div className={styles.checkHeader}>
                                    <span><ListChecks size={16} /> 계약 전 체크</span>
                                    <strong>{checklist.completed}/{checklist.total}</strong>
                                </div>
                                <div className={styles.progress} aria-label={`계약 전 체크 진행률 ${checklist.progressPercent}%`}>
                                    <span style={{ width: `${checklist.progressPercent}%` }} />
                                </div>
                                <div className={styles.remainingList}>
                                    {checklist.isComplete ? (
                                        <span className={styles.completeChip}>모든 항목 완료</span>
                                    ) : visibleRemainingLabels.map(label => (
                                        <span key={label}>{label}</span>
                                    ))}
                                    {hiddenRemainingCount > 0 && <span>외 {hiddenRemainingCount}개</span>}
                                </div>
                            </div>

                            <button type="button" className={styles.openButton} onClick={() => onOpenChecklistAction(lead.id)}>
                                체크리스트 열기
                            </button>
                        </article>
                    );
                })}
            </div>

            <div className={styles.pagination}>
                <button type="button" onClick={onPreviousPageAction} disabled={safeCurrentPage <= 1}>
                    <ChevronLeft size={16} /> 이전
                </button>
                <div>
                    <span>총 {visibleLeadCount.toLocaleString()}건</span>
                    <strong>{safeCurrentPage} / {totalPages}</strong>
                </div>
                <button type="button" onClick={onNextPageAction} disabled={safeCurrentPage >= totalPages}>
                    다음 <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
