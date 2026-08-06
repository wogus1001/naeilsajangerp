"use client";

import React from 'react';
import { CircleX, Trash2 } from 'lucide-react';
import { getRequesterId, getStoredUser, isAdminStoredUser } from '@/utils/userUtils';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { CompanyContractTemplatesPanel } from './CompanyContractTemplatesPanel';
import { ElectronicContractsTable } from './ElectronicContractsTable';
import {
    cancelElectronicContract,
    deleteElectronicContract
} from './electronicContractDocumentActionsClient';
import type {
    ContractScope,
    ContractsResponse,
    ElectronicContract,
    PageMode
} from './electronicContractDocumentsModel';
import styles from './electronicContracts.module.css';

type DocumentNotice = {
    readonly kind: 'success';
    readonly text: string;
};

function readPageModeFromUrl(): PageMode {
    if (typeof window === 'undefined') return 'documents';
    return new URLSearchParams(window.location.search).get('mode') === 'templates'
        ? 'templates'
        : 'documents';
}

export default function ElectronicContractsPage() {
    const [mode, setMode] = React.useState<PageMode>('documents');
    const [scope, setScope] = React.useState<ContractScope>('mine');
    const [contracts, setContracts] = React.useState<readonly ElectronicContract[]>([]);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [requesterId, setRequesterId] = React.useState('');
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [notice, setNotice] = React.useState<DocumentNotice | null>(null);
    const [pendingDelete, setPendingDelete] = React.useState<ElectronicContract | null>(null);
    const [pendingCancel, setPendingCancel] = React.useState<ElectronicContract | null>(null);
    const [deletingContractId, setDeletingContractId] = React.useState('');
    const [cancelingContractId, setCancelingContractId] = React.useState('');

    React.useEffect(() => {
        const user = getStoredUser();
        setRequesterId(getRequesterId(user));
        setIsAdmin(isAdminStoredUser(user));
        setMode(readPageModeFromUrl());
    }, []);

    React.useEffect(() => {
        if (!requesterId) return;
        if (mode !== 'documents') {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        async function loadContracts() {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`/api/electronic-contracts?scope=${scope}`, {
                    cache: 'no-store',
                    headers: await getApiAuthHeaders(),
                    signal: controller.signal
                });
                const payload: ContractsResponse = await response.json();
                if (!response.ok) throw new Error('전자계약 목록을 불러오지 못했습니다.');
                setContracts(payload.data?.contracts || []);
            } catch (caught) {
                if (caught instanceof DOMException && caught.name === 'AbortError') return;
                setError(caught instanceof Error ? caught.message : '전자계약 목록을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        }
        loadContracts();
        return () => controller.abort();
    }, [requesterId, scope, mode]);

    React.useEffect(() => {
        if (!notice) return undefined;
        const timeoutId = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    async function confirmDelete() {
        if (!pendingDelete) return;
        setDeletingContractId(pendingDelete.id);
        setError('');
        try {
            await deleteElectronicContract(pendingDelete.id);
            setContracts(current => current.filter(contract => contract.id !== pendingDelete.id));
            setNotice({ kind: 'success', text: '삭제했습니다.' });
            setPendingDelete(null);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '문서를 삭제하지 못했습니다.');
        } finally {
            setDeletingContractId('');
        }
    }

    async function confirmCancel() {
        if (!pendingCancel) return;
        setCancelingContractId(pendingCancel.id);
        setError('');
        try {
            const updatedContract = await cancelElectronicContract(pendingCancel.id);
            setContracts(current => current.map(contract => (
                contract.id === updatedContract.id ? updatedContract : contract
            )));
            setNotice({ kind: 'success', text: '서명 요청을 취소했습니다.' });
            setPendingCancel(null);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '서명 요청을 취소하지 못했습니다.');
        } finally {
            setCancelingContractId('');
        }
    }

    function selectMode(nextMode: PageMode) {
        setMode(nextMode);
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (nextMode === 'templates') {
            url.searchParams.set('mode', 'templates');
        } else {
            url.searchParams.delete('mode');
            url.searchParams.delete('laborDocument');
        }
        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`} aria-label="전자계약 화면 제목">
                <div>
                    <h1 className={styles.title}>전자계약</h1>
                </div>
            </section>

            <section className={styles.panel} aria-label="전자계약 업무 전환">
                <div className={styles.statusLine}>
                    <div className={styles.tabs}>
                        <button className={mode === 'documents' ? styles.tabActive : styles.tab} onClick={() => selectMode('documents')}>문서함</button>
                        <button className={mode === 'templates' ? styles.tabActive : styles.tab} onClick={() => selectMode('templates')}>템플릿 관리</button>
                    </div>
                    {mode === 'documents' && <span>{loading ? '불러오는 중' : `${contracts.length.toLocaleString('ko-KR')}건`}</span>}
                </div>
            </section>

            {mode === 'templates' ? (
                <CompanyContractTemplatesPanel />
            ) : (
                <>
                    <section className={styles.panel} aria-label="전자계약 문서 범위">
                        <div className={styles.statusLine}>
                    <div className={styles.tabs}>
                        <button className={scope === 'mine' ? styles.tabActive : styles.tab} onClick={() => setScope('mine')}>내가 발송</button>
                        <button className={scope === 'company' ? styles.tabActive : styles.tab} onClick={() => setScope('company')}>회사 문서</button>
                        {isAdmin && <button className={scope === 'all' ? styles.tabActive : styles.tab} onClick={() => setScope('all')}>전체 문서</button>}
                    </div>
                    <span>{loading ? '불러오는 중' : `${contracts.length.toLocaleString('ko-KR')}건`}</span>
                        </div>
                    </section>

                    {error && <div className={styles.error}>{error}</div>}
                    {notice && (
                        <div className={styles.toastViewport} role="status" aria-live="polite">
                            <div className={styles.toast}>{notice.text}</div>
                        </div>
                    )}

                    <section className={styles.panel} aria-label="전자계약 문서 목록">
                        <ElectronicContractsTable
                            contracts={contracts}
                            loading={loading}
                            requesterId={requesterId}
                            isAdmin={isAdmin}
                            deletingContractId={deletingContractId}
                            cancelingContractId={cancelingContractId}
                            onDeleteRequest={setPendingDelete}
                            onCancelRequest={setPendingCancel}
                        />
                    </section>

                    {pendingCancel && (
                        <div className={styles.dialogBackdrop} role="presentation">
                            <section className={styles.systemDialog} role="dialog" aria-modal="true" aria-labelledby="cancel-contract-title">
                                <div className={styles.systemDialogIcon}><CircleX size={20} /></div>
                                <h3 id="cancel-contract-title">서명 요청 취소</h3>
                                <p>
                                    <strong>{pendingCancel.name}</strong> 문서의 UCanSign 서명 요청을 취소할까요?
                                </p>
                                <p className={styles.dialogHelper}>
                                    취소 후 문서함에는 요청 취소 상태로 남고, 이미 완료된 서명 요청은 취소할 수 없습니다.
                                </p>
                                <div className={styles.systemDialogActions}>
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={() => setPendingCancel(null)}
                                        disabled={Boolean(cancelingContractId)}
                                    >
                                        닫기
                                    </button>
                                    <button
                                        className={styles.dangerButton}
                                        type="button"
                                        onClick={confirmCancel}
                                        disabled={Boolean(cancelingContractId)}
                                    >
                                        서명 요청 취소
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {pendingDelete && (
                        <div className={styles.dialogBackdrop} role="presentation">
                            <section className={styles.systemDialog} role="dialog" aria-modal="true" aria-labelledby="delete-contract-title">
                                <div className={styles.systemDialogIcon}><Trash2 size={20} /></div>
                                <h3 id="delete-contract-title">문서 삭제</h3>
                                <p>
                                    <strong>{pendingDelete.name}</strong> 문서를 문서함에서 삭제할까요?
                                </p>
                                <div className={styles.systemDialogActions}>
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={() => setPendingDelete(null)}
                                        disabled={Boolean(deletingContractId)}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className={styles.dangerButton}
                                        type="button"
                                        onClick={confirmDelete}
                                        disabled={Boolean(deletingContractId)}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
