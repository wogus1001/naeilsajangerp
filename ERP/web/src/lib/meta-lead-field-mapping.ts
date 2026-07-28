export const META_FIELD_KEYS = [
    'name',
    'mobile',
    'desiredRegion',
    'budget',
    'budgetMin',
    'budgetMax',
    'interestedBrand',
    'memo'
] as const;

const MAX_META_FIELD_VALUES = 100;
const MAX_META_TEXT_LENGTH = 300;

export type MetaFieldKey = typeof META_FIELD_KEYS[number];

export type MetaFieldMapping = {
    readonly name: readonly string[];
    readonly mobile: readonly string[];
    readonly desiredRegion: readonly string[];
    readonly budget: readonly string[];
    readonly budgetMin: readonly string[];
    readonly budgetMax: readonly string[];
    readonly interestedBrand: readonly string[];
    readonly memo: readonly string[];
};

export type MetaLeadQuestionOption = {
    readonly key: string;
    readonly label: string;
};

export type MetaLeadQuestion = {
    readonly id: string;
    readonly key: string;
    readonly label: string;
    readonly type: string;
    readonly options: readonly MetaLeadQuestionOption[];
};

export type MetaFormReadinessMissing = 'questions' | 'name' | 'mobile' | 'manager';

export const DEFAULT_META_FIELD_MAPPING: MetaFieldMapping = {
    name: ['full_name', 'name', 'first_name', 'last_name', '이름', '성명', '후보자명'],
    mobile: ['phone_number', 'phone', 'mobile', '연락처', '휴대폰', '전화번호', '핸드폰'],
    desiredRegion: ['desired_region', 'region', 'area', 'location', '희망지역', '관심지역', '지역'],
    budget: ['budget', 'startup_budget', '예산', '창업예산', '창업예산(만원)'],
    budgetMin: ['budget_min', 'min_budget', '예산최소', '예산최소(만원)', '최소예산'],
    budgetMax: ['budget_max', 'max_budget', '예산최대', '예산최대(만원)', '최대예산'],
    interestedBrand: ['brand', 'interested_brand', '관심브랜드', '브랜드'],
    memo: ['memo', 'message', 'comment', '문의내용', '메모', '비고']
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number'
        ? String(value).trim().slice(0, MAX_META_TEXT_LENGTH)
        : '';
}

function normalizeMatchText(value: string): string {
    return value
        .normalize('NFC')
        .trim()
        .toLowerCase()
        .replace(/[\s_()[\]{}·:./-]+/g, '');
}

function normalizeMappingValues(value: unknown, fallback: readonly string[]): readonly string[] {
    if (Array.isArray(value)) {
        return value.slice(0, MAX_META_FIELD_VALUES).map(cleanText).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .slice(0, MAX_META_FIELD_VALUES)
            .map(item => cleanText(item))
            .filter(Boolean);
    }
    return fallback;
}

export function normalizeFieldMapping(value: unknown): MetaFieldMapping {
    const raw = isRecord(value) ? value : {};
    return {
        name: Object.hasOwn(raw, 'name')
            ? normalizeMappingValues(raw.name, [])
            : [...DEFAULT_META_FIELD_MAPPING.name],
        mobile: Object.hasOwn(raw, 'mobile')
            ? normalizeMappingValues(raw.mobile, [])
            : [...DEFAULT_META_FIELD_MAPPING.mobile],
        desiredRegion: Object.hasOwn(raw, 'desiredRegion')
            ? normalizeMappingValues(raw.desiredRegion, [])
            : [...DEFAULT_META_FIELD_MAPPING.desiredRegion],
        budget: Object.hasOwn(raw, 'budget')
            ? normalizeMappingValues(raw.budget, [])
            : [...DEFAULT_META_FIELD_MAPPING.budget],
        budgetMin: Object.hasOwn(raw, 'budgetMin')
            ? normalizeMappingValues(raw.budgetMin, [])
            : [...DEFAULT_META_FIELD_MAPPING.budgetMin],
        budgetMax: Object.hasOwn(raw, 'budgetMax')
            ? normalizeMappingValues(raw.budgetMax, [])
            : [...DEFAULT_META_FIELD_MAPPING.budgetMax],
        interestedBrand: Object.hasOwn(raw, 'interestedBrand')
            ? normalizeMappingValues(raw.interestedBrand, [])
            : [...DEFAULT_META_FIELD_MAPPING.interestedBrand],
        memo: Object.hasOwn(raw, 'memo')
            ? normalizeMappingValues(raw.memo, [])
            : [...DEFAULT_META_FIELD_MAPPING.memo]
    };
}

