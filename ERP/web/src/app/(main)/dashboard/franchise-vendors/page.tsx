"use client";

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, FileSignature, Plus, Search, Users } from 'lucide-react';
import type { FranchiseVendorView } from '@/lib/franchise-vendors';
import { getStoredCompanyId, getStoredUser } from '@/utils/userUtils';
import { fetchVendorContracts } from '../../contracts/vendor/vendorContractsApi';
import {
    buildVendorManagementRows,
    buildVendorManagementMetrics,
    buildVendorSummaries,
    filterVendorSummaries,
    type VendorRiskLevel,
    type VendorSummary
} from './vendorManagementModel';
import {
    EMPTY_VENDOR_MASTER_FORM,
    fetchVendorMasters,
    formFromVendorMaster,
    saveVendorMaster,
    type VendorMasterForm
} from './vendorMasterApi';
import { VendorMasterFormPanel } from './VendorMasterFormPanel';
import { VendorManagementTable } from './VendorManagementTable';
import styles from './vendorManagement.module.css';

const RISK_OPTIONS: readonly { readonly label: string; readonly value: VendorRiskLevel | 'all' }[] = [
    { label: '전체', value: 'all' },
    { label: '만료', value: 'danger' },
    { label: '갱신 필요', value: 'warning' },
    { label: '정상', value: 'normal' },
    { label: '종료', value: 'closed' }
] as const;

export default function FranchiseVendorsPage() {
    const [contractSummaries, setContractSummaries] = React.useState<readonly VendorSummary[]>([]);
    const [vendorMasters, setVendorMasters] = React.useState<readonly FranchiseVendorView[]>([]);
    const [vendorForm, setVendorForm] = React.useState<VendorMasterForm>(EMPTY_VENDOR_MASTER_FORM);
    const [vendorFormOpen, setVendorFormOpen] = React.useState(false);
    const [companyId, setCompanyId] = React.useState('');
    const [query, setQuery] = React.useState('');
    const [risk, setRisk] = React.useState<VendorRiskLevel | 'all'>('all');
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [vendorSchemaReady, setVendorSchemaReady] = React.useState(true);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        const user = getStoredUser();
        const nextCompanyId = getStoredCompanyId(user);
        setCompanyId(nextCompanyId);
        try {
            const [contractResult, masterResult] = await Promise.all([
                fetchVendorContracts({ category: 'all', companyId: nextCompanyId, q: '', status: 'all' }),
                fetchVendorMasters(nextCompanyId)
            ]);
            setSchemaReady(contractResult.schemaReady);
            setVendorSchemaReady(masterResult.schemaReady);
            setContractSummaries(buildVendorSummaries(contractResult.contracts));
            setVendorMasters(masterResult.vendors);
        } catch (caught) {
            setContractSummaries([]);
            setVendorMasters([]);
            setError(caught instanceof Error ? caught.message : '업체 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void load();
    }, [load]);

    async function handleSaveVendor() {
        if (!companyId) {
            setError('회사 정보를 확인할 수 없습니다.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await saveVendorMaster(companyId, vendorForm);
            setVendorForm(EMPTY_VENDOR_MASTER_FORM);
            setVendorFormOpen(false);
            setMessage(vendorForm.id ? '업체 정보를 수정했습니다.' : '업체를 등록했습니다.');
            await load();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '업체를 저장하지 못했습니다.');
        } finally {
            setSaving(false);
        }
    }

    const vendorRows = buildVendorManagementRows(vendorMasters, contractSummaries);
    const visibleVendors = filterVendorSummaries(vendorRows, query, risk);
    const metrics = buildVendorManagementMetrics(vendorRows);

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>업체 관리</h1>
                    <p className={styles.description}>계약함에 등록된 업체를 거래처 단위로 묶어 만료 리스크와 계약 현황을 확인합니다.</p>
                </div>
                <Link className={styles.primaryButton} href="/contracts/vendor">
                    <FileSignature size={16} />
                    계약함 열기
                </Link>
            </section>

            {!schemaReady && <div className={styles.notice}>업체 계약함 SQL 적용 후 사용할 수 있습니다.</div>}
            {!vendorSchemaReady && <div className={styles.notice}>업체 직접 등록은 업체 관리 SQL 적용 후 사용할 수 있습니다.</div>}
            {error && <div className={styles.error}>{error}</div>}
            {message && <div className={styles.message}>{message}</div>}

            <section className={styles.metricGrid}>
                <div className={styles.metricCard}>
                    <Users size={18} />
                    <span>등록 업체</span>
                    <strong>{metrics.totalVendors}</strong>
                </div>
                <div className={styles.metricCard}>
                    <FileSignature size={18} />
                    <span>전체 계약</span>
                    <strong>{metrics.totalContracts}</strong>
                </div>
                <div className={styles.metricCard}>
                    <Building2 size={18} />
                    <span>진행 계약</span>
                    <strong>{metrics.activeContracts}</strong>
                </div>
                <div className={styles.metricCard}>
                    <AlertTriangle size={18} />
                    <span>관리 필요 업체</span>
                    <strong>{metrics.expiringVendors}</strong>
                </div>
            </section>

            <section className={`${styles.panel} ${styles.filterBar}`}>
                <label className={styles.searchBox}>
                    <Search size={16} />
                    <input
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="업체명, 구분, 계약명 검색"
                    />
                </label>
                <select value={risk} onChange={event => {
                    const nextRisk = RISK_OPTIONS.find(option => option.value === event.target.value)?.value || 'all';
                    setRisk(nextRisk);
                }}>
                    {RISK_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            </section>

            <section className={styles.panel}>
                <div className={styles.statusLine}>
                    <strong>업체 목록</strong>
                    <div className={styles.listHeaderActions}>
                        <span>{loading ? '불러오는 중' : `${visibleVendors.length}개`}</span>
                        <button
                            className={styles.createButton}
                            type="button"
                            onClick={() => {
                                setVendorForm(EMPTY_VENDOR_MASTER_FORM);
                                setVendorFormOpen(true);
                            }}
                        >
                            <Plus size={15} />
                            업체 생성
                        </button>
                    </div>
                </div>
                {vendorFormOpen && (
                    <VendorMasterFormPanel
                        form={vendorForm}
                        saving={saving}
                        schemaReady={vendorSchemaReady}
                        onChange={setVendorForm}
                        onReset={() => {
                            setVendorForm(EMPTY_VENDOR_MASTER_FORM);
                            setVendorFormOpen(false);
                        }}
                        onSubmit={() => void handleSaveVendor()}
                    />
                )}
                <VendorManagementTable
                    loading={loading}
                    rows={visibleVendors}
                    vendorMasters={vendorMasters}
                    onEdit={(vendor) => {
                        setVendorForm(formFromVendorMaster(vendor));
                        setVendorFormOpen(true);
                    }}
                />
            </section>
        </main>
    );
}
