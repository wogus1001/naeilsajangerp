"use client";

import React from 'react';
import { ClipboardList } from 'lucide-react';
import {
    LEAD_CONSULTATION_RESULTS,
    LEAD_FIT_LEVELS,
    LEAD_NEXT_ACTIONS,
    isLeadConsultationResult,
    isLeadFitLevel,
    isLeadNextAction
} from '@/lib/franchise-lead-workflow';
import type { LeadFitLevel, LeadWorkflowDraft } from '@/lib/franchise-lead-workflow';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly value: LeadWorkflowDraft;
    readonly isSaving: boolean;
    readonly onChange: (value: LeadWorkflowDraft) => void;
    readonly onSave: () => void;
};

type FitField = {
    readonly key: 'budgetFit' | 'regionFit' | 'brandFit';
    readonly label: string;
};

const FIT_FIELDS: readonly FitField[] = [
    { key: 'budgetFit', label: '자금 적합도' },
    { key: 'regionFit', label: '지역 적합도' },
    { key: 'brandFit', label: '브랜드 적합도' }
] as const;

export function LeadWorkflowSection({ value, isSaving, onChange, onSave }: Props) {
    const updateFit = (key: FitField['key'], nextValue: LeadFitLevel) => {
        onChange({ ...value, [key]: nextValue });
    };

    return (
        <section className={styles.detailSection}>
            <h3><ClipboardList size={16} /> 업무 관리</h3>
            <div className={styles.workflowGrid}>
                <label>
                    다음 액션
                    <select
                        value={value.nextAction}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            if (isLeadNextAction(nextValue)) {
                                onChange({ ...value, nextAction: nextValue });
                            }
                        }}
                    >
                        {LEAD_NEXT_ACTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>
                <label>
                    상담 결과
                    <select
                        value={value.consultationResult}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            if (isLeadConsultationResult(nextValue)) {
                                onChange({ ...value, consultationResult: nextValue });
                            }
                        }}
                    >
                        {LEAD_CONSULTATION_RESULTS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>
                {FIT_FIELDS.map(field => (
                    <label key={field.key}>
                        {field.label}
                        <select
                            value={value[field.key]}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                if (isLeadFitLevel(nextValue)) {
                                    updateFit(field.key, nextValue);
                                }
                            }}
                        >
                            {LEAD_FIT_LEVELS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                ))}
            </div>
            <label className={styles.workflowMemoLabel}>
                이탈/보류 사유
                <textarea
                    value={value.churnReason}
                    onChange={(event) => onChange({ ...value, churnReason: event.target.value })}
                    placeholder="예산 부족, 지역 미확정, 가족 반대처럼 후속 판단에 필요한 이유를 적어두세요."
                />
            </label>
            <div className={styles.workflowActions}>
                <p className={styles.detailHint}>저장하면 업무 큐 분류와 후보자 상세에 즉시 반영됩니다.</p>
                <button type="button" className={styles.primaryButton} onClick={onSave} disabled={isSaving}>
                    {isSaving ? '저장 중' : '업무 정보 저장'}
                </button>
            </div>
        </section>
    );
}
