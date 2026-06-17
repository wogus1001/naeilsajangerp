"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { getRequesterId, getStoredUser } from '@/utils/userUtils';
import { fetchAdminFranchiseIntake, promoteAdminProperty } from './requests';
import { IntakePropertiesTable } from './IntakePropertiesTable';
import { MatchingRequestsTable } from './MatchingRequestsTable';
import type { AdminFranchiseIntakeData, AdminIntakeProperty } from './types';
import styles from './page.module.css';

type IntakeTab = 'properties' | 'matchingRequests';

type PromotionModalState = {
    readonly property: AdminIntakeProperty;
    readonly targetCompanyId: string;
    readonly managerId: string;
};

const EMPTY_DATA: AdminFranchiseIntakeData = {
    companies: [],
    selectedCompanyId: '',
    managers: [],
    properties: [],
    leadRegistrationRequests: [],
    matchingRequests: []
};

export default function AdminFranchiseIntakePage() {
    const router = useRouter();
    const [requesterId, setRequesterId] = React.useState('');
    const [data, setData] = React.useState<AdminFranchiseIntakeData>(EMPTY_DATA);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState('');
    const [activeTab, setActiveTab] = React.useState<IntakeTab>('properties');
    const [modal, setModal] = React.useState<PromotionModalState | null>(null);
    const [message, setMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isPromoting, setIsPromoting] = React.useState(false);

    const loadData = React.useCallback(async (nextCompanyId?: string) => {
        if (!requesterId) return;
        setIsLoading(true);
        setMessage('');
        try {
            const nextData = await fetchAdminFranchiseIntake(requesterId, nextCompanyId || selectedCompanyId);
            setData(nextData);
            setSelectedCompanyId(nextData.selectedCompanyId);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '관리 데이터를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [requesterId, selectedCompanyId]);

    React.useEffect(() => {
        const user = getStoredUser();
        if (user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        setRequesterId(getRequesterId(user));
    }, [router]);

    React.useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextCompanyId = event.target.value;
        setSelectedCompanyId(nextCompanyId);
        void loadData(nextCompanyId);
    };

    const openPromotionModal = (property: AdminIntakeProperty) => {
        setModal({
            property,
            targetCompanyId: property.companyId || selectedCompanyId,
            managerId: property.managerId
        });
    };

    const targetManagers = React.useMemo(() => {
        if (!modal) return [];
        return data.managers.filter(manager => manager.companyId === modal.targetCompanyId);
    }, [data.managers, modal]);

    const confirmPromotion = async () => {
        if (!modal || !requesterId) return;
        setIsPromoting(true);
        setMessage('');
        try {
            await promoteAdminProperty({
                propertyId: modal.property.id,
                targetCompanyId: modal.targetCompanyId,
                managerId: modal.managerId || undefined,
                requesterId
            });
            setModal(null);
            setMessage('출점 후보지로 반영했습니다.');
            await loadData(selectedCompanyId);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '출점 후보지 반영에 실패했습니다.');
        } finally {
            setIsPromoting(false);
        }
    };

    const handleSynced = () => {
        void loadData(selectedCompanyId).then(() => setMessage('수정 내용을 업데이트했습니다.'));
    };

    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <div>
                    <h1>프랜차이즈 인입 관리</h1>
                    <p>입점 요청 DB와 예비 창업자 등록 건을 회사별로 확인합니다.</p>
                </div>
            </section>

            <section className={styles.toolbar}>
                <label>
                    <span>회사</span>
                    <select value={selectedCompanyId} onChange={handleCompanyChange} disabled={isLoading}>
                        <option value="">전체 회사</option>
                        {data.companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </label>
                <div className={styles.tabs}>
                    <button className={activeTab === 'properties' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('properties')}>
                        입점 요청 리스트 {data.properties.length}
                    </button>
                    <button className={activeTab === 'matchingRequests' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('matchingRequests')}>
                        예비 창업자 등록 {data.matchingRequests.length}
                    </button>
                </div>
            </section>

            {message && <p className={styles.message}>{message}</p>}

            {activeTab === 'properties' && (
                <IntakePropertiesTable
                    properties={data.properties}
                    requesterId={requesterId}
                    onPromoteAction={openPromotionModal}
                    onSyncedAction={handleSynced}
                    onErrorAction={setMessage}
                />
            )}
            {activeTab === 'matchingRequests' && (
                <MatchingRequestsTable requests={data.matchingRequests} />
            )}

            {modal && (
                <div className={styles.modalBackdrop}>
                    <section className={styles.modal}>
                        <h2>출점 후보지로 밀어넣기</h2>
                        <p>{modal.property.name} 물건을 선택한 회사의 출점 후보지로 등록합니다.</p>
                        <label>
                            <span>대상 회사 DB</span>
                            <select
                                value={modal.targetCompanyId}
                                onChange={event => setModal(prev => prev ? { ...prev, targetCompanyId: event.target.value, managerId: '' } : prev)}
                            >
                                {data.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                            </select>
                        </label>
                        <label>
                            <span>담당자</span>
                            <select value={modal.managerId} onChange={event => setModal(prev => prev ? { ...prev, managerId: event.target.value } : prev)}>
                                <option value="">미지정</option>
                                {targetManagers.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                            </select>
                        </label>
                        <div className={styles.modalActions}>
                            <button className={styles.secondaryButton} onClick={() => setModal(null)} disabled={isPromoting}>취소</button>
                            <button className={styles.primaryButton} onClick={confirmPromotion} disabled={isPromoting}>{isPromoting ? '반영 중' : '후보지 등록'}</button>
                        </div>
                    </section>
                </div>
            )}

        </main>
    );
}
