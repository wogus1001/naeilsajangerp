"use client";

import { formatAmount, numberToKoreanCurrency } from '@/lib/electronic-contracts/money';
import type { PartyForm, PremiumRightsFormValues } from './premiumRightsForm';
import styles from './electronicContracts.module.css';

type PreviewRow = {
    readonly label: string;
    readonly value: string;
};

function valueOrDash(value: string): string {
    const trimmed = value.trim();
    return trimmed ? trimmed : '-';
}

function formatDate(value: string): string {
    if (!value) return '-';
    const [year, month, day] = value.split('-');
    return year && month && day ? `${year}. ${month}. ${day}.` : value;
}

function formatAmountWithText(value: string): string {
    const amount = formatAmount(value);
    if (!amount) return '-';
    const korean = numberToKoreanCurrency(value);
    return korean ? `${amount}원 (${korean})` : `${amount}원`;
}

function renderRows(rows: readonly PreviewRow[]) {
    return (
        <table className={styles.previewTable}>
            <tbody>
                {rows.map(row => (
                    <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function partyRows(title: string, party: PartyForm): readonly PreviewRow[] {
    return [
        { label: `${title} 성명`, value: valueOrDash(party.name) },
        { label: `${title} 연락처`, value: valueOrDash(party.contact) },
        { label: `${title} 주소`, value: valueOrDash(party.address) }
    ];
}

export function PremiumRightsContractPreview({ form }: { readonly form: PremiumRightsFormValues }) {
    const specialTerms = [form.specialTerm1, form.specialTerm2, form.specialTerm3, form.specialTerm4]
        .map(value => value.trim())
        .filter(Boolean);

    return (
        <section className={styles.previewPanel} aria-label="계약서 미리보기">
            <div className={styles.previewHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>계약서 미리보기</h2>
                    <p className={styles.helperText}>입력한 내용이 계약서에 반영되는 형태를 발송 전에 확인합니다.</p>
                </div>
            </div>

            <article className={styles.previewDocument}>
                <h3 className={styles.previewTitle}>상가권리금계약서</h3>
                <p className={styles.previewIntro}>
                    본 계약은 아래 표시 상가의 권리금 양도와 관련하여 양도인과 양수인 사이의 주요 조건을 정하기 위한 것입니다.
                </p>

                <h4 className={styles.previewSectionTitle}>1. 계약 목적물 및 영업 정보</h4>
                {renderRows([
                    { label: '브랜드/회사명', value: valueOrDash(form.companyName) },
                    { label: '상호명', value: valueOrDash(form.businessName) },
                    { label: '소재지', value: valueOrDash(form.propertyAddress) },
                    { label: '업종', value: valueOrDash(form.businessType) },
                    { label: '영업허가번호', value: valueOrDash(form.licenseNumber) },
                    { label: '계약일', value: formatDate(form.contractDate) }
                ])}

                <h4 className={styles.previewSectionTitle}>2. 임대차 조건</h4>
                {renderRows([
                    { label: '임대면적', value: valueOrDash(form.leaseArea) },
                    { label: '전용면적', value: valueOrDash(form.exclusiveArea) },
                    { label: '보증금', value: formatAmountWithText(form.leaseDepositAmount) },
                    { label: '월세', value: formatAmountWithText(form.monthlyRentAmount) },
                    { label: '관리비', value: formatAmountWithText(form.managementFeeAmount) },
                    { label: '부가세', value: valueOrDash(form.vatIncluded) },
                    { label: '임대 기간', value: `${formatDate(form.leaseStartDate)} ~ ${formatDate(form.leaseEndDate)}` },
                    { label: '계약 기간', value: form.leaseTermMonths ? `${form.leaseTermMonths}개월` : '-' }
                ])}

                <h4 className={styles.previewSectionTitle}>3. 권리금 지급 조건</h4>
                {renderRows([
                    { label: '총 권리금', value: formatAmountWithText(form.totalPremiumAmount) },
                    { label: '계약금', value: formatAmountWithText(form.downPaymentAmount) },
                    { label: '중도금', value: `${formatAmountWithText(form.interimPaymentAmount)} / 지급일 ${formatDate(form.interimPaymentDate)}` },
                    { label: '잔금', value: `${formatAmountWithText(form.balancePaymentAmount)} / 지급일 ${formatDate(form.balancePaymentDate)}` }
                ])}

                <h4 className={styles.previewSectionTitle}>4. 양도 대상</h4>
                {renderRows([
                    { label: '유형 자산', value: valueOrDash(form.tangibleAssets) },
                    { label: '무형 자산', value: valueOrDash(form.intangibleAssets) }
                ])}

                <h4 className={styles.previewSectionTitle}>5. 특약사항</h4>
                <div className={styles.previewTextBox}>
                    {specialTerms.length > 0 ? (
                        <ol>
                            {specialTerms.map((term, index) => (
                                <li key={`${term}-${index}`}>{term}</li>
                            ))}
                        </ol>
                    ) : (
                        <span>-</span>
                    )}
                </div>

                <h4 className={styles.previewSectionTitle}>6. 계약 당사자</h4>
                <div className={styles.previewParties}>
                    {renderRows(partyRows('양도인', form.transferor))}
                    {renderRows(partyRows('양수인', form.transferee))}
                </div>
            </article>
        </section>
    );
}
