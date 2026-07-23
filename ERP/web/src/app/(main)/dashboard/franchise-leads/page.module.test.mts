import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stylesheet = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8');

function readLastRuleBody(selector: string): string {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...stylesheet.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))];
    return matches.at(-1)?.[1] ?? '';
}

function readRuleBodies(selector: string): string {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...stylesheet.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))]
        .map(match => match[1])
        .join('\n');
}

test('Given an open column picker When it extends beyond the table card Then the card does not clip the menu', () => {
    const tablePanelRule = readLastRuleBody('.tablePanel');
    const columnPickerPanelRules = readRuleBodies('.columnPickerPanel');

    assert.match(tablePanelRule, /overflow:\s*visible;/);
    assert.match(columnPickerPanelRules, /overflow-y:\s*auto;/);
});
