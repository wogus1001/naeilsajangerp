export const COMPANY_CONTRACT_TEMPLATE_MAX_BYTES = 10 * 1024 * 1024;
export const COMPANY_CONTRACT_TEMPLATE_MAX_PAGES = 30;

export const COMPANY_TEMPLATE_FIELD_TYPES = ['text', 'money', 'date', 'checkbox', 'signature', 'stamp'] as const;
export type CompanyTemplateFieldType = typeof COMPANY_TEMPLATE_FIELD_TYPES[number];

export type CompanyTemplateStatus = 'draft' | 'active' | 'archived';

export type CompanyTemplateRole = {
    readonly roleKey: string;
    readonly label: string;
    readonly signingOrder: number;
    readonly required: boolean;
};

export type CompanyTemplateField = {
    readonly fieldKey: string;
    readonly label: string;
    readonly type: CompanyTemplateFieldType;
    readonly page: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly required: boolean;
    readonly roleKey: string;
    readonly defaultValue?: string;
};

export type TemplateFormField = CompanyTemplateField & {
    readonly inputType: 'text' | 'number' | 'date' | 'checkbox';
};

export type CompanyTemplateParticipant = {
    readonly roleKey: string;
    readonly name: string;
    readonly contact: string;
};

export type CompanyTemplateInputMode = 'erp' | 'template';

export type CompanyTemplatePayloadInput = {
    readonly contractId: string;
    readonly templateId: string;
    readonly documentName: string;
    readonly inputMode?: CompanyTemplateInputMode;
    readonly fields: readonly CompanyTemplateField[];
    readonly roles: readonly CompanyTemplateRole[];
    readonly values: Record<string, string>;
    readonly participants: readonly CompanyTemplateParticipant[];
};

export type CompanyTemplateUcansignPayload = {
    readonly templateId: string;
    readonly documentName: string;
    readonly processType: 'PROCEDURE';
    readonly isSequential: true;
    readonly isSendMessage: true;
    readonly customValue: string;
    readonly customValue1: string;
    readonly customValue2: string;
    readonly customValue3: string;
    readonly participants: readonly {
        readonly name: string;
        readonly signingMethodType: 'email' | 'kakao';
        readonly signingContactInfo: string;
        readonly message: string;
        readonly signingOrder: number;
    }[];
    readonly fields: readonly {
        readonly fieldName: string;
        readonly value: string;
    }[];
};

export const COMPANY_TEMPLATE_DEFAULT_ROLES: readonly CompanyTemplateRole[] = [
    { roleKey: 'transferor', label: '양도인', signingOrder: 1, required: true },
    { roleKey: 'transferee', label: '양수인', signingOrder: 2, required: true }
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    return fallback;
}

function responseResult(value: unknown): unknown {
    if (isRecord(value) && isRecord(value.result)) return value.result;
    return value;
}

function arrayValue(record: Record<string, unknown>, key: string): readonly unknown[] {
    const value = record[key];
    return Array.isArray(value) ? value : [];
}

function toProviderRoleKey(row: Record<string, unknown>, index: number): string {
    return stringValue(row.participantId)
        || stringValue(row.roleName)
        || `participant_${index + 1}`;
}

function toProviderFieldType(value: string): CompanyTemplateFieldType {
    if (value === 'checkbox') return 'checkbox';
    if (value === 'date') return 'date';
    if (value === 'signature') return 'signature';
    if (value === 'stamp') return 'stamp';
    if (value === 'money' || value === 'number') return 'money';
    return 'text';
}

function ratioToPercent(value: unknown, fallback: number): number {
    const nextValue = numberValue(value, fallback / 100);
    return Math.max(0, Math.round(nextValue * 10_000) / 100);
}

export function isCompanyTemplateFieldType(value: string): value is CompanyTemplateFieldType {
    return COMPANY_TEMPLATE_FIELD_TYPES.some(type => type === value);
}

export function normalizeTemplateRoles(value: unknown): readonly CompanyTemplateRole[] {
    const rows = Array.isArray(value) ? value : [];
    const roles = rows
        .filter(isRecord)
        .map((row, index) => {
            const roleKey = stringValue(row.roleKey);
            const label = stringValue(row.label);
            return {
                roleKey,
                label: label || roleKey,
                signingOrder: Math.max(1, Math.trunc(numberValue(row.signingOrder, index + 1))),
                required: booleanValue(row.required, true)
            };
        })
        .filter(role => role.roleKey && role.label);

    return roles.length > 0 ? roles : COMPANY_TEMPLATE_DEFAULT_ROLES;
}

export function normalizeTemplateFields(value: unknown): readonly CompanyTemplateField[] {
    const rows = Array.isArray(value) ? value : [];
    return rows.filter(isRecord).map(row => {
        const typeCandidate = stringValue(row.type);
        return {
            fieldKey: stringValue(row.fieldKey),
            label: stringValue(row.label),
            type: isCompanyTemplateFieldType(typeCandidate) ? typeCandidate : 'text',
            page: Math.max(1, Math.trunc(numberValue(row.page, 1))),
            x: Math.max(0, numberValue(row.x, 8)),
            y: Math.max(0, numberValue(row.y, 8)),
            width: Math.max(4, numberValue(row.width, 24)),
            height: Math.max(4, numberValue(row.height, 8)),
            required: booleanValue(row.required, false),
            roleKey: stringValue(row.roleKey),
            defaultValue: stringValue(row.defaultValue)
        };
    }).filter(field => field.fieldKey && field.label);
}

