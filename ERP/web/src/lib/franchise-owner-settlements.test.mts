import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    isMissingOwnerSettlementSchemaError,
    isOwnerSettlementFileStoragePath,
    isOwnerSettlementMutableStatus,
    isOwnerSettlementRequestTarget,
    parseOwnerSettlementAmount,
    parseOwnerSettlementReview,
    validateOwnerSettlementFile
} from './franchise-owner-settlements.js';

void test('Given settlement amounts When parsing Then valid values are normalized without losing cents', () => {
    assert.equal(parseOwnerSettlementAmount(' 1,234.5 '), '1234.50');
    assert.equal(parseOwnerSettlementAmount(0), '0.00');
    assert.equal(parseOwnerSettlementAmount('9999999999999999.99'), '9999999999999999.99');
});

void test('Given invalid settlement amounts When parsing Then negative, imprecise and oversized values are rejected', () => {
    assert.equal(parseOwnerSettlementAmount('-1'), null);
    assert.equal(parseOwnerSettlementAmount('1.234'), null);
    assert.equal(parseOwnerSettlementAmount('10000000000000000'), null);
    assert.equal(parseOwnerSettlementAmount(Number.NaN), null);
});

void test('Given location and global requests When checking owner targeting Then only the owner location or global request matches', () => {
    assert.equal(isOwnerSettlementRequestTarget(null, 'location-1'), true);
    assert.equal(isOwnerSettlementRequestTarget('location-1', 'location-1'), true);
    assert.equal(isOwnerSettlementRequestTarget('location-2', 'location-1'), false);
});

void test('Given submission statuses When checking editability Then only drafts and rejected submissions are mutable', () => {
    assert.equal(isOwnerSettlementMutableStatus('draft'), true);
    assert.equal(isOwnerSettlementMutableStatus('rejected'), true);
    assert.equal(isOwnerSettlementMutableStatus('submitted'), false);
    assert.equal(isOwnerSettlementMutableStatus('confirmed'), false);
});

void test('Given review actions When parsing Then rejection requires a note and confirmation remains optional', () => {
    assert.deepEqual(parseOwnerSettlementReview('reject', ' 누락 영수증을 첨부해 주세요. '), {
        status: 'rejected',
        reviewNote: '누락 영수증을 첨부해 주세요.'
    });
    assert.equal(parseOwnerSettlementReview('reject', '  '), null);
    assert.deepEqual(parseOwnerSettlementReview('confirm', ''), { status: 'confirmed', reviewNote: '' });
    assert.equal(parseOwnerSettlementReview('approve', 'ok'), null);
});

void test('Given valid private settlement files When validating Then PDF and Office magic bytes are accepted', () => {
    assert.deepEqual(validateOwnerSettlementFile({
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
        fileName: '7월 정산.pdf',
        mimeType: 'application/pdf',
        size: 5
    }), { ok: true, contentType: 'application/pdf' });
    assert.deepEqual(validateOwnerSettlementFile({
        bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
        fileName: '정산표.xlsx',
        mimeType: '',
        size: 4
    }), {
        ok: true,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
});

void test('Given unsafe settlement files When validating Then spoofed and oversized files are rejected', () => {
    assert.deepEqual(validateOwnerSettlementFile({
        bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
        fileName: '영수증.pdf',
        mimeType: 'application/pdf',
        size: 4
    }), { ok: false, reason: 'INVALID_CONTENT' });
    assert.deepEqual(validateOwnerSettlementFile({
        bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
        fileName: '정산표.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 4
    }), { ok: false, reason: 'INVALID_TYPE' });
    assert.deepEqual(validateOwnerSettlementFile({
        bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
        fileName: '정산표.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 8
    }), { ok: false, reason: 'INVALID_CONTENT' });
    assert.deepEqual(validateOwnerSettlementFile({
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        fileName: '영수증.pdf',
        mimeType: 'application/pdf',
        size: 10 * 1024 * 1024 + 1
    }), { ok: false, reason: 'TOO_LARGE' });
});

void test('Given settlement file metadata When checking storage scope Then company, location and submission boundaries must all match', () => {
    const companyId = '0370fba6-364a-43a9-9cc4-0f133a9d2052';
    const locationId = '92924bd6-b2a1-49bb-844b-05eabcc51bbf';
    const submissionId = '19a7f698-5b5f-4aa7-bc66-23236019023d';
    const storagePath = `settlement/${companyId}/${locationId}/${submissionId}/68c1f2d5-4e30-4e89-97f1-f683d7591fb0-proof.pdf`;

    assert.equal(isOwnerSettlementFileStoragePath({
        companyId,
        locationId,
        storageBucket: 'franchise-owner-private',
        storagePath,
        submissionId
    }), true);
    assert.equal(isOwnerSettlementFileStoragePath({
        companyId,
        locationId,
        storageBucket: 'franchise-owner-private',
        storagePath,
        submissionId: companyId
    }), false);
});

void test('Given Supabase errors When detecting missing settlement schema Then only migration dependencies map to 424', () => {
    assert.equal(isMissingOwnerSettlementSchemaError({
        code: 'PGRST205',
        message: "Could not find the table 'franchise_owner_settlement_requests' in the schema cache"
    }), true);
    assert.equal(isMissingOwnerSettlementSchemaError({ message: 'Bucket not found' }), true);
    assert.equal(isMissingOwnerSettlementSchemaError({
        code: '23505',
        message: 'duplicate key value violates unique constraint franchise_owner_settlement_submissions_request_id_owner_account_id_key'
    }), false);
});
