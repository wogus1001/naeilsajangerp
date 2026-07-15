import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveProfileInCompany } from './franchise-supervision-api.js';

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
