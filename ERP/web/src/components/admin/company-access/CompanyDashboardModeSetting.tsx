"use client";

import { COMPANY_DASHBOARD_MODES, type CompanyDashboardMode } from '@/lib/company-menu-features';
import styles from './companyAccess.module.css';

type CompanyDashboardModeSettingProps = {
    readonly mode: CompanyDashboardMode;
    readonly onChange: (mode: CompanyDashboardMode) => void;
};

export function CompanyDashboardModeSetting({ mode, onChange }: CompanyDashboardModeSettingProps) {
    return (
        <div className={styles.dashboardModeSetting}>
            <div>
                <h4 className={styles.settingTitle}>대시보드 타입</h4>
                <p className={styles.settingDescription}>회사별 기본 요약 화면을 지정합니다.</p>
            </div>
            <div className={styles.modeTabs} aria-label="회사 기본 대시보드 타입">
                {COMPANY_DASHBOARD_MODES.map(option => (
                    <button
                        key={option.mode}
                        type="button"
                        className={mode === option.mode ? styles.modeTabActive : styles.modeTab}
                        aria-pressed={mode === option.mode}
                        title={option.description}
                        onClick={() => onChange(option.mode)}
                    >
                        <strong>{option.label}</strong>
                        <span>{option.mode === 'a' ? '모객/후보지' : '기존 요약'}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
