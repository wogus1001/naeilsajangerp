import {
    isCompanyTemplateFieldType,
    type CompanyTemplateField,
    type CompanyTemplateRole
} from '@/lib/electronic-contracts/company-template';
import type { CompanyTemplateDetail } from './companyTemplatesClient';

export function fieldFromDetail(field: CompanyTemplateDetail['fields'][number]): CompanyTemplateField {
    const type = isCompanyTemplateFieldType(field.field_type) ? field.field_type : 'text';
    return {
        fieldKey: field.field_key,
        label: field.label,
        type,
        page: Number(field.page ?? 1),
        x: Number(field.x ?? 8),
        y: Number(field.y ?? 8),
        width: Number(field.width ?? 24),
        height: Number(field.height ?? 8),
        required: field.required ?? false,
        roleKey: field.role_key || '',
        defaultValue: field.default_value || ''
    };
}

export function roleFromDetail(role: CompanyTemplateDetail['roles'][number]): CompanyTemplateRole {
    return {
        roleKey: role.role_key,
        label: role.label,
        signingOrder: role.signing_order ?? 1,
        required: role.required ?? true
    };
}

export function clampPage(value: number, pageCount: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(Math.max(1, Math.trunc(value)), Math.max(1, pageCount));
}

export function createTemplateField(index: number, page: number): CompanyTemplateField {
    return {
        fieldKey: `field_${index}`,
        label: `입력 ${index}`,
        type: 'text',
        page,
        x: 8,
        y: 10 + index * 5,
        width: 28,
        height: 7,
        required: false,
        roleKey: ''
    };
}

export function statusLabel(status: string | null | undefined): string {
    if (status === 'active') return '사용중';
    if (status === 'archived') return '보관';
    return '작성중';
}

export function pdfPreviewUrl(url: string, page: number): string {
    return `${url}#toolbar=0&navpanes=0&scrollbar=0&page=${page}&zoom=page-fit`;
}
