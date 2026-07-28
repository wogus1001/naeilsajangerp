import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import { LeadPrivateTableValue } from './LeadPrivateTableValue.js';

test('private lead table values render without native tooltip duplication', () => {
    const privateValue = '010-1234-5678';
    const html = renderToStaticMarkup(createElement(LeadPrivateTableValue, {
        className: 'phone',
        value: privateValue
    }));

    assert.match(html, />010-1234-5678</);
    assert.doesNotMatch(html, /\stitle=/);
});
