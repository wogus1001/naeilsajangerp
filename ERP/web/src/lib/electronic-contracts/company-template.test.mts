import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildCompanyTemplateUcansignPayload,
    extractUcansignTemplateFields,
    extractUcansignTemplateRoles,
    normalizeTemplateFields,
    normalizeTemplateRoles,
    renderTemplateFormFromFields,
    validateTemplateFieldLayout
} from './company-template.js';

test('Given raw role input When normalizing Then default signer order is stable', () => {
    const roles = normalizeTemplateRoles([
        { roleKey: 'owner', label: '양도인', signingOrder: '2' },
        { roleKey: 'buyer', label: '양수인', signingOrder: 1 }
    ]);

    assert.deepEqual(roles.map(role => `${role.roleKey}:${role.signingOrder}`), ['owner:2', 'buyer:1']);
});

test('Given template fields When rendering form Then signature fields are excluded', () => {
    const fields = normalizeTemplateFields([
        { fieldKey: 'amount', label: '권리금', type: 'money', page: 1, y: 30 },
        { fieldKey: 'signed', label: '양수인 서명', type: 'signature', roleKey: 'transferee', page: 1, y: 20 },
        { fieldKey: 'date', label: '계약일', type: 'date', page: 1, y: 10 }
    ]);

    assert.deepEqual(renderTemplateFormFromFields(fields).map(field => field.fieldKey), ['date', 'amount']);
});

test('Given invalid layout When validating Then field errors name the broken fields', () => {
    const roles = normalizeTemplateRoles([{ roleKey: 'transferor', label: '양도인' }]);
    const fields = normalizeTemplateFields([
        { fieldKey: 'sign', label: '서명', type: 'signature', roleKey: 'missing', page: 3 }
    ]);

    const result = validateTemplateFieldLayout(fields, roles, 1);

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errors.length, 2);
});

test('Given duplicate role keys When validating Then layout is rejected before saving', () => {
    const roles = normalizeTemplateRoles([
        { roleKey: 'transferor', label: '양도인' },
        { roleKey: 'transferor', label: '중복 양도인' }
    ]);
    const fields = normalizeTemplateFields([
        { fieldKey: 'memo', label: '메모', type: 'text', page: 1, x: 10, y: 10, width: 20, height: 8 }
    ]);

    const result = validateTemplateFieldLayout(fields, roles, 1);

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.join('\n'), /역할 키가 중복/);
});

test('Given a field outside the page When validating Then the layout is rejected', () => {
    const roles = normalizeTemplateRoles([{ roleKey: 'transferor', label: '양도인' }]);
    const fields = normalizeTemplateFields([
        { fieldKey: 'memo', label: '메모', type: 'text', page: 1, x: 90, y: 96, width: 20, height: 8 }
    ]);

    const result = validateTemplateFieldLayout(fields, roles, 1);

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.join('\n'), /문서 영역/);
});

test('Given company template input When building payload Then participants and field values are mapped', () => {
    const roles = normalizeTemplateRoles([
        { roleKey: 'transferor', label: '양도인', signingOrder: 1 },
        { roleKey: 'transferee', label: '양수인', signingOrder: 2 }
    ]);
    const fields = normalizeTemplateFields([
        { fieldKey: 'premiumAmount', label: '권리금', type: 'money', page: 1 },
        { fieldKey: 'transferorSign', label: '양도인 서명', type: 'signature', roleKey: 'transferor', page: 1 }
    ]);

    const payload = buildCompanyTemplateUcansignPayload({
        contractId: 'contract-1',
        templateId: 'ucansign-template-1',
        documentName: '미카도 권리금계약',
        roles,
        fields,
        values: { premiumAmount: '5000000' },
        participants: [
            { roleKey: 'transferor', name: '홍길동', contact: 'hong@example.com' },
            { roleKey: 'transferee', name: '김민준', contact: 'kim@example.com' }
        ]
    });

    assert.equal(payload.customValue, 'contract-1');
    assert.equal(payload.participants[1]?.signingOrder, 2);
    assert.equal(payload.participants[0]?.signingMethodType, 'email');
    assert.deepEqual(payload.fields, [{ fieldName: 'premiumAmount', value: '5000000' }]);
});

test('Given UCanSign-managed template fields When building payload Then signer-only request is valid', () => {
    const roles = normalizeTemplateRoles([
        { roleKey: 'transferor', label: '양도인', signingOrder: 1 },
        { roleKey: 'transferee', label: '양수인', signingOrder: 2 }
    ]);

    const payload = buildCompanyTemplateUcansignPayload({
        contractId: 'contract-2',
        templateId: 'ucansign-template-2',
        documentName: '유캔싸인 설정 템플릿',
        roles,
        fields: [],
        values: {},
        participants: [
            { roleKey: 'transferor', name: '홍길동', contact: 'hong@example.com' },
            { roleKey: 'transferee', name: '김민준', contact: 'kim@example.com' }
        ]
    });

    assert.equal(payload.templateId, 'ucansign-template-2');
    assert.equal(payload.participants.length, 2);
    assert.deepEqual(payload.fields, []);
});

test('Given template direct input mode When building payload Then ERP input fields are not sent', () => {
    const roles = normalizeTemplateRoles([{ roleKey: 'transferor', label: '양도인', signingOrder: 1 }]);
    const fields = normalizeTemplateFields([
        { fieldKey: 'premiumAmount', label: '권리금', type: 'money', page: 1, required: true }
    ]);

    const payload = buildCompanyTemplateUcansignPayload({
        contractId: 'contract-3',
        templateId: 'ucansign-template-3',
        documentName: '템플릿 직접 작성 계약',
        inputMode: 'template',
        roles,
        fields,
        values: {},
        participants: [
            { roleKey: 'transferor', name: '홍길동', contact: 'hong@example.com' }
        ]
    });

    assert.deepEqual(payload.fields, []);
});

test('Given UCanSign template detail When extracting roles Then provider signer count is preserved', () => {
    const roles = extractUcansignTemplateRoles({
        result: {
            participants: [
                { participantId: 'p1', roleName: '양도인', signingOrder: 1 },
                { participantId: 'p2', roleName: '양수인', signingOrder: 2 },
                { participantId: 'p3', roleName: '입회인', signingOrder: 3 }
            ]
        }
    });

    assert.deepEqual(roles.map(role => role.label), ['양도인', '양수인', '입회인']);
    assert.deepEqual(roles.map(role => role.roleKey), ['p1', 'p2', 'p3']);
});

test('Given UCanSign requester inputs When extracting fields Then coordinates are normalized', () => {
    const fields = extractUcansignTemplateFields({
        result: {
            requesterInputs: [
                {
                    fieldId: 'f1',
                    fieldType: 'text',
                    fieldName: '계약금',
                    required: true,
                    locationX: 0.25,
                    locationY: 0.5,
                    locationPage: 2,
                    sizeWidth: 0.2,
                    sizeHeight: 0.03
                }
            ]
        }
    });

    assert.equal(fields[0]?.fieldKey, '계약금');
    assert.equal(fields[0]?.page, 2);
    assert.equal(fields[0]?.x, 25);
    assert.equal(fields[0]?.y, 50);
    assert.equal(fields[0]?.width, 20);
    assert.equal(fields[0]?.required, true);
});
