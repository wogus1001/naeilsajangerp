'use client';

import React from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type { ApprovalOrganizationUnit, ApprovalPerson } from './approvalTypes';
import styles from './ApprovalSettings.module.css';

type OrganizationUnitsSectionProps = {
    readonly disabled: boolean;
    readonly units: readonly ApprovalOrganizationUnit[];
    readonly onDelete: (unitId: string) => void;
    readonly onSave: (unit: Partial<ApprovalOrganizationUnit>) => Promise<boolean>;
    readonly people: readonly ApprovalPerson[];
};

export function OrganizationUnitsSection({ disabled, units, onDelete, onSave, people }: OrganizationUnitsSectionProps) {
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [parentId, setParentId] = React.useState('');
    const [managerProfileId, setManagerProfileId] = React.useState('');
    const [pendingDelete, setPendingDelete] = React.useState<ApprovalOrganizationUnit | null>(null);
    const unitName = (id: string | null) => units.find(unit => unit.id === id)?.name ?? '최상위 조직';
    return (
        <section className={styles.panel}>
            <header><span><Building2 size={18} /><strong>부서와 팀</strong></span><small>{units.length}개</small></header>
            <div className={styles.rows}>
                {units.map(unit => (
                    <div className={styles.row} key={unit.id}>
                        <span><strong>{unit.name}</strong><small>{unit.parentId ? `${unitName(unit.parentId)} 소속` : '최상위 조직'}{unit.code ? ` · 내부 코드 ${unit.code}` : ''}</small></span>
                        <span className={styles.rowActions}>
                            <span className={unit.active ? styles.activeBadge : styles.inactiveBadge}>{unit.active ? '사용' : '중지'}</span>
                            <button aria-label={`${unit.name} 삭제`} className={styles.deleteButton} disabled={disabled} onClick={() => setPendingDelete(unit)} title="조직 삭제" type="button"><Trash2 size={16} /></button>
                        </span>
                    </div>
                ))}
                {units.length === 0 && <p className={styles.empty}>등록된 부서나 팀이 없습니다.</p>}
            </div>
            <form className={styles.formBand} onSubmit={async event => {
                event.preventDefault();
                if (!name.trim()) return;
                const saved = await onSave({ active: true, code: code.trim(), managerProfileId: managerProfileId.trim() || null, name: name.trim(), parentId: parentId || null, sortOrder: units.length });
                if (saved) { setName(''); setCode(''); setManagerProfileId(''); }
            }}>
                <label><span>부서·팀 이름</span><input onChange={event => setName(event.target.value)} placeholder="예: 운영본부" value={name} /></label>
                <label><span>내부 코드 (선택)</span><input onChange={event => setCode(event.target.value)} placeholder="예: OPS" value={code} /></label>
                <label><span>상위 부서</span><select onChange={event => setParentId(event.target.value)} value={parentId}><option value="">최상위 조직</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                <label><span>부서장</span><select onChange={event => setManagerProfileId(event.target.value)} value={managerProfileId}><option value="">미지정</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                <button disabled={disabled || !name.trim()} type="submit"><Plus size={15} />부서·팀 추가</button>
            </form>
            <ConfirmModal
                confirmText="삭제"
                isDanger
                isOpen={pendingDelete !== null}
                message={`${pendingDelete?.name ?? '선택한 조직'}을 삭제할까요? 소속 구성원, 하위 조직, 결재 담당자가 있으면 삭제할 수 없습니다.`}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) onDelete(pendingDelete.id); }}
                title="조직 삭제"
            />
        </section>
    );
}
