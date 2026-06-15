import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDisclosureStoragePath, DISCLOSURE_UPLOAD_BUCKET } from './leadDisclosureFormUtils.js';

test('Given a disclosure upload for a company When building a storage path Then it stays company scoped and URL safe', () => {
    const path = buildDisclosureStoragePath({
        companyId: 'company-1',
        companyName: '서울 본사',
        fileName: '정보공개서 최종본.pdf',
        timestamp: 1781140000000,
        uniqueSuffix: 'qa'
    });

    assert.equal(DISCLOSURE_UPLOAD_BUCKET, 'property-documents');
    assert.equal(path, 'franchise-disclosures/company-1/1781140000000-qa-disclosure.pdf');
});

test('Given no company id When building a storage path Then the company name becomes the folder scope', () => {
    const path = buildDisclosureStoragePath({
        companyName: 'Acme HQ',
        fileName: 'disclosure v2.docx',
        timestamp: 1781140000001,
        uniqueSuffix: 'qa2'
    });

    assert.equal(path, 'franchise-disclosures/Acme-HQ/1781140000001-qa2-disclosure-v2.docx');
});
