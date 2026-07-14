import { isRecord } from './boundary';

function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    return isRecord(value) && Object.values(value).some(hasValue);
}

export function missingRequiredApprovalFields(fields: unknown, values: unknown): readonly string[] {
    if (!Array.isArray(fields) || !isRecord(values)) return [];
    return fields.flatMap(field => {
        if (!isRecord(field) || field.required !== true || field.type === 'description'
            || field.editableBy === 'approver' || field.editableBy === 'agreement') return [];
        const key = typeof field.key === 'string' ? field.key : typeof field.id === 'string' ? field.id : '';
        if (!key || hasValue(values[key])) return [];
        return [typeof field.label === 'string' && field.label.trim() ? field.label.trim() : key];
    });
}
