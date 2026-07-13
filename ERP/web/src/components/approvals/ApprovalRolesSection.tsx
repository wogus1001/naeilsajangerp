'use client';

import React from 'react';
import { KeyRound, Plus } from 'lucide-react';
import type { ApprovalOrganizationUnit, ApprovalPerson, ApprovalRoleAssignment } from './approvalTypes';
import styles from './ApprovalSettings.module.css';

type ApprovalRolesSectionProps = {
    readonly disabled: boolean;
    readonly roles: readonly ApprovalRoleAssignment[];
    readonly units: readonly ApprovalOrganizationUnit[];
    readonly onSave: (role: Partial<ApprovalRoleAssignment>) => void;
    readonly people: readonly ApprovalPerson[];
};

export function ApprovalRolesSection({ disabled, roles, units, onSave, people }: ApprovalRolesSectionProps) {
    const [roleKey, setRoleKey] = React.useState('approval_admin');
    const [roleName, setRoleName] = React.useState('결재 관리자');
    const [profileId, setProfileId] = React.useState('');
    const [unitId, setUnitId] = React.useState('');
    const personName = (id: string) => people.find(person => person.id === id)?.name ?? '알 수 없는 구성원';
    return (
        <section className={styles.panel}>
            <header><span><KeyRound size={18} /><strong>결재 역할</strong></span><small>{roles.length}개</small></header>
            <div className={styles.rows}>
                {roles.map(role => (
                    <div className={styles.row} key={role.id}>
                        <span><strong>{role.roleName}</strong><small>{personName(role.profileId)} · {role.roleKey}</small></span>
                        <span className={styles.activeBadge}>사용</span>
                    </div>
                ))}
                {roles.length === 0 && <p className={styles.empty}>등록된 결재 역할이 없습니다.</p>}
            </div>
            <form className={styles.formBand} onSubmit={event => {
                event.preventDefault();
                if (!roleKey || !roleName || !profileId) return;
                onSave({ active: true, profileId: profileId.trim(), roleKey: roleKey.trim(), roleName: roleName.trim(), unitId: unitId || null });
                setProfileId('');
            }}>
                <label><span>역할 키</span><input onChange={event => setRoleKey(event.target.value)} value={roleKey} /></label>
                <label><span>역할명</span><input onChange={event => setRoleName(event.target.value)} value={roleName} /></label>
                <label><span>담당자</span><select onChange={event => setProfileId(event.target.value)} value={profileId}><option value="">담당자 선택</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                <label><span>적용 조직</span><select onChange={event => setUnitId(event.target.value)} value={unitId}><option value="">회사 전체</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                <button disabled={disabled || !profileId} type="submit"><Plus size={15} />역할 추가</button>
            </form>
        </section>
    );
}
