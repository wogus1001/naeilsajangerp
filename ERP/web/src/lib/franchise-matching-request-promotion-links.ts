import {
    findFranchiseIntakePromotionRecord,
    upsertFranchiseIntakePromotionRecord,
    type FranchiseIntakePromotionRecord
} from './franchise-intake-promotions';

export const MATCHING_REQUEST_PROMOTIONS_KEY = 'matchingRequestPromotions';

type MatchingRequestPromotionContext = {
    readonly promotedAt: string;
    readonly promotedBy: string;
    readonly promotedLeadId: string;
    readonly targetCompanyId: string;
    readonly targetManagerId: string | null;
};

function readDataString(data: Record<string, unknown>, key: string): string {
    const value = data[key];
    return typeof value === 'string' ? value.trim() : '';
}

export function buildMatchingRequestSourcePromotionData(
    existingData: Record<string, unknown>,
    context: MatchingRequestPromotionContext
): Record<string, unknown> {
    const promotion: FranchiseIntakePromotionRecord = {
        promotedLeadId: context.promotedLeadId,
        targetCompanyId: context.targetCompanyId,
        targetManagerId: context.targetManagerId || '',
        promotedAt: context.promotedAt,
        promotedBy: context.promotedBy
    };

    return {
        ...existingData,
        [MATCHING_REQUEST_PROMOTIONS_KEY]: upsertFranchiseIntakePromotionRecord(
            existingData,
            MATCHING_REQUEST_PROMOTIONS_KEY,
            promotion
        ),
        matchingRequestPromotedAt: context.promotedAt,
        matchingRequestPromotedBy: context.promotedBy,
        matchingRequestPromotedLeadId: context.promotedLeadId,
        matchingRequestPromotedCompanyId: context.targetCompanyId,
        matchingRequestPromotedManagerId: context.targetManagerId || '',
        matchingRequestPromotionStatus: 'promoted'
    };
}

export function findMatchingRequestPromotion(
    data: Record<string, unknown>,
    targetCompanyId: string | null
): FranchiseIntakePromotionRecord | null {
    const promotion = findFranchiseIntakePromotionRecord(data, MATCHING_REQUEST_PROMOTIONS_KEY, targetCompanyId);
    if (promotion) return promotion;

    const legacyPromotedLeadId = readDataString(data, 'matchingRequestPromotedLeadId');
    const legacyTargetCompanyId = readDataString(data, 'matchingRequestPromotedCompanyId');
    const legacyPromotedAt = readDataString(data, 'matchingRequestPromotedAt');
    if (!legacyPromotedLeadId || !legacyTargetCompanyId || !legacyPromotedAt) return null;
    if (targetCompanyId && legacyTargetCompanyId !== targetCompanyId) return null;
    return {
        promotedLeadId: legacyPromotedLeadId,
        targetCompanyId: legacyTargetCompanyId,
        targetManagerId: readDataString(data, 'matchingRequestPromotedManagerId'),
        promotedAt: legacyPromotedAt,
        promotedBy: readDataString(data, 'matchingRequestPromotedBy')
    };
}
