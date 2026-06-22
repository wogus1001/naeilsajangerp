import assert from 'node:assert/strict';
import test from 'node:test';
import {
    invalidSignerContactLabels,
    missingRequiredSignerLabels,
    parseRequestSignerParticipants
} from './signer-participant-validation.js';
import type { CompanyTemplateRole } from './company-template.js';

const ROLES: readonly CompanyTemplateRole[] = [
    { roleKey: 'first', label: '첫 번째 서명자', signingOrder: 1, required: true },
    { roleKey: 'second', label: '두 번째 서명자', signingOrder: 2, required: true }
];

test('Given request participants When parsing Then contacts are normalized by delivery method', () => {
    const participants = parseRequestSignerParticipants([
        { roleKey: 'first', name: '김서명', contact: ' signer@example.com ', deliveryMethod: 'email' },
        { roleKey: 'second', name: '박서명', contact: '010-1234-5678', deliveryMethod: 'kakao' }
    ]);

    assert.deepEqual(participants, [
        { roleKey: 'first', name: '김서명', contact: 'signer@example.com', deliveryMethod: 'email' },
        { roleKey: 'second', name: '박서명', contact: '01012345678', deliveryMethod: 'kakao' }
    ]);
});

test('Given missing and invalid signer contacts When validating Then role labels are returned', () => {
    const participants = parseRequestSignerParticipants([
        { roleKey: 'first', name: '김서명', contact: 'bad-email', deliveryMethod: 'email' }
    ]);

    assert.deepEqual(missingRequiredSignerLabels(ROLES, participants), ['두 번째 서명자']);
    assert.deepEqual(invalidSignerContactLabels(ROLES, participants), ['첫 번째 서명자']);
});
