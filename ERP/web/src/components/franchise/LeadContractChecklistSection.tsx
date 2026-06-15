"use client";

import React from 'react';
import { CheckCircle2, Circle, ListChecks, Save } from 'lucide-react';
import type { LeadContractChecklistStep } from '@/lib/franchise-lead-contract-checklist';
import { useLeadContractChecklist } from './useLeadContractChecklist';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly leadId: string;
    readonly onSaved?: () => void;
    readonly userId: string;
};

function formatChecklistDate(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}

function buildMemoDrafts(steps: readonly LeadContractChecklistStep[]): Record<string, string> {
    return steps.reduce<Record<string, string>>((drafts, step) => ({
        ...drafts,
        [step.stepKey]: step.memo
    }), {});
}

export function LeadContractChecklistSection({ leadId, onSaved, userId }: Props) {
    const {
        errorMessage,
        isLoading,
        message,
        saveStep,
        savingStepKey,
        steps,
        summary
    } = useLeadContractChecklist({ leadId, onSaved, userId });
    const [memoDrafts, setMemoDrafts] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        setMemoDrafts(buildMemoDrafts(steps));
    }, [steps]);

    const updateMemoDraft = (stepKey: string, memo: string) => {
        setMemoDrafts(prev => ({ ...prev, [stepKey]: memo }));
    };

    return (
        <section className={`${styles.detailSection} ${styles.contractChecklistSection}`}>
            <div className={styles.contractChecklistHeader}>
                <div>
                    <h3><ListChecks size={16} /> 계약 전 체크</h3>
                    <p className={styles.detailHint}>운영 확인용 체크입니다. 계약 가능일 기준은 정보공개서 발송 이력으로 계산됩니다.</p>
                </div>
                <span>{summary.completed}/{summary.total || 7} 완료</span>
            </div>

            <div className={styles.contractChecklistProgress} aria-label={`계약 전 체크 진행률 ${summary.progressPercent}%`}>
                <span style={{ width: `${summary.progressPercent}%` }} />
            </div>

            {errorMessage && <div className={styles.disclosureError}>{errorMessage}</div>}
            {message && <div className={styles.disclosureMessage}>{message}</div>}

            <div className={styles.contractChecklistGrid}>
                {isLoading && steps.length === 0 ? (
                    <div className={styles.contractChecklistEmpty}>체크리스트를 불러오는 중입니다.</div>
                ) : steps.map(step => {
                    const isSaving = savingStepKey === step.stepKey;
                    const completedAt = formatChecklistDate(step.completedAt);
                    return (
                        <article key={step.stepKey} className={step.completed ? styles.contractChecklistItemDone : styles.contractChecklistItem}>
                            <div className={styles.contractChecklistItemTop}>
                                <label className={styles.contractChecklistToggle}>
                                    <input
                                        type="checkbox"
                                        checked={step.completed}
                                        disabled={isSaving}
                                        onChange={(event) => void saveStep(step.stepKey, { completed: event.target.checked })}
                                    />
                                    {step.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    <span>{step.label}</span>
                                </label>
                                <small>{step.completed ? completedAt || '완료' : '대기'}</small>
                            </div>
                            <div className={styles.contractChecklistMemoRow}>
                                <input
                                    value={memoDrafts[step.stepKey] || ''}
                                    onChange={(event) => updateMemoDraft(step.stepKey, event.target.value)}
                                    placeholder="메모"
                                    disabled={isSaving}
                                />
                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() => void saveStep(step.stepKey, { memo: memoDrafts[step.stepKey] || '' })}
                                    disabled={isSaving}
                                >
                                    <Save size={14} />
                                    저장
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
