import type { ContractStoreFormState } from '@/lib/franchise-contract-store-form';
import type { ContractStoreSourceType } from '@/lib/franchise-contract-store';
import type {
    DisclosureEligibility,
    FranchiseDisclosureDocument,
    FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import type {
    LeadContractApplicability,
    LeadContractChecklistStep,
    LeadContractChecklistSummary
} from '@/lib/franchise-lead-contract-checklist';
import type {
    FranchiseLeadDocument,
    FranchiseLeadDocumentSourceType
} from '@/lib/franchise-lead-documents';
import type { DocumentDraft } from '../leadDisclosureFormUtils';
import type {
    FranchiseOpeningProject,
    OpeningProjectDraft
} from '../operations/types';
import type { FranchiseLocation } from './types';

export type GmailConnectionStatus = {
    readonly configReady: boolean;
    readonly connected: boolean;
    readonly connection: {
        readonly id: string;
        readonly gmailEmail: string;
    } | null;
};

export type LeadDisclosureState = {
    readonly documents: readonly FranchiseDisclosureDocument[];
    readonly deliveries: readonly FranchiseLeadDisclosureDelivery[];
    readonly eligibility: DisclosureEligibility | null;
};

export type LeadDisclosureLoadInput = {
    readonly userId: string;
    readonly leadId: string;
    readonly companyId?: string;
    readonly companyName: string;
};

export type LeadDisclosureUploadInput = {
    readonly companyId: string;
    readonly companyName: string;
    readonly file: File;
    readonly requesterId: string;
};

export type LeadDisclosureSaveInput = {
    readonly requesterId: string;
    readonly companyId?: string;
    readonly companyName: string;
    readonly draft: DocumentDraft;
};

export type LeadDisclosureSendInput = {
    readonly requesterId: string;
    readonly leadId: string;
    readonly documentId: string;
    readonly recipientName: string;
    readonly recipientEmail: string;
    readonly recipientPhone: string;
    readonly memo: string;
};

export type GmailScopeInput = {
    readonly userId: string;
    readonly companyName: string;
};

export type GmailConnectInput = {
    readonly requesterId: string;
    readonly companyName: string;
    readonly redirectPath: string;
};

export type GmailConnectionStrategy =
    | {
        readonly kind: 'popup';
        readonly requestAuthorizationUrl: (input: GmailConnectInput) => Promise<string>;
    }
    | {
        readonly kind: 'inline';
        readonly connect: (input: GmailScopeInput) => Promise<GmailConnectionStatus>;
    };

export type LeadDisclosureRuntimePort = {
    readonly load: (input: LeadDisclosureLoadInput) => Promise<LeadDisclosureState>;
    readonly upload: (input: LeadDisclosureUploadInput) => Promise<{
        readonly publicUrl: string;
        readonly fileName: string;
    }>;
    readonly saveDocument: (input: LeadDisclosureSaveInput) => Promise<FranchiseDisclosureDocument>;
    readonly deleteDocument: (input: {
        readonly requesterId: string;
        readonly documentId: string;
    }) => Promise<void>;
    readonly loadGmailStatus: (input: GmailScopeInput) => Promise<GmailConnectionStatus>;
    readonly gmailConnection: GmailConnectionStrategy;
    readonly disconnectGmail: (input: {
        readonly requesterId: string;
        readonly companyName: string;
    }) => Promise<void>;
    readonly sendEmail: (input: LeadDisclosureSendInput) => Promise<void>;
};

export type LeadChecklistSnapshot = {
    readonly steps: readonly LeadContractChecklistStep[];
    readonly summary: LeadContractChecklistSummary;
};

export const EMPTY_LEAD_CHECKLIST_SUMMARY: LeadContractChecklistSummary = {
    total: 0,
    completed: 0,
    resolved: 0,
    remaining: 0,
    progressPercent: 0,
    missingRequiredCount: 0,
    groups: {
        required: { total: 0, completed: 0, resolved: 0, remaining: 0, progressPercent: 0, missingDocumentCount: 0 },
        report: { total: 0, completed: 0, resolved: 0, remaining: 0, progressPercent: 0, missingDocumentCount: 0 },
        optional: { total: 0, completed: 0, resolved: 0, remaining: 0, progressPercent: 0, missingDocumentCount: 0 }
    }
};

export type LeadChecklistStepPatch = {
    readonly completed?: boolean;
    readonly memo?: string;
    readonly applicability?: LeadContractApplicability;
};

export type LeadChecklistRuntimePort = {
    readonly load: (input: {
        readonly leadId: string;
        readonly userId: string;
    }) => Promise<LeadChecklistSnapshot>;
    readonly saveStep: (input: {
        readonly leadId: string;
        readonly userId: string;
        readonly stepKey: string;
        readonly patch: LeadChecklistStepPatch;
    }) => Promise<LeadChecklistSnapshot>;
};

export type LeadElectronicContract = {
    readonly id: string;
    readonly name: string;
    readonly status: string;
};

export type LeadDocumentCreateInput = {
    readonly leadId: string;
    readonly title: string;
    readonly sourceType: Extract<FranchiseLeadDocumentSourceType, 'upload' | 'electronic_contract'>;
    readonly sourceId: string;
    readonly documentStatus: string;
    readonly fileName: string;
    readonly storageBucket: string;
    readonly storagePath: string;
    readonly memo: string;
    readonly checklistStepKey?: string;
};

export type LeadDocumentsRuntimePort = {
    readonly load: (input: { readonly leadId: string }) => Promise<readonly FranchiseLeadDocument[]>;
    readonly loadElectronicContracts: (input: {
        readonly leadId: string;
    }) => Promise<readonly LeadElectronicContract[]>;
    readonly upload: (input: {
        readonly companyId: string;
        readonly leadId: string;
        readonly file: File;
    }) => Promise<{
        readonly storageBucket: string;
        readonly storagePath: string;
        readonly fileName: string;
    }>;
    readonly create: (input: LeadDocumentCreateInput) => Promise<readonly FranchiseLeadDocument[]>;
    readonly remove: (input: {
        readonly documentId: string;
        readonly checklistStepKey?: string;
    }) => Promise<readonly FranchiseLeadDocument[]>;
    readonly link: (input: {
        readonly documentId: string;
        readonly checklistStepKey: string;
    }) => Promise<readonly FranchiseLeadDocument[]>;
    readonly open: (input: { readonly documentId: string }) => Promise<string>;
};

export type LeadContractStoreRuntimePort = {
    readonly load: (input: {
        readonly leadId: string;
        readonly userId: string;
        readonly companyName: string;
    }) => Promise<FranchiseLocation | null>;
    readonly save: (input: {
        readonly locationId: string;
        readonly form: ContractStoreFormState;
        readonly userId: string;
        readonly companyName: string;
    }) => Promise<FranchiseLocation | null>;
    readonly create: (input: {
        readonly leadId: string;
        readonly form: ContractStoreFormState;
        readonly sourceType: ContractStoreSourceType;
        readonly sourceId: string;
        readonly userId: string;
        readonly companyName: string;
    }) => Promise<{
        readonly location: FranchiseLocation | null;
        readonly created: boolean;
    }>;
};

export type LeadOpeningRuntimePort = {
    readonly load: (input: {
        readonly leadId: string;
        readonly userId: string;
        readonly companyName: string;
    }) => Promise<{
        readonly storeLocation: FranchiseLocation | null;
        readonly project: FranchiseOpeningProject | null;
    }>;
    readonly save: (input: {
        readonly draft: OpeningProjectDraft;
        readonly leadId: string;
        readonly userId: string;
        readonly companyName: string;
    }) => Promise<FranchiseOpeningProject>;
};

export type LeadDetailRuntime = {
    readonly disclosure: LeadDisclosureRuntimePort;
    readonly checklist: LeadChecklistRuntimePort;
    readonly documents: LeadDocumentsRuntimePort;
    readonly store: LeadContractStoreRuntimePort;
    readonly opening: LeadOpeningRuntimePort;
};

export type LeadDetailRuntimeOverrides = Partial<LeadDetailRuntime>;
