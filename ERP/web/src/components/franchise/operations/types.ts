import type { LocationCompetitionScan } from '@/components/franchise/LocationCompetitionPanel';
import type {
    OpeningProjectStatus,
    OpeningProjectSummary,
    OpeningProjectTask
} from '@/lib/franchise-opening-projects';

export const FRANCHISE_LOCATION_TYPES = ['직영점', '가맹점', '예정점'] as const;
export const FRANCHISE_LOCATION_STATUSES = ['운영중', '오픈준비', '검토중', '휴점', '폐점'] as const;

export type FranchiseLocationType = typeof FRANCHISE_LOCATION_TYPES[number];
export type FranchiseLocationStatus = typeof FRANCHISE_LOCATION_STATUSES[number];

export type AuthUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly role?: string;
    readonly companyName?: string;
    readonly company_name?: string;
};

export type FranchiseLocation = {
    readonly id: string;
    readonly companyId?: string;
    readonly managerId?: string | null;
    readonly name: string;
    readonly locationType: FranchiseLocationType;
    readonly brand: string;
    readonly status: FranchiseLocationStatus;
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly openedAt: string | null;
    readonly memo: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly sourcePropertyId?: string | null;
    readonly competitionScan?: LocationCompetitionScan;
    readonly competitionKeyword?: string;
    readonly brandId?: string;
    readonly industry?: string;
    readonly businessType?: string;
    readonly categoryMajor?: string;
    readonly categoryMiddle?: string;
    readonly categorySmall?: string;
};

export type FranchiseOpeningProject = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly managerId: string | null;
    readonly status: OpeningProjectStatus;
    readonly targetOpenDate: string | null;
    readonly memo: string;
    readonly tasks: readonly OpeningProjectTask[];
    readonly summary: OpeningProjectSummary;
    readonly createdAt?: string;
    readonly updatedAt?: string;
};

export type OpeningProjectDraft = {
    readonly id?: string;
    readonly locationId: string;
    readonly status: OpeningProjectStatus;
    readonly targetOpenDate: string;
    readonly memo: string;
    readonly tasks: readonly OpeningProjectTask[];
};

export type LocationFormState = {
    readonly id?: string;
    readonly name: string;
    readonly locationType: FranchiseLocationType;
    readonly brand: string;
    readonly brandId: string;
    readonly industry: string;
    readonly businessType: string;
    readonly categoryMajor: string;
    readonly categoryMiddle: string;
    readonly categorySmall: string;
    readonly competitionKeyword: string;
    readonly status: FranchiseLocationStatus;
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly openedAt: string;
    readonly memo: string;
};

export const EMPTY_LOCATION_FORM: LocationFormState = {
    name: '',
    locationType: '가맹점',
    brand: '',
    brandId: '',
    industry: '',
    businessType: '',
    categoryMajor: '',
    categoryMiddle: '',
    categorySmall: '',
    competitionKeyword: '',
    status: '운영중',
    region: '',
    address: '',
    latitude: null,
    longitude: null,
    openedAt: '',
    memo: ''
};

export function toFranchiseLocationType(value: string): FranchiseLocationType {
    return FRANCHISE_LOCATION_TYPES.find(type => type === value) || '가맹점';
}

export function toFranchiseLocationStatus(value: string): FranchiseLocationStatus {
    return FRANCHISE_LOCATION_STATUSES.find(status => status === value) || '운영중';
}
