'use client';

import React from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type { ApprovalDelegation, ApprovalPerson } from './approvalTypes';
import type { ApprovalDelegationInput } from './approvalApi';
import styles from './ApprovalSettings.module.css';

type ApprovalDelegationsSectionProps = {
    readonly delegations: readonly ApprovalDelegation[];
    readonly disabled: boolean;
    readonly onCreate: (input: ApprovalDelegationInput) => Promise<boolean>;
    readonly onDelete: (id: string) => void;
    readonly people: readonly ApprovalPerson[];
    readonly requesterProfileId: string;
};

const SCOPES = [
    { value: 'approval', label: '결재' },
    { value: 'agreement', label: '합의' },
    { value: 'acknowledgement', label: '수신 확인' }
] as const;

function scopeLabel(value: string): string {
    return SCOPES.find(scope => scope.value === value)?.label ?? '결재 처리';
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}

export function ApprovalDelegationsSection({ delegations, disabled, onCreate, onDelete, people, requesterProfileId }: ApprovalDelegationsSectionProps) {
    const [delegateProfileId, setDelegateProfileId] = React.useState('');
    const [startsAt, setStartsAt] = React.useState('');
    const [endsAt, setEndsAt] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [actionScope, setActionScope] = React.useState<readonly string[]>(['approval']);
    const [deleteId, setDeleteId] = React.useState('');
    const personName = (id: string) => people.find(person => person.id === id)?.name ?? '알 수 없는 구성원';
    return (
        <section className={styles.panel}>
            <header><span><ShieldCheck size={18} /><strong>결재 위임</strong></span><small>{delegations.length}건</small></header>
            <div className={styles.rows}>
                {delegations.map(delegation => (
                    <div className={styles.row} key={delegation.id}>
                        <span><strong>{delegation.delegatorProfileId === requesterProfileId ? `${personName(delegation.delegateProfileId)}에게 위임` : `${personName(delegation.delegatorProfileId)}님의 결재를 대신 처리`}</strong><small>{formatDate(delegation.startsAt)} ~ {formatDate(delegation.endsAt)} · {delegation.actionScope.map(scopeLabel).join(', ')}</small></span>
                        {delegation.delegatorProfileId === requesterProfileId && <button aria-label="위임 해제" className={styles.deleteButton} onClick={() => setDeleteId(delegation.id)} type="button"><Trash2 size={15} /></button>}
                    </div>
                ))}
                {delegations.length === 0 && <p className={styles.empty}>현재 적용 중인 결재 위임이 없습니다.</p>}
            </div>
            <form className={styles.formBand} onSubmit={async event => {
                event.preventDefault();
                const start = new Date(startsAt);
                const end = new Date(endsAt);
                if (!delegateProfileId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
                const saved = await onCreate({ actionScope, delegateProfileId: delegateProfileId.trim(), endsAt: end.toISOString(), reason: reason.trim(), startsAt: start.toISOString() });
                if (saved) { setDelegateProfileId(''); setReason(''); }
            }}>
                <label><span>대리자</span><select onChange={event => setDelegateProfileId(event.target.value)} value={delegateProfileId}><option value="">대리자 선택</option>{people.filter(person => person.id !== requesterProfileId).map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                <label><span>시작</span><input onChange={event => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} /></label>
                <label><span>종료</span><input onChange={event => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} /></label>
                <label><span>사유</span><input onChange={event => setReason(event.target.value)} placeholder="휴가, 출장 등" value={reason} /></label>
                <fieldset className={styles.scopeField}>
                    <legend>위임 범위</legend>
                    {SCOPES.map(scope => (
                        <label key={scope.value}><input checked={actionScope.includes(scope.value)} onChange={event => setActionScope(event.target.checked ? [...actionScope, scope.value] : actionScope.filter(item => item !== scope.value))} type="checkbox" />{scope.label}</label>
                    ))}
                </fieldset>
                <button disabled={disabled || !delegateProfileId || !startsAt || !endsAt || actionScope.length === 0} type="submit"><Plus size={15} />위임 등록</button>
            </form>
            <ConfirmModal
                confirmText="위임 해제"
                isDanger
                isOpen={Boolean(deleteId)}
                message="선택한 결재 위임을 즉시 해제할까요?"
                onClose={() => setDeleteId('')}
                onConfirm={() => onDelete(deleteId)}
                title="결재 위임 해제"
            />
        </section>
    );
}
