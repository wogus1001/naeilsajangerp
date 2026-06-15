"use client";

import { UserRound } from 'lucide-react';
import {
    getFranchiseLeadGradeLabel,
    getFranchiseLeadStageLabel
} from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatBudget } from './utils';
import type { FranchiseLead } from './types';

type LeadBasicInfoSectionProps = {
    readonly lead: FranchiseLead;
    readonly managerName: string;
};

export function LeadBasicInfoSection({ lead, managerName }: LeadBasicInfoSectionProps) {
    return (
        <section className={styles.detailSection}>
            <h3><UserRound size={16} /> 기본정보</h3>
            <div className={styles.detailInfoGrid}>
                <div>
                    <span>단계</span>
                    <strong>{getFranchiseLeadStageLabel(lead.leadStage)}</strong>
                </div>
                <div>
                    <span>우선순위</span>
                    <strong>{getFranchiseLeadGradeLabel(lead.grade)}</strong>
                </div>
                <div>
                    <span>희망지역</span>
                    <strong>{lead.desiredRegion || '-'}</strong>
                </div>
                <div>
                    <span>담당자</span>
                    <strong>{managerName}</strong>
                </div>
                <div>
                    <span>예산</span>
                    <strong>{formatBudget(lead.budgetMin, lead.budgetMax)}</strong>
                </div>
                <div>
                    <span>관심브랜드</span>
                    <strong>{lead.interestedBrand || '-'}</strong>
                </div>
            </div>
            <div className={styles.detailMemo}>
                <span>메모</span>
                <p>{lead.memo || '등록된 메모가 없습니다.'}</p>
            </div>
        </section>
    );
}
