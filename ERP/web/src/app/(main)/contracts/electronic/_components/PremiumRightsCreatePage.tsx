"use client";

import Link from 'next/link';
import React from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { getRequesterId, getStoredCompanyId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { FormSection, SelectField, TextAreaField, TextField } from './ContractFormFields';
import { LicenseSearchPanel, type LicenseBusinessResult } from './LicenseSearchPanel';
import { PremiumRightsContractPreview } from './PremiumRightsContractPreview';
import { isRecord, parsePremiumRightsDraftForm } from '@/lib/electronic-contracts/premium-rights-draft';
import {
    formatMoneyInput,
    moneyValue,
    toPremiumRightsRequestPayload,
    VAT_OPTIONS,
    type DraftResponse,
    type SendResponse
} from './premiumRightsClientPayload';
import {
    createInitialPremiumRightsForm,
    type PartyFieldKey,
    type PartyName,
    type PremiumRightsFieldKey,
    type PremiumRightsFormValues
} from './premiumRightsForm';
import styles from './electronicContracts.module.css';

function validateBeforeSend(form: PremiumRightsFormValues): string[] {
    const checks: readonly [string, string][] = [
        ['브랜드/회사명', form.companyName],
        ['상호명', form.businessName],
        ['소재지', form.propertyAddress],
        ['총 권리금', form.totalPremiumAmount],
        ['양도인 이름', form.transferor.name],
        ['양도인 연락처/이메일', form.transferor.contact],
        ['양수인 이름', form.transferee.name],
        ['양수인 연락처/이메일', form.transferee.contact]
    ];
    return checks.filter(([, value]) => !value.trim()).map(([label]) => label);
}

export default function PremiumRightsCreatePage() {
    const [requesterId, setRequesterId] = React.useState('');
    const [companyId, setCompanyId] = React.useState('');
    const [form, setForm] = React.useState<PremiumRightsFormValues>(() => createInitialPremiumRightsForm(''));
    const [sending, setSending] = React.useState(false);
    const [savingDraft, setSavingDraft] = React.useState(false);
    const [loadingDraft, setLoadingDraft] = React.useState(false);
    const [draftContractId, setDraftContractId] = React.useState('');
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    React.useEffect(() => {
        const user = getStoredUser();
        const storedCompanyName = getStoredCompanyName(user);
        setRequesterId(getRequesterId(user));
        setCompanyId(getStoredCompanyId(user));
        setForm(createInitialPremiumRightsForm(storedCompanyName));
    }, []);

    React.useEffect(() => {
        if (!requesterId) return;
        const params = new URLSearchParams(window.location.search);
        const requestedDraftId = params.get('draftId') || params.get('contractId') || '';
        if (!requestedDraftId) return;

        const controller = new AbortController();
        async function loadDraft() {
            setLoadingDraft(true);
            setError('');
            try {
                const response = await fetch(
                    `/api/electronic-contracts/${encodeURIComponent(requestedDraftId)}`,
                    {
                        cache: 'no-store',
                        headers: await getApiAuthHeaders(),
                        signal: controller.signal
                    }
                );
                const payload: DraftResponse = await response.json();
                if (!response.ok) throw new Error(payload.message || '계약서 초안을 불러오지 못했습니다.');
                const snapshot = payload.data?.formSnapshot;
                if (!isRecord(snapshot)) throw new Error('계약서 초안 형식이 올바르지 않습니다.');
                const user = getStoredUser();
                setForm(parsePremiumRightsDraftForm(snapshot, getStoredCompanyName(user)));
                setDraftContractId(payload.data?.contractId || requestedDraftId);
                setSuccess('저장된 초안을 불러왔습니다.');
            } catch (caught) {
                if (caught instanceof DOMException && caught.name === 'AbortError') return;
                setError(caught instanceof Error ? caught.message : '계약서 초안을 불러오지 못했습니다.');
            } finally {
                setLoadingDraft(false);
            }
        }

        void loadDraft();
        return () => controller.abort();
    }, [requesterId]);

    function updateField(key: PremiumRightsFieldKey, value: string) {
        setForm(previous => ({ ...previous, [key]: value }));
    }

    function updateMoneyField(key: PremiumRightsFieldKey, value: string) {
        updateField(key, formatMoneyInput(value));
    }

    function updateParty(party: PartyName, key: PartyFieldKey, value: string) {
        setForm(previous => ({
            ...previous,
            [party]: { ...previous[party], [key]: value }
        }));
    }

    function pickLicense(record: LicenseBusinessResult) {
        setForm(previous => ({
            ...previous,
            licenseNumber: record.licenseNumber,
            businessName: previous.businessName || record.businessName,
            businessType: previous.businessType || record.businessType,
            propertyAddress: previous.propertyAddress || record.address
        }));
    }

    async function saveDraft() {
        if (!requesterId) {
            setError('로그인 정보를 확인하지 못했습니다.');
            return;
        }
        setSavingDraft(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch('/api/electronic-contracts/draft', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(toPremiumRightsRequestPayload(form, requesterId, companyId, draftContractId))
            });
            const payload: DraftResponse = await response.json();
            if (!response.ok) throw new Error(payload.message || '계약서 초안 저장에 실패했습니다.');
            if (payload.data?.contractId) setDraftContractId(payload.data.contractId);
            setSuccess('계약서 초안을 저장했습니다.');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '계약서 초안 저장에 실패했습니다.');
        } finally {
            setSavingDraft(false);
        }
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!requesterId) {
            setError('로그인 정보를 확인하지 못했습니다.');
            return;
        }
        const missingFields = validateBeforeSend(form);
        if (missingFields.length > 0) {
            setError(`필수 입력값을 확인해주세요: ${missingFields.join(', ')}`);
            return;
        }
        setSending(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch('/api/electronic-contracts/send', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(toPremiumRightsRequestPayload(form, requesterId, companyId, draftContractId))
            });
            const payload: SendResponse = await response.json();
            if (!response.ok) throw new Error(payload.message || '전자계약 발송에 실패했습니다.');
            if (payload.data?.contractId) setDraftContractId(payload.data.contractId);
            setSuccess('전자계약 발송이 완료되었습니다.');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '전자계약 발송에 실패했습니다.');
        } finally {
            setSending(false);
        }
    }

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>전자계약 작성</h1>
                    <p className={styles.description}>ERP 양식에 계약 정보를 입력하면 내일사장 공용 UCanSign API KEY로 발송됩니다.</p>
                </div>
                <Link className={styles.secondaryButton} href="/contracts/electronic">
                    <ArrowLeft size={16} />
                    문서함
                </Link>
            </section>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <form className={styles.contractForm} onSubmit={submit} noValidate>
                <FormSection title="기본 정보">
                    <TextField label="브랜드/회사명" value={form.companyName} onChange={value => updateField('companyName', value)} required />
                    <TextField label="상호명" value={form.businessName} onChange={value => updateField('businessName', value)} required />
                    <TextField label="영업허가번호" value={form.licenseNumber} onChange={value => updateField('licenseNumber', value)} />
                    <TextField label="업종" value={form.businessType} onChange={value => updateField('businessType', value)} />
                    <TextField label="소재지" value={form.propertyAddress} onChange={value => updateField('propertyAddress', value)} required />
                    <TextField label="계약일" type="date" value={form.contractDate} onChange={value => updateField('contractDate', value)} />
                </FormSection>

                <LicenseSearchPanel
                    requesterId={requesterId}
                    businessName={form.businessName}
                    propertyAddress={form.propertyAddress}
                    onPick={pickLicense}
                />

                <FormSection title="임대 조건">
                    <TextField label="임대면적" value={form.leaseArea} onChange={value => updateField('leaseArea', value)} suffix="㎡/평" />
                    <TextField label="전용면적" value={form.exclusiveArea} onChange={value => updateField('exclusiveArea', value)} suffix="㎡/평" />
                    <TextField label="보증금" value={moneyValue(form, 'leaseDepositAmount')} onChange={value => updateMoneyField('leaseDepositAmount', value)} suffix="원" />
                    <TextField label="월세" value={moneyValue(form, 'monthlyRentAmount')} onChange={value => updateMoneyField('monthlyRentAmount', value)} suffix="원" />
                    <TextField label="관리비" value={moneyValue(form, 'managementFeeAmount')} onChange={value => updateMoneyField('managementFeeAmount', value)} suffix="원" />
                    <SelectField label="부가세" value={form.vatIncluded} onChange={value => updateField('vatIncluded', value)} options={VAT_OPTIONS} />
                    <TextField label="임대 시작일" type="date" value={form.leaseStartDate} onChange={value => updateField('leaseStartDate', value)} />
                    <TextField label="임대 종료일" type="date" value={form.leaseEndDate} onChange={value => updateField('leaseEndDate', value)} />
                    <TextField label="계약 기간" value={form.leaseTermMonths} onChange={value => updateField('leaseTermMonths', value)} suffix="개월" />
                </FormSection>

                <FormSection title="권리금 지급">
                    <TextField label="총 권리금" value={moneyValue(form, 'totalPremiumAmount')} onChange={value => updateMoneyField('totalPremiumAmount', value)} required suffix="원" />
                    <TextField label="계약금" value={moneyValue(form, 'downPaymentAmount')} onChange={value => updateMoneyField('downPaymentAmount', value)} suffix="원" />
                    <TextField label="중도금" value={moneyValue(form, 'interimPaymentAmount')} onChange={value => updateMoneyField('interimPaymentAmount', value)} suffix="원" />
                    <TextField label="중도금 지급일" type="date" value={form.interimPaymentDate} onChange={value => updateField('interimPaymentDate', value)} />
                    <TextField label="잔금" value={moneyValue(form, 'balancePaymentAmount')} onChange={value => updateMoneyField('balancePaymentAmount', value)} suffix="원" />
                    <TextField label="잔금 지급일" type="date" value={form.balancePaymentDate} onChange={value => updateField('balancePaymentDate', value)} />
                </FormSection>

                <FormSection title="양도 대상">
                    <TextAreaField label="유형 자산" value={form.tangibleAssets} onChange={value => updateField('tangibleAssets', value)} placeholder="집기, 비품, 시설 등" />
                    <TextAreaField label="무형 자산" value={form.intangibleAssets} onChange={value => updateField('intangibleAssets', value)} placeholder="영업권, 고객 DB, 노하우 등" />
                </FormSection>

                <FormSection title="계약 당사자">
                    <TextField label="양도인 이름" value={form.transferor.name} onChange={value => updateParty('transferor', 'name', value)} required />
                    <TextField label="양도인 연락처/이메일" value={form.transferor.contact} onChange={value => updateParty('transferor', 'contact', value)} required />
                    <TextField label="양도인 주소" value={form.transferor.address} onChange={value => updateParty('transferor', 'address', value)} />
                    <TextField label="양수인 이름" value={form.transferee.name} onChange={value => updateParty('transferee', 'name', value)} required />
                    <TextField label="양수인 연락처/이메일" value={form.transferee.contact} onChange={value => updateParty('transferee', 'contact', value)} required />
                    <TextField label="양수인 주소" value={form.transferee.address} onChange={value => updateParty('transferee', 'address', value)} />
                </FormSection>

                <FormSection title="특약">
                    <TextAreaField label="특약 1" value={form.specialTerm1} onChange={value => updateField('specialTerm1', value)} />
                    <TextAreaField label="특약 2" value={form.specialTerm2} onChange={value => updateField('specialTerm2', value)} />
                    <TextAreaField label="특약 3" value={form.specialTerm3} onChange={value => updateField('specialTerm3', value)} />
                    <TextAreaField label="특약 4" value={form.specialTerm4} onChange={value => updateField('specialTerm4', value)} />
                </FormSection>

                <PremiumRightsContractPreview form={form} />

                <div className={styles.formFooter}>
                    <Link className={styles.secondaryButton} href="/contracts/electronic">취소</Link>
                    <button className={styles.secondaryButton} type="button" onClick={saveDraft} disabled={savingDraft || loadingDraft || sending}>
                        {savingDraft ? '저장 중' : '임시저장'}
                    </button>
                    <button className={styles.primaryButton} type="submit" disabled={sending}>
                        <Send size={16} />
                        {sending ? '발송 중' : '전자계약 발송'}
                    </button>
                </div>
            </form>
        </main>
    );
}
