"use client";

import { X } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { FranchiseLead } from './types';
import { getLeadSourceTitle } from './utils';

type LeadDetailHeaderProps = {
    readonly lead: FranchiseLead;
    readonly detailTitle: string;
    readonly managerName: string;
    readonly onCloseAction: () => void;
};

export function LeadDetailHeader({
    lead,
    detailTitle,
    managerName,
    onCloseAction
}: LeadDetailHeaderProps) {
    return (
        <div className={styles.detailHeader}>
            <div>
                <span className={styles.detailEyebrow}>{detailTitle}</span>
                <h2 id="franchise-lead-detail-title">{lead.name}</h2>
                <p>{lead.mobile || '연락처 미입력'} · {getLeadSourceTitle(lead)} · 담당자 {managerName}</p>
            </div>
            <button
                className={styles.closeButton}
                onClick={onCloseAction}
                aria-label={`${detailTitle} 패널 닫기`}
            >
                <X size={20} strokeWidth={2.2} />
            </button>
        </div>
    );
}
