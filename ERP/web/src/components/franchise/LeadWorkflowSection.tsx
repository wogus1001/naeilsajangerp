"use client";

import React from 'react';
import { CalendarClock, ClipboardList } from 'lucide-react';
import {
    LEAD_CONSULTATION_RESULTS,
    LEAD_FIT_LEVELS,
    type LeadNextContactPresetKey,
    LEAD_NEXT_ACTIONS,
    isLeadConsultationResult,
    isLeadFitLevel,
    isLeadNextAction
} from '@/lib/franchise-lead-workflow';
import type { LeadFitLevel, LeadWorkflowDraft } from '@/lib/franchise-lead-workflow';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    formatFullDateTime,
    isDueToday,
    isPastDue
} from './leads/utils';

type Props = {
    readonly value: LeadWorkflowDraft;
    readonly isSaving: boolean;
    readonly currentNextContactAt?: string | null;
    readonly nextContactValue: string;
    readonly suggestedNextContactValue: string;
    readonly nextContactPresets: readonly LeadNextContactPresetOption[];
    readonly onChange: (value: LeadWorkflowDraft) => void;
    readonly onNextContactChange: (value: string) => void;
    readonly onSave: () => void;
};

export type LeadNextContactPresetOption = {
    readonly key: LeadNextContactPresetKey;
    readonly label: string;
    readonly value: string;
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

function formatPresetDateTime(value: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return formatFullDateTime(date.toISOString());
}

export function LeadWorkflowSection({
    value,
    isSaving,
    currentNextContactAt,
    nextContactValue,
    suggestedNextContactValue,
    nextContactPresets,
    onChange,
    onNextContactChange,
    onSave
}: Props) {
    const hasSuggestion = suggestedNextContactValue.length > 0 && suggestedNextContactValue !== nextContactValue;

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
            <div className={styles.workflowNextContact}>
                <div className={styles.workflowNextContactHeader}>
                    <strong><CalendarClock size={14} /> 다음 연락</strong>
                    <span>
                        현재: {formatFullDateTime(currentNextContactAt)}
                        {isPastDue(currentNextContactAt) ? ' · 지연' : isDueToday(currentNextContactAt) ? ' · 오늘' : ''}
                    </span>
                </div>
                <div className={styles.workflowNextContactControls}>
                    <input
                        type="datetime-local"
                        value={nextContactValue}
                        onChange={(event) => onNextContactChange(event.target.value)}
                    />
                    <div className={styles.nextContactQuickRow} aria-label="다음 연락 빠른 예약">
                        {hasSuggestion && (
                            <button
                                type="button"
                                className={styles.nextContactSuggestButton}
                                onClick={() => onNextContactChange(suggestedNextContactValue)}
                            >
                                추천 적용
                            </button>
                        )}
                        {nextContactPresets.map(preset => (
                            <button
                                type="button"
                                key={preset.key}
                                className={nextContactValue === preset.value ? styles.nextContactQuickButtonActive : styles.nextContactQuickButton}
                                onClick={() => onNextContactChange(preset.value)}
                            >
                                {preset.label}
                            </button>
                        ))}
                        {nextContactValue && (
                            <button
                                type="button"
                                className={styles.nextContactClearButton}
                                onClick={() => onNextContactChange('')}
                            >
                                비우기
                            </button>
                        )}
                    </div>
                </div>
                {suggestedNextContactValue && (
                    <p className={styles.workflowNextContactHint}>
                        추천: {formatPresetDateTime(suggestedNextContactValue)}
                    </p>
                )}
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
                <p className={styles.detailHint}>저장하면 연락 관리와 가맹 희망자 상세에 바로 반영됩니다.</p>
                <button type="button" className={styles.primaryButton} onClick={onSave} disabled={isSaving}>
                    {isSaving ? '저장 중' : '후속 관리 저장'}
                </button>
            </div>
        </section>
    );
}
