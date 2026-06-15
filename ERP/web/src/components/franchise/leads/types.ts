import type { LeadLocationMatchLocation } from '@/lib/franchise-lead-location-matching';
import type { LeadLocationLink } from '@/lib/franchise-lead-location-links';
import type { FranchiseLeadStage, FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { LeadConsultationResult, LeadFitLevel, LeadNextAction } from '@/lib/franchise-lead-workflow';

export type { LeadLocationLink };

export type FranchiseLead = {
    readonly id: string;
    readonly companyId?: string;
    readonly managerId?: string;
    readonly name: string;
    readonly mobile: string;
    readonly mobileNormalized?: string;
    readonly source: string;
    readonly status: FranchiseLeadStatus;
    readonly grade: string;
    readonly leadStage?: FranchiseLeadStage;
    readonly desiredRegion: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
    readonly interestedBrand: string;
    readonly memo: string;
    readonly nextContactAt: string | null;
    readonly lastContactedAt: string | null;
    readonly nextAction?: LeadNextAction;
    readonly consultationResult?: LeadConsultationResult;
    readonly churnReason?: string;
    readonly budgetFit?: LeadFitLevel;
    readonly regionFit?: LeadFitLevel;
    readonly brandFit?: LeadFitLevel;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly activityLog?: readonly LeadActivity[];
    readonly linkedCustomerId?: string;
    readonly linkedCustomerName?: string;
    readonly linkedBusinessCardId?: string;
    readonly linkedBusinessCardName?: string;
    readonly sourceType?: string;
    readonly sourceId?: string;
    readonly companyName?: string;
    readonly convertedCustomerId?: string;
    readonly convertedCustomerName?: string;
    readonly convertedAt?: string;
    readonly locationLinks?: readonly LeadLocationLink[];
};

export type LeadActivityType = '전화' | '문자' | '방문상담' | '계약검토' | '메모' | '상태변경' | '고객전환';

export type LeadActivity = {
    readonly id: string;
    readonly type: LeadActivityType;
    readonly content: string;
    readonly createdAt: string;
    readonly createdBy?: string;
};

export type RelatedCustomer = {
    readonly id: string;
    readonly name: string;
    readonly mobile?: string;
    readonly companyPhone?: string;
    readonly wantedArea?: string;
    readonly memoInterest?: string;
};

export type RelatedBusinessCard = {
    readonly id: string;
    readonly name: string;
    readonly companyName?: string;
    readonly mobile?: string;
    readonly companyPhone1?: string;
    readonly memo?: string;
};

export type FranchiseLocation = LeadLocationMatchLocation & {
    readonly companyId?: string;
    readonly managerId?: string | null;
    readonly createdAt?: string;
    readonly updatedAt?: string;
};

export type ExternalPropertyListing = {
    readonly id: string;
    readonly source?: string | null;
    readonly title?: string | null;
    readonly address?: string | null;
    readonly region?: string | null;
    readonly sourceUrl?: string | null;
    readonly depositAmount?: number | null;
    readonly monthlyRent?: number | null;
    readonly salePrice?: number | null;
    readonly areaPyeong?: string | null;
    readonly floorInfo?: string | null;
    readonly collectedAt?: string | null;
    readonly data?: Record<string, unknown> | null;
};

export type LeadSummary = {
    readonly total: number;
    readonly byStatus: Record<string, number>;
    readonly bySource: Record<string, number>;
    readonly hotCount: number;
    readonly nextContactCount: number;
    readonly createdByDate: Record<string, number>;
};

export type LeadListResponse = {
    readonly leads: FranchiseLead[];
    readonly summary: LeadSummary;
    readonly total: number;
};

export type AuthUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly name?: string;
    readonly role?: string;
    readonly companyName?: string;
    readonly companyId?: string | null;
};

export type ManagerOption = {
    readonly id: string;
    readonly uuid?: string;
    readonly name?: string;
    readonly companyName?: string;
    readonly companyId?: string | null;
    readonly role?: string;
};

export type MetaFieldMapping = {
    readonly name: string[];
    readonly mobile: string[];
    readonly desiredRegion: string[];
    readonly budget: string[];
    readonly budgetMin: string[];
    readonly budgetMax: string[];
    readonly interestedBrand: string[];
    readonly memo: string[];
};

export type MetaConnection = {
    readonly id: string;
    readonly companyId: string;
    readonly connectedBy?: string;
    readonly metaPageId: string;
    readonly metaPageName: string;
    readonly status: string;
    readonly lastSyncAt?: string | null;
    readonly lastWebhookAt?: string | null;
    readonly lastError?: string | null;
    readonly pageCategory?: string;
    readonly subscribeError?: string;
};

export type MetaLeadForm = {
    readonly id: string;
    readonly companyId: string;
    readonly connectionId: string;
    readonly metaFormId: string;
    readonly metaFormName: string;
    readonly enabled: boolean;
    readonly defaultManagerId?: string | null;
    readonly fieldMapping: MetaFieldMapping;
    readonly lastSyncedAt?: string | null;
    readonly lastError?: string | null;
};

export type MetaLeadImportLog = {
    readonly id: string;
    readonly metaLeadId: string;
    readonly franchiseLeadId?: string | null;
    readonly status: string;
    readonly errorMessage?: string | null;
    readonly receivedAt?: string | null;
    readonly importedAt?: string | null;
};

export type MetaIntegrationState = {
    readonly connections: MetaConnection[];
    readonly forms: MetaLeadForm[];
    readonly imports: MetaLeadImportLog[];
    readonly configReady: boolean;
};

export type LeadFormState = {
    readonly id?: string;
    readonly name: string;
    readonly mobile: string;
    readonly source: string;
    readonly status: FranchiseLeadStatus;
    readonly grade: string;
    readonly desiredRegion: string;
    readonly budgetMin: string;
    readonly budgetMax: string;
    readonly interestedBrand: string;
    readonly managerId: string;
    readonly nextContactAt: string;
    readonly memo: string;
};

export type LeadViewMode = 'table' | 'pipeline' | 'tasks';
export type LeadDbLayer = 'candidate' | 'raw_intake';

export type UploadErrorRow = {
    readonly row: number;
    readonly reason: string;
    readonly data?: Record<string, unknown>;
};
