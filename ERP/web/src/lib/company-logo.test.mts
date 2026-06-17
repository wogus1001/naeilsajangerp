import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildCompanyLogoStoragePath,
    COMPANY_LOGO_MAX_BYTES,
    sanitizeCompanyLogoFileName,
    validateCompanyLogoFile
} from './company-logo.js';

test('Given a supported logo file When validating Then it is accepted', () => {
    const result = validateCompanyLogoFile({
        name: 'brand-logo.png',
        size: COMPANY_LOGO_MAX_BYTES,
        type: 'image/png'
    });

    assert.deepEqual(result, { ok: true });
});

test('Given an oversized logo file When validating Then it is rejected with policy text', () => {
    const result = validateCompanyLogoFile({
        name: 'brand-logo.webp',
        size: COMPANY_LOGO_MAX_BYTES + 1,
        type: 'image/webp'
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /1MB/);
});

test('Given an unsupported logo file When validating Then it is rejected', () => {
    const result = validateCompanyLogoFile({
        name: 'brand-logo.svg',
        size: 4096,
        type: 'image/svg+xml'
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /PNG, JPG, WebP/);
});

test('Given a Korean file name When sanitizing Then a storage-safe fallback is used', () => {
    const sanitized = sanitizeCompanyLogoFileName('회사 로고.png', 'image/png');

    assert.equal(sanitized, 'company-logo.png');
});

test('Given a company and unique id When building a storage path Then it stays under company-logos', () => {
    const path = buildCompanyLogoStoragePath(
        '123e4567-e89b-12d3-a456-426614174000',
        'Mintia Logo.webp',
        'image/webp',
        'upload-01'
    );

    assert.equal(path, 'company-logos/123e4567-e89b-12d3-a456-426614174000/upload-01-Mintia-Logo.webp');
});
