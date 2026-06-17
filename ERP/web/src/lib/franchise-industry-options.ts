import {
    FRANCHISE_INDUSTRY_TAXONOMY,
    getDefaultFranchiseIndustryMajors,
    getDefaultFranchiseIndustryOptions
} from './franchise-industry-taxonomy';

export type FranchiseIndustrySource = {
    readonly industry?: string | null;
    readonly businessType?: string | null;
    readonly categoryMajor?: string | null;
    readonly categoryMiddle?: string | null;
    readonly categorySmall?: string | null;
};

export type FranchiseIndustryOptionGroup = {
    readonly businessType: string;
    readonly categories: readonly string[];
    readonly detailGroups: readonly {
        readonly category: string;
        readonly details: readonly string[];
    }[];
};

export type FranchiseIndustryOptionGroups = {
    readonly businessTypes: readonly string[];
    readonly groups: readonly FranchiseIndustryOptionGroup[];
};

export const DEFAULT_FRANCHISE_BUSINESS_TYPE_OPTIONS: readonly string[] = [
    ...getDefaultFranchiseIndustryMajors()
];

export const DEFAULT_FRANCHISE_INDUSTRY_OPTIONS: readonly string[] = [
    ...getDefaultFranchiseIndustryOptions()
];

const FIELD_ORDER: readonly (keyof FranchiseIndustrySource)[] = [
    'categoryMajor',
    'categoryMiddle',
    'categorySmall',
    'industry',
    'businessType'
] as const;

type TaxonomyMatch = {
    readonly major: string;
    readonly middle: string;
    readonly detail: string;
};

function normalizeOption(value: string | null | undefined): string {
    return (value || '').trim();
}

function addOption(target: Set<string>, value: string | null | undefined): void {
    const option = normalizeOption(value);
    if (option) target.add(option);
}

function addCategory(
    groups: Map<string, Set<string>>,
    businessType: string,
    category: string | null | undefined
): void {
    const normalizedBusinessType = normalizeOption(businessType);
    const normalizedCategory = normalizeOption(category);
    if (!normalizedBusinessType || !normalizedCategory) return;
    const categories = groups.get(normalizedBusinessType) || new Set<string>();
    categories.add(normalizedCategory);
    groups.set(normalizedBusinessType, categories);
}

function ensureMajorGroup(groups: Map<string, Set<string>>, major: string): void {
    const normalizedMajor = normalizeOption(major);
    if (!normalizedMajor || groups.has(normalizedMajor)) return;
    groups.set(normalizedMajor, new Set<string>());
}

function addDetail(
    detailGroups: Map<string, Map<string, Set<string>>>,
    major: string,
    middle: string | null | undefined,
    detail: string | null | undefined
): void {
    const normalizedMajor = normalizeOption(major);
    const normalizedMiddle = normalizeOption(middle);
    const normalizedDetail = normalizeOption(detail);
    if (!normalizedMajor || !normalizedMiddle || !normalizedDetail) return;
    const middleMap = detailGroups.get(normalizedMajor) || new Map<string, Set<string>>();
    const details = middleMap.get(normalizedMiddle) || new Set<string>();
    details.add(normalizedDetail);
    middleMap.set(normalizedMiddle, details);
    detailGroups.set(normalizedMajor, middleMap);
}

function findTaxonomyMatch(value: string): TaxonomyMatch | null {
    const normalizedValue = normalizeOption(value);
    if (!normalizedValue) return null;

    for (const [major, middleMap] of Object.entries(FRANCHISE_INDUSTRY_TAXONOMY)) {
        if (major === normalizedValue) return { major, middle: '', detail: '' };

        for (const [middle, details] of Object.entries(middleMap)) {
            if (middle === normalizedValue) return { major, middle, detail: middle };
            if (details.includes(normalizedValue)) return { major, middle, detail: normalizedValue };
        }
    }

    return null;
}

function isKnownMajor(value: string): boolean {
    return Object.prototype.hasOwnProperty.call(FRANCHISE_INDUSTRY_TAXONOMY, value);
}

