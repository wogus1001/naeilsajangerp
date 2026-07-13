'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Check, ChevronRight, Search, Settings2, Trash2, UserRound, Users, X } from 'lucide-react';
import { ApprovalLinePreview } from './ApprovalLinePreview';
import {
    approvalLineSelectionCount,
    moveApprovalLineSelection,
    selectedApprovalSteps,
    updateApprovalLineSelection
} from './approvalLineSelections';
import type {
    ApprovalLineSelections,
    ApprovalOrganization,
    ApprovalTemplateStep
} from './approvalTypes';
import styles from './ApprovalLineSelector.module.css';

type ApprovalLineSelectorProps = {
    readonly organization: ApprovalOrganization | null;
    readonly readerProfileIds: readonly string[];
    readonly selections: ApprovalLineSelections;
    readonly steps: readonly ApprovalTemplateStep[];
    readonly onChange: (selections: ApprovalLineSelections) => void;
    readonly onReaderChange: (profileIds: readonly string[]) => void;
};

function toggle(values: readonly string[], id: string, checked: boolean): readonly string[] {
    return checked ? [...new Set([...values, id])] : values.filter(value => value !== id);
}

export function ApprovalLineSelector({
    onChange,
    onReaderChange,
    organization,
    readerProfileIds,
    selections,
    steps
}: ApprovalLineSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [activeTarget, setActiveTarget] = React.useState(steps[0]?.id ?? 'reference');
    const [query, setQuery] = React.useState('');
    const [unitId, setUnitId] = React.useState('all');
    const [draftSelections, setDraftSelections] = React.useState<ApprovalLineSelections>(selections);
    const [draftReaders, setDraftReaders] = React.useState<readonly string[]>(readerProfileIds);
    const closeButtonRef = React.useRef<HTMLButtonElement>(null);
    const dialogTitleId = React.useId();

    const previewSteps = selectedApprovalSteps(steps, selections, organization);
    const selectedCount = approvalLineSelectionCount(selections) + readerProfileIds.length;
    const activeStep = steps.find(step => step.id === activeTarget) ?? null;
    const people = organization?.people.filter(person => {
        const nameMatch = `${person.name} ${person.email}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
        if (!nameMatch) return false;
        if (unitId === 'all') return true;
        return organization.memberships.some(membership => membership.profileId === person.id && membership.unitId === unitId && membership.active !== false);
    }) ?? [];

    React.useEffect(() => {
        if (!open) return;
        closeButtonRef.current?.focus();
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    function openSelector() {
        setDraftSelections(selections);
        setDraftReaders(readerProfileIds);
        setActiveTarget(steps[0]?.id ?? 'reference');
        setOpen(true);
    }

    function personDescription(profileId: string): string {
        const membership = organization?.memberships.find(item => item.profileId === profileId && item.active !== false);
        const unit = organization?.units.find(item => item.id === membership?.unitId);
        return [unit?.name, membership?.jobTitle].filter(Boolean).join(' · ') || '소속 정보 없음';
    }

    return (
        <>
            <div className={styles.summary}>
                <ApprovalLinePreview kind="template" steps={previewSteps} />
                <div className={styles.summaryFooter}>
                    <span>{selectedCount > 0 ? `${selectedCount}명 직접 지정` : '양식의 기본 결재선을 사용합니다.'}</span>
                    <button disabled={!organization || steps.length === 0} onClick={openSelector} type="button"><Settings2 size={15} />결재선 설정</button>
                </div>
            </div>
            {open && organization && (
                <div className={styles.overlay} onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}>
                    <section aria-labelledby={dialogTitleId} aria-modal="true" className={styles.dialog} role="dialog">
                        <header>
                            <div><strong id={dialogTitleId}>결재선 설정</strong><span>결재 단계와 참조자를 문서에 맞게 선택합니다.</span></div>
                            <button aria-label="닫기" onClick={() => setOpen(false)} ref={closeButtonRef} type="button"><X size={20} /></button>
                        </header>
                        <div className={styles.dialogBody}>
                            <aside className={styles.peoplePanel}>
                                <label className={styles.search}><Search size={16} /><input onChange={event => setQuery(event.target.value)} placeholder="이름 또는 이메일 검색" value={query} /></label>
                                <select aria-label="조직 선택" onChange={event => setUnitId(event.target.value)} value={unitId}>
                                    <option value="all">전체 조직</option>
                                    {organization.units.filter(unit => unit.active).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                                </select>
                                <div className={styles.peopleList}>
                                    {people.map(person => {
                                        const isReference = activeTarget === 'reference';
                                        const selected = isReference
                                            ? draftReaders.includes(person.id)
                                            : activeStep ? (draftSelections[activeStep.id] ?? []).includes(person.id) : false;
                                        const disabled = person.id === organization.requesterProfileId;
                                        return (
                                            <label className={`${styles.personRow} ${selected ? styles.selectedPerson : ''}`} key={person.id}>
                                                <input
                                                    checked={selected}
                                                    disabled={disabled}
                                                    onChange={event => {
                                                        if (isReference) setDraftReaders(toggle(draftReaders, person.id, event.target.checked));
                                                        else if (activeStep) setDraftSelections(updateApprovalLineSelection(draftSelections, activeStep, person.id, event.target.checked));
                                                    }}
                                                    type="checkbox"
                                                />
                                                <span className={styles.personIcon}><UserRound size={16} /></span>
                                                <span><strong>{person.name}</strong><small>{disabled ? '본인' : personDescription(person.id)}</small></span>
                                            </label>
                                        );
                                    })}
                                    {people.length === 0 && <p className={styles.empty}>조건에 맞는 구성원이 없습니다.</p>}
                                </div>
                            </aside>
                            <div className={styles.linePanel}>
                                <h3>결재 순서</h3>
                                <ol>
                                    {steps.map((step, index) => {
                                        const selectedProfiles = draftSelections[step.id] ?? [];
                                        const selectedNames = selectedProfiles.map(profileId => organization.people.find(person => person.id === profileId)?.name).filter(Boolean);
                                        return (
                                            <li key={step.id}>
                                                <button className={activeTarget === step.id ? styles.activeTarget : ''} onClick={() => setActiveTarget(step.id)} type="button">
                                                    <span className={styles.order}>{index + 1}</span>
                                                    <span><strong>{step.label}</strong><small>{selectedNames.length > 0 ? step.mode === 'sequential' ? selectedNames.join(' → ') : `${selectedNames.length}명 선택` : `자동 지정 · ${step.targetLabel}`}</small></span>
                                                    {selectedNames.length > 0 ? <Check size={16} /> : <ChevronRight size={16} />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ol>
                                {activeStep && (draftSelections[activeStep.id]?.length ?? 0) > 0 && (
                                    <div className={styles.selectedApprovers}>
                                        <strong>{activeStep.mode === 'sequential' ? '결재 순서' : '선택한 결재자'}</strong>
                                        <ol>
                                            {(draftSelections[activeStep.id] ?? []).map((profileId, index, selectedProfiles) => {
                                                const person = organization.people.find(item => item.id === profileId);
                                                return (
                                                    <li key={profileId}>
                                                        <span className={styles.selectedOrder}>{index + 1}</span>
                                                        <span><strong>{person?.name ?? '선택한 구성원'}</strong><small>{personDescription(profileId)}</small></span>
                                                        {activeStep.mode === 'sequential' && (
                                                            <span className={styles.orderButtons}>
                                                                <button aria-label={`${person?.name ?? '결재자'} 위로 이동`} disabled={index === 0} onClick={() => setDraftSelections(moveApprovalLineSelection(draftSelections, activeStep.id, profileId, -1))} type="button"><ArrowUp size={15} /></button>
                                                                <button aria-label={`${person?.name ?? '결재자'} 아래로 이동`} disabled={index === selectedProfiles.length - 1} onClick={() => setDraftSelections(moveApprovalLineSelection(draftSelections, activeStep.id, profileId, 1))} type="button"><ArrowDown size={15} /></button>
                                                            </span>
                                                        )}
                                                        <button aria-label={`${person?.name ?? '결재자'} 제거`} className={styles.removeApprover} onClick={() => setDraftSelections(updateApprovalLineSelection(draftSelections, activeStep, profileId, false))} type="button"><Trash2 size={15} /></button>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </div>
                                )}
                                <button className={`${styles.referenceTarget} ${activeTarget === 'reference' ? styles.activeTarget : ''}`} onClick={() => setActiveTarget('reference')} type="button">
                                    <Users size={18} /><span><strong>참조</strong><small>{draftReaders.length > 0 ? `${draftReaders.length}명 선택` : '참조자 없음'}</small></span><ChevronRight size={16} />
                                </button>
                                <p className={styles.guidance}>{activeTarget === 'reference' ? '참조자는 결재 순서에는 영향을 주지 않고 문서를 열람합니다.' : activeStep?.mode === 'sequential' ? '여러 명을 선택하면 위에서 아래 순서대로 결재가 진행됩니다. 선택하지 않으면 양식의 기본 담당자가 자동 지정됩니다.' : activeStep?.mode === 'parallel_any' ? '선택한 결재자 중 한 명이 처리하면 다음 단계로 이동합니다.' : '선택한 결재자 전원이 처리하면 다음 단계로 이동합니다.'}</p>
                            </div>
                        </div>
                        <footer>
                            <button onClick={() => setOpen(false)} type="button">취소</button>
                            <button className={styles.applyButton} onClick={() => { onChange(draftSelections); onReaderChange(draftReaders); setOpen(false); }} type="button">적용</button>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
