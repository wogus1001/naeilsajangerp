"use client";

import React from 'react';
import { Search } from 'lucide-react';
import type { AlimtalkCompanyUsageSummary } from '@/lib/alimtalk-operations';
import type { SaveAlimtalkPayload } from './AlimtalkOperationsPanel';
import {
    filterAndSortAlimtalkUsage,
    pageAlimtalkUsage,
    parseAlimtalkSortDirection,
    parseAlimtalkUsageFilter,
    parseAlimtalkUsageSortKey,
    type AlimtalkSortDirection,
    type AlimtalkUsageFilter,
    type AlimtalkUsageSortKey
} from './alimtalkOperationsTableState';
import styles from './page.module.css';

type Props = {
    readonly usage: readonly AlimtalkCompanyUsageSummary[];
    readonly onSave: (payload: SaveAlimtalkPayload) => Promise<void>;
};

type CompanyDraft = {
    readonly enabled: boolean;
    readonly monthlyLimit: string;
    readonly warningThreshold: string;
};

function initialDraft(item: AlimtalkCompanyUsageSummary): CompanyDraft {
    return {
        enabled: item.enabled,
        monthlyLimit: item.monthlyLimit?.toString() ?? '',
        warningThreshold: item.warningThreshold?.toString() ?? ''
    };
}

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function statusBadge(item: AlimtalkCompanyUsageSummary): string {
    if (!item.enabled) return '중지';
    if (item.monthlyLimit !== null && item.total > item.monthlyLimit) return '한도 초과';
    if (item.warningThreshold !== null && item.total >= item.warningThreshold) return '주의';
    return '사용';
}

export function AlimtalkCompanyUsageSection({ usage, onSave }: Props) {
    const [query, setQuery] = React.useState('');
    const [filter, setFilter] = React.useState<AlimtalkUsageFilter>('all');
    const [sortKey, setSortKey] = React.useState<AlimtalkUsageSortKey>('total');
    const [sortDirection, setSortDirection] = React.useState<AlimtalkSortDirection>('desc');
    const [page, setPage] = React.useState(1);
    const [savingCompanyId, setSavingCompanyId] = React.useState('');
    const [drafts, setDrafts] = React.useState<Record<string, CompanyDraft>>({});

    React.useEffect(() => setPage(1), [filter, query, sortDirection, sortKey]);
    React.useEffect(() => {
        setDrafts(Object.fromEntries(usage.map(item => [item.companyId, initialDraft(item)])));
    }, [usage]);

    const filtered = React.useMemo(() => filterAndSortAlimtalkUsage(usage, {
        query,
        filter,
        sortKey,
        sortDirection
    }), [filter, query, sortDirection, sortKey, usage]);
    const visible = pageAlimtalkUsage(filtered, page, 10);
    const pageCount = Math.max(1, Math.ceil(filtered.length / 10));

    function updateDraft(companyId: string, patch: Partial<CompanyDraft>) {
        setDrafts(current => ({
            ...current,
            [companyId]: { ...(current[companyId] || { enabled: true, monthlyLimit: '', warningThreshold: '' }), ...patch }
        }));
    }

    function parseDraftNumber(value: string): number | null {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) return null;
        return Math.floor(parsed);
    }

    async function saveCompany(item: AlimtalkCompanyUsageSummary) {
        const draft = drafts[item.companyId] || initialDraft(item);
        setSavingCompanyId(item.companyId);
        try {
            await onSave({
                entity: 'company',
                key: item.companyId,
                enabled: draft.enabled,
                monthlyLimit: parseDraftNumber(draft.monthlyLimit),
                warningThreshold: parseDraftNumber(draft.warningThreshold)
            });
        } finally {
            setSavingCompanyId('');
        }
    }

    return (
        <>
            <div className={styles.toolbar}>
                <label className={styles.searchBox}>
                    <Search size={16} />
                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="회사명 또는 회사 ID 검색" />
                </label>
                <select className={styles.control} value={filter} onChange={event => setFilter(parseAlimtalkUsageFilter(event.currentTarget.value))}>
                    <option value="all">전체 회사</option>
                    <option value="enabled">발송 사용</option>
                    <option value="disabled">발송 중지</option>
                    <option value="used">발송 있음</option>
                    <option value="failed">실패 있음</option>
                    <option value="limit_warning">한도 주의</option>
                </select>
                <select className={styles.control} value={sortKey} onChange={event => setSortKey(parseAlimtalkUsageSortKey(event.currentTarget.value))}>
                    <option value="total">발송 많은순</option>
                    <option value="companyName">회사명</option>
                    <option value="success">성공</option>
                    <option value="failed">실패</option>
                    <option value="recentSentAt">최근 발송</option>
                </select>
                <select className={styles.control} value={sortDirection} onChange={event => setSortDirection(parseAlimtalkSortDirection(event.currentTarget.value))}>
                    <option value="desc">내림차순</option>
                    <option value="asc">오름차순</option>
                </select>
            </div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>회사</th>
                            <th>상태</th>
                            <th>월 발송</th>
                            <th>성공</th>
                            <th>실패/차단</th>
                            <th>월 한도</th>
                            <th>주의 기준</th>
                            <th>최근 발송</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(item => {
                            const draft = drafts[item.companyId] || initialDraft(item);
                            return (
                                <tr key={item.companyId}>
                                    <td><div className={styles.strongText}>{item.companyName}</div><div className={styles.mutedText}>{item.companyId}</div></td>
                                    <td>
                                        <label className={styles.actions}>
                                            <input type="checkbox" checked={draft.enabled} onChange={event => updateDraft(item.companyId, { enabled: event.currentTarget.checked })} />
                                            <span className={`${styles.badge} ${draft.enabled ? styles.badgeGreen : styles.badgeRed}`}>{statusBadge({ ...item, enabled: draft.enabled })}</span>
                                        </label>
                                    </td>
                                    <td className={styles.strongText}>{item.total.toLocaleString('ko-KR')}</td>
                                    <td>{item.success.toLocaleString('ko-KR')}</td>
                                    <td>{(item.failed + item.blocked).toLocaleString('ko-KR')}</td>
                                    <td><input className={styles.field} inputMode="numeric" value={draft.monthlyLimit} onChange={event => updateDraft(item.companyId, { monthlyLimit: event.currentTarget.value })} placeholder="무제한" /></td>
                                    <td><input className={styles.field} inputMode="numeric" value={draft.warningThreshold} onChange={event => updateDraft(item.companyId, { warningThreshold: event.currentTarget.value })} placeholder="기준 없음" /></td>
                                    <td>{formatDate(item.recentSentAt)}</td>
                                    <td>
                                        <button type="button" className={styles.secondaryButton} disabled={savingCompanyId === item.companyId} onClick={() => void saveCompany(item)}>
                                            저장
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {visible.length === 0 && <tr><td className={styles.empty} colSpan={9}>회사별 발송량이 없습니다.</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className={styles.actions}>
                <button type="button" className={styles.secondaryButton} disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>이전</button>
                <span className={styles.mutedText}>{page} / {pageCount}</span>
                <button type="button" className={styles.secondaryButton} disabled={page === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>다음</button>
            </div>
        </>
    );
}
