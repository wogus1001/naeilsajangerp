import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSavedLoginCompany } from './loginStorage';

describe('loginStorage', () => {
    it('parses a saved company for automatic next login selection', () => {
        const company = parseSavedLoginCompany(JSON.stringify({
            id: 'company-1',
            name: '민티아',
            manager_name: '김팀장',
            created_at: '2026-06-22'
        }));

        assert.deepEqual(company, {
            id: 'company-1',
            name: '민티아',
            manager_name: '김팀장',
            created_at: '2026-06-22'
        });
    });

    it('ignores malformed saved company payloads', () => {
        assert.equal(parseSavedLoginCompany(null), null);
        assert.equal(parseSavedLoginCompany('{'), null);
        assert.equal(parseSavedLoginCompany(JSON.stringify({ id: 'company-1' })), null);
    });
});
