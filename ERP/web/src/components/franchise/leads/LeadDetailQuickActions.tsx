"use client";

import { Pencil, UserCheck } from 'lucide-react';
import {
    FRANCHISE_LEAD_STATUSES
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ENABLE_LEAD_CUSTOMER_DB_LINKING } from './constants';
import { isRawIntakeLead } from './utils';
import type { FranchiseLead } from './types';

type AsyncVoid = void | Promise<void>;

type LeadDetailQuickActionsProps = {
    readonly lead: FranchiseLead;
    readonly convertingLeadId: string;
    readonly onPromoteLeadToCandidateAction: (lead: FranchiseLead) => AsyncVoid;
    readonly onStatusChangeAction: (lead: FranchiseLead, status: FranchiseLeadStatus) => AsyncVoid;
    readonly onEditAction: (lead: FranchiseLead) => void;
    readonly onConvertLeadAction: (lead: FranchiseLead) => AsyncVoid;
};

function parseLeadStatus(value: string): FranchiseLeadStatus {
    return FRANCHISE_LEAD_STATUSES.find(status => status === value) || FRANCHISE_LEAD_STATUSES[0];
}

export function LeadDetailQuickActions({
    lead,
    convertingLeadId,
    onPromoteLeadToCandidateAction,
    onStatusChangeAction,
    onEditAction,
    onConvertLeadAction
}: LeadDetailQuickActionsProps) {
    return (
        <div className={styles.detailQuickActions}>
            {isRawIntakeLead(lead) && (
                <button className={styles.promoteButtonLarge} onClick={() => void onPromoteLeadToCandidateAction(lead)}>
                    가맹 희망자 승격
                </button>
            )}
            <select
                value={lead.status}
                onChange={(event) => void onStatusChangeAction(lead, parseLeadStatus(event.target.value))}
            >
                {FRANCHISE_LEAD_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
            <button className={styles.secondaryButton} onClick={() => onEditAction(lead)}>
                <Pencil size={15} />
                기본정보 수정
            </button>
            {ENABLE_LEAD_CUSTOMER_DB_LINKING && (
                <button
                    className={lead.convertedCustomerId ? styles.secondaryButtonSuccess : styles.primaryButton}
                    onClick={() => void onConvertLeadAction(lead)}
                    disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                >
                    <UserCheck size={15} />
                    {lead.convertedCustomerId ? '전환완료' : '고객 전환'}
                </button>
            )}
        </div>
    );
}
