import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExternalCollectedProperty } from './property-external-status.js';

test('isExternalCollectedProperty includes manually promoted external realty properties', () => {
    const property = {
        processStatus: '',
        externalImportMode: 'manual-promoted'
    };

    assert.equal(isExternalCollectedProperty(property), true);
});

test('isExternalCollectedProperty keeps legacy auto-created external properties', () => {
    assert.equal(isExternalCollectedProperty({ externalImportMode: 'auto-created' }), true);
    assert.equal(isExternalCollectedProperty({ processStatus: '외부수집,검토중' }), true);
    assert.equal(isExternalCollectedProperty({ externalSource: 'daangn' }), true);
    assert.equal(isExternalCollectedProperty({ externalListingId: 'listing-1' }), true);
});

test('isExternalCollectedProperty excludes ordinary properties without external markers', () => {
    assert.equal(isExternalCollectedProperty({ processStatus: '상담중', externalImportMode: 'manual' }), false);
    assert.equal(isExternalCollectedProperty(null), false);
});
