"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LeadDashboardTypeB } from './LeadDashboardTypeB';
import type { LeadDashboardTypeBProps } from './LeadDashboardTypes';

export function LeadDashboard(props: LeadDashboardTypeBProps) {
    return (
        <div className={styles.dashboardShell}>
            <div className={styles.dashboardModeBar}>
                <div>
                    <h2>요약 대시보드</h2>
                    <p>기존 모객 흐름 분석</p>
                </div>
            </div>
            <LeadDashboardTypeB {...props} />
        </div>
    );
}
