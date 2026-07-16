"use client";

import React from 'react';
import { ListChecks, Pencil, Trash2 } from 'lucide-react';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getRequesterId, getStoredUser } from '@/utils/userUtils';
import { formatWorkIntakePropertyMeta } from '@/lib/work-intake-display';
import { WorkIntakeEditModal } from './WorkIntakeEditModal';
import { DeletedRecordsTable } from './DeletedRecordsTable';
import { WorkIntakeFilters, type WorkIntakeFilterState } from './WorkIntakeFilters';
import { WorkIntakePagination } from './WorkIntakePagination';
import { deleteWorkIntakeItem } from './requests';
import type { WorkIntakeData, WorkIntakeEditTarget, WorkIntakePageMeta, WorkIntakeVisibleTab } from './types';
import styles from './page.module.css';

const EMPTY_DATA: WorkIntakeData = {
    properties: [],
    leadRegistrationRequests: [],
    matchingRequests: [],
    deletedRecords: [],
    isAdmin: false
};
const EMPTY_FILTERS: WorkIntakeFilterState = { search: '', status: '', from: '', to: '' };
const EMPTY_META: WorkIntakePageMeta = { page: 1, pageSize: 10, total: 0, pageCount: 1 };

type PageByTab = Record<WorkIntakeVisibleTab, number>;

function resetPages(): PageByTab {
    return { properties: 1, leadRegistrations: 1, matchingRequests: 1, deletedRecords: 1 };
}

