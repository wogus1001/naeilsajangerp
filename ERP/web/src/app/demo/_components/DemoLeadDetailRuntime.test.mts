import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDemoLeadDetailRuntime } from './DemoLeadDetailRuntime.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test('Given the demo detail runtime When all four contract workflows mutate Then state persists without network', async () => {
    // Given
    let fetchCount = 0;
    globalThis.fetch = async () => {
        fetchCount += 1;
        throw new TypeError('demo runtime must not call fetch');
    };
    const runtime = createDemoLeadDetailRuntime();
    const leadId = 'demo-candidate-2';
    const file = new File(['demo'], 'contract.pdf', { type: 'application/pdf' });

    // When
    const checklistBefore = await runtime.checklist.load({ leadId, userId: 'demo-user' });
    const checklistAfter = await runtime.checklist.saveStep({
        leadId,
        userId: 'demo-user',
        stepKey: checklistBefore.steps[0]?.stepKey || '',
        patch: { completed: true, memo: '데모 완료' }
    });
    const upload = await runtime.documents.upload({ companyId: 'demo-company', leadId, file });
    const documents = await runtime.documents.create({
        leadId,
        title: '가맹계약서',
        sourceType: 'upload',
        sourceId: '',
        documentStatus: 'stored',
        fileName: upload.fileName,
        storageBucket: upload.storageBucket,
        storagePath: upload.storagePath,
        memo: '데모 문서',
        checklistStepKey: checklistBefore.steps[0]?.stepKey
    });
    const createdDocument = documents.find(document => document.title === '가맹계약서');
    assert.ok(createdDocument);
    const linkedDocuments = await runtime.documents.link({
        documentId: createdDocument.id,
        checklistStepKey: checklistBefore.steps[1]?.stepKey || ''
    });
    const unlinkedDocuments = await runtime.documents.remove({
        documentId: createdDocument.id,
        checklistStepKey: checklistBefore.steps[0]?.stepKey
    });
    const remainingDocuments = await runtime.documents.remove({
        documentId: createdDocument.id
    });
    const store = await runtime.store.load({ leadId, userId: 'demo-user', companyName: 'FC ERP 데모 본사' });
    const openingBefore = await runtime.opening.load({ leadId, userId: 'demo-user', companyName: 'FC ERP 데모 본사' });
    assert.ok(store);
    assert.ok(openingBefore.project);
    const openingAfter = await runtime.opening.save({
        draft: {
            ...openingBefore.project,
            targetOpenDate: openingBefore.project.targetOpenDate || '',
            memo: '교육 일정 확정'
        },
        leadId,
        userId: 'demo-user',
        companyName: 'FC ERP 데모 본사'
    });

    // Then
    assert.equal(fetchCount, 0);
    assert.ok(checklistBefore.steps.length >= 3);
    assert.equal(checklistAfter.steps[0]?.completed, true);
    assert.ok(documents.some(document => document.title === '가맹계약서'));
    assert.ok(linkedDocuments.find(document => document.id === createdDocument.id)?.checklistStepKeys.includes(
        checklistBefore.steps[1]?.stepKey || ''
    ));
    assert.ok(!unlinkedDocuments.find(document => document.id === createdDocument.id)?.checklistStepKeys.includes(
        checklistBefore.steps[0]?.stepKey || ''
    ));
    assert.ok(!remainingDocuments.some(document => document.id === createdDocument.id));
    assert.equal(openingAfter.memo, '교육 일정 확정');
});

test('Given the demo disclosure runtime When documents and Gmail state change Then the popup workflow remains local', async () => {
    // Given
    const runtime = createDemoLeadDetailRuntime();
    const scope = { userId: 'demo-user', companyName: 'FC ERP 데모 본사' };

    // When
    const statusBefore = await runtime.disclosure.loadGmailStatus(scope);
    assert.equal(runtime.disclosure.gmailConnection.kind, 'inline');
    const statusAfter = runtime.disclosure.gmailConnection.kind === 'inline'
        ? await runtime.disclosure.gmailConnection.connect(scope)
        : statusBefore;
    const loaded = await runtime.disclosure.load({
        ...scope,
        leadId: 'demo-candidate-1',
        companyId: 'demo-company'
    });

    // Then
    assert.equal(statusBefore.connected, false);
    assert.equal(statusAfter.connected, true);
    assert.ok(loaded.documents.length > 0);
});
