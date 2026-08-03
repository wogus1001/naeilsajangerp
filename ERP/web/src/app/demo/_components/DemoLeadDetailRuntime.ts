import { summarizeOpeningProjectTasks } from '@/lib/franchise-opening-projects';
import type { FranchiseLeadDisclosureDelivery } from '@/lib/franchise-disclosure-deliveries';
import {
    mergeLeadContractChecklistSteps,
    summarizeLeadContractChecklist,
    type LeadContractChecklistDocumentSummary,
    type LeadContractChecklistStepInput
} from '@/lib/franchise-lead-contract-checklist';
import type { FranchiseLeadDocument } from '@/lib/franchise-lead-documents';
import type { FranchiseOpeningProject } from '@/components/franchise/operations/types';
import type {
    LeadChecklistSnapshot,
    LeadDetailRuntime
} from '@/components/franchise/leads/leadDetailRuntime';
import type { FranchiseLocation } from '@/components/franchise/leads/types';
import {
    DEMO_DETAIL_COMPANY_ID,
    DEMO_DETAIL_NOW,
    DEMO_DETAIL_USER_ID,
    createDemoChecklistRows,
    createDemoDisclosureDelivery,
    createDemoDisclosureDocument,
    createDemoLeadDocument,
    createDemoOpeningProject,
    createDemoStore
} from './DemoLeadDetailFixtures';
import { createDemoDisclosureRuntime } from './createDemoDisclosureRuntime';

const CONTRACT_LEAD_IDS = [
    'demo-candidate-2',
    'demo-candidate-4',
    'demo-candidate-6'
] as const;

function toDocumentSummaries(
    documents: readonly FranchiseLeadDocument[]
): Record<string, LeadContractChecklistDocumentSummary> {
    const stepKeys = new Set(documents.flatMap(document => document.checklistStepKeys));
    return [...stepKeys].reduce<Record<string, LeadContractChecklistDocumentSummary>>((summaries, stepKey) => {
        const linked = documents.filter(document => document.checklistStepKeys.includes(stepKey));
        const latest = linked[0];
        summaries[stepKey] = {
            count: linked.length,
            latestTitle: latest?.title || '',
            latestStatus: latest?.documentStatus || '',
            latestMemo: latest?.memo || '',
            latestCreatedBy: latest?.createdBy || '',
            latestCreatedByName: latest?.createdByName || '',
            requiredEvidenceLinked: linked.length > 0,
            documentIds: linked.map(document => document.id),
            documents: linked.map(document => ({
                id: document.id,
                title: document.title,
                sourceType: document.sourceType,
                sourceId: document.sourceId,
                status: document.documentStatus,
                fileUrl: document.fileUrl,
                fileName: document.fileName,
                memo: document.memo,
                createdBy: document.createdBy,
                createdByName: document.createdByName,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt
            }))
        };
        return summaries;
    }, {});
}

function checklistSnapshot(
    rows: readonly LeadContractChecklistStepInput[],
    documents: readonly FranchiseLeadDocument[]
): LeadChecklistSnapshot {
    const documentSummaries = toDocumentSummaries(documents);
    return {
        steps: mergeLeadContractChecklistSteps(rows, documentSummaries),
        summary: summarizeLeadContractChecklist(rows, documentSummaries)
    };
}

function findDocumentEntry(
    documentsByLead: ReadonlyMap<string, readonly FranchiseLeadDocument[]>,
    documentId: string
): readonly [string, readonly FranchiseLeadDocument[]] | null {
    for (const [leadId, documents] of documentsByLead) {
        if (documents.some(document => document.id === documentId)) return [leadId, documents];
    }
    return null;
}

function createMaps() {
    const disclosure = createDemoDisclosureDocument();
    const checklistRows = new Map<string, readonly LeadContractChecklistStepInput[]>();
    const documents = new Map<string, readonly FranchiseLeadDocument[]>();
    const stores = new Map<string, FranchiseLocation>();
    const openings = new Map<string, FranchiseOpeningProject>();
    const deliveries = new Map<string, readonly FranchiseLeadDisclosureDelivery[]>();
    CONTRACT_LEAD_IDS.forEach(leadId => {
        const store = createDemoStore(leadId);
        checklistRows.set(leadId, createDemoChecklistRows());
        documents.set(leadId, [createDemoLeadDocument(leadId)]);
        stores.set(leadId, store);
        openings.set(leadId, createDemoOpeningProject(leadId, store.id));
        deliveries.set(leadId, [createDemoDisclosureDelivery(leadId, disclosure)]);
    });
    return { checklistRows, deliveries, disclosure, documents, openings, stores };
}

