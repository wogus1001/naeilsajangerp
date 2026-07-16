import { normalizeFranchiseFileAttachments, normalizeFranchiseFileNames } from '@/lib/franchise-file-attachments';
import { PROPERTY_REGISTRATION_INITIAL_FORM } from '@/lib/franchise-property-registration';
import { firstText } from './deleted-record-details';
import { rebuildDeletedAttachmentUrls, type DeletedEditContext } from './deleted-record-edit-utils';
import type { DeletedWorkIntakeItem, WorkIntakeEditTarget } from './types';

export function buildDeletedPropertyEditTarget(
    record: DeletedWorkIntakeItem,
    context: DeletedEditContext
): WorkIntakeEditTarget {
    const { row, data, managerId, createdAt } = context;
    const fileAttachments = rebuildDeletedAttachmentUrls(
        normalizeFranchiseFileAttachments(data.fileAttachments),
        record.sourceId
    );
    const form = {
        ...PROPERTY_REGISTRATION_INITIAL_FORM,
        desiredBrand: firstText(data.desiredBrand),
        desiredBusinessType: firstText(data.desiredBusinessType),
        desiredCategory: firstText(data.desiredCategory),
        matchPriority: firstText(data.matchPriority, PROPERTY_REGISTRATION_INITIAL_FORM.matchPriority),
        propertyName: firstText(data.propertyName, row.name, record.title),
        propertyAddress: firstText(data.propertyAddress, row.address),
        propertyRegion: firstText(data.propertyRegion, data.region),
        roadAddress: firstText(data.roadAddress),
        jibunAddress: firstText(data.jibunAddress),
        zoneNo: firstText(data.zoneNo),
        detailAddress: firstText(data.detailAddress),
        privateArea: firstText(data.privateAreaInput, data.privateArea),
        privateAreaUnit: firstText(data.privateAreaUnit, PROPERTY_REGISTRATION_INITIAL_FORM.privateAreaUnit),
        supplyArea: firstText(data.supplyArea),
        floor: firstText(data.floor),
        totalFloors: firstText(data.totalFloors),
        parkingAvailable: firstText(data.parkingAvailable, PROPERTY_REGISTRATION_INITIAL_FORM.parkingAvailable),
        currentStatus: firstText(row.status, data.currentStatus, PROPERTY_REGISTRATION_INITIAL_FORM.currentStatus),
        operatingStoreName: firstText(data.operatingStoreName),
        fileNames: normalizeFranchiseFileNames(data.fileNames, fileAttachments),
        fileAttachments,
        deposit: firstText(data.deposit),
        monthlyRent: firstText(data.monthlyRent),
        maintenanceFee: firstText(data.maintenanceFee),
        premium: firstText(data.premium),
        vatIncluded: firstText(data.vatIncluded, PROPERTY_REGISTRATION_INITIAL_FORM.vatIncluded),
        leaseAvailableDate: firstText(data.leaseAvailableDate),
        contractPeriod: firstText(data.contractPeriod),
        negotiable: firstText(data.negotiable, PROPERTY_REGISTRATION_INITIAL_FORM.negotiable),
        rentFreeAvailable: firstText(data.rentFreeAvailable, PROPERTY_REGISTRATION_INITIAL_FORM.rentFreeAvailable),
        rentFreePeriod: firstText(data.rentFreePeriod),
        interiorSupportAvailable: firstText(data.interiorSupportAvailable, PROPERTY_REGISTRATION_INITIAL_FORM.interiorSupportAvailable),
        simpleInstallSupportAvailable: firstText(data.simpleInstallSupportAvailable, PROPERTY_REGISTRATION_INITIAL_FORM.simpleInstallSupportAvailable),
        facilityWorkNegotiable: firstText(data.facilityWorkNegotiable, PROPERTY_REGISTRATION_INITIAL_FORM.facilityWorkNegotiable),
        landlordSupportMemo: firstText(data.landlordSupportMemo),
        consultationMemo: firstText(data.consultationMemo),
        riskMemo: firstText(data.riskMemo),
        nextAction: firstText(data.nextAction, PROPERTY_REGISTRATION_INITIAL_FORM.nextAction),
        nextContactAt: firstText(data.nextContactAt)
    };
    return {
        kind: 'properties',
        item: {
            id: record.sourceId,
            companyName: record.companyName,
            managerId,
            authorId: managerId,
            authorName: '',
            name: firstText(row.name, form.propertyName, record.title),
            status: firstText(row.status, form.currentStatus),
            address: firstText(row.address, form.propertyAddress),
            region: form.propertyRegion,
            desiredBrand: form.desiredBrand,
            desiredCategory: form.desiredCategory,
            deposit: form.deposit,
            monthlyRent: form.monthlyRent,
            createdAt,
            canEdit: false,
            canDelete: false,
            form
        }
    };
}
