"use client";

import React from 'react';
import { parseCompanyAccessResponse } from '@/components/admin/company-access/companyAccessParse';
import type { AdminCompanySummary } from '@/components/admin/company-access/types';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import {
    getAdminCompanyScope,
    getRequesterId,
    setAdminCompanyScope
} from '@/utils/userUtils';
import styles from './Header.module.css';

type AdminCompanySelectorUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly role?: string;
    readonly companyId?: string;
};

type AdminCompanySelectorProps = {
    readonly user: AdminCompanySelectorUser | null;
};

function isAdminRole(role: string | undefined): boolean {
    return role === 'admin' || role === 'super_admin';
}

function findCompany(companies: readonly AdminCompanySummary[], companyId: string): AdminCompanySummary | null {
    return companies.find(company => company.id === companyId) || null;
}

export function AdminCompanySelector({ user }: AdminCompanySelectorProps) {
    const [companies, setCompanies] = React.useState<readonly AdminCompanySummary[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const requesterId = getRequesterId(user);
    const isAdmin = isAdminRole(user?.role);

    React.useEffect(() => {
        if (!isAdmin || !requesterId) return;

        let cancelled = false;
        const storedScope = getAdminCompanyScope();
        const preferredCompanyId = storedScope?.id || user?.companyId || '';
        setSelectedCompanyId(preferredCompanyId);

        const loadCompanies = async () => {
            setIsLoading(true);
            setMessage('');

            const params = new URLSearchParams({ requesterId });
            if (preferredCompanyId) params.set('companyId', preferredCompanyId);

            try {
                const response = await fetch(`/api/admin/company-access?${params.toString()}`, {
                    cache: 'no-store',
                    headers: await getApiAuthHeaders()
                });
                const payload = parseCompanyAccessResponse(await response.json());

                if (cancelled) return;

                if (!response.ok || !payload?.data) {
                    setMessage('회사 조회 실패');
                    setCompanies([]);
                    return;
                }

                setCompanies(payload.data.companies);
                if (preferredCompanyId && payload.data.companies.some(company => company.id === preferredCompanyId)) {
                    setSelectedCompanyId(preferredCompanyId);
                    return;
                }
                setSelectedCompanyId(user?.companyId || '');
            } catch (error) {
                if (!cancelled) {
                    console.error('Admin company selector load failed:', error);
                    setMessage('회사 조회 실패');
                    setCompanies([]);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadCompanies();

        return () => {
            cancelled = true;
        };
    }, [isAdmin, requesterId, user?.companyId]);

    if (!isAdmin) return null;

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextCompanyId = event.target.value;
        setSelectedCompanyId(nextCompanyId);

        const nextCompany = findCompany(companies, nextCompanyId);
        setAdminCompanyScope(nextCompany ? { id: nextCompany.id, name: nextCompany.name } : null);
        window.location.reload();
    };

    return (
        <div className={styles.companyScope} title={message || '슈퍼어드민 조회 회사'}>
            <span className={styles.companyScopeLabel}>조회 회사</span>
            <select
                className={styles.companyScopeSelect}
                value={selectedCompanyId}
                onChange={handleChange}
                disabled={isLoading || companies.length === 0}
                aria-label="조회 회사 선택"
            >
                {companies.length === 0 && <option value="">등록 회사 없음</option>}
                {companies.length > 0 && !selectedCompanyId && <option value="">회사 선택</option>}
                {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                ))}
            </select>
        </div>
    );
}
