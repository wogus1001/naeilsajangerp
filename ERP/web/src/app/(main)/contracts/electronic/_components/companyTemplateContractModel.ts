import {
    normalizeTemplateFields,
    normalizeTemplateRoles,
    type CompanyTemplateInputMode,
    type CompanyTemplateParticipant
} from '@/lib/electronic-contracts/company-template';
import type { CompanyTemplateDetail } from './companyTemplatesClient';

export type ContractDetailResponse = {
    readonly data?: {
        readonly contract?: {
            readonly id?: string;
            readonly leadId?: string;
            readonly checklistStepKey?: string;
        };
        readonly formSnapshot?: unknown;
    };
    readonly message?: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function recordStringMap(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).map(([key, fieldValue]) => [key, typeof fieldValue === 'string' ? fieldValue : ''])
    );
}

export function snapshotInputMode(value: unknown): CompanyTemplateInputMode {
    if (!isRecord(value)) return 'erp';
    return value.inputMode === 'template' ? 'template' : 'erp';
}

export function snapshotParticipants(value: unknown): Record<string, CompanyTemplateParticipant> {
    if (!Array.isArray(value)) return {};
    return Object.fromEntries(
        value.filter(isRecord).map(row => {
            const roleKey = typeof row.roleKey === 'string' ? row.roleKey : '';
            return [roleKey, {
                roleKey,
                name: typeof row.name === 'string' ? row.name : '',
                contact: typeof row.contact === 'string' ? row.contact : ''
            }];
        }).filter(([roleKey]) => roleKey)
    );
}

export function detailFields(detail: CompanyTemplateDetail) {
    return normalizeTemplateFields(detail.fields.map(field => ({
        fieldKey: field.field_key,
        label: field.label,
        type: field.field_type,
        page: field.page || 1,
        x: field.x || 0,
        y: field.y || 0,
        width: field.width || 24,
        height: field.height || 8,
        required: field.required ?? false,
        roleKey: field.role_key || '',
        defaultValue: field.default_value || ''
    })));
}

export function detailRoles(detail: CompanyTemplateDetail) {
    return normalizeTemplateRoles(detail.roles.map(role => ({
        roleKey: role.role_key,
        label: role.label,
        signingOrder: role.signing_order || 1,
        required: role.required ?? true
    })));
}