export function areMetaFieldMappingsEqual(leftValue: unknown, rightValue: unknown): boolean {
    const left = normalizeFieldMapping(leftValue);
    const right = normalizeFieldMapping(rightValue);
    return META_FIELD_KEYS.every(key => {
        const leftValues = [...left[key]].sort();
        const rightValues = [...right[key]].sort();
        return (
            leftValues.length === rightValues.length &&
            leftValues.every((value, index) => value === rightValues[index])
        );
    });
}

function normalizeQuestionOption(value: unknown): MetaLeadQuestionOption | null {
    if (!isRecord(value)) return null;
    const key = cleanText(value.key);
    const label = cleanText(value.value) || cleanText(value.label) || key;
    if (!key && !label) return null;
    return { key: key || label, label };
}

function normalizeQuestion(value: unknown): MetaLeadQuestion | null {
    if (!isRecord(value)) return null;
    const key = cleanText(value.key);
    const label = cleanText(value.label) || key;
    if (!key) return null;
    const options = Array.isArray(value.options)
        ? value.options
            .slice(0, 100)
            .map(normalizeQuestionOption)
            .filter((option): option is MetaLeadQuestionOption => option !== null)
        : [];
    return {
        id: cleanText(value.id) || key,
        key,
        label,
        type: cleanText(value.type),
        options
    };
}

export function normalizeMetaLeadQuestions(value: unknown): readonly MetaLeadQuestion[] {
    if (!Array.isArray(value)) return [];
    const questions = value
        .slice(0, 100)
        .map(normalizeQuestion)
        .filter((question): question is MetaLeadQuestion => question !== null);
    return questions.filter((question, index) => (
        questions.findIndex(candidate => normalizeMatchText(candidate.key) === normalizeMatchText(question.key)) === index
    ));
}

function findSuggestedQuestion(
    questions: readonly MetaLeadQuestion[],
    aliases: readonly string[],
    usedKeys: ReadonlySet<string>,
    acceptedTypes: readonly string[]
): MetaLeadQuestion | null {
    const normalizedAliases = aliases.map(normalizeMatchText);
    const available = questions.filter(question => !usedKeys.has(normalizeMatchText(question.key)));
    const byKey = available.find(question => normalizedAliases.includes(normalizeMatchText(question.key)));
    if (byKey) return byKey;
    const byLabel = available.find(question => normalizedAliases.includes(normalizeMatchText(question.label)));
    if (byLabel) return byLabel;
    return available.find(question => acceptedTypes.includes(question.type.toUpperCase())) || null;
}

export function suggestMetaFieldMapping(questionsValue: unknown): MetaFieldMapping {
    const questions = normalizeMetaLeadQuestions(questionsValue);
    const usedKeys = new Set<string>();
    const select = (
        aliases: readonly string[],
        acceptedTypes: readonly string[] = []
    ): readonly string[] => {
        const question = findSuggestedQuestion(questions, aliases, usedKeys, acceptedTypes);
        if (!question) return [];
        usedKeys.add(normalizeMatchText(question.key));
        return [question.key];
    };

    return {
        name: select(DEFAULT_META_FIELD_MAPPING.name, ['FULL_NAME']),
        mobile: select(DEFAULT_META_FIELD_MAPPING.mobile, ['PHONE']),
        desiredRegion: select(DEFAULT_META_FIELD_MAPPING.desiredRegion),
        budget: select(DEFAULT_META_FIELD_MAPPING.budget),
        budgetMin: select(DEFAULT_META_FIELD_MAPPING.budgetMin),
        budgetMax: select(DEFAULT_META_FIELD_MAPPING.budgetMax),
        interestedBrand: select(DEFAULT_META_FIELD_MAPPING.interestedBrand),
        memo: select(DEFAULT_META_FIELD_MAPPING.memo)
    };
}

