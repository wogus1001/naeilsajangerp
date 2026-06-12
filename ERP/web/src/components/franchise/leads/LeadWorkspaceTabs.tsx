"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type LeadWorkspaceTab = 'dashboard' | 'db' | 'contractOwners';

type LeadWorkspaceTabsProps = {
    readonly activeTab: LeadWorkspaceTab;
    readonly onTabChange: (tab: LeadWorkspaceTab) => void;
};

export function LeadWorkspaceTabs({ activeTab, onTabChange }: LeadWorkspaceTabsProps) {
    return (
        <nav className={styles.workspaceTabs} aria-label="모객 DB 작업 영역">
            <button
                type="button"
                className={activeTab === 'dashboard' ? styles.workspaceTabActive : styles.workspaceTab}
                onClick={() => onTabChange('dashboard')}
            >
                대시보드
            </button>
            <button
                type="button"
                className={activeTab === 'db' ? styles.workspaceTabActive : styles.workspaceTab}
                onClick={() => onTabChange('db')}
            >
                DB 관리
            </button>
            <button
                type="button"
                className={activeTab === 'contractOwners' ? styles.workspaceTabActive : styles.workspaceTab}
                onClick={() => onTabChange('contractOwners')}
            >
                계약 점주
            </button>
        </nav>
    );
}
