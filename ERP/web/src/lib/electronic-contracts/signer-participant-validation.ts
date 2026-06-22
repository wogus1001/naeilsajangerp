import type { CompanyTemplateParticipant, CompanyTemplateRole } from './company-template';
import {
    inferSignerDeliveryMethod,
    normalizeSignerContact,
    validateSignerContact,
    type SignerDeliveryMethod
} from './signer-contact-policy';

export type RequestSignerParticipant = CompanyTemplateParticipant & {
    readonly deliveryMethod: SignerDeliveryMethod;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

function deliveryMethodFromRow(row: Record<string, unknown>, contact: string): SignerDeliveryMethod {
    const method = textValue(row, 'deliveryMethod');
    if (method === 'email' || method === 'kakao') return method;
    return inferSignerDeliveryMethod(contact);
}

export function parseRequestSignerParticipants(value: unknown): readonly RequestSignerParticipant[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(row => {
        const rawContact = textValue(row, 'contact');
        const deliveryMethod = deliveryMethodFromRow(row, rawContact);
        return {
            roleKey: textValue(row, 'roleKey'),
            name: textValue(row, 'name'),
            contact: normalizeSignerContact(deliveryMethod, rawContact),
            deliveryMethod
        };
    }).filter(participant => participant.roleKey && participant.name && participant.contact);
}

export function missingRequiredSignerLabels(
    roles: readonly CompanyTemplateRole[],
    participants: readonly CompanyTemplateParticipant[]
): readonly string[] {
    return roles
        .filter(role => role.required && !participants.some(participant => participant.roleKey === role.roleKey))
        .map(role => role.label);
}

export function invalidSignerContactLabels(
    roles: readonly CompanyTemplateRole[],
    participants: readonly RequestSignerParticipant[]
): readonly string[] {
    const roleLabelByKey = new Map(roles.map(role => [role.roleKey, role.label]));
    return participants
        .filter(participant => !validateSignerContact(participant.deliveryMethod, participant.contact))
        .map(participant => roleLabelByKey.get(participant.roleKey) || participant.roleKey);
}
