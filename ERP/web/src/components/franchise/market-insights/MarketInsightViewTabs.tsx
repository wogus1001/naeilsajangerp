"use client";

import { BarChart3, ListChecks } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type MarketInsightView = 'location-list' | 'region-insight';

type MarketInsightViewTabsProps = {
    readonly activeView: MarketInsightView;
    readonly filteredLocationCount: number;
    readonly locationCount: number;
    readonly insightCount: number;
    readonly onViewChange: (view: MarketInsightView) => void;
};

function formatLocationCount(filteredCount: number, totalCount: number) {
    if (filteredCount === totalCount) return `${totalCount.toLocaleString()}건`;
    return `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}건`;
}

export function MarketInsightViewTabs({
    activeView,
    filteredLocationCount,
    locationCount,
    insightCount,
    onViewChange
}: MarketInsightViewTabsProps) {
    return (
        <nav className={styles.marketViewTabs} aria-label="출점 후보지 보기 방식">
            <button
                type="button"
                className={activeView === 'location-list' ? styles.marketViewTabActive : styles.marketViewTab}
                onClick={() => onViewChange('location-list')}
            >
                <span>
                    <ListChecks size={15} />
                    후보지 목록
                </span>
                <small>{formatLocationCount(filteredLocationCount, locationCount)}</small>
            </button>
            <button
                type="button"
                className={activeView === 'region-insight' ? styles.marketViewTabActive : styles.marketViewTab}
                onClick={() => onViewChange('region-insight')}
            >
                <span>
                    <BarChart3 size={15} />
                    지역 인사이트
                </span>
                <small>{insightCount.toLocaleString()}개 지역</small>
            </button>
        </nav>
    );
}
