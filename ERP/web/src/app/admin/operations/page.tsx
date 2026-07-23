'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Search, ShieldCheck } from 'lucide-react';

import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
    getPlatformOperationKindLabel,
    type PlatformOperationItem,
    type PlatformOperationKind,
    type PlatformOperationsSummary
} from '@/lib/platform-operations';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';

import { OperationStatusBadge, OperationsSummaryCard } from './OperationsComponents';
import styles from './page.module.css';

type AuditEvent = {
    readonly id: string;
    readonly request_id: string;
    readonly actor_profile_id: string | null;
    readonly resource_type: string;
    readonly resource_id: string | null;
    readonly action: string;
    readonly outcome: string;
    readonly occurred_at: string;
};

type OperationsResponse = {
    readonly schemaReady: boolean;
    readonly summary: PlatformOperationsSummary | null;
    readonly operations: readonly PlatformOperationItem[];
    readonly auditEvents: readonly AuditEvent[];
};

type ViewTab = 'overview' | 'retry' | 'audit';

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));
}

function getAuditActionLabel(action: string): string {
    if (action === 'retry') return '재처리 요청';
    return action || '상태 변경';
}

export default function PlatformOperationsPage() {
    const [data, setData] = useState<OperationsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tab, setTab] = useState<ViewTab>('overview');
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState<'all' | PlatformOperationKind>('all');
    const [retryTarget, setRetryTarget] = useState<PlatformOperationItem | null>(null);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const loadOperations = useCallback(async (refresh = false) => {
        refresh ? setIsRefreshing(true) : setIsLoading(true);
        try {
            const response = await fetch('/api/admin/platform-operations', {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json() as { data?: OperationsResponse; message?: string };
            if (!response.ok || !payload.data) throw new Error(payload.message || '운영 현황을 불러오지 못했습니다.');
            setData(payload.data);
        } catch (error) {
            setAlert({ message: error instanceof Error ? error.message : '운영 현황을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadOperations();
    }, [loadOperations]);

    const visibleOperations = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return (data?.operations || []).filter(item => {
            if (tab === 'retry' && !item.canRetry) return false;
            if (kind !== 'all' && item.kind !== kind) return false;
            if (!normalizedQuery) return true;
            return `${item.title} ${item.detail} ${item.companyId || ''}`.toLowerCase().includes(normalizedQuery);
        });
    }, [data?.operations, kind, query, tab]);

    const retryOperation = async () => {
        const target = retryTarget;
        if (!target) return;
        try {
            const response = await fetch('/api/admin/platform-operations', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ kind: target.kind, jobId: target.id })
            });
            const payload = await response.json() as { message?: string };
            if (!response.ok) throw new Error(payload.message || '재처리 요청에 실패했습니다.');
            setAlert({ message: '작업을 재처리 대기로 전환했습니다.', type: 'success' });
            await loadOperations(true);
        } catch (error) {
            setAlert({ message: error instanceof Error ? error.message : '재처리 요청에 실패했습니다.', type: 'error' });
        } finally {
            setRetryTarget(null);
        }
    };

    const summary = data?.summary;

    const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const tabs: readonly ViewTab[] = ['overview', 'retry', 'audit'];
        const currentIndex = tabs.indexOf(tab);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
        setTab(nextTab);
        event.currentTarget.parentElement
            ?.querySelector<HTMLButtonElement>(`[data-tab="${nextTab}"]`)
            ?.focus();
    };

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>운영센터</h1>
                    <p>실패하거나 지연된 시스템 작업을 확인하고 안전하게 다시 처리합니다.</p>
                </div>
                <button className={styles.refreshButton} disabled={isRefreshing} onClick={() => void loadOperations(true)} type="button">
                    <RefreshCw aria-hidden="true" className={isRefreshing ? styles.spinning : ''} size={17} />
                    새로고침
                </button>
            </header>

            {!isLoading && data && !data.schemaReady && (
                <section className={styles.schemaNotice}>
                    <AlertTriangle aria-hidden="true" size={20} />
                    <div>
                        <strong>운영센터 준비가 필요합니다.</strong>
                        <p>`supabase_platform_operations_phase4_migration.sql`을 적용한 뒤 다시 확인해주세요.</p>
                    </div>
                </section>
            )}

            <section aria-label="운영 요약" className={styles.kpis}>
                <OperationsSummaryCard icon={<AlertTriangle aria-hidden="true" size={22} />} label="확인 필요" value={summary?.needsAttention ?? 0} />
                <OperationsSummaryCard icon={<ShieldCheck aria-hidden="true" size={22} />} label="실패" value={summary?.failed ?? 0} />
                <OperationsSummaryCard icon={<Clock3 aria-hidden="true" size={22} />} label="처리 대기" value={summary?.pending ?? 0} />
                <OperationsSummaryCard icon={<CheckCircle2 aria-hidden="true" size={22} />} label="발송 차단" value={summary?.blocked ?? 0} />
            </section>

            <nav aria-label="운영센터 보기" className={styles.tabs} role="tablist">
                <button aria-controls="operations-panel" aria-selected={tab === 'overview'} className={tab === 'overview' ? styles.activeTab : ''} data-tab="overview" id="operations-tab" onClick={() => setTab('overview')} onKeyDown={handleTabKeyDown} role="tab" tabIndex={tab === 'overview' ? 0 : -1} type="button">운영 현황</button>
                <button aria-controls="operations-panel" aria-selected={tab === 'retry'} className={tab === 'retry' ? styles.activeTab : ''} data-tab="retry" id="retry-tab" onClick={() => setTab('retry')} onKeyDown={handleTabKeyDown} role="tab" tabIndex={tab === 'retry' ? 0 : -1} type="button">재처리 필요</button>
                <button aria-controls="audit-panel" aria-selected={tab === 'audit'} className={tab === 'audit' ? styles.activeTab : ''} data-tab="audit" id="audit-tab" onClick={() => setTab('audit')} onKeyDown={handleTabKeyDown} role="tab" tabIndex={tab === 'audit' ? 0 : -1} type="button">감사 이력</button>
            </nav>

            {tab !== 'audit' ? (
                <section aria-labelledby={tab === 'retry' ? 'retry-tab' : 'operations-tab'} className={styles.contentSection} id="operations-panel" role="tabpanel">
                    <div className={styles.filters}>
                        <label className={styles.searchField}>
                            <Search aria-hidden="true" size={18} />
                            <input aria-label="작업 검색" onChange={event => setQuery(event.target.value)} placeholder="작업명, 오류 내용, 회사 ID 검색" value={query} />
                        </label>
                        <select aria-label="작업 종류" onChange={event => setKind(event.target.value as 'all' | PlatformOperationKind)} value={kind}>
                            <option value="all">전체 작업</option>
                            <option value="schedule_sync">일정 동기화</option>
                            <option value="file_cleanup">파일 정리</option>
                            <option value="alimtalk">알림톡 발송</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <p className={styles.empty}>운영 현황을 불러오는 중입니다.</p>
                    ) : visibleOperations.length === 0 ? (
                        <p className={styles.empty}>조건에 맞는 작업이 없습니다.</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table>
                                <thead><tr><th>작업</th><th>상태</th><th>시도</th><th>발생 시각</th><th>관리</th></tr></thead>
                                <tbody>
                                    {visibleOperations.map(item => (
                                        <tr key={`${item.kind}-${item.id}`}>
                                            <td data-label="작업"><strong>{item.title}</strong><span>{getPlatformOperationKindLabel(item.kind)} · {item.detail}</span></td>
                                            <td data-label="상태"><OperationStatusBadge status={item.status} /></td>
                                            <td data-label="시도">{item.attemptCount}회</td>
                                            <td data-label="발생 시각">{formatDateTime(item.occurredAt)}</td>
                                            <td data-label="관리">{item.canRetry ? <button className={styles.retryButton} onClick={() => setRetryTarget(item)} type="button"><RefreshCw aria-hidden="true" size={15} /> 재처리</button> : <span className={styles.readOnly}>확인 전용</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            ) : (
                <section aria-labelledby="audit-tab" className={styles.contentSection} id="audit-panel" role="tabpanel">
                    {(data?.auditEvents || []).length === 0 ? <p className={styles.empty}>기록된 관리자 작업이 없습니다.</p> : (
                        <div className={styles.tableWrap}>
                            <table>
                                <thead><tr><th>작업</th><th>대상</th><th>결과</th><th>요청 ID</th><th>처리 시각</th></tr></thead>
                                <tbody>{(data?.auditEvents || []).map(event => (
                                    <tr key={event.id}>
                                        <td data-label="작업"><strong>{getAuditActionLabel(event.action)}</strong></td>
                                        <td data-label="대상"><span>{event.resource_type}</span><small>{event.resource_id || '-'}</small></td>
                                        <td data-label="결과"><OperationStatusBadge status={event.outcome === 'success' ? 'completed' : 'failed'} /></td>
                                        <td data-label="요청 ID"><code>{event.request_id.slice(0, 8)}</code></td>
                                        <td data-label="처리 시각">{formatDateTime(event.occurred_at)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            <ConfirmModal
                confirmText="재처리"
                isOpen={Boolean(retryTarget)}
                message="선택한 작업을 처리 대기 상태로 되돌릴까요?"
                onClose={() => setRetryTarget(null)}
                onConfirm={() => void retryOperation()}
                title="작업 재처리"
            />
            <AlertModal
                isOpen={Boolean(alert)}
                message={alert?.message || ''}
                onClose={() => setAlert(null)}
                type={alert?.type || 'info'}
            />
        </main>
    );
}
