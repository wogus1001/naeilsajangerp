import {
    summarizeOpeningProjectTasks
} from '@/lib/franchise-opening-projects';
import type { FranchiseDisclosureDocument } from '@/lib/franchise-disclosure-deliveries';
import type { FranchiseLeadDocument } from '@/lib/franchise-lead-documents';
import {
    EMPTY_LEAD_CHECKLIST_SUMMARY,
    type GmailConnectionStatus,
    type LeadDetailRuntime
} from './leadDetailRuntime';
import type { FranchiseLocation } from './types';
import type { FranchiseOpeningProject } from '../operations/types';

export function createTestLeadDetailRuntime(): LeadDetailRuntime {
    let disclosures: readonly FranchiseDisclosureDocument[] = [];
    let documents: readonly FranchiseLeadDocument[] = [];
    let checklistCompleted = false;
    let storeLocation: FranchiseLocation | null = null;
    let openingProject: FranchiseOpeningProject | null = null;
    let gmailConnected = false;

    return {
        disclosure: {
            async load() {
                return { documents: disclosures, deliveries: [], eligibility: null };
            },
            async upload(input) {
                return { publicUrl: `memory://disclosures/${input.file.name}`, fileName: input.file.name };
            },
            async saveDocument(input) {
                const document: FranchiseDisclosureDocument = {
                    id: `disclosure-${disclosures.length + 1}`,
                    companyId: input.companyId || 'company-1',
                    createdBy: input.requesterId,
                    title: input.draft.title,
                    brandName: input.draft.brandName,
                    franchisorName: input.draft.franchisorName,
                    version: input.draft.version,
                    fileUrl: input.draft.fileUrl,
                    fileName: input.draft.fileName,
                    issuedAt: input.draft.issuedAt || null,
                    memo: input.draft.memo,
                    status: 'active',
                    createdAt: '2026-07-30T00:00:00.000Z',
                    updatedAt: '2026-07-30T00:00:00.000Z'
                };
                disclosures = [...disclosures, document];
                return document;
            },
            async deleteDocument(input) {
                disclosures = disclosures.filter(document => document.id !== input.documentId);
            },
            async loadGmailStatus() {
                return gmailStatus(gmailConnected);
            },
            gmailConnection: {
                kind: 'inline',
                async connect() {
                    gmailConnected = true;
                    return gmailStatus(true);
                }
            },
            async disconnectGmail() {
                gmailConnected = false;
            },
            async sendEmail() {
                return;
            }
        },
        checklist: {
            async load() {
                return checklistSnapshot(checklistCompleted);
            },
            async saveStep(input) {
                checklistCompleted = input.patch.completed === true;
                return checklistSnapshot(checklistCompleted);
            }
        },
        documents: {
            async load() {
                return documents;
            },
            async loadElectronicContracts() {
                return [];
            },
            async upload(input) {
                return {
                    storageBucket: 'fixture',
                    storagePath: `lead/${input.leadId}/${input.file.name}`,
                    fileName: input.file.name
                };
            },
            async create(input) {
                documents = [...documents, leadDocument(input.leadId, input.title)];
                return documents;
            },
            async remove(input) {
                documents = documents.filter(document => document.id !== input.documentId);
                return documents;
            },
            async link(input) {
                documents = documents.map(document => document.id === input.documentId
                    ? { ...document, checklistStepKeys: [...document.checklistStepKeys, input.checklistStepKey] }
                    : document);
                return documents;
            },
            async open(input) {
                return `memory://documents/${input.documentId}`;
            }
        },
        store: {
            async load() {
                return storeLocation;
            },
            async save(input) {
                storeLocation = { ...storeFixture(input.locationId), ...input.form };
                return storeLocation;
            },
            async create(input) {
                storeLocation = { ...storeFixture('store-1'), ...input.form };
                return { location: storeLocation, created: true };
            }
        },
        opening: {
            async load() {
                return { storeLocation, project: openingProject };
            },
            async save(input) {
                const tasks = input.draft.tasks;
                openingProject = {
                    id: input.draft.id || 'opening-1',
                    companyId: 'company-1',
                    locationId: input.draft.locationId,
                    managerId: null,
                    status: input.draft.status,
                    targetOpenDate: input.draft.targetOpenDate,
                    memo: input.draft.memo,
                    tasks,
                    summary: summarizeOpeningProjectTasks(tasks)
                };
                return openingProject;
            }
        }
    };
}

function gmailStatus(connected: boolean): GmailConnectionStatus {
    return {
        configReady: true,
        connected,
        connection: connected ? { id: 'gmail-1', gmailEmail: 'demo@example.com' } : null
    };
}

function checklistSnapshot(completed: boolean) {
    return {
        steps: [],
        summary: {
            ...EMPTY_LEAD_CHECKLIST_SUMMARY,
            completed: completed ? 1 : 0
        }
    };
}

function leadDocument(leadId: string, title: string): FranchiseLeadDocument {
    return {
        id: `document-${leadId}`,
        companyId: 'company-1',
        leadId,
        sourceType: 'upload',
        sourceId: '',
        title,
        documentStatus: 'stored',
        fileUrl: 'memory://document',
        fileName: 'fixture.pdf',
        memo: '',
        status: 'active',
        createdBy: 'user-1',
        createdByName: '김담당',
        createdAt: '2026-07-30T00:00:00.000Z',
        updatedAt: '2026-07-30T00:00:00.000Z',
        checklistStepKeys: []
    };
}

function storeFixture(id: string): FranchiseLocation {
    return { id, name: '샘플점', status: '오픈준비', region: '서울', address: '서울시 중구' };
}
