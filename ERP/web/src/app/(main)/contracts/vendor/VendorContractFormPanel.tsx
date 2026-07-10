"use client";

import { useId } from 'react';
import { FileSignature, Save, Upload } from 'lucide-react';
import type { FranchiseVendorView } from '@/lib/franchise-vendors';
import {
    CATEGORY_OPTIONS,
    STATUS_OPTIONS,
    electronicContractLabel,
    type ElectronicContractOption,
    type UserOption,
    type VendorContractForm
} from './vendorContractsModel';
import formStyles from './vendorContractForm.module.css';
import styles from './vendorContracts.module.css';

type Props = {
    readonly electronicContracts: readonly ElectronicContractOption[];
    readonly form: VendorContractForm;
    readonly requesterId: string;
    readonly saving: boolean;
    readonly selectedFile: File | null;
    readonly users: readonly UserOption[];
    readonly vendorMasters: readonly FranchiseVendorView[];
    readonly onFileChange: (file: File | null) => void;
    readonly onFormChange: (form: VendorContractForm) => void;
    readonly onReset: () => void;
    readonly onSubmit: () => void;
};

function userLabel(user: UserOption): string {
    return `${user.name || user.uuid} · ${user.role || '직원'}`;
}

export function VendorContractFormPanel({
    electronicContracts,
    form,
    requesterId,
    saving,
    selectedFile,
    users,
    vendorMasters,
    onFileChange,
    onFormChange,
    onReset,
    onSubmit
}: Props) {
    const isEditing = Boolean(form.id);
    const fileInputId = useId();

    return (
        <form className={styles.panel} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
            <div className={styles.sectionTitle}><FileSignature size={16} /> {isEditing ? '계약 수정' : '계약 등록'}</div>
            <div className={styles.formGrid}>
                <label className={styles.wide}>
                    업체 선택
                    <select
                        value={form.vendorId}
                        onChange={event => {
                            const vendor = vendorMasters.find(item => item.id === event.target.value);
                            if (!vendor) {
                                onFormChange({ ...form, vendorId: '' });
                                return;
                            }
                            onFormChange({
                                ...form,
                                category: vendor.category,
                                vendorId: vendor.id,
                                vendorName: vendor.vendorName
                            });
                        }}
                    >
                        <option value="">직접 입력</option>
                        {vendorMasters.map(vendor => (
                            <option key={vendor.id} value={vendor.id}>
                                {vendor.vendorName} · {vendor.categoryLabel}
                            </option>
                        ))}
                    </select>
                </label>
                <label>구분<select value={form.category} onChange={event => onFormChange({ ...form, category: event.target.value as VendorContractForm['category'], vendorId: '' })}>{CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label>업체명<input value={form.vendorName} onChange={event => onFormChange({ ...form, vendorId: '', vendorName: event.target.value })} placeholder="예: 내일식자재" /></label>
                <label className={styles.wide}>계약명<input value={form.contractTitle} onChange={event => onFormChange({ ...form, contractTitle: event.target.value })} placeholder="예: 2026 식자재 공급 계약" /></label>
                <label>시작일<input type="date" value={form.contractStartDate} onChange={event => onFormChange({ ...form, contractStartDate: event.target.value })} /></label>
                <label>만료일<input type="date" value={form.contractEndDate} onChange={event => onFormChange({ ...form, contractEndDate: event.target.value })} /></label>
                <label>상태<select value={form.status} onChange={event => onFormChange({ ...form, status: event.target.value as VendorContractForm['status'] })}>{STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label>담당자<select value={form.ownerProfileId} onChange={event => onFormChange({ ...form, ownerProfileId: event.target.value })}><option value={requesterId}>나</option>{users.map(user => <option key={user.uuid} value={user.uuid}>{userLabel(user)}</option>)}</select></label>
                <label className={styles.wide}>전자계약 연결<select value={form.electronicContractId} onChange={event => onFormChange({ ...form, documentSource: event.target.value ? 'electronic_contract' : form.documentSource, electronicContractId: event.target.value })}><option value="">연결 안 함</option>{electronicContracts.map(contract => <option key={contract.id} value={contract.id}>{electronicContractLabel(contract)}</option>)}</select></label>
                <div className={`${styles.wide} ${formStyles.fileField}`}>
                    <span className={formStyles.fieldLabel}>계약서 파일</span>
                    <div className={formStyles.filePicker}>
                        <label className={formStyles.fileSelectButton} htmlFor={fileInputId}>
                            <Upload size={14} aria-hidden="true" />
                            파일 선택
                        </label>
                        <span
                            className={`${formStyles.fileName} ${selectedFile ? '' : formStyles.fileNameEmpty}`}
                            title={selectedFile?.name || '선택된 파일 없음'}
                        >
                            {selectedFile?.name || '선택된 파일 없음'}
                        </span>
                    </div>
                    <input
                        id={fileInputId}
                        className={formStyles.fileInput}
                        type="file"
                        onChange={event => onFileChange(event.target.files?.[0] || null)}
                    />
                </div>
                <label className={styles.wide}>메모<textarea value={form.memo} onChange={event => onFormChange({ ...form, memo: event.target.value })} placeholder="갱신 조건, 담당자 변경 메모 등" rows={3} /></label>
            </div>
            <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={onReset} disabled={saving}>초기화</button>
                <button className={styles.primaryButton} type="submit" disabled={saving}>
                    <Save size={16} />
                    {saving ? '저장 중' : '저장'}
                </button>
            </div>
        </form>
    );
}