function removeSource(mapping: MetaFieldMapping, sourceKey: string): MetaFieldMapping {
    const normalizedSource = normalizeMatchText(sourceKey);
    const withoutSource = (values: readonly string[]) => (
        values.filter(value => normalizeMatchText(value) !== normalizedSource)
    );
    return {
        name: withoutSource(mapping.name),
        mobile: withoutSource(mapping.mobile),
        desiredRegion: withoutSource(mapping.desiredRegion),
        budget: withoutSource(mapping.budget),
        budgetMin: withoutSource(mapping.budgetMin),
        budgetMax: withoutSource(mapping.budgetMax),
        interestedBrand: withoutSource(mapping.interestedBrand),
        memo: withoutSource(mapping.memo)
    };
}

export function assignMetaQuestion(
    mappingValue: unknown,
    sourceKey: string,
    target: MetaFieldKey | null
): MetaFieldMapping {
    const mapping = removeSource(normalizeFieldMapping(mappingValue), sourceKey);
    if (!target) return mapping;
    return {
        ...mapping,
        [target]: [...mapping[target], sourceKey]
    };
}

export function findMetaQuestionTarget(mappingValue: unknown, sourceKey: string): MetaFieldKey | null {
    const mapping = normalizeFieldMapping(mappingValue);
    const normalizedSource = normalizeMatchText(sourceKey);
    return META_FIELD_KEYS.find(key => (
        mapping[key].some(value => normalizeMatchText(value) === normalizedSource)
    )) || null;
}

export function findMetaFieldMappingConflicts(mappingValue: unknown): readonly string[] {
    const mapping = normalizeFieldMapping(mappingValue);
    const sources = new Map<string, { readonly source: string; count: number }>();
    META_FIELD_KEYS.forEach(key => {
        mapping[key].forEach(source => {
            const normalizedSource = normalizeMatchText(source);
            const previous = sources.get(normalizedSource);
            sources.set(normalizedSource, {
                source: previous?.source || source,
                count: (previous?.count || 0) + 1
            });
        });
    });
    return [...sources.values()]
        .filter(item => item.count > 1)
        .map(item => item.source);
}

function hasMappedQuestion(
    mappingValues: readonly string[],
    questions: readonly MetaLeadQuestion[]
): boolean {
    const questionKeys = new Set(questions.map(question => normalizeMatchText(question.key)));
    return mappingValues.some(value => questionKeys.has(normalizeMatchText(value)));
}

export function getMetaFormReadiness(input: {
    readonly questions: unknown;
    readonly mapping: unknown;
    readonly defaultManagerId?: string | null;
}): { readonly ready: boolean; readonly missing: readonly MetaFormReadinessMissing[] } {
    const questions = normalizeMetaLeadQuestions(input.questions);
    const mapping = normalizeFieldMapping(input.mapping);
    const missing: MetaFormReadinessMissing[] = [];
    if (questions.length === 0) missing.push('questions');
    if (!hasMappedQuestion(mapping.name, questions)) missing.push('name');
    if (!hasMappedQuestion(mapping.mobile, questions)) missing.push('mobile');
    if (!cleanText(input.defaultManagerId)) missing.push('manager');
    return { ready: missing.length === 0, missing };
}

export function isEligibleMetaFormManager(
    profile: { readonly company_id?: unknown; readonly status?: unknown } | null,
    companyId: string
): boolean {
    return profile?.company_id === companyId && profile.status === 'active';
}
