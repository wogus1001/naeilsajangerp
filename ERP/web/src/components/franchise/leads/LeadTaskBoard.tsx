"use client";

import { CheckCircle2 } from 'lucide-react';
import type { LeadWorkQueueKey } from '@/lib/franchise-lead-workflow';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { FranchiseLead } from './types';
import { formatDateTime, getLeadTaskLabel, getLeadTaskRank } from './utils';

type TaskQueueOption = {
    readonly key: LeadWorkQueueKey;
    readonly label: string;
    readonly count: number;
};

type LeadTaskBoardProps = {
    readonly isLoading: boolean;
    readonly taskQueueOptions: readonly TaskQueueOption[];
    readonly taskQueueFilter: LeadWorkQueueKey;
    readonly taskLeads: readonly FranchiseLead[];
    readonly convertingLeadId: string;
    readonly getManagerName: (managerId?: string) => string;
    readonly onTaskQueueFilterChange: (filter: LeadWorkQueueKey) => void;
    readonly onSelectLead: (leadId: string) => void;
    readonly onCompleteTodayTask: (lead: FranchiseLead) => void;
    readonly onConvertLead: (lead: FranchiseLead) => void;
};

export function LeadTaskBoard({
    isLoading,
    taskQueueOptions,
    taskQueueFilter,
    taskLeads,
    convertingLeadId,
    getManagerName,
    onTaskQueueFilterChange,
    onSelectLead,
    onCompleteTodayTask,
    onConvertLead
}: LeadTaskBoardProps) {
    return (
        <>
            <div className={styles.taskQueueToolbar}>
                {taskQueueOptions.map(option => (
                    <button
                        key={option.key}
                        type="button"
                        className={taskQueueFilter === option.key ? styles.taskQueueFilterActive : styles.taskQueueFilter}
                        onClick={() => onTaskQueueFilterChange(option.key)}
                    >
                        <span>{option.label}</span>
                        <strong>{option.count.toLocaleString()}</strong>
                    </button>
                ))}
            </div>
            <div className={styles.taskBoard}>
                {isLoading ? (
                    <div className={styles.boardEmpty}>업무 큐를 불러오고 있습니다.</div>
                ) : taskLeads.length === 0 ? (
                    <div className={styles.boardEmpty}>
                        <CheckCircle2 size={28} />
                        현재 필터에 처리할 리드가 없습니다.
                    </div>
                ) : taskLeads.map(lead => (
                    <article key={lead.id} className={styles.taskCard}>
                        <div className={styles.taskCardMain}>
                            <span className={getLeadTaskRank(lead) === 0 ? styles.taskLabelDanger : styles.taskLabel}>
                                {getLeadTaskLabel(lead)}
                            </span>
                            <button type="button" onClick={() => onSelectLead(lead.id)}>
                                <strong>{lead.name}</strong>
                                <span>{lead.mobile || '연락처 미입력'} · 담당자 {getManagerName(lead.managerId)}</span>
                            </button>
                        </div>
                        <div className={styles.taskInfoGrid}>
                            <div>
                                <span>다음 액션</span>
                                <strong>{lead.nextAction || '미정'}</strong>
                            </div>
                            <div>
                                <span>상담 결과</span>
                                <strong>{lead.consultationResult || '미상담'}</strong>
                            </div>
                            <div>
                                <span>다음 연락</span>
                                <strong>{formatDateTime(lead.nextContactAt)}</strong>
                            </div>
                            <div>
                                <span>상태</span>
                                <strong>{lead.status}</strong>
                            </div>
                            <div>
                                <span>관심브랜드</span>
                                <strong>{lead.interestedBrand || '-'}</strong>
                            </div>
                            <div>
                                <span>희망지역</span>
                                <strong>{lead.desiredRegion || '-'}</strong>
                            </div>
                        </div>
                        <div className={styles.fitPillRow}>
                            <span>자금 {lead.budgetFit || '미확인'}</span>
                            <span>지역 {lead.regionFit || '미확인'}</span>
                            <span>브랜드 {lead.brandFit || '미확인'}</span>
                        </div>
                        <p>{lead.churnReason || lead.memo || '등록된 메모가 없습니다.'}</p>
                        <div className={styles.taskActions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => onSelectLead(lead.id)}>
                                상세 보기
                            </button>
                            <button type="button" className={styles.secondaryButton} onClick={() => onCompleteTodayTask(lead)}>
                                연락 완료
                            </button>
                            <button
                                type="button"
                                className={styles.primaryButton}
                                disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                                onClick={() => onConvertLead(lead)}
                            >
                                고객 전환
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
