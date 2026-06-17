"use client";

import React from 'react';
import {
    DEFAULT_COMPANY_DASHBOARD_MODE,
    type CompanyDashboardMode
} from '@/lib/company-menu-features';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getAdminCompanyScope, getRequesterId, setAdminCompanyScope } from '@/utils/userUtils';
import { CompanyDashboardModeSetting } from './CompanyDashboardModeSetting';
import { CompanyInfoPanel } from './CompanyInfoPanel';
import { parseCompanyAccessResponse } from './companyAccessParse';
import styles from './companyAccess.module.css';
import type { AdminCompanyFeature, AdminCompanySummary } from './types';

function groupFeatures(features: readonly AdminCompanyFeature[]): readonly [string, readonly AdminCompanyFeature[]][] {
    const grouped = new Map<string, AdminCompanyFeature[]>();
    for (const feature of features) {
        const list = grouped.get(feature.category) || [];
        list.push(feature);
        grouped.set(feature.category, list);
    }
    return Array.from(grouped.entries());
}

export function CompanyAccessManager() {
    const [companies, setCompanies] = React.useState<readonly AdminCompanySummary[]>([]);
    const [selectedCompany, setSelectedCompany] = React.useState<AdminCompanySummary | null>(null);
    const [features, setFeatures] = React.useState<readonly AdminCompanyFeature[]>([]);
    const [dashboardMode, setDashboardMode] = React.useState<CompanyDashboardMode>(DEFAULT_COMPANY_DASHBOARD_MODE);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDirty, setIsDirty] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const loadAccess = React.useCallback(async (companyId?: string) => {
        setIsLoading(true);
        setMessage('');
        const requesterId = getRequesterId();
        const params = new URLSearchParams();
        if (requesterId) params.set('requesterId', requesterId);
        if (companyId) params.set('companyId', companyId);

        try {
            const response = await fetch(`/api/admin/company-access?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload = parseCompanyAccessResponse(await response.json());
            if (!response.ok || !payload?.data) {
                setMessage(payload?.message || payload?.error || '회사 메뉴 설정을 불러오지 못했습니다.');
                return;
            }

            setCompanies(payload.data.companies);
            setSelectedCompany(payload.data.selectedCompany);
            setSelectedCompanyId(payload.data.selectedCompany?.id || '');
            setDashboardMode(payload.data.dashboardMode);
            setFeatures(payload.data.features);
            setIsDirty(false);
        } catch (error) {
            console.error('Company access load failed:', error);
            setMessage('회사 메뉴 설정을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadAccess();
    }, [loadAccess]);

    const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextCompanyId = event.target.value;
        setSelectedCompanyId(nextCompanyId);
        void loadAccess(nextCompanyId);
    };

    const handleFeatureToggle = (key: AdminCompanyFeature['key']) => {
        setFeatures(prev => prev.map(feature => (
            feature.key === key ? { ...feature, enabled: !feature.enabled } : feature
        )));
        setIsDirty(true);
        setMessage('');
    };

    const handleDashboardModeChange = (mode: CompanyDashboardMode) => {
        setDashboardMode(mode);
        setIsDirty(true);
        setMessage('');
    };

    const handleLogoChanged = (logoUrl: string | null) => {
        if (!selectedCompany) return;
        const nextCompany = { ...selectedCompany, logoUrl };
        setSelectedCompany(nextCompany);
        setCompanies(prev => prev.map(company => (
            company.id === nextCompany.id ? { ...company, logoUrl } : company
        )));

        const adminScope = getAdminCompanyScope();
        if (adminScope?.id === nextCompany.id) {
            setAdminCompanyScope({ id: nextCompany.id, name: nextCompany.name, logoUrl });
        }
    };

    const handleSave = async () => {
        if (!selectedCompanyId) return;
        setIsSaving(true);
        setMessage('');
        const requesterId = getRequesterId();
        const params = new URLSearchParams();
        if (requesterId) params.set('requesterId', requesterId);

        try {
            const response = await fetch(`/api/admin/company-access?${params.toString()}`, {
                method: 'PUT',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    companyId: selectedCompanyId,
                    dashboardMode,
                    features: features.map(feature => ({ key: feature.key, enabled: feature.enabled }))
                })
            });
            const payload = parseCompanyAccessResponse(await response.json());
            if (!response.ok) {
                setMessage(payload?.message || payload?.error || '저장에 실패했습니다.');
                return;
            }

            if (payload?.data?.features) setFeatures(payload.data.features);
            if (payload?.data?.dashboardMode) setDashboardMode(payload.data.dashboardMode);
            setIsDirty(false);
            setMessage('회사별 메뉴 설정을 저장했습니다.');
        } catch (error) {
            console.error('Company access save failed:', error);
            setMessage('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const enabledCount = features.filter(feature => feature.enabled).length;

    return (
        <section className={styles.wrapper}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>회사별 메뉴 관리</h2>
                    <p className={styles.subtitle}>슈퍼어드민이 회사를 선택해 사용 가능한 메뉴를 켜고 끕니다.</p>
                </div>
                <button className={styles.saveButton} onClick={handleSave} disabled={!isDirty || isSaving || !selectedCompanyId}>
                    {isSaving ? '저장 중' : '설정 저장'}
                </button>
            </div>

            <div className={styles.companySelectRow}>
                <label className={styles.selectLabel} htmlFor="admin-company-access-company">회사 선택</label>
                <select
                    id="admin-company-access-company"
                    className={styles.companySelect}
                    value={selectedCompanyId}
                    onChange={handleCompanyChange}
                    disabled={isLoading}
                >
                    {companies.length === 0 && <option value="">등록 회사 없음</option>}
                    {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                </select>
            </div>

            {message && <p className={styles.message}>{message}</p>}

            <div className={styles.contentGrid}>
                <CompanyInfoPanel company={selectedCompany} onLogoChangedAction={handleLogoChanged} />

                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h3 className={styles.panelTitle}>메뉴 on/off</h3>
                            <p className={styles.panelDescription}>사용 중 {enabledCount}개 / 전체 {features.length}개</p>
                        </div>
                        {isDirty && <span className={styles.unsavedBadge}>저장 필요</span>}
                    </div>

                    <CompanyDashboardModeSetting mode={dashboardMode} onChange={handleDashboardModeChange} />

                    {groupFeatures(features).map(([category, list]) => (
                        <div className={styles.featureGroup} key={category}>
                            <h4 className={styles.groupTitle}>{category}</h4>
                            <div className={styles.featureList}>
                                {list.map(feature => (
                                    <label className={styles.featureRow} key={feature.key}>
                                        <span>
                                            <strong>{feature.title}</strong>
                                            <small>{feature.description}</small>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={feature.enabled}
                                            onChange={() => handleFeatureToggle(feature.key)}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </section>
    );
}
