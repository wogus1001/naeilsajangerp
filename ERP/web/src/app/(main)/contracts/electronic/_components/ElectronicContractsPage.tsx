"use client";

import Link from 'next/link';
import React from 'react';
import { FileText, Plus, Send } from 'lucide-react';
import { getRequesterId, getStoredUser, isAdminStoredUser } from '@/utils/userUtils';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import styles from './electronicContracts.module.css';

type ContractScope = 'mine' | 'company' | 'all';

type ElectronicContract = {
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly ucansignDocumentId: string;
    readonly licenseNumber: string;
    readonly sentAt: string;
    readonly createdAt: string;
    readonly businessName: string;
    readonly transferorName: string;
    readonly transfereeName: string;
    readonly companyName: string;
};

type ContractsResponse = {
    readonly data?: {
        readonly contracts?: readonly ElectronicContract[];
    };
};

type PlatformStatus = {
    readonly connected: boolean;
    readonly configured: boolean;
    readonly missingEnv: readonly string[];
    readonly webhookConfigured?: boolean;
    readonly webhookMissingEnv?: readonly string[];
};

function statusLabel(status: string): string {
    if (status === 'draft') return '초안';
    if (status === 'sent') return '발송 완료';
    if (status === 'completed') return '서명 완료';
    if (status === 'send_failed') return '발송 실패';
    if (status === 'sending') return '발송 중';
    if (status === 'canceled') return '취소';
    return status || '대기';
}

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ElectronicContractsPage() {
    const [scope, setScope] = React.useState<ContractScope>('mine');
    const [contracts, setContracts] = React.useState<readonly ElectronicContract[]>([]);
    const [status, setStatus] = React.useState<PlatformStatus | null>(null);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [requesterId, setRequesterId] = React.useState('');
    const [isAdmin, setIsAdmin] = React.useState(false);

    React.useEffect(() => {
        const user = getStoredUser();
        setRequesterId(getRequesterId(user));
        setIsAdmin(isAdminStoredUser(user));
    }, []);

    React.useEffect(() => {
        if (!requesterId) return;
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
    }, [requesterId, scope]);

    React.useEffect(() => {
        if (!requesterId || !isAdmin) return;
        async function loadStatus() {
            try {
                const response = await fetch('/api/admin/ucansign/status', {
                    cache: 'no-store',
                    headers: await getApiAuthHeaders()
                });
                const payload = await response.json();
                setStatus(payload.data || null);
            } catch (caught) {
                if (caught instanceof Error) console.warn(caught.message);
            }
        }
        loadStatus();
    }, [requesterId, isAdmin]);

    const platformStatusLabel = status?.connected && status.configured
        ? '발송 가능'
        : status?.connected
            ? '연결됨 · 설정 필요'
            : '설정 필요';

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>권리금 전자계약</h1>
                    <p className={styles.description}>내일사장 공용 유캔싸인 계정으로 발송하고, 회사와 발송자 기준으로 문서를 분리합니다.</p>
                </div>
                <div className={styles.actions}>
                    <Link className={styles.primaryButton} href="/contracts/electronic/create">
                        <Plus size={16} />
                        권리금계약 작성
                    </Link>
                </div>
            </section>

            {isAdmin && status && (
                <section className={styles.panel}>
                    <div className={styles.statusLine}>
                        <span>
                            공용 유캔싸인 상태: <strong>{platformStatusLabel}</strong>
                            {!status.configured && ` · 누락 env: ${status.missingEnv.join(', ')}`}
                            {status.webhookConfigured === false && ` · webhook env: ${(status.webhookMissingEnv || []).join(', ')}`}
                        </span>
                        <span className={styles.badge}>내일사장 공용 발송</span>
                    </div>
                </section>
            )}

            <section className={styles.panel}>
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

            <section className={styles.panel}>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>문서</th>
                                <th>회사</th>
                                <th>참여자</th>
                                <th>영업허가번호</th>
                                <th>상태</th>
                                <th>발송/저장일</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map(contract => (
                                <tr key={contract.id}>
                                    <td>
                                        <div className={styles.mainText}><FileText size={14} /> {contract.name}</div>
                                        <div className={styles.subText}>{contract.businessName || contract.ucansignDocumentId || contract.id}</div>
                                    </td>
                                    <td>{contract.companyName || '-'}</td>
                                    <td>
                                        <div>{contract.transferorName || '-'}</div>
                                        <div className={styles.subText}>{contract.transfereeName || '-'}</div>
                                    </td>
                                    <td>{contract.licenseNumber || '-'}</td>
                                    <td><span className={styles.badge}><Send size={12} /> {statusLabel(contract.status)}</span></td>
                                    <td>{formatDate(contract.sentAt || contract.createdAt)}</td>
                                    <td>
                                        {contract.status === 'draft' ? (
                                            <Link className={styles.weakButton} href={`/contracts/electronic/create?draftId=${encodeURIComponent(contract.id)}`}>
                                                이어쓰기
                                            </Link>
                                        ) : (
                                            <span className={styles.subText}>-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!loading && contracts.length === 0 && (
                                <tr>
                                    <td className={styles.empty} colSpan={7}>표시할 전자계약 문서가 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
