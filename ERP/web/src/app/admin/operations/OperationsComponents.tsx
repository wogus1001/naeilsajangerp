import type { ReactNode } from 'react';

import {
    getPlatformOperationStatusLabel,
    type PlatformOperationItem
} from '@/lib/platform-operations';

import styles from './page.module.css';

export function OperationsSummaryCard({
    icon,
    label,
    value
}: {
    readonly icon: ReactNode;
    readonly label: string;
    readonly value: number;
}) {
    return (
        <article className={styles.kpi}>
            <span>{label}</span>
            <strong>{value}건</strong>
            {icon}
        </article>
    );
}

export function OperationStatusBadge({ status }: { readonly status: PlatformOperationItem['status'] }) {
    return <span className={`${styles.status} ${styles[status]}`}>{getPlatformOperationStatusLabel(status)}</span>;
}
