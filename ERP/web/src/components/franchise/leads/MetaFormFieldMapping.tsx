"use client";

import { RefreshCw, WandSparkles } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    findMetaQuestionTarget,
    getMetaFormReadiness,
    suggestMetaFieldMapping
} from '@/lib/meta-lead-field-mapping';
import type { MetaFieldKey, MetaFieldMapping, MetaLeadQuestion } from '@/lib/meta-lead-field-mapping';
import { META_FIELD_LABELS } from './constants';
import type { MetaFormOperation, MetaLeadForm } from './types';

type MetaFormFieldMappingProps = {
    readonly form: MetaLeadForm;
    readonly canManageMeta: boolean;
    readonly isSaving: boolean;
    readonly savingOperation: MetaFormOperation | null;
    readonly isDirty: boolean;
    readonly onRefreshQuestionsAction: (form: MetaLeadForm) => void | Promise<void>;
    readonly onReplaceMappingAction: (formId: string, mapping: MetaFieldMapping) => void;
    readonly onUpdateQuestionAction: (formId: string, sourceKey: string, target: MetaFieldKey | null) => void;
    readonly onSaveMappingAction: (form: MetaLeadForm, mapping: MetaFieldMapping) => void | Promise<void>;
};

const QUESTION_TYPE_LABELS: Readonly<Record<string, string>> = {
    FULL_NAME: '이름',
    PHONE: '전화번호',
    EMAIL: '이메일',
    CUSTOM: '직접 입력',
    MULTIPLE_CHOICE: '선택형'
};

const READINESS_LABELS = {
    questions: '신청 항목',
    name: '이름',
    mobile: '연락처',
    manager: '기본 담당자'
} as const;

function getQuestionTypeLabel(question: MetaLeadQuestion): string {
    if (question.options.length > 0) return '선택형';
    return QUESTION_TYPE_LABELS[question.type.toUpperCase()] || '직접 입력';
}

function getFieldLabel(key: MetaFieldKey): string {
    return META_FIELD_LABELS.find(field => field.key === key)?.label || key;
}

export function MetaFormFieldMapping({
    form,
    canManageMeta,
    isSaving,
    savingOperation,
    isDirty,
    onRefreshQuestionsAction,
    onReplaceMappingAction,
    onUpdateQuestionAction,
    onSaveMappingAction
}: MetaFormFieldMappingProps) {
    const readiness = getMetaFormReadiness({
        questions: form.questions,
        mapping: form.fieldMapping,
        defaultManagerId: form.defaultManagerId
    });
    const connectedFields = META_FIELD_LABELS
        .map(field => ({
            ...field,
            questions: form.questions.filter(question => (
                findMetaQuestionTarget(form.fieldMapping, question.key) === field.key
            ))
        }))
        .filter(field => field.questions.length > 0);

    return (
        <section
            className={styles.metaMappingSection}
            aria-labelledby={`meta-mapping-title-${form.id}`}
        >
            <div className={styles.metaMappingHeader}>
                <div className={styles.metaMappingIntro}>
                    <h4 id={`meta-mapping-title-${form.id}`}>신청 항목 연결</h4>
                    <p>Meta 광고 양식의 질문을 모객 DB에 저장할 항목과 연결해 주세요.</p>
                    {!readiness.ready && (
                        <small>
                            자동 수집 전 확인: {readiness.missing.map(item => READINESS_LABELS[item]).join(', ')}
                        </small>
                    )}
                </div>
                <div className={styles.metaMappingActions}>
                    <span className={readiness.ready ? styles.metaStatusOk : styles.metaStatusWarn}>
                        {readiness.ready ? '연동 준비 완료' : '연결 확인 필요'}
                    </span>
                    <span className={styles.metaMappingSaveStatus} role="status" aria-live="polite">
                        {savingOperation === 'mapping'
                            ? '저장 중…'
                            : isDirty
                                ? '변경사항 있음'
                                : '저장된 설정'}
                    </span>
                    {canManageMeta && (
                        <>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => void onRefreshQuestionsAction(form)}
                                disabled={isSaving}
                            >
                                <RefreshCw size={14} />
                                항목 새로고침
                            </button>
                            {form.questions.length > 0 && (
                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() => onReplaceMappingAction(
                                        form.id,
                                        suggestMetaFieldMapping(form.questions)
                                    )}
                                    disabled={isSaving}
                                >
                                    <WandSparkles size={14} />
                                    자동 연결
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div aria-busy={isSaving}>
                {form.questions.length === 0 ? (
                    <div className={styles.metaMappingEmpty}>
                        <strong>Meta 신청 항목을 먼저 불러와 주세요.</strong>
                        <p>항목을 불러오면 각 질문을 이름, 연락처, 희망 지역 등의 모객 DB 항목과 연결할 수 있습니다.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.metaMappingTable}>
                            <div className={styles.metaMappingTableHead} aria-hidden="true">
                                <span>Meta 신청 질문</span>
                                <span>모객 DB 저장 항목</span>
                            </div>
                            {form.questions.map(question => {
                                const selectedTarget = findMetaQuestionTarget(form.fieldMapping, question.key);
                                return (
                                    <label key={question.id || question.key} className={styles.metaMappingRow}>
                                        <span>
                                            <strong>{question.label || question.key}</strong>
                                            <small>{getQuestionTypeLabel(question)}</small>
                                        </span>
                                        <select
                                            value={selectedTarget || ''}
                                            disabled={!canManageMeta || isSaving}
                                            onChange={(event) => {
                                                const target = META_FIELD_LABELS.find(field => (
                                                    field.key === event.target.value
                                                ))?.key || null;
                                                onUpdateQuestionAction(form.id, question.key, target);
                                            }}
                                        >
                                            <option value="">연결 안 함</option>
                                            {META_FIELD_LABELS.map(field => (
                                                <option key={field.key} value={field.key}>{field.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                );
                            })}
                        </div>

                        <div className={styles.metaMappingPreview}>
                            <strong>저장 결과 미리보기</strong>
                            {connectedFields.length > 0 ? (
                                <div>
                                    {connectedFields.map(field => (
                                        <span key={field.key}>
                                            <b>{getFieldLabel(field.key)}</b>
                                            {field.questions.map(question => question.label || question.key).join(', ')}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p>연결된 항목이 없습니다.</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {canManageMeta && (
                <div className={styles.metaMappingFooter}>
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => void onSaveMappingAction(form, form.fieldMapping)}
                        disabled={isSaving || form.questions.length === 0}
                    >
                        {savingOperation === 'mapping' ? '저장 중…' : '연결 저장'}
                    </button>
                </div>
            )}
        </section>
    );
}
