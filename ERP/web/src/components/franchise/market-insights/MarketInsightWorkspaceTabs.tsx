"use client";

import { BriefcaseBusiness, FileSearch } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type MarketInsightTab = 'market-insights' | 'realty-import';

type MarketInsightWorkspaceTabsProps = {
    readonly activeTab: MarketInsightTab;
    readonly onTabChange: (tab: MarketInsightTab) => void;
};

export function MarketInsightWorkspaceTabs({ activeTab, onTabChange }: MarketInsightWorkspaceTabsProps) {
    return (
        <nav className={styles.workspaceTabs} aria-label="출점 후보지 작업 영역">
            <button
                type="button"
                className={activeTab === 'market-insights' ? styles.workspaceTabActive : styles.workspaceTab}
                onClick={() => onTabChange('market-insights')}
            >
                <BriefcaseBusiness size={15} />
                출점 후보지
            </button>
            <button
                type="button"
                className={activeTab === 'realty-import' ? styles.workspaceTabActive : styles.workspaceTab}
                onClick={() => onTabChange('realty-import')}
            >
                <FileSearch size={15} />
                외부 상가 수집
            </button>
        </nav>
    );
}
