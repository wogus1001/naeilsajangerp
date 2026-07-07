"use client";

import { RotateCcw, Save } from 'lucide-react';
import { CATEGORY_OPTIONS } from '../../contracts/vendor/vendorContractsModel';
import type { VendorMasterForm } from './vendorMasterApi';
import styles from './vendorMasterForm.module.css';

type Props = {
    readonly form: VendorMasterForm;
    readonly saving: boolean;
    readonly schemaReady: boolean;
    readonly onChange: (form: VendorMasterForm) => void;
    readonly onReset: () => void;
    readonly onSubmit: () => void;
};

function categoryValue(value: string) {
    return CATEGORY_OPTIONS.find(option => option.value === value)?.value || 'other';
}

function statusValue(value: string) {
    return value === 'inactive' ? 'inactive' : 'active';
}

export function VendorMasterFormPanel({
    form,
    saving,
    schemaReady,
    onChange,
    onReset,
    onSubmit
}: Props) {
    return (
        <div className={styles.formBox}>
            <div className={styles.statusLine}>
                <strong>{form.id ? '업체 정보 수정' : '업체 등록'}</strong>
                <span>계약 등록 전에도 거래처를 먼저 등록할 수 있습니다.</span>
            </div>
            <div className={styles.formGrid}>
                <label>
                    업체명
                    <input
                        value={form.vendorName}
                        onChange={event => onChange({ ...form, vendorName: event.target.value })}
                        placeholder="예: 내일식자재"
                    />
                </label>
                <label>
                    구분
                    <select
                        value={form.category}
                        onChange={event => onChange({ ...form, category: categoryValue(event.target.value) })}
                    >
                        {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </label>
                <label>
                    담당자
                    <input
                        value={form.contactName}
                        onChange={event => onChange({ ...form, contactName: event.target.value })}
                        placeholder="담당자명"
                    />
                </label>
                <label>
                    연락처
                    <input
                        value={form.contactPhone}
                        onChange={event => onChange({ ...form, contactPhone: event.target.value })}
                        placeholder="010-0000-0000"
                    />
                </label>
                <label>
                    이메일
                    <input
                        value={form.contactEmail}
                        onChange={event => onChange({ ...form, contactEmail: event.target.value })}
                        placeholder="vendor@example.com"
                    />
                </label>
                <label>
                    사업자등록번호
                    <input
                        value={form.businessNumber}
                        onChange={event => onChange({ ...form, businessNumber: event.target.value })}
                        placeholder="000-00-00000"
                    />
                </label>
                <label>
                    상태
                    <select
                        value={form.status}
                        onChange={event => onChange({ ...form, status: statusValue(event.target.value) })}
                    >
                        <option value="active">거래중</option>
                        <option value="inactive">거래 중지</option>
                    </select>
                </label>
                <label className={styles.wide}>
                    메모
                    <textarea
                        rows={3}
                        value={form.memo}
                        onChange={event => onChange({ ...form, memo: event.target.value })}
                        placeholder="계약 전 확인사항, 담당자 변경, 정산 메모 등"
                    />
                </label>
            </div>
            <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={onReset}>
                    <RotateCcw size={15} />
                    초기화
                </button>
                <button className={styles.primaryButton} type="button" disabled={saving || !schemaReady} onClick={onSubmit}>
                    <Save size={15} />
                    {form.id ? '수정 저장' : '업체 등록'}
                </button>
            </div>
        </div>
    );
}
