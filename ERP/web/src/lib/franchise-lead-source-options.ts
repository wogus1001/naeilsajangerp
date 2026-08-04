import {
    FRANCHISE_LEAD_REGISTRATION_SOURCE,
    FRANCHISE_MATCHING_REQUEST_SOURCE,
    FRANCHISE_MATCHING_REQUEST_SOURCE_LABEL
} from './franchise-leads';

export const FRANCHISE_LEAD_SOURCE_OPTION_KINDS = ['system', 'custom'] as const;

export type FranchiseLeadSourceOptionKind = typeof FRANCHISE_LEAD_SOURCE_OPTION_KINDS[number];

export type FranchiseLeadSourceOption = {
    readonly id: string;
    readonly companyId: string | null;
    readonly code: string;
    readonly label: string;
    readonly kind: FranchiseLeadSourceOptionKind;
    readonly isActive: boolean;
    readonly sortOrder: number;
    readonly persisted: boolean;
};

export type FranchiseLeadSourceOptionRow = {
    readonly id: string;
    readonly company_id: string;
    readonly code: string;
    readonly label: string;
    readonly is_system: boolean;
    readonly is_active: boolean;
    readonly sort_order: number;
};

type DefaultSourceDefinition = {
    readonly code: string;
    readonly label: string;
    readonly kind: FranchiseLeadSourceOptionKind;
};

const DEFAULT_SOURCE_DEFINITIONS = [
    { code: '네이버폼', label: '네이버폼', kind: 'custom' },
    { code: '랜딩페이지', label: '랜딩페이지', kind: 'custom' },
    { code: '박람회', label: '박람회', kind: 'custom' },
    { code: '소개', label: '소개', kind: 'custom' },
    { code: '광고', label: '광고', kind: 'custom' },
    { code: 'Meta Lead Ads', label: 'Meta Lead Ads', kind: 'system' },
    { code: '전화문의', label: '전화문의', kind: 'custom' },
    { code: '고객DB', label: '고객DB', kind: 'system' },
    { code: '명함DB', label: '명함DB', kind: 'system' },
    { code: FRANCHISE_LEAD_REGISTRATION_SOURCE, label: FRANCHISE_LEAD_REGISTRATION_SOURCE, kind: 'system' },
    { code: FRANCHISE_MATCHING_REQUEST_SOURCE, label: FRANCHISE_MATCHING_REQUEST_SOURCE_LABEL, kind: 'system' },
    { code: '기타', label: '기타', kind: 'custom' }
] as const satisfies readonly DefaultSourceDefinition[];

export const DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS: readonly FranchiseLeadSourceOption[] = DEFAULT_SOURCE_DEFINITIONS.map(
    (definition, index) => ({
        id: `default:${definition.code}`,
        companyId: null,
        code: definition.code,
        label: definition.label,
        kind: definition.kind,
        isActive: true,
        sortOrder: (index + 1) * 10,
        persisted: false
    })
);

export function canEditFranchiseLeadSourceOption(option: FranchiseLeadSourceOption): boolean {
    return option.kind === 'custom';
}

export function canManageFranchiseLeadSourceOptions(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'manager' || role === 'sub_manager';
}

export function normalizeFranchiseLeadSourceOptionLabel(value: unknown): string {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function validateFranchiseLeadSourceOptionLabel(value: unknown):
    | { readonly ok: true; readonly label: string }
    | { readonly ok: false; readonly message: string } {
    const label = normalizeFranchiseLeadSourceOptionLabel(value);
    if (!label) {
        return { ok: false, message: '유입경로 이름을 입력해주세요.' };
    }
    if (label.length > 40) {
        return { ok: false, message: '유입경로 이름은 40자 이내로 입력해주세요.' };
    }
    return { ok: true, label };
}

export function getFranchiseLeadSourceOptionLabel(
    code: string | null | undefined,
    options: readonly FranchiseLeadSourceOption[]
): string {
    if (!code) return '유입 미지정';
    return options.find(option => option.code === code)?.label || code;
}

export function getSelectableFranchiseLeadSourceOptions(
    options: readonly FranchiseLeadSourceOption[],
    selectedCode: string
): readonly FranchiseLeadSourceOption[] {
    return options.filter(option => option.isActive || option.code === selectedCode);
}

export function getLabeledFranchiseLeadSourceCounts(
    counts: Readonly<Record<string, number>>,
    options: readonly FranchiseLeadSourceOption[]
): Readonly<Record<string, number>> {
    return Object.entries(counts).reduce<Record<string, number>>((labeledCounts, [code, count]) => {
        const label = getFranchiseLeadSourceOptionLabel(code, options);
        labeledCounts[label] = (labeledCounts[label] || 0) + count;
        return labeledCounts;
    }, {});
}

export function mergeFranchiseLeadSourceOptions(
    rows: readonly FranchiseLeadSourceOptionRow[]
): readonly FranchiseLeadSourceOption[] {
    const savedByCode = new Map(rows.map(row => [row.code, row]));
    const mergedDefaults = DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS.map(option => {
        const saved = savedByCode.get(option.code);
        if (!saved) return option;
        savedByCode.delete(option.code);
        return {
            id: saved.id,
            companyId: saved.company_id,
            code: saved.code,
            label: saved.label,
            kind: saved.is_system ? 'system' : 'custom',
            isActive: saved.is_active,
            sortOrder: saved.sort_order,
            persisted: true
        } satisfies FranchiseLeadSourceOption;
    });
    const additionalOptions = [...savedByCode.values()].map(row => ({
        id: row.id,
        companyId: row.company_id,
        code: row.code,
        label: row.label,
        kind: row.is_system ? 'system' : 'custom',
        isActive: row.is_active,
        sortOrder: row.sort_order,
        persisted: true
    } satisfies FranchiseLeadSourceOption));

    return [...mergedDefaults, ...additionalOptions].sort((left, right) => (
        left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, 'ko')
    ));
}
