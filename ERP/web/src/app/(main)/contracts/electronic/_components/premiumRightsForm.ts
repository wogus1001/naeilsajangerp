export type PartyForm = {
    readonly name: string;
    readonly contact: string;
    readonly address: string;
};

export type PremiumRightsFormValues = {
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
    readonly transferor: PartyForm;
    readonly transferee: PartyForm;
};

export type PremiumRightsFieldKey = Exclude<keyof PremiumRightsFormValues, 'transferor' | 'transferee'>;
export type PartyName = 'transferor' | 'transferee';
export type PartyFieldKey = keyof PartyForm;

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export function createInitialPremiumRightsForm(companyName: string): PremiumRightsFormValues {
    return {
        companyName,
        businessName: '',
        propertyAddress: '',
        businessType: '',
        licenseNumber: '',
        leaseArea: '',
        exclusiveArea: '',
        leaseDepositAmount: '',
        monthlyRentAmount: '',
        managementFeeAmount: '',
        vatIncluded: '별도',
        leaseStartDate: '',
        leaseEndDate: '',
        leaseTermMonths: '',
        totalPremiumAmount: '',
        downPaymentAmount: '',
        interimPaymentAmount: '',
        interimPaymentDate: '',
        balancePaymentAmount: '',
        balancePaymentDate: '',
        tangibleAssets: '',
        intangibleAssets: '',
        specialTerm1: '',
        specialTerm2: '',
        specialTerm3: '',
        specialTerm4: '',
        contractDate: today(),
        transferor: { name: '', contact: '', address: '' },
        transferee: { name: '', contact: '', address: '' }
    };
}
