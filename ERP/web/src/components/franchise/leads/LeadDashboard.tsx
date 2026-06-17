"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LeadDashboardTypeB } from './LeadDashboardTypeB';
import type { LeadDashboardTypeBProps } from './LeadDashboardTypes';

export function LeadDashboard(props: LeadDashboardTypeBProps) {
    return (
        <div className={styles.dashboardShell}>
            <LeadDashboardTypeB {...props} />
        </div>
    );
}
