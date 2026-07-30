import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMetaFormScopeFilters } from '../../../../../lib/meta-sync-scope.js';

test('manual Meta sync applies both form and company scope to its enabled-form query', () => {
    const filters: Array<[string, string]> = [];
    const query = {
        eq(column: string, value: string) {
            filters.push([column, value]);
            return this;
        }
    };

    const scopedQuery = applyMetaFormScopeFilters(query, {
        formId: 'form-1',
        companyId: 'company-1'
    });

    assert.equal(scopedQuery, query);
    assert.deepEqual(filters, [
        ['id', 'form-1'],
        ['company_id', 'company-1']
    ]);
});

test('scheduled Meta sync can omit optional manual scope filters', () => {
    const filters: Array<[string, string]> = [];
    const query = {
        eq(column: string, value: string) {
            filters.push([column, value]);
            return this;
        }
    };

    applyMetaFormScopeFilters(query, {});

    assert.deepEqual(filters, []);
});
