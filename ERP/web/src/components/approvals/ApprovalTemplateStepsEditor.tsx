'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ApprovalOrganization, ApprovalStepTarget, ApprovalTemplateStep } from './approvalTypes';
import styles from './ApprovalTemplates.module.css';

type Props = {
    readonly organization: ApprovalOrganization;
    readonly steps: readonly ApprovalTemplateStep[];
    readonly onChange: (steps: readonly ApprovalTemplateStep[]) => void;
};

function newStep(index: number): ApprovalTemplateStep {
    return {
        id: `step-${crypto.randomUUID()}`,
        label: `${index + 1}차 결재`,
        action: 'approval',
        mode: 'sequential',
        target: { kind: 'author_manager' },
        targetLabel: '작성자 소속 부서장'
    };
}

function targetForKind(kind: ApprovalStepTarget['kind'], organization: ApprovalOrganization): ApprovalStepTarget {
    if (kind === 'profiles') return { kind, profileIds: organization.people[0] ? [organization.people[0].id] : [] };
    if (kind === 'role') return { kind, roleKey: organization.roleAssignments[0]?.roleKey || '', unitId: null };
    if (kind === 'unit_manager' || kind === 'unit_members') return { kind, unitId: organization.units[0]?.id || '' };
    return { kind: 'author_manager' };
}

function targetLabel(target: ApprovalStepTarget, organization: ApprovalOrganization): string {
    if (target.kind === 'author_manager') return '작성자 소속 부서장';
    if (target.kind === 'profiles') return organization.people.find(person => person.id === target.profileIds[0])?.name || '직접 지정';
    if (target.kind === 'role') return organization.roleAssignments.find(role => role.roleKey === target.roleKey)?.roleName || target.roleKey || '결재 역할';
    const unit = organization.units.find(item => item.id === target.unitId)?.name || '조직 선택';
    return target.kind === 'unit_manager' ? `${unit} 부서장` : `${unit} 구성원`;
}

export function ApprovalTemplateStepsEditor({ organization, steps, onChange }: Props) {
    function update(index: number, patch: Partial<ApprovalTemplateStep>) {
        onChange(steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= steps.length) return;
        const next = [...steps];
        [next[index], next[target]] = [next[target]!, next[index]!];
        onChange(next);
    }

    return (
        <section className={styles.stepEditor}>
            <div className={styles.stepEditorHeader}>
                <div><h3>기본 결재선</h3><p>문서 제출 시 현재 조직을 기준으로 실제 결재자가 확정됩니다.</p></div>
                <button onClick={() => onChange([...steps, newStep(steps.length)])} type="button"><Plus size={15} />단계 추가</button>
            </div>
            {steps.map((step, index) => (
                <div className={styles.stepRow} key={step.id}>
                    <span className={styles.stepNumber}>{index + 1}</span>
                    <label><span>단계명</span><input onChange={event => update(index, { label: event.target.value })} value={step.label} /></label>
                    <label><span>처리 유형</span><select onChange={event => update(index, { action: event.target.value as ApprovalTemplateStep['action'] })} value={step.action}><option value="approval">결재</option><option value="agreement">합의</option><option value="acknowledgement">수신 확인</option></select></label>
                    <label><span>완료 조건</span><select onChange={event => update(index, { mode: event.target.value as ApprovalTemplateStep['mode'] })} value={step.mode}><option value="sequential">순차</option><option value="parallel_all">전원 처리</option><option value="parallel_any">1인 처리</option></select></label>
                    <label><span>대상 방식</span><select onChange={event => { const target = targetForKind(event.target.value as ApprovalStepTarget['kind'], organization); update(index, { target, targetLabel: targetLabel(target, organization) }); }} value={step.target.kind}><option value="author_manager">작성자 부서장</option><option value="unit_manager">지정 부서장</option><option value="unit_members">지정 부서원</option><option value="role">결재 역할</option><option value="profiles">직접 지정</option></select></label>
                    {step.target.kind === 'profiles' && <label><span>담당자</span><select onChange={event => { const target = { kind: 'profiles' as const, profileIds: [event.target.value] }; update(index, { target, targetLabel: targetLabel(target, organization) }); }} value={step.target.profileIds[0] || ''}><option value="">담당자 선택</option>{organization.people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
                    {step.target.kind === 'role' && <label><span>결재 역할</span><select onChange={event => { const target = { ...step.target, roleKey: event.target.value }; update(index, { target, targetLabel: targetLabel(target, organization) }); }} value={step.target.roleKey}><option value="">역할 선택</option>{organization.roleAssignments.map(role => <option key={role.id} value={role.roleKey}>{role.roleName}</option>)}</select></label>}
                    {(step.target.kind === 'unit_manager' || step.target.kind === 'unit_members') && <label><span>조직</span><select onChange={event => { const target = { ...step.target, unitId: event.target.value }; update(index, { target, targetLabel: targetLabel(target, organization) }); }} value={step.target.unitId}><option value="">조직 선택</option>{organization.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>}
                    <div className={styles.stepActions}>
                        <button aria-label="위로 이동" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp size={15} /></button>
                        <button aria-label="아래로 이동" disabled={index === steps.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown size={15} /></button>
                        <button aria-label="단계 삭제" disabled={steps.length === 1} onClick={() => onChange(steps.filter((_, stepIndex) => stepIndex !== index))} type="button"><Trash2 size={15} /></button>
                    </div>
                </div>
            ))}
        </section>
    );
}
