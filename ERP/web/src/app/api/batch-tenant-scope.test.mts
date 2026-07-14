import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

async function routeSource(relativeUrl: string): Promise<string> {
    return readFile(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

test('Given customer synchronization When persisting linked records Then every update keeps authenticated company scope', async () => {
    const source = await routeSource('./customers/sync/route.ts');
    const updateStatements = [...source.matchAll(/\.from\('(customers|properties)'\)\s*\.update\([\s\S]*?;\n/g)];

    assert.ok(updateStatements.length >= 6);
    for (const statement of updateStatements) {
        assert.match(statement[0], /\.eq\('company_id', companyId\)/);
    }
    assert.match(source, /\.from\('schedules'\)[\s\S]*?\.eq\('company_id', companyId\)[\s\S]*?\.eq\('customer_id', customer\.id\)/);
    assert.match(source, /newSchedules\.push\(\{[\s\S]*?customer_id: customer\.id,[\s\S]*?company_id: companyId/);
});

test('Given property batch updates When writing records Then the authenticated company remains in every update query', async () => {
    const source = await routeSource('./properties/batch/route.ts');

    assert.match(source, /\.from\('properties'\)[\s\S]*?\.update\([\s\S]*?\.eq\('id', id\)[\s\S]*?\.eq\('company_id', companyId\)/);
    assert.match(source, /\.from\('customers'\)[\s\S]*?\.eq\('company_id', companyId\)/);
    assert.match(source, /\.from\('business_cards'\)[\s\S]*?\.eq\('company_id', companyId\)/);
    assert.doesNotMatch(source, /async function resolveIds/);
});
