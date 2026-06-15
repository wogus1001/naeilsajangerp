"use client";

import { ArrowLeft, ArrowRight, UserCheck } from 'lucide-react';
import {
    getFranchiseLeadGradeLabel,
    type FranchiseLeadStatus
} from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ENABLE_LEAD_CUSTOMER_DB_LINKING } from './constants';
import type { FranchiseLead } from './types';
import { getAdjacentStatus, isDueToday, isPastDue } from './utils';

type PipelineColumn = {
    readonly status: FranchiseLeadStatus;
    readonly leads: readonly FranchiseLead[];
};

type LeadPipelineBoardProps = {
    readonly isLoading: boolean;
    readonly columns: readonly PipelineColumn[];
    readonly convertingLeadId: string;
    readonly getManagerName: (managerId?: string) => string;
    readonly onSelectLead: (leadId: string) => void;
    readonly onStatusChange: (lead: FranchiseLead, status: FranchiseLeadStatus) => void;
    readonly onConvertLead: (lead: FranchiseLead) => void;
};

export function LeadPipelineBoard({
    isLoading,
    columns,
    convertingLeadId,
    getManagerName,
    onSelectLead,
    onStatusChange,
    onConvertLead
}: LeadPipelineBoardProps) {
    return (
        <div className={styles.pipelineBoard}>
            {isLoading ? (
                <div className={styles.boardEmpty}>파이프라인을 불러오고 있습니다.</div>
            ) : columns.map(column => (
                <section key={column.status} className={styles.pipelineColumn}>
                    <div className={styles.pipelineColumnHeader}>
                        <strong>{column.status}</strong>
                        <span>{column.leads.length.toLocaleString()}</span>
                    </div>
                    <div className={styles.pipelineCardList}>
                        {column.leads.length === 0 ? (
                            <div className={styles.pipelineEmpty}>해당 상태의 리드가 없습니다.</div>
                        ) : column.leads.map(lead => {
                            const prevStatus = getAdjacentStatus(lead.status, 'prev');
                            const nextStatus = getAdjacentStatus(lead.status, 'next');

                            return (
                                <article key={lead.id} className={styles.pipelineCard}>
                                    <button
                                        type="button"
                                        className={styles.pipelineCardMain}
                                        onClick={() => onSelectLead(lead.id)}
                                    >
                                        <span className={styles.pipelineName}>{lead.name}</span>
                                        <span className={styles.pipelinePhone}>{lead.mobile || '연락처 미입력'}</span>
                                        <span className={styles.pipelineMeta}>{lead.interestedBrand || '브랜드 미지정'} · {lead.desiredRegion || '지역 미지정'}</span>
                                        <span className={styles.pipelineMeta}>담당자 {getManagerName(lead.managerId)}</span>
                                    </button>
                                    <div className={styles.pipelineCardFooter}>
                                        <span className={lead.grade === 'HOT' ? styles.hotBadge : styles.pipelineBadge}>{getFranchiseLeadGradeLabel(lead.grade)}</span>
                                        {ENABLE_LEAD_CUSTOMER_DB_LINKING && lead.convertedCustomerId && <span className={styles.convertedBadge}>전환완료</span>}
                                        {isPastDue(lead.nextContactAt) && <span className={styles.dueBadgeDanger}>지연</span>}
                                        {isDueToday(lead.nextContactAt) && !isPastDue(lead.nextContactAt) && <span className={styles.dueBadge}>오늘</span>}
                                    </div>
                                    <div className={styles.pipelineActions}>
                                        <button
                                            type="button"
                                            className={styles.miniButton}
                                            disabled={!prevStatus}
                                            onClick={() => prevStatus && onStatusChange(lead, prevStatus)}
                                        >
                                            <ArrowLeft size={13} />
                                            이전
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.miniButton}
                                            disabled={!nextStatus}
                                            onClick={() => nextStatus && onStatusChange(lead, nextStatus)}
                                        >
                                            다음
                                            <ArrowRight size={13} />
                                        </button>
                                        {ENABLE_LEAD_CUSTOMER_DB_LINKING && (
                                            <button
                                                type="button"
                                                className={styles.miniButtonStrong}
                                                disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                                                onClick={() => onConvertLead(lead)}
                                            >
                                                <UserCheck size={13} />
                                                고객전환
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
