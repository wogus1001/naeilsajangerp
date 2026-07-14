import assert from 'node:assert/strict';
import test from 'node:test';
import { readSupervisionPhotoAttachments } from './franchise-supervision-attachment-access.js';

test('returns only exact private-bucket supervision attachments', () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const reportId = '22222222-2222-4222-8222-222222222222';
    const validPath = `franchise-supervision/${companyId}/${reportId}/photo.jpg`;

    const signedPaths: string[] = [];
    const result = readSupervisionPhotoAttachments([
        { name: 'private.jpg', path: validPath, storageBucket: 'franchise-supervision-private', size: 10, contentType: 'image/jpeg' },
        { name: 'legacy.jpg', path: validPath, storageBucket: 'property-documents', size: 10, contentType: 'image/jpeg' },
        { name: 'other-report.jpg', path: `franchise-supervision/${companyId}/33333333-3333-4333-8333-333333333333/photo.jpg`, storageBucket: 'franchise-supervision-private' },
        { name: 'traversal.jpg', path: `franchise-supervision/${companyId}/${reportId}/%2e%2e/private.jpg`, storageBucket: 'franchise-supervision-private' }
    ], { companyId, reportId }, path => {
        signedPaths.push(path);
        return `signed:${path}`;
    });

    assert.deepEqual(result, [{
        name: 'private.jpg',
        path: validPath,
        storageBucket: 'franchise-supervision-private',
        publicUrl: `signed:${validPath}`,
        size: 10,
        contentType: 'image/jpeg'
    }]);
    assert.deepEqual(signedPaths, [validPath]);
});