export function extractUcansignTemplateRoles(value: unknown): readonly CompanyTemplateRole[] {
    const result = responseResult(value);
    if (!isRecord(result)) return [];

    return arrayValue(result, 'participants')
        .filter(isRecord)
        .map((row, index) => {
            const signingOrder = Math.max(1, Math.trunc(numberValue(row.signingOrder, index + 1)));
            return {
                roleKey: toProviderRoleKey(row, index),
                label: stringValue(row.roleName) || `서명자 ${signingOrder}`,
                signingOrder,
                required: true
            };
        })
        .filter(role => role.roleKey && role.label)
        .sort((left, right) => left.signingOrder - right.signingOrder);
}

export function extractUcansignTemplateFields(value: unknown): readonly CompanyTemplateField[] {
    const result = responseResult(value);
    if (!isRecord(result)) return [];

    return arrayValue(result, 'requesterInputs')
        .filter(isRecord)
        .map((row, index) => {
            const fieldName = stringValue(row.fieldName);
            const fieldId = stringValue(row.fieldId);
            const type = toProviderFieldType(stringValue(row.fieldType));
            return {
                fieldKey: fieldName || fieldId || `field_${index + 1}`,
                label: fieldName || `입력 ${index + 1}`,
                type,
                page: Math.max(1, Math.trunc(numberValue(row.locationPage, 1))),
                x: ratioToPercent(row.locationX, 8),
                y: ratioToPercent(row.locationY, 8),
                width: Math.max(4, ratioToPercent(row.sizeWidth, 24)),
                height: Math.max(4, ratioToPercent(row.sizeHeight, 8)),
                required: booleanValue(row.required, false),
                roleKey: '',
                defaultValue: ''
            };
        })
        .filter(field => field.fieldKey && field.label);
}

export function validateTemplateFieldLayout(
    fields: readonly CompanyTemplateField[],
    roles: readonly CompanyTemplateRole[],
    pageCount: number
): { readonly ok: true } | { readonly ok: false; readonly errors: readonly string[] } {
    const errors: string[] = [];
    const roleKeys = new Set(roles.map(role => role.roleKey));
    if (roleKeys.size !== roles.length) {
        errors.push('서명자 역할 키가 중복되었습니다.');
    }
    const fieldKeys = new Set<string>();
    if (pageCount < 1 || pageCount > COMPANY_CONTRACT_TEMPLATE_MAX_PAGES) {
        errors.push(`페이지 수는 1~${COMPANY_CONTRACT_TEMPLATE_MAX_PAGES} 사이여야 합니다.`);
    }

    for (const field of fields) {
        if (fieldKeys.has(field.fieldKey)) errors.push(`중복 fieldKey: ${field.fieldKey}`);
        fieldKeys.add(field.fieldKey);
        if (field.page < 1 || field.page > pageCount) errors.push(`${field.label}의 페이지가 문서 범위를 벗어났습니다.`);
        if (field.width <= 0 || field.height <= 0) errors.push(`${field.label}의 크기가 올바르지 않습니다.`);
        if (field.x < 0 || field.y < 0 || field.x > 100 || field.y > 100) {
            errors.push(`${field.label}의 위치가 문서 범위를 벗어났습니다.`);
        }
        if (field.x + field.width > 100 || field.y + field.height > 100) {
            errors.push(`${field.label}의 크기와 위치가 문서 영역을 벗어났습니다.`);
        }
        if ((field.type === 'signature' || field.type === 'stamp') && !roleKeys.has(field.roleKey)) {
            errors.push(`${field.label}의 서명자 역할을 확인해주세요.`);
        }
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function toInputType(type: CompanyTemplateFieldType): TemplateFormField['inputType'] {
    switch (type) {
        case 'money':
            return 'number';
        case 'date':
            return 'date';
        case 'checkbox':
            return 'checkbox';
        case 'text':
            return 'text';
        case 'signature':
        case 'stamp':
            return 'text';
        default:
            return 'text';
    }
}

export function renderTemplateFormFromFields(fields: readonly CompanyTemplateField[]): readonly TemplateFormField[] {
    return fields
        .filter(field => field.type !== 'signature' && field.type !== 'stamp')
        .map(field => ({ ...field, inputType: toInputType(field.type) }))
        .sort((left, right) => left.page - right.page || left.y - right.y || left.x - right.x);
}

export function buildCompanyTemplateUcansignPayload(
    input: CompanyTemplatePayloadInput
): CompanyTemplateUcansignPayload {
    const roleOrder = new Map(input.roles.map(role => [role.roleKey, role.signingOrder]));
    const fields = input.inputMode === 'template'
        ? []
        : renderTemplateFormFromFields(input.fields).map(field => ({
            fieldName: field.fieldKey,
            value: input.values[field.fieldKey] || field.defaultValue || ''
        }));
    return {
        templateId: input.templateId,
        documentName: input.documentName,
        processType: 'PROCEDURE',
        isSequential: true,
        isSendMessage: true,
        customValue: input.contractId,
        customValue1: '',
        customValue2: '',
        customValue3: '',
        participants: input.participants.map(participant => ({
            name: participant.name,
            signingMethodType: participant.contact.includes('@') ? 'email' : 'kakao',
            signingContactInfo: participant.contact,
            message: `${input.documentName} ${participant.name}님 서명 요청입니다.`,
            signingOrder: roleOrder.get(participant.roleKey) || 1
        })),
        fields
    };
}
