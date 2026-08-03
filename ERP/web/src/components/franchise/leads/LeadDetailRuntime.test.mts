import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const RUNTIME_BACKED_SECTIONS = [
    '../useLeadDisclosureWorkflow.ts',
    '../useLeadDisclosureGmail.ts',
    '../LeadContractChecklistSection.tsx',
    '../useLeadContractChecklist.ts',
    '../LeadDocumentBoxSection.tsx',
    './LeadContractStoreSection.tsx',
    './LeadOpeningProjectSection.tsx'
] as const;

test('Given the lead detail subtree When a fixture runtime is provided Then API-backed sections resolve the scoped runtime port', () => {
    // Given
    const sources = RUNTIME_BACKED_SECTIONS.map(fileName =>
        readFileSync(new URL(fileName, import.meta.url), 'utf8')
    );

    // When
    const sectionsWithoutRuntime = sources.filter(source => !source.includes('useLeadDetailRuntime'));

    // Then
    assert.equal(sectionsWithoutRuntime.length, 0);
});

test('Given injected lead detail ports When the production sections render Then network calls stay behind the live runtime', () => {
    // Given
    const source = RUNTIME_BACKED_SECTIONS.map(fileName =>
        readFileSync(new URL(fileName, import.meta.url), 'utf8')
    ).join('\n');

    // When
    const directFetchCalls = source.match(/\bfetch\s*\(/g) || [];

    // Then
    assert.equal(directFetchCalls.length, 0);
    assert.doesNotMatch(source, /\bisDemo\b|demo-only|demoOnly/);
});