export function createDemoLeadDetailRuntime(): LeadDetailRuntime {
    const state = createMaps();

    return {
        disclosure: createDemoDisclosureRuntime(state.deliveries, state.disclosure),
        checklist: {
            async load(input) {
                return checklistSnapshot(
                    state.checklistRows.get(input.leadId) || createDemoChecklistRows(),
                    state.documents.get(input.leadId) || []
                );
            },
            async saveStep(input) {
                const current = state.checklistRows.get(input.leadId) || createDemoChecklistRows();
                const saved = current.find(step => step.stepKey === input.stepKey);
                const next = {
                    ...saved,
                    stepKey: input.stepKey,
                    ...input.patch,
                    completedAt: input.patch.completed ? DEMO_DETAIL_NOW : '',
                    completedBy: input.patch.completed ? input.userId : '',
                    updatedAt: DEMO_DETAIL_NOW
                };
                const rows = saved
                    ? current.map(step => step.stepKey === input.stepKey ? next : step)
                    : [...current, next];
                state.checklistRows.set(input.leadId, rows);
                return checklistSnapshot(rows, state.documents.get(input.leadId) || []);
            }
        },
        documents: {
            async load(input) {
                return state.documents.get(input.leadId) || [];
            },
            async loadElectronicContracts() {
                return [
                    { id: 'demo-contract-signed', name: '가맹계약서', status: 'completed' },
                    { id: 'demo-contract-draft', name: '임대차 확인서', status: 'draft' }
                ];
            },
            async upload(input) {
                return {
                    storageBucket: 'demo-memory',
                    storagePath: `${input.leadId}/${input.file.name}`,
                    fileName: input.file.name
                };
            },
            async create(input) {
                const current = state.documents.get(input.leadId) || [];
                const document = {
                    ...createDemoLeadDocument(input.leadId, input.title, input.checklistStepKey),
                    id: `demo-document-${input.leadId}-${current.length + 1}`,
                    sourceType: input.sourceType,
                    sourceId: input.sourceId,
                    documentStatus: input.documentStatus,
                    fileName: input.fileName,
                    memo: input.memo
                };
                const next = [document, ...current];
                state.documents.set(input.leadId, next);
                return next;
            },
            async remove(input) {
                const entry = findDocumentEntry(state.documents, input.documentId);
                if (!entry) return [];
                const [leadId, documents] = entry;
                const next = input.checklistStepKey
                    ? documents.map(document => document.id === input.documentId
                        ? {
                            ...document,
                            checklistStepKeys: document.checklistStepKeys.filter(
                                stepKey => stepKey !== input.checklistStepKey
                            )
                        }
                        : document)
                    : documents.filter(document => document.id !== input.documentId);
                state.documents.set(leadId, next);
                return next;
            },
            async link(input) {
                const entry = findDocumentEntry(state.documents, input.documentId);
                if (!entry) return [];
                const [leadId, documents] = entry;
                const next = documents.map(document => (
                    document.id === input.documentId && !document.checklistStepKeys.includes(input.checklistStepKey)
                        ? { ...document, checklistStepKeys: [...document.checklistStepKeys, input.checklistStepKey] }
                        : document
                ));
                state.documents.set(leadId, next);
                return next;
            },
            async open(input) {
                return `data:application/pdf;name=${encodeURIComponent(input.documentId)}`;
            }
        },
        store: {
            async load(input) {
                return state.stores.get(input.leadId) || null;
            },
            async save(input) {
                const entry = [...state.stores].find(([, store]) => store.id === input.locationId);
                if (!entry) return null;
                const [leadId, store] = entry;
                const saved = { ...store, ...input.form };
                state.stores.set(leadId, saved);
                return saved;
            },
            async create(input) {
                const existing = state.stores.get(input.leadId);
                if (existing) return { location: existing, created: false };
                const store = { ...createDemoStore(input.leadId), ...input.form };
                state.stores.set(input.leadId, store);
                return { location: store, created: true };
            }
        },
        opening: {
            async load(input) {
                return {
                    storeLocation: state.stores.get(input.leadId) || null,
                    project: state.openings.get(input.leadId) || null
                };
            },
            async save(input) {
                const project: FranchiseOpeningProject = {
                    id: input.draft.id || `demo-opening-${input.leadId}`,
                    companyId: DEMO_DETAIL_COMPANY_ID,
                    locationId: input.draft.locationId,
                    managerId: DEMO_DETAIL_USER_ID,
                    status: input.draft.status,
                    targetOpenDate: input.draft.targetOpenDate || null,
                    memo: input.draft.memo,
                    tasks: input.draft.tasks,
                    summary: summarizeOpeningProjectTasks(input.draft.tasks, new Date(DEMO_DETAIL_NOW))
                };
                state.openings.set(input.leadId, project);
                return project;
            }
        }
    };
}
