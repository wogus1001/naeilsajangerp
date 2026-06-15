export type FranchiseBrand = {
    id: string;
    companyId?: string | null;
    brandName: string;
    franchisorName?: string;
    disclosureBrandId?: string;
    industry?: string;
    businessType?: string;
    categoryMajor?: string;
    categoryMiddle?: string;
    categorySmall?: string;
    recommendedKeywords: string[];
    source?: string;
    isSaved?: boolean;
    data?: Record<string, unknown>;
};

const KEYWORD_RULES: Array<{ patterns: string[]; keywords: string[] }> = [
    { patterns: ['치킨', '닭', '통닭'], keywords: ['치킨', '닭강정', '호프'] },
    { patterns: ['피자'], keywords: ['피자', '파스타'] },
    { patterns: ['커피', '카페', '디저트', '베이커리', '제과'], keywords: ['카페', '커피', '디저트'] },
    { patterns: ['한식', '국밥', '찌개', '분식', '김밥', '도시락'], keywords: ['한식', '분식', '국밥'] },
    { patterns: ['고기', '갈비', '삼겹', '구이', '족발', '보쌈'], keywords: ['고기집', '한식', '구이'] },
    { patterns: ['중식', '마라', '짬뽕', '짜장'], keywords: ['중식', '마라탕'] },
    { patterns: ['일식', '초밥', '스시', '라멘', '돈카츠', '돈까스'], keywords: ['일식', '초밥', '라멘'] },
    { patterns: ['버거', '햄버거', '패스트푸드'], keywords: ['햄버거', '패스트푸드'] },
    { patterns: ['주점', '호프', '맥주', '술집', '포차'], keywords: ['술집', '호프', '포차'] },
    { patterns: ['교육', '학원', '교습'], keywords: ['학원', '교육'] },
    { patterns: ['미용', '헤어', '네일', '뷰티'], keywords: ['미용실', '네일샵', '뷰티'] },
    { patterns: ['헬스', '피트니스', '요가', '필라테스'], keywords: ['헬스장', '필라테스', '요가'] },
    { patterns: ['편의점', '마트', '소매'], keywords: ['편의점', '마트'] },
    { patterns: ['세탁', '빨래'], keywords: ['세탁소', '빨래방'] },
    { patterns: ['반려', '펫', '동물'], keywords: ['애견', '펫샵', '동물병원'] }
];

function cleanText(value: unknown) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeBrandName(value: unknown) {
    return cleanText(value);
}

export function normalizeRecommendedKeywords(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map(cleanText).filter(Boolean).slice(0, 5);
    }
    return cleanText(value)
        .split(/[,\s/|]+/)
        .map(cleanText)
        .filter(Boolean)
        .slice(0, 5);
}

export function inferBrandKeywords(input: {
    brandName?: string | null;
    industry?: string | null;
    businessType?: string | null;
    categoryMajor?: string | null;
    categoryMiddle?: string | null;
    categorySmall?: string | null;
}) {
    const haystack = [
        input.industry,
        input.businessType,
        input.categoryMajor,
        input.categoryMiddle,
        input.categorySmall,
        input.brandName
    ].map(cleanText).join(' ');

    const matched = KEYWORD_RULES.find(rule => rule.patterns.some(pattern => haystack.includes(pattern)));
    if (matched) return matched.keywords;

    const industry = cleanText(input.categorySmall || input.categoryMiddle || input.businessType || input.industry);
    if (industry) return [industry];

    const brandName = cleanText(input.brandName);
    return brandName ? [brandName] : [];
}

export function mergeRecommendedKeywords(primary: unknown, fallbackInput: Parameters<typeof inferBrandKeywords>[0]) {
    const explicit = normalizeRecommendedKeywords(primary);
    const inferred = inferBrandKeywords(fallbackInput);
    return Array.from(new Set([...explicit, ...inferred].map(cleanText).filter(Boolean))).slice(0, 5);
}
