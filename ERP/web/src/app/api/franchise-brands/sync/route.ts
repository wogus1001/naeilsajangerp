import { randomUUID } from 'crypto';
import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { mergeRecommendedKeywords, normalizeBrandName } from '@/lib/franchise-brands';
import { fetchDisclosureBrands as fetchLiveDisclosureBrands } from '@/lib/franchise-disclosure';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type DisclosureBrandCandidate = {
    brandName?: string;
    franchisorName?: string;
    disclosureBrandId?: string;
    industry?: string;
    businessType?: string;
    categoryMajor?: string;
    categoryMiddle?: string;
    categorySmall?: string;
    recommendedKeywords?: string[];
    raw?: Record<string, unknown>;
};

function cleanString(value: unknown): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function getField(row: Record<string, unknown>, keys: string[]) {
    const found = keys.find(key => row[key] !== undefined && row[key] !== null && cleanString(row[key]));
    return found ? cleanString(row[found]) : '';
}

function mapDisclosureRow(row: Record<string, unknown>): DisclosureBrandCandidate | null {
    const brandName = normalizeBrandName(getField(row, [
        'brandName',
        'brandNm',
        'brdNm',
        'bizesNm',
        'jngBizNm',
        'frcsBrdNm',
        'mrhstBrandNm',
        'brand_nm',
        '상호',
        '브랜드',
        '브랜드명'
    ]));
    if (!brandName) return null;

    const industry = getField(row, ['industry', 'indutyNm', 'indutyName', 'indutyMlsfcNm', 'majrGdsNm', '업종', '업종명']);
    const businessType = getField(row, ['businessType', 'bizType', '업태', '업태명']);
    const categoryMajor = getField(row, ['categoryMajor', 'lclasNm', 'indutyLclasNm', 'largeCategory', '대분류']);
    const categoryMiddle = getField(row, ['categoryMiddle', 'mlsfcNm', 'indutyMlsfcNm', 'middleCategory', '중분류']);
    const categorySmall = getField(row, ['categorySmall', 'sclasNm', 'smallCategory', '소분류']);

    return {
        brandName,
        franchisorName: getField(row, ['franchisorName', 'corpNm', 'jnghdqrtrsRprsvNm', 'hdqrtrsNm', 'entrprsNm', '가맹본부', '상호명']),
        disclosureBrandId: getField(row, ['disclosureBrandId', 'docId', 'brandId', 'brandMnno', 'brdNo', '정보공개서ID']),
        industry,
        businessType,
        categoryMajor,
        categoryMiddle,
        categorySmall,
        recommendedKeywords: mergeRecommendedKeywords(null, {
            brandName,
            industry,
            businessType,
            categoryMajor,
            categoryMiddle,
            categorySmall
        }),
        raw: row
    };
}

function mapLiveBrand(brand: any): DisclosureBrandCandidate {
    return {
        brandName: brand.brandName,
        franchisorName: brand.franchisorName,
        disclosureBrandId: brand.disclosureBrandId,
        industry: brand.industry,
        businessType: brand.businessType,
        categoryMajor: brand.categoryMajor,
        categoryMiddle: brand.categoryMiddle,
        categorySmall: brand.categorySmall,
        recommendedKeywords: brand.recommendedKeywords,
        raw: brand.data?.raw || brand
    };
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json().catch(() => ({}));
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request, body.requesterId || body.userId || null);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requesterProfile)) return fail(403, 'FORBIDDEN', 'Only admin can sync disclosure brands');

        const search = cleanString(body.query || body.brandName);
        const limit = Math.min(100, Math.max(1, Number(body.limit || 50)));
        const incomingRows = Array.isArray(body.brands)
            ? body.brands.map(mapDisclosureRow).filter(Boolean) as DisclosureBrandCandidate[]
            : (await fetchLiveDisclosureBrands(search, limit)).map(mapLiveBrand);

        let upserted = 0;
        const errors: Array<{ brandName?: string; message: string }> = [];

        for (const brand of incomingRows) {
            try {
                const { data: existing } = await supabaseAdmin
                    .from('franchise_brands')
                    .select('id, created_at')
                    .is('company_id', null)
                    .ilike('brand_name', brand.brandName || '')
                    .maybeSingle();

                const payload = {
                    id: existing?.id || randomUUID(),
                    company_id: null,
                    brand_name: brand.brandName,
                    franchisor_name: brand.franchisorName || '',
                    disclosure_brand_id: brand.disclosureBrandId || '',
                    industry: brand.industry || '',
                    business_type: brand.businessType || '',
                    category_major: brand.categoryMajor || '',
                    category_middle: brand.categoryMiddle || '',
                    category_small: brand.categorySmall || '',
                    recommended_keywords: brand.recommendedKeywords || [],
                    source: 'disclosure-api',
                    created_at: existing?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    data: {
                        raw: brand.raw || {}
                    }
                };

                const { error } = existing?.id
                    ? await supabaseAdmin.from('franchise_brands').update(payload).eq('id', existing.id)
                    : await supabaseAdmin.from('franchise_brands').insert(payload);
                if (error) throw error;
                upserted += 1;
            } catch (error) {
                errors.push({
                    brandName: brand.brandName,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return ok({ upserted, errors, total: incomingRows.length });
    } catch (error) {
        console.error('Franchise brand sync error:', error);
        return fail(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to sync franchise brands');
    }
}
