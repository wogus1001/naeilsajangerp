import assert from 'node:assert/strict';
import test from 'node:test';
import {
    inferSignerDeliveryMethod,
    normalizeSignerContact,
    validateSignerParticipants,
    signerOrderLabel,
    toSignerParticipantInput
} from './signerParticipantModel.js';

test('Given signer contact values When inferring delivery method Then email stays default and phone becomes kakao', () => {
    assert.equal(inferSignerDeliveryMethod(''), 'email');
    assert.equal(inferSignerDeliveryMethod('buyer@example.com'), 'email');
    assert.equal(inferSignerDeliveryMethod('010-1234-5678'), 'kakao');
});

test('Given a kakao signer contact When normalizing Then only digits remain', () => {
    assert.equal(normalizeSignerContact('kakao', '010-1234-5678'), '01012345678');
    assert.equal(normalizeSignerContact('email', ' buyer@example.com '), 'buyer@example.com');
});

test('Given signer order values When rendering labels Then common Korean order labels are used', () => {
    assert.equal(signerOrderLabel(1), '첫 번째');
    assert.equal(signerOrderLabel(3), '세 번째');
    assert.equal(signerOrderLabel(11), '11번째');
});

test('Given a saved participant When converting to UI state Then delivery method is inferred', () => {
    const participant = toSignerParticipantInput({
        roleKey: 'third',
        name: '김서명',
        contact: '010-1111-2222'
    });

    assert.deepEqual(participant, {
        roleKey: 'third',
        name: '김서명',
        contact: '01011112222',
        deliveryMethod: 'kakao'
    });
});

test('Given required signer participants When validating Then invalid email and phone values are blocked', () => {
    const result = validateSignerParticipants([
        { roleKey: 'first', name: '', contact: 'bad-email', deliveryMethod: 'email' },
        { roleKey: 'second', name: '김서명', contact: '02-123-4567', deliveryMethod: 'kakao' }
    ], new Set(['first', 'second']));

    assert.deepEqual(result, {
        ok: false,
        issues: [
            { roleKey: 'first', field: 'name', message: '이름 또는 회사명을 입력해주세요.' },
            { roleKey: 'first', field: 'contact', message: '올바른 이메일 주소를 입력해주세요.' },
            { roleKey: 'second', field: 'contact', message: '휴대폰 번호는 01012345678처럼 숫자 10~11자리로 입력해주세요.' }
        ]
    });
});

test('Given valid signer participants When validating Then normalized values are returned', () => {
    const result = validateSignerParticipants([
        { roleKey: 'first', name: '김서명 ', contact: ' signer@example.com ', deliveryMethod: 'email' },
        { roleKey: 'second', name: '박서명', contact: '010-1234-5678', deliveryMethod: 'kakao' }
    ], new Set(['first', 'second']));

    assert.deepEqual(result, {
        ok: true,
        participants: [
            { roleKey: 'first', name: '김서명', contact: 'signer@example.com', deliveryMethod: 'email' },
            { roleKey: 'second', name: '박서명', contact: '01012345678', deliveryMethod: 'kakao' }
        ]
    });
});
