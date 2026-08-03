import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { buildDefaultOpeningProjectTasks } from '@/lib/franchise-opening-projects';
import { resolveLeadDetailRuntime } from './LeadDetailRuntimeProvider.js';
import { createTestLeadDetailRuntime } from './leadDetailRuntimeFixture.test-support.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test('Given in-memory lead detail ports When workflow actions run Then local state changes without network', async () => {
    // Given
    let fetchCount = 0;
    globalThis.fetch = async () => {
        fetchCount += 1;
        throw new TypeError('fixture runtime must not use fetch');
    };
    const runtime = resolveLeadDetailRuntime(createTestLeadDetailRuntime());
    const file = new File(['fixture'], 'fixture.pdf', { type: 'application/pdf' });

    // When
    const upload = await runtime.disclosure.upload({
        companyId: 'company-1',
        companyName: '샘플 본사',
        file,
        requesterId: 'user-1'
    });
    const savedDisclosure = await runtime.disclosure.saveDocument({
        requesterId: 'user-1',
        companyId: 'company-1',
        companyName: '샘플 본사',
        draft: {
            title: '샘플 정보공개서',
            version: '2026',
            brandName: '샘플',
            franchisorName: '샘플 본사',
            fileUrl: upload.publicUrl,
            fileName: upload.fileName,
            issuedAt: '2026-07-30',
            memo: ''
        }
    });
    await runtime.disclosure.deleteDocument({
        requesterId: 'user-1',
        documentId: savedDisclosure.id
    });
    const checklist = await runtime.checklist.saveStep({
        leadId: 'lead-1',
        userId: 'user-1',
        stepKey: 'franchise-contract',
        patch: { completed: true }
    });
    const uploadedDocument = await runtime.documents.upload({
        companyId: 'company-1',
        leadId: 'lead-1',
        file
    });
    await runtime.documents.create({
        leadId: 'lead-1',
        title: '가맹계약서',
        sourceType: 'upload',
        sourceId: '',
        documentStatus: 'stored',
        fileName: uploadedDocument.fileName,
        storageBucket: uploadedDocument.storageBucket,
        storagePath: uploadedDocument.storagePath,
        memo: '',
        checklistStepKey: 'franchise-contract'
    });
    await runtime.store.create({
        leadId: 'lead-1',
        form: storeFormFixture(),
        sourceType: 'direct',
        sourceId: '',
        userId: 'user-1',
        companyName: '샘플 본사'
    });
    const opening = await runtime.opening.save({
        draft: {
            locationId: 'store-1',
            status: '진행중',
            targetOpenDate: '2026-08-30',
            memo: '교육 일정 확인',
            tasks: buildDefaultOpeningProjectTasks()
        },
        leadId: 'lead-1',
        userId: 'user-1',
        companyName: '샘플 본사'
    });

    // Then
    assert.equal(fetchCount, 0);
    assert.equal((await runtime.disclosure.load({
        userId: 'user-1',
        leadId: 'lead-1',
        companyId: 'company-1',
        companyName: '샘플 본사'
    })).documents.length, 0);
    assert.equal(checklist.summary.completed, 1);
    assert.equal((await runtime.documents.load({ leadId: 'lead-1' })).length, 1);
    assert.equal((await runtime.store.load({
        leadId: 'lead-1',
        userId: 'user-1',
        companyName: '샘플 본사'
    }))?.name, '샘플점');
    assert.equal(opening.status, '진행중');
});

test('Given an empty fixture runtime When detail data loads Then each section receives an explicit empty state', async () => {
    // Given
    const runtime = resolveLeadDetailRuntime(createTestLeadDetailRuntime());

    // When
    const [disclosure, checklist, documents, store, opening] = await Promise.all([
        runtime.disclosure.load({
            userId: 'user-1',
            leadId: 'lead-1',
            companyId: 'company-1',
            companyName: '샘플 본사'
        }),
        runtime.checklist.load({ userId: 'user-1', leadId: 'lead-1' }),
        runtime.documents.load({ leadId: 'lead-1' }),
        runtime.store.load({ userId: 'user-1', leadId: 'lead-1', companyName: '샘플 본사' }),
        runtime.opening.load({ userId: 'user-1', leadId: 'lead-1', companyName: '샘플 본사' })
    ]);

    // Then
    assert.equal(disclosure.documents.length, 0);
    assert.equal(checklist.steps.length, 0);
    assert.equal(documents.length, 0);
    assert.equal(store, null);
    assert.equal(opening.project, null);
});

test('Given a fixture runtime failure When section actions run Then the typed failure propagates without live fallback', async () => {
    // Given
    let fetchCount = 0;
    globalThis.fetch = async () => {
        fetchCount += 1;
        throw new TypeError('live fallback was called');
    };
    const fixture = createTestLeadDetailRuntime();
    const failure = new FixtureRuntimeFailure('문서함 fixture 실패');
    const runtime = resolveLeadDetailRuntime({
        disclosure: {
            ...fixture.disclosure,
            async deleteDocument() {
                throw failure;
            }
        },
        checklist: {
            ...fixture.checklist,
            async saveStep() {
                throw failure;
            }
        },
        documents: {
            ...fixture.documents,
            async load() {
                throw failure;
            }
        }
    });

    // When
    const results = [
        runtime.documents.load({ leadId: 'lead-1' }),
        runtime.checklist.saveStep({
            leadId: 'lead-1',
            userId: 'user-1',
            stepKey: 'franchise-contract',
            patch: { completed: true }
        }),
        runtime.disclosure.deleteDocument({
            requesterId: 'user-1',
            documentId: 'document-1'
        })
    ];

    // Then
    await Promise.all(results.map(result => assert.rejects(result, FixtureRuntimeFailure)));
    assert.equal(fetchCount, 0);
});

function storeFormFixture() {
    return {
        name: '샘플점',
        brand: '샘플',
        status: '오픈준비',
        region: '서울',
        address: '서울시 중구',
        latitude: 37.5,
        longitude: 127,
        openedAt: '2026-08-30',
        memo: '오픈 준비'
    };
}

class FixtureRuntimeFailure extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FixtureRuntimeFailure';
    }
}
