export type AdminIntakeCompany = {
    readonly id: string;
    readonly name: string;
};

export type AdminIntakeManager = {
    readonly id: string;
    readonly companyId: string;
    readonly name: string;
    readonly role: string;
};

export type AdminIntakeProperty = {
    readonly id: string;
    readonly companyId: string;
    readonly companyName: string;
    readonly managerId: string;
    readonly name: string;
    readonly status: string;
    readonly operationType: string;
    readonly address: string;
    readonly region: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly promotedLocationId: string;
    readonly promotedCompanyId: string;
    readonly promotedCompanyIds: readonly string[];
    readonly promotionCount: number;
    readonly syncStatus: 'synced' | 'stale';
};

export type AdminMatchingRequest = {
    readonly id: string;
    readonly companyId: string;
    readonly managerId: string;
    readonly managerName: string;
    readonly name: string;
    readonly mobile: string;
    readonly email: string;
    readonly residence: string;
    readonly currentJob: string;
    readonly desiredRegion: string;
    readonly desiredCategory: string;
    readonly interestedBrand: string;
    readonly brandPreference: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
    readonly totalBudget: string;
    readonly ownCapital: string;
    readonly loanPreference: string;
    readonly desiredDeposit: string;
    readonly desiredRent: string;
    readonly desiredPremium: string;
    readonly desiredSize: string;
    readonly desiredFloor: string;
    readonly excludedRegion: string;
    readonly ownedPropertyStatus: string;
    readonly ownedPropertyName: string;
    readonly ownedPropertyAddress: string;
    readonly matchPriority: string;
    readonly proposalRange: string;
    readonly urgency: string;
    readonly summaryNote: string;
    readonly riskMemo: string;
    readonly recommendedBrands: string;
    readonly recommendedProperties: string;
    readonly nextAction: string;
    readonly memo: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly promotedLeadId: string;
    readonly promotedCompanyId: string;
    readonly promotedCompanyIds: readonly string[];
    readonly promotionCount: number;
    readonly promotedAt: string;
    readonly syncStatus: 'synced' | 'stale';
};

export type AdminLeadRegistrationRequest = {
    readonly id: string;
    readonly companyId: string;
    readonly managerId: string;
    readonly managerName: string;
    readonly name: string;
    readonly mobile: string;
    readonly source: string;
    readonly status: string;
    readonly grade: string;
    readonly desiredRegion: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
    readonly interestedBrand: string;
    readonly memo: string;
    readonly nextContactAt: string;
    readonly leadStage: string;
    readonly adminIntakeStatus: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly promotedLeadId: string;
    readonly syncStatus: 'synced' | 'stale';
    readonly promotedAt: string;
};

export type AdminFranchiseIntakeData = {
    readonly companies: readonly AdminIntakeCompany[];
    readonly selectedCompanyId: string;
    readonly managers: readonly AdminIntakeManager[];
    readonly properties: readonly AdminIntakeProperty[];
    readonly leadRegistrationRequests: readonly AdminLeadRegistrationRequest[];
    readonly matchingRequests: readonly AdminMatchingRequest[];
};

export type PromotionRequest = {
    readonly propertyId: string;
    readonly targetCompanyId: string;
    readonly managerId?: string;
    readonly requesterId: string;
};

export type LeadPromotionRequest = {
    readonly leadId: string;
    readonly targetCompanyId: string;
    readonly managerId?: string;
    readonly requesterId: string;
};

export type LeadSyncRequest = {
    readonly leadId: string;
    readonly requesterId: string;
    readonly targetCompanyId?: string;
};

export type PropertySyncRequest = {
    readonly propertyId: string;
    readonly requesterId: string;
    readonly targetCompanyId?: string;
};
