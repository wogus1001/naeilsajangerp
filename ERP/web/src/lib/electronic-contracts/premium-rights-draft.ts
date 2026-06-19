import type { ContractParty, PremiumRightsContractInput } from './premium-rights-contract';

export const PREMIUM_RIGHTS_TEMPLATE_KEY = 'premium_rights_transfer';
export const PREMIUM_RIGHTS_TEMPLATE_VERSION = '2026-06-18';

export type PremiumRightsDraftForm = {
    readonly companyName: string;
    readonly businessName: string;
    readonly propertyAddress: string;
    readonly businessType: string;
    readonly licenseNumber: string;
    readonly leaseArea: string;
    readonly exclusiveArea: string;
    readonly leaseDepositAmount: string;
    readonly monthlyRentAmount: string;
    readonly managementFeeAmount: string;
    readonly vatIncluded: string;
    readonly leaseStartDate: string;
    readonly leaseEndDate: string;
    readonly leaseTermMonths: string;
    readonly totalPremiumAmount: string;
    readonly downPaymentAmount: string;
    readonly interimPaymentAmount: string;
    readonly interimPaymentDate: string;
    readonly balancePaymentAmount: string;
    readonly balancePaymentDate: string;
    readonly tangibleAssets: string;
    readonly intangibleAssets: string;
    readonly specialTerm1: string;
    readonly specialTerm2: string;
    readonly specialTerm3: string;
    readonly specialTerm4: string;
    readonly contractDate: string;
    readonly transferor: ContractParty;
    readonly transferee: ContractParty;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

function parseParty(record: Record<string, unknown>, key: string): ContractParty {
    const value = record[key];
    const source = isRecord(value) ? value : {};
    return {
        name: getString(source, 'name'),
        contact: getString(source, 'contact'),
        address: getString(source, 'address')
    };
}

export function parsePremiumRightsDraftForm(
    record: Record<string, unknown>,
    fallbackCompanyName: string
): PremiumRightsDraftForm {
    return {
        companyName: getString(record, 'companyName') || fallbackCompanyName,
        businessName: getString(record, 'businessName'),
        propertyAddress: getString(record, 'propertyAddress'),
        businessType: getString(record, 'businessType'),
        licenseNumber: getString(record, 'licenseNumber'),
        leaseArea: getString(record, 'leaseArea'),
        exclusiveArea: getString(record, 'exclusiveArea'),
        leaseDepositAmount: getString(record, 'leaseDepositAmount'),
        monthlyRentAmount: getString(record, 'monthlyRentAmount'),
        managementFeeAmount: getString(record, 'managementFeeAmount'),
        vatIncluded: getString(record, 'vatIncluded') || '별도',
        leaseStartDate: getString(record, 'leaseStartDate'),
        leaseEndDate: getString(record, 'leaseEndDate'),
        leaseTermMonths: getString(record, 'leaseTermMonths'),
        totalPremiumAmount: getString(record, 'totalPremiumAmount'),
        downPaymentAmount: getString(record, 'downPaymentAmount'),
        interimPaymentAmount: getString(record, 'interimPaymentAmount'),
        interimPaymentDate: getString(record, 'interimPaymentDate'),
        balancePaymentAmount: getString(record, 'balancePaymentAmount'),
        balancePaymentDate: getString(record, 'balancePaymentDate'),
        tangibleAssets: getString(record, 'tangibleAssets'),
        intangibleAssets: getString(record, 'intangibleAssets'),
        specialTerm1: getString(record, 'specialTerm1'),
        specialTerm2: getString(record, 'specialTerm2'),
        specialTerm3: getString(record, 'specialTerm3'),
        specialTerm4: getString(record, 'specialTerm4'),
        contractDate: getString(record, 'contractDate'),
        transferor: parseParty(record, 'transferor'),
        transferee: parseParty(record, 'transferee')
    };
}

export function createPremiumRightsFormSnapshot(form: PremiumRightsDraftForm): Record<string, unknown> {
    return {
        ...form,
        transferorName: form.transferor.name,
        transfereeName: form.transferee.name
    };
}

export function createPremiumRightsDraftName(form: PremiumRightsDraftForm): string {
    const target = form.businessName || form.propertyAddress || '작성 중';
    return `[초안] 권리금계약서 - ${target}`;
}

export function toPremiumRightsContractInput(
    form: PremiumRightsDraftForm,
    meta: {
        readonly companyId: string;
        readonly sentByProfileId: string;
        readonly sentByName: string;
        readonly ucansignTemplateId: string;
    }
): PremiumRightsContractInput {
    return {
        ...form,
        companyId: meta.companyId,
        sentByProfileId: meta.sentByProfileId,
        sentByName: meta.sentByName,
        ucansignTemplateId: meta.ucansignTemplateId
    };
}
