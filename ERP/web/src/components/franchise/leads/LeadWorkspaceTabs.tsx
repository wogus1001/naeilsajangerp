"use client";

import { LayoutDashboard, Table2 } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type LeadWorkspaceTab = 'dashboard' | 'db';

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
                <LayoutDashboard size={15} />
                대시보드
            </button>
            <button
                type="button"
                className={activeTab === 'db' ? styles.workspaceTabActive : styles.workspaceTab}
                onClick={() => onTabChange('db')}
            >
                <Table2 size={15} />
                DB 관리
            </button>
        </nav>
    );
}
