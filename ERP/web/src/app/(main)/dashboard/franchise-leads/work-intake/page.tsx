"use client";

import React from 'react';
import { ListChecks, Pencil, Trash2 } from 'lucide-react';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getRequesterId, getStoredUser } from '@/utils/userUtils';
import { formatWorkIntakePropertyMeta } from '@/lib/work-intake-display';
import { WorkIntakeEditModal } from './WorkIntakeEditModal';
import { deleteWorkIntakeItem } from './requests';
import type { WorkIntakeData, WorkIntakeEditTarget, WorkIntakeTab } from './types';
import styles from './page.module.css';

const EMPTY_DATA: WorkIntakeData = {
    properties: [],
    leadRegistrationRequests: [],
    matchingRequests: []
};

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
    const [activeTab, setActiveTab] = React.useState<WorkIntakeTab>('properties');
    const [editTarget, setEditTarget] = React.useState<WorkIntakeEditTarget | null>(null);
    const [message, setMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [deletingId, setDeletingId] = React.useState('');

    const loadData = React.useCallback(async () => {
        const nextRequesterId = getRequesterId(getStoredUser());
        if (!nextRequesterId) {
            setMessage('로그인 정보를 확인할 수 없습니다.');
            setIsLoading(false);
            return;
        }
        setRequesterId(nextRequesterId);

        setIsLoading(true);
        setMessage('');
        try {
            const params = new URLSearchParams({ requesterId: nextRequesterId });
            const response = await fetch(`/api/franchise-work-intake?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            setData(unwrapApiData<WorkIntakeData>(payload));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '진행현황을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadData();
    }, [loadData]);

    const deleteItem = async (target: WorkIntakeEditTarget) => {
        if (!requesterId) {
            setMessage('로그인 정보를 확인할 수 없습니다.');
            return;
        }
        const label = target.kind === 'properties' ? '입점 요청' : '예비 창업자 등록';
        if (!window.confirm(`${label}을 삭제할까요? 삭제 후에는 진행현황 목록에서 사라집니다.`)) return;

        setDeletingId(target.item.id);
        setMessage('');
        try {
            await deleteWorkIntakeItem(target, requesterId);
            await loadData();
            setMessage('삭제했습니다.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
        } finally {
            setDeletingId('');
        }
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
                <button className={activeTab === 'properties' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('properties')}>
                    입점 요청 {data.properties.length}
                </button>
                <button className={activeTab === 'matchingRequests' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('matchingRequests')}>
                    예비 창업자 등록 {data.matchingRequests.length}
                </button>
            </section>

            {message && <p className={styles.message}>{message}</p>}

            {activeTab === 'properties' && (
                <section className={styles.panel}>
                    <table className={styles.table}>
                        <thead><tr><th>물건</th><th>희망 조건</th><th>주소</th><th>임대 조건</th><th>등록일</th><th>관리</th></tr></thead>
                        <tbody>
                            {data.properties.map(item => (
                                <tr key={item.id}>
                                    <td><strong>{item.name}</strong><small>{formatWorkIntakePropertyMeta(item)}</small></td>
                                    <td><span>{joinParts([item.desiredBrand, item.desiredCategory])}</span></td>
                                    <td><span>{item.region || '-'}</span><small>{item.address || '-'}</small></td>
                                    <td><span>{joinParts([item.deposit ? `보증금 ${formatManwon(item.deposit)}` : '', item.monthlyRent ? `월세 ${formatManwon(item.monthlyRent)}` : ''])}</span></td>
                                    <td>{formatDate(item.createdAt)}</td>
                                    <td>
                                        <div className={styles.actionGroup}>
                                            {item.canEdit ? (
                                                <button className={styles.actionButton} onClick={() => setEditTarget({ kind: 'properties', item })}>
                                                    <Pencil size={14} /> 확인/수정
                                                </button>
                                            ) : null}
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
            )}

            {activeTab === 'matchingRequests' && (
                <section className={styles.panel}>
                    <table className={styles.table}>
                        <thead><tr><th>신청자</th><th>희망 조건</th><th>예산/물건</th><th>매칭 조건</th><th>담당/등록일</th><th>관리</th></tr></thead>
                        <tbody>
                            {data.matchingRequests.map(item => (
                                <tr key={item.id}>
                                    <td><strong>{item.name}</strong><small>{joinParts([item.mobile, item.email])}</small></td>
                                    <td><span>{joinParts([item.desiredCategory, item.interestedBrand])}</span><small>{item.desiredRegion || '-'}</small></td>
                                    <td><span>총예산 {formatManwon(item.totalBudget)}</span><small>{item.ownedPropertyStatus || '-'}</small></td>
                                    <td><span>{joinParts([item.matchPriority, item.urgency])}</span><small>{item.memo || '-'}</small></td>
                                    <td><span>{item.managerName || '-'}</span><small>{formatDate(item.createdAt)}</small></td>
                                    <td>
                                        <div className={styles.actionGroup}>
                                            {item.canEdit ? (
                                                <button className={styles.actionButton} onClick={() => setEditTarget({ kind: 'matchingRequests', item })}>
                                                    <Pencil size={14} /> 확인/수정
                                                </button>
                                            ) : null}
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
            )}

            {editTarget && requesterId && (
                <WorkIntakeEditModal
                    target={editTarget}
                    requesterId={requesterId}
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
