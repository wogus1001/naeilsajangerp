'use client';

import React from 'react';
import { Building2, Plus } from 'lucide-react';
import type { ApprovalOrganizationUnit, ApprovalPerson } from './approvalTypes';
import styles from './ApprovalSettings.module.css';

type OrganizationUnitsSectionProps = {
    readonly disabled: boolean;
    readonly units: readonly ApprovalOrganizationUnit[];
    readonly onSave: (unit: Partial<ApprovalOrganizationUnit>) => void;
    readonly people: readonly ApprovalPerson[];
};

export function OrganizationUnitsSection({ disabled, units, onSave, people }: OrganizationUnitsSectionProps) {
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [parentId, setParentId] = React.useState('');
    const [managerProfileId, setManagerProfileId] = React.useState('');
    return (
        <section className={styles.panel}>
            <header><span><Building2 size={18} /><strong>조직 단위</strong></span><small>{units.length}개</small></header>
            <div className={styles.rows}>
                {units.map(unit => (
                    <div className={styles.row} key={unit.id}>
                        <span><strong>{unit.name}</strong><small>{unit.code || '코드 없음'} · {unit.parentId ? '하위 조직' : '최상위 조직'}</small></span>
                        <span className={unit.active ? styles.activeBadge : styles.inactiveBadge}>{unit.active ? '사용' : '중지'}</span>
                    </div>
                ))}
                {units.length === 0 && <p className={styles.empty}>등록된 조직 단위가 없습니다.</p>}
            </div>
            <form className={styles.formBand} onSubmit={event => {
                event.preventDefault();
                if (!name.trim()) return;
                onSave({ active: true, code: code.trim(), managerProfileId: managerProfileId.trim() || null, name: name.trim(), parentId: parentId || null, sortOrder: units.length });
                setName(''); setCode(''); setManagerProfileId('');
            }}>
                <label><span>조직명</span><input onChange={event => setName(event.target.value)} placeholder="예: 운영본부" value={name} /></label>
                <label><span>조직 코드</span><input onChange={event => setCode(event.target.value)} placeholder="예: OPS" value={code} /></label>
                <label><span>상위 조직</span><select onChange={event => setParentId(event.target.value)} value={parentId}><option value="">최상위</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                <label><span>부서장</span><select onChange={event => setManagerProfileId(event.target.value)} value={managerProfileId}><option value="">미지정</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                <button disabled={disabled || !name.trim()} type="submit"><Plus size={15} />조직 추가</button>
            </form>
        </section>
    );
}
