import { MATCHING_REQUEST_INITIAL_FORM } from '@/lib/franchise-matching-request';
import { firstText } from './deleted-record-details';
import { readBoolean, type DeletedEditContext } from './deleted-record-edit-utils';
import type { DeletedWorkIntakeItem, WorkIntakeEditTarget } from './types';

export function buildDeletedMatchingEditTarget(
    record: DeletedWorkIntakeItem,
    context: DeletedEditContext
): WorkIntakeEditTarget {
    const { row, data, managerId, authorId, createdAt } = context;
    const desiredBrand = firstText(data.desiredBrand, row.interested_brand);
    const form = {
        ...MATCHING_REQUEST_INITIAL_FORM,
        name: firstText(row.name, record.title),
        mobile: firstText(row.mobile),
        email: firstText(data.email),
        residence: firstText(data.residence),
        currentJob: firstText(data.currentJob),
        startupExperience: firstText(data.startupExperience, MATCHING_REQUEST_INITIAL_FORM.startupExperience),
        decisionMaker: firstText(data.decisionMaker, MATCHING_REQUEST_INITIAL_FORM.decisionMaker),
        startupTiming: firstText(data.startupTiming),
        desiredCategory: firstText(data.desiredCategory),
        desiredBrand,
        brandUnknown: readBoolean(data, 'brandUnknown', firstText(row.interested_brand) === '브랜드 미정'),
        brandPreference: firstText(data.brandPreference, MATCHING_REQUEST_INITIAL_FORM.brandPreference),
        totalBudget: firstText(data.totalBudget),
        ownCapital: firstText(data.ownCapital),
        loanPreference: firstText(data.loanPreference, MATCHING_REQUEST_INITIAL_FORM.loanPreference),
        desiredDeposit: firstText(data.desiredDeposit),
        desiredRent: firstText(data.desiredRent),
        desiredPremium: firstText(data.desiredPremium),
        desiredSize: firstText(data.desiredSize),
        desiredFloor: firstText(data.desiredFloor),
        desiredRegion: firstText(row.desired_region, data.desiredRegion),
        excludedRegion: firstText(data.excludedRegion),
        ownedPropertyStatus: firstText(data.ownedPropertyStatus),
        ownedPropertyName: firstText(data.ownedPropertyName),
        ownedPropertyAddress: firstText(data.ownedPropertyAddress),
        ownedPropertyAddressDetail: firstText(data.ownedPropertyAddressDetail),
        ownedArea: firstText(data.ownedArea),
        ownedFloor: firstText(data.ownedFloor),
        ownedDeposit: firstText(data.ownedDeposit),
        ownedRent: firstText(data.ownedRent),
        ownedMaintenance: firstText(data.ownedMaintenance),
        ownedPremium: firstText(data.ownedPremium),
        ownedCurrentStatus: firstText(data.ownedCurrentStatus),
        ownerAgreement: firstText(data.ownerAgreement, MATCHING_REQUEST_INITIAL_FORM.ownerAgreement),
        ownedDescription: firstText(data.ownedDescription),
        matchPriority: firstText(data.matchPriority, MATCHING_REQUEST_INITIAL_FORM.matchPriority),
        proposalRange: firstText(data.proposalRange, MATCHING_REQUEST_INITIAL_FORM.proposalRange),
        urgency: firstText(data.urgency, MATCHING_REQUEST_INITIAL_FORM.urgency),
        extraRequest: firstText(data.extraRequest),
        summaryNote: firstText(data.summaryNote),
        riskMemo: firstText(data.riskMemo),
        recommendedBrands: firstText(data.recommendedBrands),
        recommendedProperties: firstText(data.recommendedProperties),
        nextAction: firstText(data.nextAction, MATCHING_REQUEST_INITIAL_FORM.nextAction)
    };
    return {
        kind: 'matchingRequests',
        item: {
            id: record.sourceId,
            managerId,
            authorId,
            managerName: '',
            name: form.name,
            mobile: form.mobile,
            email: form.email,
            status: firstText(row.status),
            desiredRegion: form.desiredRegion,
            desiredCategory: form.desiredCategory,
            interestedBrand: firstText(row.interested_brand, form.desiredBrand),
            totalBudget: form.totalBudget,
            ownedPropertyStatus: form.ownedPropertyStatus,
            matchPriority: form.matchPriority,
            urgency: form.urgency,
            memo: firstText(row.memo),
            createdAt,
            canEdit: false,
            canDelete: false,
            form
        }
    };
}
