'use client';

import React from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { APPROVAL_ROLE_OPTIONS, approvalRoleLabel } from './approvalLabels';
import type { ApprovalOrganizationUnit, ApprovalPerson, ApprovalRoleAssignment } from './approvalTypes';
import styles from './ApprovalSettings.module.css';

type ApprovalRolesSectionProps = {
    readonly disabled: boolean;
    readonly roles: readonly ApprovalRoleAssignment[];
    readonly units: readonly ApprovalOrganizationUnit[];
    readonly onDelete: (roleId: string) => void;
    readonly onSave: (role: Partial<ApprovalRoleAssignment>) => void;
    readonly people: readonly ApprovalPerson[];
};

export function ApprovalRolesSection({ disabled, roles, units, onDelete, onSave, people }: ApprovalRolesSectionProps) {
    const [roleKey, setRoleKey] = React.useState('approval_admin');
    const [profileId, setProfileId] = React.useState('');
    const [unitId, setUnitId] = React.useState('');
    const [pendingDelete, setPendingDelete] = React.useState<ApprovalRoleAssignment | null>(null);
    const selectedRole = APPROVAL_ROLE_OPTIONS.find(role => role.value === roleKey) ?? APPROVAL_ROLE_OPTIONS[0];
    const companyWideRole = selectedRole.companyWide;
    const personName = (id: string) => people.find(person => person.id === id)?.name ?? '알 수 없는 구성원';
    const unitName = (id: string | null) => units.find(unit => unit.id === id)?.name ?? '회사 전체';
    return (
        <section className={styles.panel}>
            <header><span><KeyRound size={18} /><strong>결재 담당자</strong></span><small>{roles.length}명</small></header>
            <div className={styles.rows}>
                {roles.map(role => (
                    <div className={styles.row} key={role.id}>
                        <span><strong>{approvalRoleLabel(role.roleKey, role.roleName)}</strong><small>{personName(role.profileId)} · {unitName(role.unitId)}</small></span>
                        <span className={styles.rowActions}>
                            <span className={styles.activeBadge}>사용</span>
                            <button aria-label={`${personName(role.profileId)} 결재 담당 해제`} className={styles.deleteButton} disabled={disabled} onClick={() => setPendingDelete(role)} title="담당자 해제" type="button"><Trash2 size={16} /></button>
                        </span>
                    </div>
                ))}
                {roles.length === 0 && <p className={styles.empty}>등록된 결재 담당자가 없습니다.</p>}
            </div>
            <form className={styles.formBand} onSubmit={event => {
                event.preventDefault();
                if (!roleKey || !profileId) return;
                onSave({ active: true, profileId: profileId.trim(), roleKey, roleName: selectedRole.label, unitId: companyWideRole ? null : unitId || null });
                setProfileId('');
            }}>
                <label><span>담당 업무</span><select onChange={event => { setRoleKey(event.target.value); if (event.target.value === 'approval_admin') setUnitId(''); }} value={roleKey}>{APPROVAL_ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select><small className={styles.fieldHelp}>{selectedRole.description}</small></label>
                <label><span>담당자</span><select onChange={event => setProfileId(event.target.value)} value={profileId}><option value="">담당자 선택</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                <label><span>담당 조직</span><select disabled={companyWideRole} onChange={event => setUnitId(event.target.value)} value={companyWideRole ? '' : unitId}><option value="">회사 전체</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                <button disabled={disabled || !profileId} type="submit"><Plus size={15} />담당자 추가</button>
            </form>
            <ConfirmModal
                confirmText="담당 해제"
                isDanger
                isOpen={pendingDelete !== null}
                message={`${pendingDelete ? personName(pendingDelete.profileId) : '선택한 구성원'}의 ${pendingDelete ? approvalRoleLabel(pendingDelete.roleKey, pendingDelete.roleName) : '결재 담당'} 지정을 해제할까요?`}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) onDelete(pendingDelete.id); }}
                title="결재 담당자 해제"
            />
        </section>
    );
}
