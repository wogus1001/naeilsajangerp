import {
    buildPrivateAreaValues,
    normalizeDecimalText,
    normalizeMoneyText
} from './franchise-property-registration-format';
import type { FranchiseFileAttachment } from './franchise-file-attachments';
export {
    FRANCHISE_ATTACHMENT_POLICY as PROPERTY_ATTACHMENT_POLICY
} from './franchise-file-attachments';
export {
    PROPERTY_REGISTRATION_SECTIONS,
    buildPropertyRegistrationSections
} from './franchise-property-registration-sections';
export type {
    PropertyRegistrationField,
    PropertyRegistrationFieldKey,
    PropertyRegistrationSection
} from './franchise-property-registration-sections';

export type PropertyRegistrationFileAttachment = FranchiseFileAttachment;

export type PropertyRegistrationForm = {
    readonly desiredBrand: string;
    readonly desiredBusinessType: string;
    readonly desiredCategory: string;
    readonly matchPriority: string;
    readonly propertyName: string;
    readonly propertyAddress: string;
    readonly propertyRegion: string;
    readonly roadAddress: string;
    readonly jibunAddress: string;
    readonly zoneNo: string;
    readonly detailAddress: string;
    readonly privateArea: string;
    readonly privateAreaUnit: string;
    readonly supplyArea: string;
    readonly floor: string;
    readonly totalFloors: string;
    readonly parkingAvailable: string;
    readonly currentStatus: string;
    readonly operatingStoreName: string;
    readonly fileNames: readonly string[];
    readonly fileAttachments: readonly PropertyRegistrationFileAttachment[];
    readonly deposit: string;
    readonly monthlyRent: string;
    readonly maintenanceFee: string;
    readonly premium: string;
    readonly vatIncluded: string;
    readonly leaseAvailableDate: string;
    readonly contractPeriod: string;
    readonly negotiable: string;
    readonly rentFreeAvailable: string;
    readonly rentFreePeriod: string;
    readonly interiorSupportAvailable: string;
    readonly simpleInstallSupportAvailable: string;
    readonly facilityWorkNegotiable: string;
    readonly landlordSupportMemo: string;
    readonly consultationMemo: string;
    readonly riskMemo: string;
    readonly nextAction: string;
    readonly nextContactAt: string;
};

export type PropertyRegistrationPayloadContext = {
    readonly requesterId: string;
    readonly companyName: string;
};

export const PROPERTY_REGISTRATION_INITIAL_FORM: PropertyRegistrationForm = {
    desiredBrand: '',
    desiredBusinessType: '',
    desiredCategory: '',
    matchPriority: '브랜드 우선',
    propertyName: '',
    propertyAddress: '',
    propertyRegion: '',
    roadAddress: '',
    jibunAddress: '',
    zoneNo: '',
    detailAddress: '',
    privateArea: '',
    privateAreaUnit: 'squareMeter',
    supplyArea: '',
    floor: '',
    totalFloors: '',
    parkingAvailable: '가능',
    currentStatus: '공실',
    operatingStoreName: '',
    fileNames: [],
    fileAttachments: [],
    deposit: '',
    monthlyRent: '',
    maintenanceFee: '',
    premium: '',
    vatIncluded: '포함',
    leaseAvailableDate: '',
    contractPeriod: '',
    negotiable: '가능',
    rentFreeAvailable: '가능',
    rentFreePeriod: '',
    interiorSupportAvailable: '가능',
    simpleInstallSupportAvailable: '가능',
    facilityWorkNegotiable: '가능',
    landlordSupportMemo: '',
    consultationMemo: '',
    riskMemo: '',
    nextAction: '임대인 재통화',
    nextContactAt: ''
};

export function updatePropertyRegistrationAttachments(
    form: PropertyRegistrationForm,
    attachments: readonly PropertyRegistrationFileAttachment[]
): PropertyRegistrationForm {
    return {
        ...form,
        fileAttachments: attachments,
        fileNames: attachments.map(file => file.name)
    };
}

function normalizeRegion(address: string): string {
    return address.trim().split(/\s+/).slice(0, 2).join(' ');
}

export function buildPropertyRegistrationPayload(
    form: PropertyRegistrationForm,
    context: PropertyRegistrationPayloadContext
) {
    const address = form.propertyAddress.trim();
    const name = form.propertyName.trim() || address || '이름 없는 물건';
    const privateAreaValues = buildPrivateAreaValues(form.privateArea, form.privateAreaUnit);

    return {
        requesterId: context.requesterId,
        managerId: context.requesterId,
        companyName: context.companyName,
        name,
        status: form.currentStatus,
        operationType: '물건등록',
        address,
        isFavorite: false,
        sourceType: 'franchise_property_registration',
        region: form.propertyRegion || normalizeRegion(address),
        desiredBrand: form.desiredBrand,
        brand: form.desiredBrand,
        desiredBusinessType: form.desiredBusinessType,
        businessType: form.desiredBusinessType,
        desiredCategory: form.desiredCategory,
        category: form.desiredCategory,
        categoryMajor: form.desiredBusinessType,
        categoryMiddle: form.desiredCategory,
        categorySmall: '',
        industry: form.desiredCategory || form.desiredBusinessType,
        propertyName: form.propertyName,
        propertyAddress: form.propertyAddress,
        propertyRegion: form.propertyRegion,
        roadAddress: form.roadAddress,
        jibunAddress: form.jibunAddress,
        zoneNo: form.zoneNo,
        detailAddress: form.detailAddress,
        privateArea: privateAreaValues.squareMeter || normalizeDecimalText(form.privateArea),
        privateAreaInput: privateAreaValues.input,
        privateAreaUnit: privateAreaValues.unit,
        privateAreaSquareMeter: privateAreaValues.squareMeter,
        privateAreaPyeong: privateAreaValues.pyeong,
        supplyArea: normalizeDecimalText(form.supplyArea),
        floor: form.floor,
        totalFloors: form.totalFloors,
        parkingAvailable: form.parkingAvailable,
        currentStatus: form.currentStatus,
        operatingStoreName: form.operatingStoreName,
        fileNames: form.fileNames,
        fileAttachments: form.fileAttachments,
        deposit: normalizeMoneyText(form.deposit),
        monthlyRent: normalizeMoneyText(form.monthlyRent),
        maintenanceFee: normalizeMoneyText(form.maintenanceFee),
        premium: normalizeMoneyText(form.premium),
        vatIncluded: form.vatIncluded,
        leaseAvailableDate: form.leaseAvailableDate,
        contractPeriod: form.contractPeriod,
        negotiable: form.negotiable,
        rentFreeAvailable: form.rentFreeAvailable,
        rentFreePeriod: form.rentFreePeriod,
        interiorSupportAvailable: form.interiorSupportAvailable,
        simpleInstallSupportAvailable: form.simpleInstallSupportAvailable,
        facilityWorkNegotiable: form.facilityWorkNegotiable,
        landlordSupportMemo: form.landlordSupportMemo,
        consultationMemo: form.consultationMemo,
        riskMemo: form.riskMemo,
        nextAction: form.nextAction,
        nextContactAt: form.nextContactAt
    };
}
