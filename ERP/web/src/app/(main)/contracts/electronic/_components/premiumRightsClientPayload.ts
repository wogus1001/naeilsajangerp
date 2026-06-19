import type { PremiumRightsFieldKey, PremiumRightsFormValues } from './premiumRightsForm';

export type SendResponse = {
    readonly data?: {
        readonly contractId?: string;
        readonly ucansignDocumentId?: string;
    };
    readonly message?: string;
};

export type DraftResponse = {
    readonly data?: {
        readonly contractId?: string;
        readonly formSnapshot?: unknown;
    };
    readonly message?: string;
};

export const VAT_OPTIONS = [
    { value: '별도', label: '별도' },
    { value: '포함', label: '포함' }
] as const;

function stripComma(value: string): string {
    return value.replace(/,/g, '');
}

export function formatMoneyInput(value: string): string {
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits).toLocaleString('ko-KR') : '';
}

export function moneyValue(form: PremiumRightsFormValues, key: PremiumRightsFieldKey): string {
    return formatMoneyInput(String(form[key] || ''));
}

export function toPremiumRightsRequestPayload(
    form: PremiumRightsFormValues,
    requesterId: string,
    companyId: string,
    contractId: string
) {
    return {
        requesterId,
        companyId,
        contractId,
        ...form,
        leaseDepositAmount: stripComma(form.leaseDepositAmount),
        monthlyRentAmount: stripComma(form.monthlyRentAmount),
        managementFeeAmount: stripComma(form.managementFeeAmount),
        totalPremiumAmount: stripComma(form.totalPremiumAmount),
        downPaymentAmount: stripComma(form.downPaymentAmount),
        interimPaymentAmount: stripComma(form.interimPaymentAmount),
        balancePaymentAmount: stripComma(form.balancePaymentAmount)
    };
}
