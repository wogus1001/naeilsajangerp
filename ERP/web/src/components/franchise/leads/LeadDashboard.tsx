"use client";

import React from 'react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LeadDashboardTypeA } from './LeadDashboardTypeA';
import { LeadDashboardTypeB } from './LeadDashboardTypeB';
import type { LeadDashboardTypeBProps } from './LeadDashboardTypes';

type DashboardMode = 'b' | 'a';

const DASHBOARD_MODE_OPTIONS: ReadonlyArray<{
    readonly mode: DashboardMode;
    readonly label: string;
    readonly description: string;
}> = [
    { mode: 'b', label: 'B 타입', description: '기존 요약/분석 대시보드' },
    { mode: 'a', label: 'A 타입', description: '정보공개서와 알림 중심 운영 대시보드' }
] as const;

export function LeadDashboard(props: LeadDashboardTypeBProps) {
    const [dashboardMode, setDashboardMode] = React.useState<DashboardMode>('b');

    return (
        <div className={styles.dashboardShell}>
            <div className={styles.dashboardModeBar}>
                <div>
                    <h2>요약 대시보드</h2>
                    <p>{dashboardMode === 'b' ? 'B 타입 · 기존 모객 흐름 분석' : 'A 타입 · 담당자 액션과 알림 중심'}</p>
                </div>
                <div className={styles.dashboardModeTabs} aria-label="요약 대시보드 타입">
                    {DASHBOARD_MODE_OPTIONS.map(option => (
                        <button
                            key={option.mode}
                            type="button"
                            className={dashboardMode === option.mode ? styles.dashboardModeTabActive : styles.dashboardModeTab}
                            title={option.description}
                            onClick={() => setDashboardMode(option.mode)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            {dashboardMode === 'a' ? (
                <LeadDashboardTypeA {...props} />
            ) : (
                <LeadDashboardTypeB {...props} />
            )}
        </div>
    );
}
