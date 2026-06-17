"use client";

import { CompanyLogoManager } from '@/components/company/CompanyLogoManager';
import styles from './companyAccess.module.css';
import type { AdminCompanySummary } from './types';

type CompanyInfoPanelProps = {
    readonly company: AdminCompanySummary | null;
    readonly onLogoChangedAction: (logoUrl: string | null) => void;
};

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function statusLabel(status: string): string {
    switch (status) {
        case 'active':
            return '활성';
        case 'non_payment':
            return '결제 확인 필요';
        case 'blocked':
            return '차단';
        default:
            return status || '-';
    }
}

export function CompanyInfoPanel({ company, onLogoChangedAction }: CompanyInfoPanelProps) {
    if (!company) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.panelTitle}>회사 정보</h3>
                <p className={styles.emptyText}>관리할 회사를 선택하세요.</p>
            </section>
        );
    }

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <span className={styles.eyebrow}>선택 회사</span>
                    <h3 className={styles.companyName}>{company.name}</h3>
                </div>
                <span className={styles.statusBadge}>{statusLabel(company.status)}</span>
            </div>
            <div className={styles.infoGrid}>
                <div>
                    <span className={styles.infoLabel}>사업자번호</span>
                    <strong>{company.businessNumber}</strong>
                </div>
                <div>
                    <span className={styles.infoLabel}>등록일</span>
                    <strong>{formatDate(company.createdAt)}</strong>
                </div>
                <div>
                    <span className={styles.infoLabel}>사용자</span>
                    <strong>{company.userCount}명</strong>
                </div>
                <div>
                    <span className={styles.infoLabel}>활성 / 대기</span>
                    <strong>{company.activeUserCount}명 / {company.pendingUserCount}명</strong>
                </div>
            </div>
            <div className={styles.managerLine}>
                <span className={styles.infoLabel}>팀장</span>
                <strong>{company.managerNames.length > 0 ? company.managerNames.join(', ') : '지정 없음'}</strong>
            </div>
            <div className={styles.logoSetting}>
                <CompanyLogoManager
                    companyId={company.id}
                    companyName={company.name}
                    logoUrl={company.logoUrl}
                    onChanged={onLogoChangedAction}
                />
            </div>
        </section>
    );
}
