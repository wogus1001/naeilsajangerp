import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildOwnerContentStoragePath,
    canOwnerReadContent,
    isMissingOwnerContentSchemaError,
    isOwnerContentStoragePath,
    OWNER_CONTENT_STORAGE,
    parseOwnerContentAction,
    parseOwnerContentCreate,
    parseOwnerContentReceiptAction,
    mergeOwnerContentAcknowledgedAt,
    summarizeOwnerContentReceiptStats,
    targetOwnerAccountIdsForContent,
    type OwnerContentReceiptRow,
    validateOwnerContentAttachment
} from './franchise-owner-content';

const companyId = '0370fba6-364a-43a9-9cc4-0f133a9d2052';
const otherCompanyId = '68c1f2d5-4e30-4e89-97f1-f683d7591fb0';
const locationId = '92924bd6-b2a1-49bb-844b-05eabcc51bbf';
const otherLocationId = '19a7f698-5b5f-4aa7-bc66-23236019023d';
const contentId = '6cf1ccf1-bfca-48d7-a3ce-037b12d7f510';
const uniqueId = '46eb499f-6127-47ac-b9cc-df04f47565d6';

test('owner visibility accepts only published global or own-location content in the same company', () => {
    assert.equal(canOwnerReadContent({ company_id: companyId, location_id: null, status: 'published' }, companyId, locationId), true);
    assert.equal(canOwnerReadContent({ company_id: companyId, location_id: locationId, status: 'published' }, companyId, locationId), true);
    assert.equal(canOwnerReadContent({ company_id: companyId, location_id: otherLocationId, status: 'published' }, companyId, locationId), false);
    assert.equal(canOwnerReadContent({ company_id: companyId, location_id: null, status: 'draft' }, companyId, locationId), false);
    assert.equal(canOwnerReadContent({ company_id: otherCompanyId, location_id: null, status: 'published' }, companyId, locationId), false);
});

test('content creation requires valid types and a location for location-only content', () => {
    const globalResult = parseOwnerContentCreate({
        contentType: 'manual',
        requiresAcknowledgement: true,
        title: '운영 매뉴얼'
    });
    assert.equal(globalResult.ok, true);

    const missingLocation = parseOwnerContentCreate({ contentType: 'corrective_action', title: '시정조치' });
    assert.deepEqual(missingLocation, { ok: false, message: '이 콘텐츠 유형은 운영점을 선택해야 합니다.' });

    const scopedResult = parseOwnerContentCreate({
        contentType: 'contract_document',
        dueAt: '2026-07-31T09:00:00+09:00',
        locationId,
        title: '계약 문서'
    });
    assert.equal(scopedResult.ok, true);
    if (scopedResult.ok) assert.equal(scopedResult.input.dueAt, '2026-07-31T00:00:00.000Z');
});

test('publish and archive actions reject unrelated status changes', () => {
    assert.equal(parseOwnerContentAction({ action: 'publish' }), 'publish');
    assert.equal(parseOwnerContentAction({ status: 'archived' }), 'archive');
    assert.equal(parseOwnerContentAction({ action: 'draft' }), null);
});

test('owner content receipt action accepts acknowledgement only', () => {
    assert.equal(parseOwnerContentReceiptAction({ action: 'acknowledge' }), 'acknowledge');
    assert.equal(parseOwnerContentReceiptAction({ status: 'acknowledged' }), null);
    assert.equal(parseOwnerContentReceiptAction({ action: 'archive' }), null);
});

test('owner content acknowledgement merge is current-owner and requirement scoped', () => {
    const items = [
        { id: contentId, requires_acknowledgement: true },
        { id: uniqueId, requires_acknowledgement: false }
    ] as const;
    const receipts: readonly Pick<OwnerContentReceiptRow, 'content_id' | 'owner_account_id' | 'acknowledged_at'>[] = [
        { content_id: contentId, owner_account_id: uniqueId, acknowledged_at: '2026-07-22T01:00:00.000Z' },
        { content_id: contentId, owner_account_id: otherLocationId, acknowledged_at: '2026-07-22T02:00:00.000Z' }
    ];

    assert.deepEqual(mergeOwnerContentAcknowledgedAt(items, receipts, uniqueId), [
        { id: contentId, requires_acknowledgement: true, acknowledged_at: '2026-07-22T01:00:00.000Z' },
        { id: uniqueId, requires_acknowledgement: false, acknowledged_at: null }
    ]);
});

