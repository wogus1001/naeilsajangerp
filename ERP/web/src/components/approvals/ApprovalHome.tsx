'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock3, Inbox, MailCheck, RotateCcw } from 'lucide-react';
import { fetchApprovalInbox, type ApprovalInboxResult } from './approvalApi';
import { isApprovalDelayed } from './approvalFormatting';
import { ApprovalDocumentTable } from './ApprovalDocumentTable';
import type { ApprovalDocumentSummary } from './approvalTypes';
import listStyles from './ApprovalLists.module.css';
import styles from './ApprovalHome.module.css';

type HomeState = {
    readonly waiting: ApprovalInboxResult;
    readonly rejected: ApprovalInboxResult;
    readonly reference: ApprovalInboxResult;
    readonly received: ApprovalInboxResult;
};

const EMPTY_RESULT: ApprovalInboxResult = { documents: [], page: 1, pageSize: 5, total: 0, delayedTotal: 0 };
const EMPTY_STATE: HomeState = {
    waiting: EMPTY_RESULT,
    rejected: EMPTY_RESULT,
    reference: EMPTY_RESULT,
    received: EMPTY_RESULT
};

export function ApprovalHome() {
    const [data, setData] = React.useState<HomeState>(EMPTY_STATE);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const [waiting, rejected, reference, received] = await Promise.all([
                    fetchApprovalInbox('waiting', 1, 5),
                    fetchApprovalInbox('rejected', 1, 5),
                    fetchApprovalInbox('reference', 1, 5),
                    fetchApprovalInbox('received', 1, 5)
                ]);
                if (active) setData({ waiting, rejected, reference, received });
            } catch (caught) {
                if (active) setError(caught instanceof Error ? caught.message : '전자결재 현황을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        }
        void load();
        return () => { active = false; };
    }, []);

    const delayed = data.waiting.documents.filter(document => isApprovalDelayed(document.dueAt));
    const attention: readonly ApprovalDocumentSummary[] = [...delayed, ...data.rejected.documents]
        .filter((document, index, documents) => documents.findIndex(item => item.id === document.id) === index)
        .slice(0, 5);
    const metrics = [
        { label: '결재 대기', value: data.waiting.total, helper: '내 처리가 필요한 문서', href: '/approvals/pending', icon: Clock3, tone: 'warning' },
        { label: '반려', value: data.rejected.total, helper: '보완 후 다시 제출할 문서', href: '/approvals/mine', icon: RotateCcw, tone: 'danger' },
        { label: '참조·수신', value: data.reference.total + data.received.total, helper: '확인하거나 수신할 문서', href: '/approvals/department', icon: MailCheck, tone: 'info' },
        { label: '지연', value: data.waiting.delayedTotal, helper: '처리기한이 지난 결재', href: '/approvals/pending', icon: AlertTriangle, tone: 'danger' }
    ] as const;

    return (
        <section className={styles.home}>
            <div className={styles.intro}>
                <div>
                    <h2>오늘 처리할 결재</h2>
                    <p>대기, 반려, 수신과 지연 문서를 우선순위대로 확인하세요.</p>
                </div>
                <span>업무 기준 현재</span>
            </div>
            {error && <div className={listStyles.error} role="alert">{error}</div>}
            <div className={styles.metricGrid}>
                {metrics.map(metric => {
                    const Icon = metric.icon;
                    return (
                        <Link className={styles.metric} data-tone={metric.tone} href={metric.href} key={metric.label}>
                            <span className={styles.metricIcon}><Icon size={18} aria-hidden="true" /></span>
                            <span className={styles.metricLabel}>{metric.label}</span>
                            <strong>{loading ? '-' : metric.value.toLocaleString('ko-KR')}</strong>
                            <small>{metric.helper}</small>
                            <ArrowRight className={styles.metricArrow} size={16} aria-hidden="true" />
                        </Link>
                    );
                })}
            </div>
            <div className={styles.listGrid}>
                <section className={styles.listPanel}>
                    <div className={styles.panelHeader}>
                        <span><Inbox size={18} aria-hidden="true" /><strong>결재 대기</strong></span>
                        <Link href="/approvals/pending">전체 보기 <ArrowRight size={14} aria-hidden="true" /></Link>
                    </div>
                    <ApprovalDocumentTable
                        documents={data.waiting.documents}
                        emptyMessage="현재 결재 대기 문서가 없습니다."
                        loading={loading}
                    />
                </section>
                <section className={styles.listPanel}>
                    <div className={styles.panelHeader}>
                        <span><AlertTriangle size={18} aria-hidden="true" /><strong>확인 필요</strong></span>
                        <Link href="/approvals/mine">내 문서함 <ArrowRight size={14} aria-hidden="true" /></Link>
                    </div>
                    <ApprovalDocumentTable
                        documents={attention}
                        emptyMessage="반려되거나 지연된 문서가 없습니다."
                        loading={loading}
                    />
                </section>
            </div>
        </section>
    );
}