function cleanText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function formatDate(value: unknown): string {
    const text = cleanText(value);
    if (!text) return '-';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatManwon(value: unknown): string {
    const text = cleanText(value);
    if (!text) return '-';
    const parsed = Number(text.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return text;
    return `${new Intl.NumberFormat('ko-KR').format(parsed)}만원`;
}

function joinParts(parts: readonly unknown[]): string {
    return parts.map(cleanText).filter(Boolean).join(' / ') || '-';
}

export default function FranchiseWorkIntakePage() {
    const [data, setData] = React.useState<WorkIntakeData>(EMPTY_DATA);
    const [requesterId, setRequesterId] = React.useState('');
    const [activeTab, setActiveTab] = React.useState<WorkIntakeVisibleTab>('properties');
    const [filters, setFilters] = React.useState<WorkIntakeFilterState>(EMPTY_FILTERS);
    const [pages, setPages] = React.useState<PageByTab>(resetPages);
    const [isAdminUser, setIsAdminUser] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState<WorkIntakeEditTarget | null>(null);
    const [message, setMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [deletingId, setDeletingId] = React.useState('');
    const requestSequence = React.useRef(0);
    const currentPage = pages[activeTab];
    const meta = data.meta || {
        properties: EMPTY_META,
        leadRegistrationRequests: EMPTY_META,
        matchingRequests: EMPTY_META,
        deletedRecords: EMPTY_META
    };
    const canSeeDeletedRecords = isAdminUser || data.isAdmin === true;

    const loadData = React.useCallback(async () => {
        const sequence = ++requestSequence.current;
        const storedUser = getStoredUser();
        const nextRequesterId = getRequesterId(storedUser);
        if (!nextRequesterId) {
            if (sequence === requestSequence.current) {
                setMessage('로그인 정보를 확인할 수 없습니다.');
                setIsLoading(false);
            }
            return;
        }
        setRequesterId(nextRequesterId);
        setIsAdminUser(storedUser?.role === 'admin');

        setIsLoading(true);
        setMessage('');
        try {
            const params = new URLSearchParams({ requesterId: nextRequesterId });
            params.set('tab', activeTab);
            params.set('page', String(currentPage));
            params.set('pageSize', '10');
            if (filters.search) params.set('search', filters.search);
            if (filters.status) params.set('status', filters.status);
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            const response = await fetch(`/api/franchise-work-intake?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            if (sequence === requestSequence.current) {
                setData(unwrapApiData<WorkIntakeData>(payload));
            }
        } catch (error) {
            if (sequence === requestSequence.current) {
                setMessage(error instanceof Error ? error.message : '진행현황을 불러오지 못했습니다.');
            }
        } finally {
            if (sequence === requestSequence.current) setIsLoading(false);
        }
    }, [activeTab, currentPage, filters]);

    React.useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab === 'matchingRequests' || tab === 'properties' || tab === 'deletedRecords') {
            setActiveTab(tab);
        }
    }, []);

    React.useEffect(() => {
        void loadData();
    }, [loadData]);

    React.useEffect(() => {
        if (activeTab === 'deletedRecords' && !canSeeDeletedRecords) {
            setActiveTab('properties');
        }
    }, [activeTab, canSeeDeletedRecords]);

    const deleteItem = async (target: WorkIntakeEditTarget) => {
        if (!requesterId) {
            setMessage('로그인 정보를 확인할 수 없습니다.');
            return;
        }
        const label = target.kind === 'properties' ? '입점 요청' : '예비 창업자 등록';
        const confirmed = window.confirm(`${label}을 삭제할까요? 삭제 후에는 진행현황 목록에서 사라집니다.`);
        if (!confirmed) return;

        setDeletingId(target.item.id);
        setMessage('');
        try {
            const result = await deleteWorkIntakeItem(target, requesterId);
            await loadData();
            setMessage(result.deleteHistoryStored === false && result.message ? result.message : '삭제했습니다.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
        } finally {
            setDeletingId('');
        }
    };

    const changeTab = (tab: WorkIntakeVisibleTab) => {
        setActiveTab(tab);
        setFilters(EMPTY_FILTERS);
        setPages(resetPages());
        setMessage('');
    };
    const changeFilters = (nextFilters: WorkIntakeFilterState) => {
        setFilters(nextFilters);
        setPages(resetPages());
    };
    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        setPages(resetPages());
    };
    const changePage = (page: number) => {
        setPages(current => ({ ...current, [activeTab]: page }));
    };
    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <div className={styles.titleRow}>
                    <div className={styles.iconBox}><ListChecks size={20} /></div>
                    <div>
                        <h1>진행현황</h1>
                        <p>입점 요청과 예비 창업자 등록 입력 건을 탭으로 확인합니다.</p>
                    </div>
                </div>
            </section>

            <section className={styles.toolbar}>
                <button className={activeTab === 'properties' ? styles.activeTab : styles.tab} onClick={() => changeTab('properties')}>
                    입점 요청 {meta.properties.total}
                </button>
                <button className={activeTab === 'matchingRequests' ? styles.activeTab : styles.tab} onClick={() => changeTab('matchingRequests')}>
                    예비 창업자 등록 {meta.matchingRequests.total}
                </button>
                {canSeeDeletedRecords && (
                    <button className={activeTab === 'deletedRecords' ? styles.activeTab : styles.tab} onClick={() => changeTab('deletedRecords')}>
                        삭제 목록 {meta.deletedRecords.total}
                    </button>
                )}
            </section>

            <WorkIntakeFilters activeTab={activeTab} filters={filters} onChangeAction={changeFilters} onResetAction={resetFilters} />

            {message && <p className={styles.message}>{message}</p>}
            {isLoading && <p className={styles.message}>목록을 불러오는 중입니다.</p>}

            {activeTab === 'properties' && (
                <>
                    <section className={styles.panel}>
                        <table className={styles.table}>
                        <thead><tr><th>물건</th><th>희망 조건</th><th>주소</th><th>임대 조건</th><th>등록일</th><th>관리</th></tr></thead>
                        <tbody>
                            {data.properties.map(item => (
                                <tr key={item.id}>
                                    <td data-label="물건"><strong>{item.name}</strong><small>{formatWorkIntakePropertyMeta(item)}</small></td>
                                    <td data-label="희망 조건"><span>{joinParts([item.desiredBrand, item.desiredCategory])}</span></td>
                                    <td data-label="주소"><span>{item.region || '-'}</span><small>{item.address || '-'}</small></td>
                                    <td data-label="임대 조건"><span>{joinParts([item.deposit ? `보증금 ${formatManwon(item.deposit)}` : '', item.monthlyRent ? `월세 ${formatManwon(item.monthlyRent)}` : ''])}</span></td>
                                    <td data-label="등록일">{formatDate(item.createdAt)}</td>
                                    <td data-label="관리">
                                        <div className={styles.actionGroup}>
                                            <button className={styles.actionButton} onClick={() => setEditTarget({ kind: 'properties', item })}>
                                                <Pencil size={14} /> {item.canEdit ? '확인/수정' : '확인'}
                                            </button>
                                            {item.canDelete ? (
                                                <button className={styles.deleteButton} onClick={() => void deleteItem({ kind: 'properties', item })} disabled={deletingId === item.id}>
                                                    <Trash2 size={14} /> {deletingId === item.id ? '삭제 중' : '삭제'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data.properties.length === 0 && <tr><td colSpan={6} className={styles.emptyCell}>등록된 입점 요청이 없습니다.</td></tr>}
                        </tbody>
                        </table>
                    </section>
                    <WorkIntakePagination meta={meta.properties} onPageChangeAction={changePage} />
                </>
            )}

            {activeTab === 'matchingRequests' && (
                <>
                    <section className={styles.panel}>
                        <table className={styles.table}>
                        <thead><tr><th>신청자</th><th>희망 조건</th><th>예산/물건</th><th>매칭 조건</th><th>담당/등록일</th><th>관리</th></tr></thead>
                        <tbody>
                            {data.matchingRequests.map(item => (
                                <tr key={item.id}>
                                    <td data-label="신청자"><strong>{item.name}</strong><small>{joinParts([item.mobile, item.email])}</small></td>
                                    <td data-label="희망 조건"><span>{joinParts([item.desiredCategory, item.interestedBrand])}</span><small>{item.desiredRegion || '-'}</small></td>
                                    <td data-label="예산/물건"><span>총예산 {formatManwon(item.totalBudget)}</span><small>{item.ownedPropertyStatus || '-'}</small></td>
                                    <td data-label="매칭 조건"><span>{joinParts([item.matchPriority, item.urgency])}</span><small>{item.memo || '-'}</small></td>
                                    <td data-label="담당/등록일"><span>{item.managerName || '-'}</span><small>{formatDate(item.createdAt)}</small></td>
                                    <td data-label="관리">
                                        <div className={styles.actionGroup}>
                                            <button className={styles.actionButton} onClick={() => setEditTarget({ kind: 'matchingRequests', item })}>
                                                <Pencil size={14} /> {item.canEdit ? '확인/수정' : '확인'}
                                            </button>
                                            {item.canDelete ? (
                                                <button className={styles.deleteButton} onClick={() => void deleteItem({ kind: 'matchingRequests', item })} disabled={deletingId === item.id}>
                                                    <Trash2 size={14} /> {deletingId === item.id ? '삭제 중' : '삭제'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data.matchingRequests.length === 0 && <tr><td colSpan={6} className={styles.emptyCell}>등록된 예비 창업자 정보가 없습니다.</td></tr>}
                        </tbody>
                        </table>
                    </section>
                    <WorkIntakePagination meta={meta.matchingRequests} onPageChangeAction={changePage} />
                </>
            )}

            {activeTab === 'deletedRecords' && canSeeDeletedRecords && (
                <>
                    <DeletedRecordsTable records={data.deletedRecords || []} />
                    <WorkIntakePagination meta={meta.deletedRecords} onPageChangeAction={changePage} />
                </>
            )}

            {editTarget && requesterId && (
                <WorkIntakeEditModal
                    target={editTarget}
                    requesterId={requesterId}
                    isReadOnly={!editTarget.item.canEdit}
                    onCloseAction={() => setEditTarget(null)}
                    onSavedAction={() => {
                        setEditTarget(null);
                        void loadData();
                        setMessage('수정 내용을 저장했습니다.');
                    }}
                    onErrorAction={setMessage}
                />
            )}
        </main>
    );
}
