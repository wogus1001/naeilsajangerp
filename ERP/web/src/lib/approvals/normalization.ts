import {
    organizationUnitId,
    profileId,
    type StepActionKind,
    type StepCompletionMode,
    type StepTargetSelector,
    type TemplateField,
    type TemplateFieldType,
    type TemplateStep
} from './types';

export type ParseIssue = {
    readonly index: number;
    readonly message: string;
};

export type ParseResult<Value> =
    | { readonly ok: true; readonly value: Value }
    | { readonly ok: false; readonly issues: readonly ParseIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function fieldKey(value: unknown): string {
    return text(value)
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^a-z0-9_가-힣]/g, '')
        .replace(/^_+|_+$/g, '');
}

function fieldType(value: unknown): TemplateFieldType {
    switch (text(value).toLowerCase()) {
        case 'shorttext': return 'shortText';
        case 'longtext': return 'longText';
        case 'textarea': return 'textarea';
        case 'number': return 'number';
        case 'money':
        case 'currency': return 'money';
        case 'date': return 'date';
        case 'period': return 'period';
        case 'select': return 'select';
        case 'checklist': return 'checklist';
        case 'table': return 'table';
        case 'score': return 'score';
        case 'attachment': return 'attachment';
        case 'description': return 'description';
        case 'checkbox':
        case 'boolean': return 'checkbox';
        case 'person':
        case 'user': return 'person';
        default: return 'text';
    }
}

function stringOptions(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];
    const options: string[] = [];
    for (const item of value) {
        const option = text(item);
        if (option && !options.includes(option)) options.push(option);
    }
    return options;
}

function scanFields(value: unknown): { readonly fields: readonly TemplateField[]; readonly issues: readonly ParseIssue[] } {
    if (!Array.isArray(value)) return { fields: [], issues: [{ index: -1, message: '필드 목록은 배열이어야 합니다.' }] };
    const fields: TemplateField[] = [];
    const issues: ParseIssue[] = [];
    const keys = new Set<string>();
    value.forEach((item, index) => {
        if (!isRecord(item)) {
            issues.push({ index, message: '필드는 객체여야 합니다.' });
            return;
        }
        const key = fieldKey(item['key']);
        if (!key || keys.has(key)) {
            issues.push({ index, message: key ? '필드 키가 중복되었습니다.' : '필드 키가 비어 있습니다.' });
            return;
        }
        const label = text(item['label']);
        if (!label) {
            issues.push({ index, message: '필드명이 비어 있습니다.' });
            return;
        }
        keys.add(key);
        const columns = item['columns'] === 2 ? 2 as const : item['columns'] === 1 ? 1 as const : undefined;
        const editableBy = ['author', 'approver', 'agreement', 'all'].includes(text(item['editableBy']))
            ? text(item['editableBy']) as 'author' | 'approver' | 'agreement' | 'all'
            : undefined;
        fields.push({
            key,
            label,
            type: fieldType(item['type']),
            required: item['required'] === true,
            placeholder: text(item['placeholder']),
            options: stringOptions(item['options']),
            ...(columns ? { columns } : {}),
            ...(text(item['description']) ? { description: text(item['description']) } : {}),
            ...(editableBy ? { editableBy } : {})
        });
    });
    return { fields, issues };
}

export function normalizeTemplateFields(value: unknown): readonly TemplateField[] {
    return scanFields(value).fields;
}

export function parseTemplateFields(value: unknown): ParseResult<readonly TemplateField[]> {
    const result = scanFields(value);
    return result.issues.length === 0 ? { ok: true, value: result.fields } : { ok: false, issues: result.issues };
}

function stepAction(value: unknown): StepActionKind {
    switch (text(value).toLowerCase()) {
        case 'agreement':
        case 'agree': return 'agreement';
        case 'acknowledgement':
        case 'acknowledge': return 'acknowledgement';
        default: return 'approval';
    }
}

function stepMode(value: unknown): StepCompletionMode {
    switch (text(value).toLowerCase()) {
        case 'parallel_all':
        case 'all': return 'parallel_all';
        case 'parallel_any':
        case 'any': return 'parallel_any';
        default: return 'sequential';
    }
}

function targetSelector(value: unknown): StepTargetSelector | null {
    if (!isRecord(value)) return null;
    switch (text(value['kind'])) {
        case 'profiles': {
            if (!Array.isArray(value['profileIds'])) return null;
            const profileIds = value['profileIds'].map(text).filter(Boolean).map(profileId);
            return profileIds.length > 0 ? { kind: 'profiles', profileIds } : null;
        }
        case 'role': {
            const roleKey = fieldKey(value['roleKey']);
            const unitId = text(value['unitId']);
            return roleKey ? { kind: 'role', roleKey, unitId: unitId ? organizationUnitId(unitId) : null } : null;
        }
        case 'unit_manager': {
            const unitId = text(value['unitId']);
            return unitId ? { kind: 'unit_manager', unitId: organizationUnitId(unitId) } : null;
        }
        case 'unit_members': {
            const unitId = text(value['unitId']);
            return unitId ? { kind: 'unit_members', unitId: organizationUnitId(unitId) } : null;
        }
        case 'author_manager': return { kind: 'author_manager' };
        default: return null;
    }
}

function scanSteps(value: unknown): { readonly steps: readonly TemplateStep[]; readonly issues: readonly ParseIssue[] } {
    if (!Array.isArray(value)) return { steps: [], issues: [{ index: -1, message: '결재 단계는 배열이어야 합니다.' }] };
    const steps: TemplateStep[] = [];
    const issues: ParseIssue[] = [];
    const orders = new Set<number>();
    value.forEach((item, index) => {
        if (!isRecord(item)) {
            issues.push({ index, message: '결재 단계는 객체여야 합니다.' });
            return;
        }
        const key = fieldKey(item['key']);
        const label = text(item['label']);
        const rawOrder = item['order'];
        const order = typeof rawOrder === 'number' && Number.isInteger(rawOrder) && rawOrder > 0 ? rawOrder : index + 1;
        const target = targetSelector(item['target']);
        if (!key || !label || !target || orders.has(order)) {
            issues.push({ index, message: '결재 단계의 키, 이름, 순서 또는 대상을 확인해 주세요.' });
            return;
        }
        orders.add(order);
        steps.push({ key, order, label, action: stepAction(item['action']), mode: stepMode(item['mode']), target });
    });
    return { steps: [...steps].sort((left, right) => left.order - right.order), issues };
}

export function normalizeTemplateSteps(value: unknown): readonly TemplateStep[] {
    return scanSteps(value).steps;
}

export function parseTemplateSteps(value: unknown): ParseResult<readonly TemplateStep[]> {
    const result = scanSteps(value);
    return result.issues.length === 0 ? { ok: true, value: result.steps } : { ok: false, issues: result.issues };
}
