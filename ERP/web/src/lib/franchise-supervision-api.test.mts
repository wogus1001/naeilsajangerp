import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isSupervisionResourceInCompany, resolveProfileInCompany } from './franchise-supervision-api.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';

function profileClient(profile: { readonly company_id: string; readonly id: string; readonly status: string }) {
    const query = {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: profile, error: null }; }
    };
    return { from() { return query; } };
}

void test('Given an inactive same-company profile When assigning supervision work Then assignment is rejected', async () => {
    const result = await resolveProfileInCompany({
        companyId,
        message: '담당자를 선택해주세요.',
        rawProfileId: profileId,
        supabaseAdmin: profileClient({ company_id: companyId, id: profileId, status: 'inactive' }) as never
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.response.status, 400);
});

void test('Given an active same-company profile When assigning supervision work Then assignment is accepted', async () => {
    const result = await resolveProfileInCompany({
        companyId,
        message: '담당자를 선택해주세요.',
        rawProfileId: profileId,
        supabaseAdmin: profileClient({ company_id: companyId, id: profileId, status: 'active' }) as never
    });

    assert.deepEqual(result, { ok: true, profileId });
});

void test('Given an existing supervision row from another company When a scoped mutation runs Then the row is rejected', () => {
    assert.equal(isSupervisionResourceInCompany({ company_id: companyId }, companyId), true);
    assert.equal(isSupervisionResourceInCompany({ company_id: 'other-company' }, companyId), false);
});

void test('Given supervision PATCH routes When mutating an existing row Then both routes enforce source company scope', () => {
    for (const relativePath of [
        '../app/api/franchise-supervision/visits/route.ts',
        '../app/api/franchise-supervision/actions/route.ts'
    ]) {
        const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
        assert.match(source, /isSupervisionResourceInCompany\(existing, scope\.companyId\)/, relativePath);
    }
});
