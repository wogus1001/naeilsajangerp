import { getDisclosureEligibility } from '@/lib/franchise-disclosure-deliveries';
import type {
    FranchiseDisclosureDocument,
    FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import type {
    GmailConnectionStatus,
    LeadDisclosureRuntimePort
} from '@/components/franchise/leads/leadDetailRuntime';
import {
    DEMO_DETAIL_COMPANY_ID,
    DEMO_DETAIL_NOW,
    createDemoDisclosureDelivery
} from './DemoLeadDetailFixtures';

function gmailStatus(connected: boolean): GmailConnectionStatus {
    return {
        configReady: true,
        connected,
        connection: connected
            ? { id: 'demo-gmail', gmailEmail: 'franchise@example.com' }
            : null
    };
}

export function createDemoDisclosureRuntime(
    deliveryMap: Map<string, readonly FranchiseLeadDisclosureDelivery[]>,
    initialDocument: FranchiseDisclosureDocument
): LeadDisclosureRuntimePort {
    let documents: readonly FranchiseDisclosureDocument[] = [initialDocument];
    let gmailConnected = false;

    return {
        async load(input) {
            const deliveries = deliveryMap.get(input.leadId) || [];
            return {
                documents,
                deliveries,
                eligibility: getDisclosureEligibility(deliveries, new Date(DEMO_DETAIL_NOW))
            };
        },
        async upload(input) {
            return {
                publicUrl: `data:${input.file.type || 'application/octet-stream'};name=${encodeURIComponent(input.file.name)}`,
                fileName: input.file.name
            };
        },
        async saveDocument(input) {
            const document: FranchiseDisclosureDocument = {
                id: `demo-disclosure-${documents.length + 1}`,
                companyId: input.companyId || DEMO_DETAIL_COMPANY_ID,
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
                createdAt: DEMO_DETAIL_NOW,
                updatedAt: DEMO_DETAIL_NOW
            };
            documents = [document, ...documents];
            return document;
        },
        async deleteDocument(input) {
            documents = documents.filter(document => document.id !== input.documentId);
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
        async sendEmail(input) {
            const document = documents.find(item => item.id === input.documentId);
            if (!document) throw new TypeError('발송할 정보공개서를 찾을 수 없습니다.');
            const current = deliveryMap.get(input.leadId) || [];
            const delivery = {
                ...createDemoDisclosureDelivery(input.leadId, document),
                id: `demo-delivery-${input.leadId}-${current.length + 1}`,
                recipientName: input.recipientName,
                recipientContact: input.recipientEmail,
                recipientEmail: input.recipientEmail,
                memo: input.memo,
                sentAt: DEMO_DETAIL_NOW,
                createdAt: DEMO_DETAIL_NOW,
                updatedAt: DEMO_DETAIL_NOW
            };
            deliveryMap.set(input.leadId, [delivery, ...current]);
        }
    };
}
