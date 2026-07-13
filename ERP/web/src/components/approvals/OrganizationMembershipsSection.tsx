'use client';

import React from 'react';
import { Plus, Users } from 'lucide-react';
import type { ApprovalMembership, ApprovalOrganizationUnit, ApprovalPerson } from './approvalTypes';
import styles from './ApprovalSettings.module.css';

type OrganizationMembershipsSectionProps = {
    readonly disabled: boolean;
    readonly memberships: readonly ApprovalMembership[];
    readonly units: readonly ApprovalOrganizationUnit[];
    readonly onSave: (membership: Partial<ApprovalMembership>) => void;
    readonly people: readonly ApprovalPerson[];
};

export function OrganizationMembershipsSection({ disabled, memberships, units, onSave, people }: OrganizationMembershipsSectionProps) {
    const [profileId, setProfileId] = React.useState('');
    const [unitId, setUnitId] = React.useState('');
    const [jobTitle, setJobTitle] = React.useState('');
    const unitName = (id: string) => units.find(unit => unit.id === id)?.name ?? '미지정 조직';
    const personName = (id: string) => people.find(person => person.id === id)?.name ?? '알 수 없는 구성원';
    return (
        <section className={styles.panel}>
            <header><span><Users size={18} /><strong>조직 구성원</strong></span><small>{memberships.length}명</small></header>
            <div className={styles.rows}>
                {memberships.map(membership => (
                    <div className={styles.row} key={membership.id}>
                        <span><strong>{personName(membership.profileId)}</strong><small>{unitName(membership.unitId)} · {membership.jobTitle || '직책 없음'}</small></span>
                        {membership.primary && <span className={styles.primaryBadge}>주 소속</span>}
                    </div>
                ))}
                {memberships.length === 0 && <p className={styles.empty}>등록된 조직 구성원이 없습니다.</p>}
            </div>
            <form className={styles.formBand} onSubmit={event => {
                event.preventDefault();
                if (!profileId || !unitId) return;
                onSave({ active: true, jobTitle: jobTitle.trim(), positionRank: 0, primary: true, profileId: profileId.trim(), unitId });
                setProfileId(''); setJobTitle('');
            }}>
                <label><span>구성원</span><select onChange={event => setProfileId(event.target.value)} value={profileId}><option value="">구성원 선택</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                <label><span>소속 조직</span><select onChange={event => setUnitId(event.target.value)} value={unitId}><option value="">조직 선택</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                <label><span>직책</span><input onChange={event => setJobTitle(event.target.value)} placeholder="예: 팀장" value={jobTitle} /></label>
                <button disabled={disabled || !profileId || !unitId} type="submit"><Plus size={15} />구성원 추가</button>
            </form>
        </section>
    );
}
