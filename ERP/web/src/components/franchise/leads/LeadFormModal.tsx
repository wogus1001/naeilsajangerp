"use client";

import React from 'react';
import { Settings2, X } from 'lucide-react';
import { useModalFocusTrap } from '@/components/common/useModalFocusTrap';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LeadRegionMultiSelect } from './LeadRegionMultiSelect';
import { LeadSourceOptionManager } from './LeadSourceOptionManager';
import { formatLeadPhoneInput } from './leadFormFormatters';
import type { LeadFormState } from './types';
import {
    FRANCHISE_LEAD_GRADES,
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadGradeLabel
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import {
    getSelectableFranchiseLeadSourceOptions,
    type FranchiseLeadSourceOption
} from '@/lib/franchise-lead-source-options';

type LeadFormModalProps = {
    readonly form: LeadFormState;
    readonly isSaving: boolean;
    readonly onFormChangeAction: React.Dispatch<React.SetStateAction<LeadFormState>>;
    readonly onCloseAction: () => void;
    readonly onSubmitAction: React.FormEventHandler<HTMLFormElement>;
    readonly renderManagerOptionsAction: (selectedManagerId?: string) => React.ReactNode;
    readonly sourceOptions: readonly FranchiseLeadSourceOption[];
    readonly canManageSourceOptions: boolean;
    readonly isSourceOptionStorageReady: boolean;
    readonly isSourceOptionLoading: boolean;
    readonly isSourceOptionSaving: boolean;
    readonly sourceOptionError: string;
    readonly onRefreshSourceOptionsAction: () => Promise<void>;
    readonly onCreateSourceOptionAction: (label: string) => Promise<void>;
    readonly onUpdateSourceOptionAction: (
        optionId: string,
        updates: { readonly label?: string; readonly isActive?: boolean }
    ) => Promise<void>;
};

export function LeadFormModal({
    form,
    isSaving,
    onFormChangeAction,
    onCloseAction,
    onSubmitAction,
    renderManagerOptionsAction,
    sourceOptions,
    canManageSourceOptions,
    isSourceOptionStorageReady,
    isSourceOptionLoading,
    isSourceOptionSaving,
    sourceOptionError,
    onRefreshSourceOptionsAction,
    onCreateSourceOptionAction,
    onUpdateSourceOptionAction
}: LeadFormModalProps) {
    const [isSourceManagerOpen, setIsSourceManagerOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement | null>(null);
    const title = form.id ? '가맹 희망자 수정' : '가맹 희망자 등록';
    const selectableSourceOptions = getSelectableFranchiseLeadSourceOptions(sourceOptions, form.source);
    useModalFocusTrap({
        dialogRef: formRef,
        isOpen: true,
        onClose: onCloseAction
    });

    React.useEffect(() => {
        const parentDialog = Array.from(
            document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
        ).filter(dialog => dialog !== formRef.current).at(-1);
        if (!parentDialog) return;
        const previousAriaModal = parentDialog.getAttribute('aria-modal');
        parentDialog.setAttribute('aria-modal', 'false');
        return () => {
            if (previousAriaModal === null) {
                parentDialog.removeAttribute('aria-modal');
                return;
            }
            parentDialog.setAttribute('aria-modal', previousAriaModal);
        };
    }, []);

    return (
        <div className={styles.modalBackdrop}>
            <form
                ref={formRef}
                className={styles.modalCard}
                onSubmit={onSubmitAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="franchise-lead-modal-title"
                tabIndex={-1}
            >
                <div className={styles.modalHeader}>
                    <div>
                        <h2 id="franchise-lead-modal-title">{title}</h2>
                        <p>본사 모객 DB에 필요한 중요 정보만 빠르게 기록합니다.</p>
                    </div>
                    <button type="button" onClick={onCloseAction} className={styles.closeButton} aria-label={`${title} 닫기`}>
                        <X size={20} strokeWidth={2.2} />
                    </button>
                </div>

                <div className={styles.formGrid}>
                    <label>
                        가맹 희망자명 *
                        <input value={form.name} onChange={(event) => onFormChangeAction(prev => ({ ...prev, name: event.target.value }))} placeholder="홍길동" />
                    </label>
                    <label>
                        연락처
                        <input
                            value={form.mobile}
                            onChange={(event) => onFormChangeAction(prev => ({ ...prev, mobile: formatLeadPhoneInput(event.target.value) }))}
                            placeholder="010-0000-0000"
                            inputMode="numeric"
                            autoComplete="tel"
                        />
                    </label>
                    <label>
                        상태
                        <select value={form.status} onChange={(event) => onFormChangeAction(prev => ({ ...prev, status: event.target.value as FranchiseLeadStatus }))}>
                            {FRANCHISE_LEAD_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        등급
                        <select value={form.grade} onChange={(event) => onFormChangeAction(prev => ({ ...prev, grade: event.target.value }))}>
                            <option value="">미지정</option>
                            {FRANCHISE_LEAD_GRADES.map(grade => (
                                <option key={grade} value={grade}>{getFranchiseLeadGradeLabel(grade)}</option>
                            ))}
                        </select>
                    </label>
                    <div className={styles.formField}>
                        <div className={styles.formFieldLabelRow}>
                            <span id="lead-source-label">유입경로</span>
                            <button
                                type="button"
                                onClick={() => setIsSourceManagerOpen(current => !current)}
                                aria-expanded={isSourceManagerOpen}
                            >
                                <Settings2 size={14} />
                                항목 관리
                            </button>
                        </div>
                        <select
                            value={form.source}
                            aria-labelledby="lead-source-label"
                            onChange={(event) => onFormChangeAction(prev => ({ ...prev, source: event.target.value }))}
                        >
                            <option value="">미지정</option>
                            {selectableSourceOptions.map(option => (
                                <option key={option.code} value={option.code}>
                                    {option.label}{option.isActive ? '' : ' (사용 중지)'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formField}>
                        <span>희망지역</span>
                        <LeadRegionMultiSelect
                            value={form.desiredRegion}
                            onChangeAction={(desiredRegion) => onFormChangeAction(prev => ({ ...prev, desiredRegion }))}
                        />
                    </div>
                    <label>
                        예산 최소(만원)
                        <input value={form.budgetMin} onChange={(event) => onFormChangeAction(prev => ({ ...prev, budgetMin: event.target.value }))} placeholder="10000" />
                    </label>
                    <label>
                        예산 최대(만원)
                        <input value={form.budgetMax} onChange={(event) => onFormChangeAction(prev => ({ ...prev, budgetMax: event.target.value }))} placeholder="20000" />
                    </label>
                    <label>
                        관심브랜드
                        <input value={form.interestedBrand} onChange={(event) => onFormChangeAction(prev => ({ ...prev, interestedBrand: event.target.value }))} placeholder="미카도" />
                    </label>
                    <label>
                        담당자
                        <select value={form.managerId} onChange={(event) => onFormChangeAction(prev => ({ ...prev, managerId: event.target.value }))}>
                            {renderManagerOptionsAction(form.managerId)}
                        </select>
                    </label>
                    <label>
                        다음 연락일
                        <input type="datetime-local" value={form.nextContactAt} onChange={(event) => onFormChangeAction(prev => ({ ...prev, nextContactAt: event.target.value }))} />
                    </label>
                </div>

                {isSourceManagerOpen && (
                    <LeadSourceOptionManager
                        options={sourceOptions}
                        canManage={canManageSourceOptions}
                        storageReady={isSourceOptionStorageReady}
                        isLoading={isSourceOptionLoading}
                        isSaving={isSourceOptionSaving}
                        loadError={sourceOptionError}
                        onRefreshAction={onRefreshSourceOptionsAction}
                        onCreateAction={onCreateSourceOptionAction}
                        onUpdateAction={onUpdateSourceOptionAction}
                    />
                )}

                <label className={styles.memoLabel}>
                    메모
                    <textarea value={form.memo} onChange={(event) => onFormChangeAction(prev => ({ ...prev, memo: event.target.value }))} placeholder="상담 내용, 관심 조건, 후속 액션을 기록하세요." />
                </label>

                <div className={styles.modalActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onCloseAction}>취소</button>
                    <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                        {isSaving ? '저장 중' : '저장'}
                    </button>
                </div>
            </form>
        </div>
    );
}