function readSourceIndustryPath(source: FranchiseIndustrySource): TaxonomyMatch | null {
    const explicitMajor = normalizeOption(source.categoryMajor);
    const businessType = normalizeOption(source.businessType);
    const middleInput = normalizeOption(source.categoryMiddle);
    const smallInput = normalizeOption(source.categorySmall);
    const industryInput = normalizeOption(source.industry);
    const inferred = findTaxonomyMatch(middleInput) || findTaxonomyMatch(smallInput) || findTaxonomyMatch(industryInput);

    const major = (
        isKnownMajor(explicitMajor)
            ? explicitMajor
            : (isKnownMajor(businessType) ? businessType : '')
    ) || inferred?.major || '';
    const middle = middleInput || inferred?.middle || (!explicitMajor && !businessType ? industryInput : '');
    const detail = smallInput || inferred?.detail || middle;

    if (!major || !middle) return null;
    return { major, middle, detail };
}

export function buildFranchiseIndustryOptions(
    sources: readonly FranchiseIndustrySource[] = [],
    customCategoryNames: readonly string[] = []
): readonly string[] {
    const options = new Set<string>();

    DEFAULT_FRANCHISE_INDUSTRY_OPTIONS.forEach(option => options.add(option));
    customCategoryNames.map(normalizeOption).filter(Boolean).forEach(option => options.add(option));

    sources.forEach(source => {
        FIELD_ORDER.forEach(field => {
            const option = normalizeOption(source[field]);
            if (option) options.add(option);
        });
    });

    return Array.from(options);
}

export function buildFranchiseIndustryOptionGroups(
    sources: readonly FranchiseIndustrySource[] = [],
    _customCategoryNames: readonly string[] = []
): FranchiseIndustryOptionGroups {
    const groups = new Map<string, Set<string>>();
    const detailGroups = new Map<string, Map<string, Set<string>>>();

    Object.entries(FRANCHISE_INDUSTRY_TAXONOMY).forEach(([major, middleMap]) => {
        ensureMajorGroup(groups, major);
        Object.entries(middleMap).forEach(([middle, details]) => {
            addCategory(groups, major, middle);
            const effectiveDetails = details.length > 0 ? details : [middle];
            effectiveDetails.forEach(detail => addDetail(detailGroups, major, middle, detail));
        });
    });

    sources.forEach(source => {
        const path = readSourceIndustryPath(source);
        if (!path) return;
        ensureMajorGroup(groups, path.major);
        addCategory(groups, path.major, path.middle);
        addDetail(detailGroups, path.major, path.middle, path.detail);
    });
    const businessTypes = new Set<string>();
    DEFAULT_FRANCHISE_BUSINESS_TYPE_OPTIONS.forEach(option => businessTypes.add(option));
    Array.from(groups.keys()).forEach(option => addOption(businessTypes, option));

    return {
        businessTypes: Array.from(businessTypes),
        groups: Array.from(groups.entries()).map(([businessType, categories]) => ({
            businessType,
            categories: ['', ...Array.from(categories)],
            detailGroups: Array.from(detailGroups.get(businessType)?.entries() || []).map(([category, details]) => ({
                category,
                details: ['', ...Array.from(details)]
            }))
        }))
    };
}

export function getFranchiseIndustryCategoriesForBusinessType(
    optionGroups: FranchiseIndustryOptionGroups,
    businessType: string
): readonly string[] {
    const normalizedBusinessType = normalizeOption(businessType);
    if (!normalizedBusinessType) return [''];
    return optionGroups.groups.find(group => group.businessType === normalizedBusinessType)?.categories || [''];
}

export function getFranchiseIndustryDetailsForCategory(
    optionGroups: FranchiseIndustryOptionGroups,
    businessType: string,
    category: string
): readonly string[] {
    const normalizedBusinessType = normalizeOption(businessType);
    const normalizedCategory = normalizeOption(category);
    if (!normalizedBusinessType || !normalizedCategory) return [''];
    const group = optionGroups.groups.find(item => item.businessType === normalizedBusinessType);
    return group?.detailGroups.find(item => item.category === normalizedCategory)?.details || [''];
}
