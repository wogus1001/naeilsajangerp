import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { fetchDisclosureBrands, getDisclosureConfigState } from '@/lib/franchise-disclosure';
import { mergeRecommendedKeywords, normalizeBrandName } from '@/lib/franchise-brands';

export const dynamic = 'force-dynamic';

const CONTROL_FIELDS = new Set([
    'id',
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'brandName',
    'brand_name',
    'franchisorName',
    'franchisor_name',
    'disclosureBrandId',
    'disclosure_brand_id',
    'industry',
    'businessType',
    'business_type',
    'categoryMajor',
    'category_major',
    'categoryMiddle',
    'category_middle',
    'categorySmall',
    'category_small',
    'recommendedKeywords',
    'recommended_keywords',
    'source'
]);

function getFirst(body: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function sanitizeIlikeTerm(value: string) {
    return value.replace(/[,%]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildDataPayload(body: Record<string, any>, existingData: Record<string, any> = {}) {
    const extras: Record<string, any> = {};
    Object.entries(body).forEach(([key, value]) => {
        if (!CONTROL_FIELDS.has(key)) extras[key] = value;
    });
    return {
        ...existingData,
        ...extras
    };
}

function transformBrand(row: any, requesterCompanyId?: string | null) {
    if (!row) return null;
    const data = row.data || {};
    return {
        ...data,
        id: row.id,
        companyId: row.company_id,
        brandName: row.brand_name || '',
        franchisorName: row.franchisor_name || '',
        disclosureBrandId: row.disclosure_brand_id || '',
        industry: row.industry || '',
        businessType: row.business_type || '',
        categoryMajor: row.category_major || '',
        categoryMiddle: row.category_middle || '',
        categorySmall: row.category_small || '',
        recommendedKeywords: row.recommended_keywords || [],
        source: row.source || 'manual',
        isSaved: Boolean(row.company_id && requesterCompanyId && row.company_id === requesterCompanyId),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function resolveCompanyScope(supabaseAdmin: any, requesterProfile: any, companyName: string | null) {
    const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    if (companyName && !requestedCompanyId) return { companyId: '__none__' };
    if (isAdmin(requesterProfile)) return { companyId: requestedCompanyId };
    if (requesterProfile.company_id) {
        if (requestedCompanyId && requestedCompanyId !== requesterProfile.company_id) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
        }
        return { companyId: requesterProfile.company_id };
    }
    return { companyId: null };
}

async function resolveMutationCompanyId(supabaseAdmin: any, requesterProfile: any, body: Record<string, any>) {
    const companyName = cleanString(body.companyName);
    const requestedCompanyId = cleanString(body.companyId);
    const resolvedCompanyId = requestedCompanyId || (companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null);
    const companyId = resolvedCompanyId || requesterProfile.company_id;

    if (!companyId) return { error: fail(400, 'VALIDATION_ERROR', 'Company scope is required') };
    if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, companyId)) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied') };
    }
    return { companyId };
}

function buildBrandPayload(body: Record<string, any>, companyId: string, existingData: Record<string, any> = {}) {
    const brandName = normalizeBrandName(getFirst(body, ['brandName', 'brand_name', '브랜드']));
    if (!brandName) return { error: fail(400, 'VALIDATION_ERROR', 'Brand name is required') };

    const industry = cleanString(getFirst(body, ['industry', '업종'])) || '';
    const businessType = cleanString(getFirst(body, ['businessType', 'business_type', '업태'])) || '';
    const categoryMajor = cleanString(getFirst(body, ['categoryMajor', 'category_major', '대분류'])) || '';
    const categoryMiddle = cleanString(getFirst(body, ['categoryMiddle', 'category_middle', '중분류'])) || '';
    const categorySmall = cleanString(getFirst(body, ['categorySmall', 'category_small', '소분류'])) || '';
    const recommendedKeywords = mergeRecommendedKeywords(
        getFirst(body, ['recommendedKeywords', 'recommended_keywords', '추천키워드']),
        { brandName, industry, businessType, categoryMajor, categoryMiddle, categorySmall }
    );

    return {
        payload: {
            company_id: companyId,
            brand_name: brandName,
            franchisor_name: cleanString(getFirst(body, ['franchisorName', 'franchisor_name', '가맹본부'])) || '',
            disclosure_brand_id: cleanString(getFirst(body, ['disclosureBrandId', 'disclosure_brand_id', '정보공개서ID'])) || '',
            industry,
            business_type: businessType,
            category_major: categoryMajor,
            category_middle: categoryMiddle,
            category_small: categorySmall,
            recommended_keywords: recommendedKeywords,
            source: cleanString(body.source) || 'manual',
            updated_at: new Date().toISOString(),
            data: buildDataPayload(body, existingData)
        }
    };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const company = searchParams.get('company');
        const search = sanitizeIlikeTerm(searchParams.get('query') || '');
        const limit = Math.min(80, Math.max(10, Number(searchParams.get('limit') || 40)));
        const includeDisclosure = searchParams.get('includeDisclosure') === 'true' && Boolean(search);
        const warnings: string[] = [];

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const scope = await resolveCompanyScope(supabaseAdmin, requesterProfile, company);
        if (scope.error) return scope.error;
        if (scope.companyId === '__none__') return ok({ brands: [] });

        let query = supabaseAdmin
            .from('franchise_brands')
            .select('*')
            .limit(limit);

        if (!isAdmin(requesterProfile) || scope.companyId) {
            if (scope.companyId) query = query.or(`company_id.is.null,company_id.eq.${scope.companyId}`);
            else query = query.is('company_id', null);
        }

        if (search) {
            const term = `%${search}%`;
            query = query.or([
                `brand_name.ilike.${term}`,
                `franchisor_name.ilike.${term}`,
                `industry.ilike.${term}`,
                `business_type.ilike.${term}`,
                `category_major.ilike.${term}`,
                `category_middle.ilike.${term}`,
                `category_small.ilike.${term}`
            ].join(','));
        }

        const { data, error } = await query;
        if (error) {
            if ((error as { code?: string }).code === 'PGRST205') {
                warnings.push('franchise_brands table is not migrated yet');
            } else {
                throw error;
            }
        }

        let disclosureBrands: Awaited<ReturnType<typeof fetchDisclosureBrands>> = [];
        if (includeDisclosure) {
            try {
                disclosureBrands = await fetchDisclosureBrands(search, limit);
            } catch (error) {
                warnings.push(error instanceof Error ? error.message : 'Failed to fetch disclosure brands');
            }
        }

        const savedBrands = (data || [])
            .map((row: any) => transformBrand(row, scope.companyId === '__none__' ? null : scope.companyId))
            .filter(Boolean)
            .sort((a: any, b: any) => {
                if (a.isSaved !== b.isSaved) return a.isSaved ? -1 : 1;
                return String(a.brandName).localeCompare(String(b.brandName), 'ko');
            });

        const seen = new Set<string>();
        const brands = [...savedBrands, ...disclosureBrands]
            .filter((brand: any) => {
                const key = normalizeBrandName(brand.brandName).toLowerCase();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, limit);

        return ok({
            brands,
            warnings,
            config: getDisclosureConfigState()
        });
    } catch (error) {
        console.error('Franchise brands GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise brands');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request, body.requesterId || body.userId || null);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const scope = await resolveMutationCompanyId(supabaseAdmin, requesterProfile, body);
        if (scope.error) return scope.error;

        const built = buildBrandPayload(body, scope.companyId);
        if (built.error) return built.error;

        const { data: existing } = await supabaseAdmin
            .from('franchise_brands')
            .select('*')
            .eq('company_id', scope.companyId)
            .ilike('brand_name', built.payload.brand_name)
            .maybeSingle();

        const payload = {
            ...built.payload,
            id: existing?.id || randomUUID(),
            created_at: existing?.created_at || new Date().toISOString(),
            data: buildDataPayload(body, existing?.data || {})
        };

        const { data, error } = existing?.id
            ? await supabaseAdmin
                .from('franchise_brands')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single()
            : await supabaseAdmin
                .from('franchise_brands')
                .insert(payload)
                .select()
                .single();

        if (error) throw error;
        return ok({ brand: transformBrand(data, scope.companyId) }, existing?.id ? 200 : 201);
    } catch (error) {
        console.error('Franchise brands POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to save franchise brand');
    }
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request, body.requesterId || body.userId || null);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!body.id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_brands')
            .select('*')
            .eq('id', body.id)
            .single();
        if (fetchError || !existing) return fail(404, 'NOT_FOUND', 'Franchise brand not found');
        if (!canAccessCompanyResource(requesterProfile, existing)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const built = buildBrandPayload(body, existing.company_id, existing.data || {});
        if (built.error) return built.error;

        const { data, error } = await supabaseAdmin
            .from('franchise_brands')
            .update(built.payload)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        return ok({ brand: transformBrand(data, existing.company_id) });
    } catch (error) {
        console.error('Franchise brands PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update franchise brand');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_brands')
            .select('id, company_id')
            .eq('id', id)
            .single();
        if (fetchError || !existing) return fail(404, 'NOT_FOUND', 'Franchise brand not found');
        if (!canAccessCompanyResource(requesterProfile, existing)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company delete denied');
        }

        const { error } = await supabaseAdmin
            .from('franchise_brands')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Franchise brands DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete franchise brand');
    }
}
