"use client";

import React from 'react';
import { X } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LeadRegionMultiSelect } from './LeadRegionMultiSelect';
import { formatLeadPhoneInput } from './leadFormFormatters';
import type { LeadFormState } from './types';
import {
    FRANCHISE_LEAD_GRADES,
    FRANCHISE_LEAD_SOURCES,
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadGradeLabel,
    getFranchiseLeadSourceLabel
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';

type LeadFormModalProps = {
    readonly form: LeadFormState;
    readonly isSaving: boolean;
    readonly onFormChangeAction: React.Dispatch<React.SetStateAction<LeadFormState>>;
    readonly onCloseAction: () => void;
    readonly onSubmitAction: React.FormEventHandler<HTMLFormElement>;
    readonly renderManagerOptionsAction: (selectedManagerId?: string) => React.ReactNode;
};

export function LeadFormModal({
    form,
    isSaving,
    onFormChangeAction,
    onCloseAction,
    onSubmitAction,
    renderManagerOptionsAction
}: LeadFormModalProps) {
    const title = form.id ? '가맹 희망자 수정' : '가맹 희망자 등록';

    return (
        <div className={styles.modalBackdrop}>
            <form className={styles.modalCard} onSubmit={onSubmitAction} role="dialog" aria-modal="true" aria-labelledby="franchise-lead-modal-title">
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
                    <label>
                        유입경로
                        <select value={form.source} onChange={(event) => onFormChangeAction(prev => ({ ...prev, source: event.target.value }))}>
                            <option value="">미지정</option>
                            {FRANCHISE_LEAD_SOURCES.map(source => (
                                <option key={source} value={source}>{getFranchiseLeadSourceLabel(source)}</option>
                            ))}
                        </select>
                    </label>
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
