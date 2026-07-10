"use client";

import React from 'react';
import type { AlimtalkSendLogRow } from '@/lib/alimtalk-operations';
import styles from './page.module.css';

type Props = {
    readonly logs: readonly AlimtalkSendLogRow[];
};

function formatDateTime(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function statusLabel(status: string): string {
    switch (status) {
        case 'success':
            return '성공';
        case 'failed':
            return '실패';
        case 'blocked':
            return '차단';
        case 'fallback_sms':
            return 'SMS 대체';
        default:
            return status || '-';
    }
}

function statusClass(status: string): string {
    if (status === 'success') return styles.badgeGreen;
    if (status === 'failed' || status === 'blocked') return styles.badgeRed;
    return styles.badgeBlue;
}

export function AlimtalkLogsSection({ logs }: Props) {
    const [query, setQuery] = React.useState('');
    const visibleLogs = React.useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('ko-KR');
        if (!normalized) return logs.slice(0, 100);
        return logs.filter(log => [
            log.scenario_key,
            log.template_key,
            log.recipient_name,
            log.recipient_phone,
            log.error_message
        ].join(' ').toLocaleLowerCase('ko-KR').includes(normalized)).slice(0, 100);
    }, [logs, query]);

    return (
        <>
            <div className={styles.toolbar}>
                <label className={styles.searchBox}>
                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="시나리오, 템플릿, 수신자, 오류 검색" />
                </label>
            </div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>발송 시각</th>
                            <th>시나리오</th>
                            <th>템플릿</th>
                            <th>수신자</th>
                            <th>상태</th>
                            <th>오류</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleLogs.map(log => (
                            <tr key={log.id}>
                                <td>{formatDateTime(log.sent_at)}</td>
                                <td>{log.scenario_key}</td>
                                <td>{log.template_key}</td>
                                <td>
                                    <div className={styles.strongText}>{log.recipient_name || '-'}</div>
                                    <div className={styles.mutedText}>{log.recipient_phone || '-'}</div>
                                </td>
                                <td><span className={`${styles.badge} ${statusClass(log.status)}`}>{statusLabel(log.status)}</span></td>
                                <td>{log.error_message || '-'}</td>
                            </tr>
                        ))}
                        {visibleLogs.length === 0 && <tr><td className={styles.empty} colSpan={6}>발송 로그가 없습니다.</td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );
}
