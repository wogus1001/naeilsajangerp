import React from 'react';
import { ArrowRight } from 'lucide-react';
import { syncAdminLeadRegistration } from './requests';
import type { AdminLeadRegistrationRequest } from './types';
import styles from './page.module.css';

type LeadRegistrationRequestsTableProps = {
    readonly requests: readonly AdminLeadRegistrationRequest[];
    readonly requesterId: string;
    readonly onPromoteAction: (request: AdminLeadRegistrationRequest) => void;
    readonly onSyncedAction: () => void;
    readonly onErrorAction: (message: string) => void;
};

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatBudgetValue(value: number | null): string {
    if (value === null) return '';
    return `${new Intl.NumberFormat('ko-KR').format(Math.round(value / 10000))}만원`;
}

function formatBudget(request: AdminLeadRegistrationRequest): string {
    const min = formatBudgetValue(request.budgetMin);
    const max = formatBudgetValue(request.budgetMax);
    if (min && max) return `${min} ~ ${max}`;
    return min || max || '-';
}

function joinParts(parts: readonly string[]): string {
    return parts.map(part => part.trim()).filter(Boolean).join(' / ') || '-';
}

function isPromoted(request: AdminLeadRegistrationRequest): boolean {
    return request.leadStage === 'candidate' || Boolean(request.promotedAt) || request.adminIntakeStatus === 'promoted';
}

export function LeadRegistrationRequestsTable({
    requests,
    requesterId,
    onPromoteAction,
    onSyncedAction,
    onErrorAction
}: LeadRegistrationRequestsTableProps) {
    const [syncingId, setSyncingId] = React.useState('');

    const handleSync = async (request: AdminLeadRegistrationRequest) => {
        if (!requesterId) return;
        setSyncingId(request.id);
        try {
            await syncAdminLeadRegistration({ leadId: request.id, requesterId });
            onSyncedAction();
        } catch (error) {
            onErrorAction(error instanceof Error ? error.message : '모객 DB 업데이트에 실패했습니다.');
        } finally {
            setSyncingId('');
        }
    };

    return (
        <section className={styles.panel}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>가맹 희망자</th>
                        <th>희망 조건</th>
                        <th>유입/상태</th>
                        <th>담당/등록일</th>
                        <th>모객 DB 반영</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(request => {
                        const promoted = isPromoted(request);
                        const stale = promoted && request.syncStatus === 'stale';
                        return (
                            <tr key={request.id}>
                                <td>
                                    <strong>{request.name}</strong>
                                    <small>{request.mobile || '-'}</small>
                                    <small>{request.memo || '-'}</small>
                                </td>
                                <td>
                                    <span>{joinParts([request.desiredRegion, request.interestedBrand])}</span>
                                    <small>예산 {formatBudget(request)}</small>
                                    <small>{request.nextContactAt ? `다음 연락 ${formatDate(request.nextContactAt)}` : '-'}</small>
                                </td>
                                <td>
                                    <span>{joinParts([request.source, request.status])}</span>
                                    <small>{request.grade || '등급 미지정'}</small>
                                </td>
                                <td>
                                    <span>{request.managerName || '-'}</span>
                                    <small>{formatDate(request.createdAt)}</small>
                                </td>
                                <td>
                                    {stale && <span className={styles.staleBadge}>수정</span>}
                                    {!stale && promoted && <span className={styles.doneBadge}>반영 완료</span>}
                                    {!promoted && <span className={styles.waitBadge}>대기</span>}
                                </td>
                                <td>
                                    {stale ? (
                                        <button className={styles.actionButton} onClick={() => void handleSync(request)} disabled={syncingId === request.id}>
                                            {syncingId === request.id ? '업데이트 중' : '업데이트'}
                                        </button>
                                    ) : (
                                        <button className={styles.actionButton} onClick={() => onPromoteAction(request)} disabled={promoted}>
                                            밀어넣기 <ArrowRight size={14} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {requests.length === 0 && <tr><td colSpan={6} className={styles.emptyCell}>등록된 가맹 희망자 접수가 없습니다.</td></tr>}
                </tbody>
            </table>
        </section>
    );
}