test('receipt stats target active owner accounts globally or by content location', () => {
    const firstOwnerId = '2ab6f4f2-7b5c-4867-8c25-6e13b90889fa';
    const secondOwnerId = 'd2ebd4ae-17f7-4ccb-b4fc-a8e4caf77c6c';
    const suspendedOwnerId = 'f90e667d-dfe7-41c0-a0d7-d8cd817bc7d1';
    const otherCompanyOwnerId = 'a8e5ea6a-84c0-47f2-a5ae-7cfde91f0d92';
    const accounts = [
        { id: firstOwnerId, company_id: companyId, location_id: locationId, status: 'active' },
        { id: secondOwnerId, company_id: companyId, location_id: otherLocationId, status: 'active' },
        { id: suspendedOwnerId, company_id: companyId, location_id: locationId, status: 'suspended' },
        { id: otherCompanyOwnerId, company_id: otherCompanyId, location_id: locationId, status: 'active' }
    ] as const;
    const receipts: readonly Pick<OwnerContentReceiptRow, 'content_id' | 'owner_account_id' | 'acknowledged_at'>[] = [
        { content_id: contentId, owner_account_id: firstOwnerId, acknowledged_at: '2026-07-22T01:00:00.000Z' },
        { content_id: contentId, owner_account_id: firstOwnerId, acknowledged_at: '2026-07-22T01:00:00.000Z' },
        { content_id: contentId, owner_account_id: otherCompanyOwnerId, acknowledged_at: '2026-07-22T02:00:00.000Z' }
    ];

    const globalTargets = targetOwnerAccountIdsForContent({ location_id: null }, companyId, accounts);
    assert.deepEqual(globalTargets, [firstOwnerId, secondOwnerId]);
    assert.deepEqual(summarizeOwnerContentReceiptStats(contentId, globalTargets, receipts), {
        targetCount: 2,
        acknowledgedCount: 1,
        unacknowledgedCount: 1
    });

    const locationTargets = targetOwnerAccountIdsForContent({ location_id: locationId }, companyId, accounts);
    assert.deepEqual(locationTargets, [firstOwnerId]);
    assert.deepEqual(summarizeOwnerContentReceiptStats(contentId, locationTargets, receipts), {
        targetCount: 1,
        acknowledgedCount: 1,
        unacknowledgedCount: 0
    });

    assert.deepEqual(summarizeOwnerContentReceiptStats(uniqueId, globalTargets, receipts), {
        targetCount: 2,
        acknowledgedCount: 0,
        unacknowledgedCount: 2
    });
});

test('content storage paths bind company, location scope, and content id', () => {
    const globalPath = buildOwnerContentStoragePath({
        companyId,
        contentId,
        fileName: '본사 매뉴얼.pdf',
        locationId: null,
        uniqueId
    });
    assert.equal(globalPath, `content/${companyId}/global/${contentId}/${uniqueId}-content-file.pdf`);
    assert.equal(isOwnerContentStoragePath({
        companyId,
        contentId,
        locationId: null,
        storageBucket: OWNER_CONTENT_STORAGE.bucket,
        storagePath: globalPath || ''
    }), true);
    assert.equal(isOwnerContentStoragePath({
        companyId,
        contentId,
        locationId,
        storageBucket: OWNER_CONTENT_STORAGE.bucket,
        storagePath: globalPath || ''
    }), false);

    const scopedPath = buildOwnerContentStoragePath({
        companyId,
        contentId,
        fileName: 'manual.pdf',
        locationId,
        uniqueId
    });
    assert.equal(isOwnerContentStoragePath({
        companyId,
        contentId,
        locationId: otherLocationId,
        storageBucket: OWNER_CONTENT_STORAGE.bucket,
        storagePath: scopedPath || ''
    }), false);
    assert.equal(isOwnerContentStoragePath({
        companyId,
        contentId,
        locationId: null,
        storageBucket: OWNER_CONTENT_STORAGE.bucket,
        storagePath: `content/${companyId}/global/${contentId}/../../private.pdf`
    }), false);
});

test('content attachment validation enforces 10MB and PDF magic bytes', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    assert.deepEqual(validateOwnerContentAttachment({
        bytes: pdfBytes,
        fileName: 'manual.pdf',
        mimeType: 'application/pdf',
        size: pdfBytes.length
    }), { ok: true, contentType: 'application/pdf' });
    assert.deepEqual(validateOwnerContentAttachment({
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        fileName: 'manual.pdf',
        mimeType: 'application/pdf',
        size: 4
    }), { ok: false, reason: 'INVALID_CONTENT' });
    assert.deepEqual(validateOwnerContentAttachment({
        bytes: pdfBytes,
        fileName: 'manual.pdf',
        mimeType: 'application/pdf',
        size: OWNER_CONTENT_STORAGE.maxFileSizeBytes + 1
    }), { ok: false, reason: 'TOO_LARGE' });
});

test('missing schema detection is limited to content migration dependencies', () => {
    assert.equal(isMissingOwnerContentSchemaError({
        code: 'PGRST205',
        message: "Could not find the table 'franchise_owner_content_items' in the schema cache"
    }), true);
    assert.equal(isMissingOwnerContentSchemaError({ message: 'Bucket not found' }), true);
    assert.equal(isMissingOwnerContentSchemaError({ code: 'PGRST205', message: 'unrelated table is missing' }), false);
});
