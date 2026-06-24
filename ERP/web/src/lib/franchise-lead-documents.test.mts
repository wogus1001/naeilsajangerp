import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    attachChecklistLinksToDocuments,
    buildChecklistDocumentSummaries,
    normalizeFranchiseLeadDocumentSourceType,
    upsertElectronicContractLeadDocument
} from './franchise-lead-documents.js';

test('normalizeFranchiseLeadDocumentSourceType falls back to manual for unknown values', () => {
    assert.equal(normalizeFranchiseLeadDocumentSourceType('electronic_contract'), 'electronic_contract');
    assert.equal(normalizeFranchiseLeadDocumentSourceType('unknown'), 'manual');
});

test('attachChecklistLinksToDocuments adds linked checklist step keys to documents', () => {
    const documents = attachChecklistLinksToDocuments([
        {
            id: 'doc-1',
            company_id: 'company-1',
            lead_id: 'lead-1',
            source_type: 'upload',
            title: '신분증'
        }
    ], [
        {
            lead_document_id: 'doc-1',
            step_key: 'owner-id-seal-certificate'
        }
    ]);

    assert.deepEqual(documents[0]?.checklistStepKeys, ['owner-id-seal-certificate']);
});

test('buildChecklistDocumentSummaries counts non-archived linked documents per step', () => {
    const summaries = buildChecklistDocumentSummaries([
        {
            id: 'doc-1',
            company_id: 'company-1',
            lead_id: 'lead-1',
            source_type: 'upload',
            source_id: 'source-1',
            title: '신분증',
            document_status: 'stored',
            file_url: 'https://example.com/id.pdf',
            file_name: 'id.pdf',
            memo: '인감증명서는 원본 확인',
            status: 'active',
            created_by: 'manager-1',
            created_at: '2026-06-23T03:00:00.000Z',
            updated_at: '2026-06-23T04:00:00.000Z'
        },
        {
            id: 'doc-2',
            company_id: 'company-1',
            lead_id: 'lead-1',
            title: '이전 신분증',
            document_status: 'stored',
            status: 'archived'
        }
    ], [
        {
            lead_document_id: 'doc-1',
            step_key: 'owner-id-seal-certificate'
        },
        {
            lead_document_id: 'doc-2',
            step_key: 'owner-id-seal-certificate'
        }
    ], new Map([['manager-1', '김담당']]));

    assert.deepEqual(summaries['owner-id-seal-certificate'], {
        count: 1,
        latestTitle: '신분증',
        latestStatus: 'stored',
        latestMemo: '인감증명서는 원본 확인',
        latestCreatedBy: 'manager-1',
        latestCreatedByName: '김담당',
        requiredEvidenceLinked: true,
        documentIds: ['doc-1'],
        documents: [{
            id: 'doc-1',
            title: '신분증',
            sourceType: 'upload',
            sourceId: 'source-1',
            status: 'stored',
            fileUrl: 'https://example.com/id.pdf',
            fileName: 'id.pdf',
            memo: '인감증명서는 원본 확인',
            createdBy: 'manager-1',
            createdByName: '김담당',
            createdAt: '2026-06-23T03:00:00.000Z',
            updatedAt: '2026-06-23T04:00:00.000Z'
        }]
    });
});

test('upsertElectronicContractLeadDocument links to the provided checklist step key', async () => {
    const calls: Array<{ table: string; payload: Record<string, unknown> }> = [];
    const supabase = {
        from(table: string) {
            return {
                upsert(payload: Record<string, unknown>) {
                    calls.push({ table, payload });
                    if (table === 'franchise_lead_documents') {
                        return {
                            select() {
                                return {
                                    single() {
                                        return Promise.resolve({
                                            data: {
                                                id: 'doc-1',
                                                company_id: payload.company_id,
                                                lead_id: payload.lead_id,
                                                source_type: payload.source_type,
                                                source_id: payload.source_id,
                                                title: payload.title,
                                                document_status: payload.document_status,
                                                status: payload.status,
                                                created_by: payload.created_by,
                                                updated_at: payload.updated_at
                                            },
                                            error: null
                                        });
                                    }
                                };
                            }
                        };
                    }
                    return Promise.resolve({ error: null });
                }
            };
        }
    };

    const document = await upsertElectronicContractLeadDocument(supabase as never, {
        companyId: 'company-1',
        leadId: 'lead-1',
        contractId: 'contract-1',
        checklistStepKey: 'privacy-consent',
        title: '개인정보 동의서',
        documentStatus: 'draft',
        requesterId: 'manager-1',
        nowIso: '2026-06-23T10:30:00.000Z'
    });

    assert.deepEqual(document?.checklistStepKeys, ['privacy-consent']);
    assert.equal(calls.find(call => call.table === 'franchise_lead_document_checklist_links')?.payload.step_key, 'privacy-consent');
});
