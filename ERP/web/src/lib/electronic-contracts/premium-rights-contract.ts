import { formatAmount, numberToKoreanCurrency, normalizeAmountInput } from './money';

export type SigningContactType = 'email' | 'kakao';

export type ContractParty = {
    readonly name: string;
    readonly contact: string;
    readonly address: string;
};

export type PremiumRightsContractInput = {
    readonly companyId: string;
    readonly companyName: string;
    readonly sentByProfileId: string;
    readonly sentByName: string;
    readonly ucansignTemplateId: string;
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

export type UcansignField = {
    readonly fieldName: string;
    readonly value: string | boolean;
};

export type UcansignParticipant = {
    readonly signingOrder: number;
    readonly name: string;
    readonly message: string;
    readonly signingMethodType: SigningContactType;
    readonly signingContactInfo: string;
};

export type PremiumRightsSendPayload = {
    readonly templateId: string;
    readonly documentName: string;
    readonly processType: 'PROCEDURE';
    readonly isSequential: true;
    readonly isSendMessage: true;
    readonly fields: readonly UcansignField[];
    readonly participants: readonly UcansignParticipant[];
    readonly customValue: string;
    readonly customValue1: string;
    readonly customValue2: string;
    readonly customValue3: string;
};

function splitDate(value: string): readonly string[] {
    const [year = '', month = '', day = ''] = value.split('-');
    return [year, month, day];
}

function contactType(contact: string): SigningContactType {
    return contact.includes('@') ? 'email' : 'kakao';
}

function amountText(value: string): string {
    return numberToKoreanCurrency(value);
}

function amountNumber(value: string): string {
    return formatAmount(value);
}

function areaText(value: string): string {
    const amount = normalizeAmountInput(value);
    return amount === null ? value : amount.toLocaleString('ko-KR');
}

function field(fieldName: string, value: string | boolean | null | undefined): UcansignField {
    return { fieldName, value: value ?? '' };
}

export function buildPremiumRightsUcansignPayload(
    input: PremiumRightsContractInput,
    contractId: string
): PremiumRightsSendPayload {
    const [leaseStartYear, leaseStartMonth, leaseStartDay] = splitDate(input.leaseStartDate);
    const [leaseEndYear, leaseEndMonth, leaseEndDay] = splitDate(input.leaseEndDate);
    const [contractYear, contractMonth, contractDay] = splitDate(input.contractDate);
    const [interimYear, interimMonth, interimDay] = splitDate(input.interimPaymentDate);
    const [balanceYear, balanceMonth, balanceDay] = splitDate(input.balancePaymentDate);

    return {
        templateId: input.ucansignTemplateId,
        documentName: `[${input.companyName}] 권리금계약서 - ${input.businessName || input.propertyAddress}`,
        processType: 'PROCEDURE',
        isSequential: true,
        isSendMessage: true,
        customValue: contractId,
        customValue1: input.companyId,
        customValue2: input.sentByProfileId,
        customValue3: input.licenseNumber,
        participants: [
            {
                signingOrder: 1,
                name: input.transferor.name,
                signingMethodType: contactType(input.transferor.contact),
                signingContactInfo: input.transferor.contact,
                message: `${input.companyName} 권리금계약서 양도인 서명 요청입니다.`
            },
            {
                signingOrder: 2,
                name: input.transferee.name,
                signingMethodType: contactType(input.transferee.contact),
                signingContactInfo: input.transferee.contact,
                message: `${input.companyName} 권리금계약서 양수인 서명 요청입니다.`
            }
        ],
        fields: [
            field('companyName', input.companyName),
            field('businessName', input.businessName),
            field('propertyAddress', input.propertyAddress),
            field('businessType', input.businessType),
            field('licenseNumber', input.licenseNumber),
            field('leaseArea', areaText(input.leaseArea)),
            field('exclusiveArea', areaText(input.exclusiveArea)),
            field('leaseDepositAmount', amountNumber(input.leaseDepositAmount)),
            field('leaseDepositText', amountText(input.leaseDepositAmount)),
            field('monthlyRentAmount', amountNumber(input.monthlyRentAmount)),
            field('monthlyRentText', amountText(input.monthlyRentAmount)),
            field('managementFeeAmount', amountNumber(input.managementFeeAmount)),
            field('managementFeeText', amountText(input.managementFeeAmount)),
            field('vatIncluded', input.vatIncluded),
            field('leaseStartYear', leaseStartYear),
            field('leaseStartMonth', leaseStartMonth),
            field('leaseStartDay', leaseStartDay),
            field('leaseEndYear', leaseEndYear),
            field('leaseEndMonth', leaseEndMonth),
            field('leaseEndDay', leaseEndDay),
            field('leaseTermMonths', input.leaseTermMonths),
            field('totalPremiumAmount', amountNumber(input.totalPremiumAmount)),
            field('totalPremiumText', amountText(input.totalPremiumAmount)),
            field('downPaymentAmount', amountNumber(input.downPaymentAmount)),
            field('downPaymentText', amountText(input.downPaymentAmount)),
            field('interimPaymentAmount', amountNumber(input.interimPaymentAmount)),
            field('interimPaymentText', amountText(input.interimPaymentAmount)),
            field('interimPaymentYear', interimYear),
            field('interimPaymentMonth', interimMonth),
            field('interimPaymentDay', interimDay),
            field('balancePaymentAmount', amountNumber(input.balancePaymentAmount)),
            field('balancePaymentText', amountText(input.balancePaymentAmount)),
            field('balancePaymentYear', balanceYear),
            field('balancePaymentMonth', balanceMonth),
            field('balancePaymentDay', balanceDay),
            field('tangibleAssets', input.tangibleAssets),
            field('intangibleAssets', input.intangibleAssets),
            field('specialTerm1', input.specialTerm1),
            field('specialTerm2', input.specialTerm2),
            field('specialTerm3', input.specialTerm3),
            field('specialTerm4', input.specialTerm4),
            field('contractYear', contractYear),
            field('contractMonth', contractMonth),
            field('contractDay', contractDay),
            field('transferorName', input.transferor.name),
            field('transferorContact', input.transferor.contact),
            field('transferorAddress', input.transferor.address),
            field('transfereeName', input.transferee.name),
            field('transfereeContact', input.transferee.contact),
            field('transfereeAddress', input.transferee.address)
        ]
    };
}
