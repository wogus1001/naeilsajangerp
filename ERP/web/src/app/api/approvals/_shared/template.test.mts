import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApprovalInputError } from './boundary.js';
import { parseTemplateDefinition } from './template.js';

test('Given structured template fields and steps When parsing Then canonical wire values are produced', () => {
    const parsed = parseTemplateDefinition({
        fields: [{ key: ' Amount ', label: ' 금액 ', type: 'currency', required: true }],
        steps: [{
            key: ' manager ',
            label: ' 팀장 결재 ',
            order: 1,
            action: 'approve',
            mode: 'all',
            target: { kind: 'profiles', profileIds: ['11111111-1111-4111-8111-111111111111'] }
        }]
    });

    assert.equal(parsed.fields[0]?.key, 'amount');
    assert.equal(parsed.fields[0]?.type, 'money');
    assert.deepEqual(parsed.steps[0]?.target, {
        kind: 'profiles',
        profileIds: ['11111111-1111-4111-8111-111111111111']
    });
});

test('Given malformed structured steps When parsing Then no partial definition reaches storage', () => {
    assert.throws(() => parseTemplateDefinition({ fields: [], steps: [{ key: '', label: '' }] }), ApprovalInputError);
});
