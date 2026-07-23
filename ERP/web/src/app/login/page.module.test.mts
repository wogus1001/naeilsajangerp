import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stylesheet = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8');

function readRuleBody(selector: string): string {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
    return match?.[1] ?? '';
}

test('Given a narrow mobile login card When rendering the company picker Then the input track can shrink without clipping the search button', () => {
    const companyPickerRule = readRuleBody('.companyPickerRow');
    const companyInputRule = readRuleBody('.companyInput');

    assert.match(companyPickerRule, /display:\s*grid;/);
    assert.match(companyPickerRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/);
    assert.match(companyInputRule, /min-width:\s*0;/);
});
