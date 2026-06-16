import type { LocationCompetitionScan } from '@/components/franchise/LocationCompetitionPanel';
import type { FranchiseLocationMasterData } from '@/lib/franchise-location-master';

export const FRANCHISE_LOCATION_TYPES = ['직영점', '가맹점', '예정점'] as const;
export const FRANCHISE_LOCATION_STATUSES = ['운영중', '오픈준비', '검토중', '휴점', '폐점'] as const;

export type FranchiseLocationType = typeof FRANCHISE_LOCATION_TYPES[number];
export type FranchiseLocationStatus = typeof FRANCHISE_LOCATION_STATUSES[number];

export type AuthUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly name?: string;
    readonly role?: string;
    readonly companyName?: string;
    readonly companyId?: string | null;
};

export type FranchiseLead = {
    readonly id: string;
    readonly desiredRegion: string;
    readonly grade: string;
    readonly status: string;
    readonly source: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
};

export type FranchiseLocation = FranchiseLocationMasterData & {
    readonly id: string;
    readonly companyId?: string;
    readonly managerId?: string | null;
    readonly managerName?: string;
    readonly name: string;
    readonly locationType: FranchiseLocationType;
    readonly brand: string;
    readonly status: FranchiseLocationStatus;
    readonly region: string;
    readonly address: string;
    readonly addressDetail?: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly openedAt: string | null;
    readonly sourcePropertyId?: string | null;
    readonly memo: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly competitionScan?: LocationCompetitionScan;
    readonly competitionKeyword?: string;
    readonly brandId?: string;
    readonly industry?: string;
    readonly businessType?: string;
    readonly categoryMajor?: string;
    readonly categoryMiddle?: string;
    readonly categorySmall?: string;
};

export type LocationManagerOption = {
    readonly id: string;
    readonly displayId: string;
    readonly name: string;
};

export type LocationFormState = Omit<
    FranchiseLocation,
    'id' | 'companyId' | 'managerId' | 'managerName' | 'openedAt' | 'createdAt' | 'updatedAt' | 'competitionScan' | 'sourcePropertyId'
> & {
    readonly id?: string;
    readonly managerId: string;
    readonly openedAt: string;
    readonly addressDetail: string;
};

export type LocationMasterFilters = {
    readonly region: string;
    readonly maxAcquisitionCost: string;
    readonly maxDeposit: string;
    readonly maxPremium: string;
    readonly maxMonthlyRent: string;
    readonly maxMaintenanceFee: string;
    readonly importance: string;
    readonly status: string;
    readonly developmentStage: string;
};

export type LeadListResponse = {
    readonly leads: readonly FranchiseLead[];
    readonly total: number;
};

export type LocationListResponse = {
    readonly locations: readonly FranchiseLocation[];
};
