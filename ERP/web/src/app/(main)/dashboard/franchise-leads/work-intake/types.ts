import type { LeadRegistrationForm } from '@/lib/franchise-lead-registration';
import type { MatchingRequestForm } from '@/lib/franchise-matching-request';
import type { PropertyRegistrationForm } from '@/lib/franchise-property-registration';

export type WorkIntakeTab = 'properties' | 'leadRegistrations' | 'matchingRequests';

export type WorkIntakeKind = WorkIntakeTab;

export type WorkIntakeVisibleTab = WorkIntakeTab | 'deletedRecords';

export type WorkIntakePageMeta = {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly pageCount: number;
};

export type PropertyItem = {
    readonly id: string;
    readonly companyName: string;
    readonly managerId: string;
    readonly authorId: string;
    readonly authorName: string;
    readonly name: string;
    readonly status: string;
    readonly address: string;
    readonly region: string;
    readonly desiredBrand: string;
    readonly desiredCategory: string;
    readonly deposit: string;
    readonly monthlyRent: string;
    readonly createdAt: string;
    readonly canEdit: boolean;
    readonly canDelete: boolean;
    readonly form: PropertyRegistrationForm;
};

export type LeadRegistrationItem = {
    readonly id: string;
    readonly managerId: string;
    readonly authorId: string;
    readonly managerName: string;
    readonly name: string;
    readonly mobile: string;
    readonly source: string;
    readonly status: string;
    readonly archivedStatus?: string;
    readonly grade: string;
    readonly desiredRegion: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
    readonly interestedBrand: string;
    readonly memo: string;
    readonly nextContactAt: string;
    readonly promotedAt: string;
    readonly promotedLeadId: string;
    readonly createdAt: string;
    readonly canEdit: boolean;
    readonly canDelete: boolean;
    readonly form: LeadRegistrationForm;
};

export type MatchingRequestItem = {
    readonly id: string;
    readonly managerId: string;
    readonly authorId: string;
    readonly managerName: string;
    readonly name: string;
    readonly mobile: string;
    readonly email: string;
    readonly status: string;
    readonly desiredRegion: string;
    readonly desiredCategory: string;
    readonly interestedBrand: string;
    readonly totalBudget: string;
    readonly ownedPropertyStatus: string;
    readonly matchPriority: string;
    readonly urgency: string;
    readonly memo: string;
    readonly createdAt: string;
    readonly canEdit: boolean;
    readonly canDelete: boolean;
    readonly form: MatchingRequestForm;
};

export type DeletedWorkIntakeItem = {
    readonly id: string;
    readonly kind: string;
    readonly kindLabel: string;
    readonly sourceId: string;
    readonly companyId: string;
    readonly companyName: string;
    readonly deletedBy: string;
    readonly deletedByName: string;
    readonly title: string;
    readonly summary: string;
    readonly deletedAt: string;
    readonly snapshot: Record<string, unknown>;
};

export type WorkIntakeData = {
    readonly properties: readonly PropertyItem[];
    readonly leadRegistrationRequests: readonly LeadRegistrationItem[];
    readonly matchingRequests: readonly MatchingRequestItem[];
    readonly deletedRecords?: readonly DeletedWorkIntakeItem[];
    readonly isAdmin?: boolean;
    readonly meta?: {
        readonly properties: WorkIntakePageMeta;
        readonly leadRegistrationRequests: WorkIntakePageMeta;
        readonly matchingRequests: WorkIntakePageMeta;
        readonly deletedRecords: WorkIntakePageMeta;
    };
};

export type WorkIntakeEditTarget =
    | { readonly kind: 'properties'; readonly item: PropertyItem }
    | { readonly kind: 'leadRegistrations'; readonly item: LeadRegistrationItem }
    | { readonly kind: 'matchingRequests'; readonly item: MatchingRequestItem };
