import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildMonitoringQuery,
    collectNaverOfficialSnapshot,
    collectSerpSnapshot,
    getMarketMonitoringConfigState
} from '@/lib/franchise-market-monitoring';

export const dynamic = 'force-dynamic';

type JsonObject = Record<string, unknown>;

type MarketWatchRow = {
    id: string;
    company_id: string;
    brand_id: string | null;
    brand_name: string;
    region: string;
    keyword: string;
    own_store_name: string | null;
    risk_keywords: string[] | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    data?: JsonObject | null;
};

type MarketSnapshotRow = {
    id: string;
    company_id: string;
    watchlist_id: string | null;
    brand_id: string | null;
    brand_name: string;
    region: string;
    keyword: string;
    snapshot_date: string;
    provider: string;
    naver_query: string | null;
    naver_blog_total: number;
    naver_news_total: number;
    naver_trend_latest: number | null;
    naver_trend_delta: number | null;
    naver_local_top5: unknown;
    serp_provider: string | null;
    serp_query: string | null;
    serp_results: unknown;
    own_store_name: string | null;
    own_store_rank: number | null;
    own_store_visible: boolean;
    risk_mentions: unknown;
    summary: unknown;
    raw: unknown;
    created_at: string;
};

const DEFAULT_RISK_KEYWORDS = ['폐점', '위생', '불친절', '환불', '컴플레인', '논란'];

function cleanString(value: unknown) {
    const text = String(value || '').trim();
    return text.length > 0 ? text : '';
}

function cleanNullableString(value: unknown) {
    const text = cleanString(value);
    return text || null;
}

function toBool(value: unknown, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
    return fallback;
}

function sanitizeRiskKeywords(value: unknown) {
    if (Array.isArray(value)) {
        return value.map(cleanString).filter(Boolean).slice(0, 8);
    }

    const raw = cleanString(value);
    if (!raw) return DEFAULT_RISK_KEYWORDS;
    return raw.split(/[,\s，]+/).map(keyword => keyword.trim()).filter(Boolean).slice(0, 8);
}

function getArray(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function transformWatch(row: MarketWatchRow) {
    return {
        id: row.id,
        companyId: row.company_id,
        brandId: row.brand_id,
        brandName: row.brand_name,
        region: row.region,
        keyword: row.keyword,
        ownStoreName: row.own_store_name || '',
        riskKeywords: row.risk_keywords || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: row.data || {}
    };
}

function transformSnapshot(row: MarketSnapshotRow) {
    return {
        id: row.id,
        companyId: row.company_id,
        watchlistId: row.watchlist_id,
        brandId: row.brand_id,
        brandName: row.brand_name,
        region: row.region,
        keyword: row.keyword,
        snapshotDate: row.snapshot_date,
        provider: row.provider,
        naverQuery: row.naver_query || '',
        naverBlogTotal: Number(row.naver_blog_total || 0),
        naverNewsTotal: Number(row.naver_news_total || 0),
        naverTrendLatest: row.naver_trend_latest === null ? null : Number(row.naver_trend_latest),
        naverTrendDelta: row.naver_trend_delta === null ? null : Number(row.naver_trend_delta),
        naverLocalTop5: getArray(row.naver_local_top5),
        serpProvider: row.serp_provider || '',
        serpQuery: row.serp_query || '',
        serpResults: getArray(row.serp_results),
        ownStoreName: row.own_store_name || '',
        ownStoreRank: row.own_store_rank,
        ownStoreVisible: row.own_store_visible,
        riskMentions: getArray(row.risk_mentions),
        summary: row.summary && typeof row.summary === 'object' ? row.summary : {},
        raw: row.raw && typeof row.raw === 'object' ? row.raw : {},
        createdAt: row.created_at
    };
}

async function resolveCompanyScope(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, requester: Awaited<ReturnType<typeof getRequesterProfile>>, companyName: string | null) {
    if (!requester) return null;
    if (companyName) return resolveCompanyIdByName(supabaseAdmin, companyName);
    if (!isAdmin(requester)) return requester.company_id;
    return null;
}

async function resolveMutationCompanyId(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, requester: Awaited<ReturnType<typeof getRequesterProfile>>, body: JsonObject) {
    const bodyCompanyId = cleanString(body.companyId);
    if (bodyCompanyId) return bodyCompanyId;

    const bodyCompanyName = cleanString(body.companyName || body.company);
    if (bodyCompanyName) return resolveCompanyIdByName(supabaseAdmin, bodyCompanyName);

    return requester?.company_id || null;
}

async function findExistingWatch(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    input: {
        companyId: string;
        brandName: string;
        region: string;
        keyword: string;
        ownStoreName: string | null;
    }
) {
    let query = supabaseAdmin
        .from('franchise_market_watchlist')
        .select('*')
        .eq('company_id', input.companyId)
        .ilike('brand_name', input.brandName)
        .ilike('region', input.region)
        .ilike('keyword', input.keyword)
        .limit(1);

    if (input.ownStoreName) {
        query = query.eq('own_store_name', input.ownStoreName);
    } else {
        query = query.or('own_store_name.is.null,own_store_name.eq.');
    }

    const { data } = await query.maybeSingle();
    return data as MarketWatchRow | null;
}

async function saveWatch(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    requester: Awaited<ReturnType<typeof getRequesterProfile>>,
    body: JsonObject,
    values: {
        companyId: string;
        brandId: string | null;
        brandName: string;
        region: string;
        keyword: string;
        ownStoreName: string | null;
        riskKeywords: string[];
    }
) {
    const watchId = cleanString(body.watchlistId || body.id);
    if (watchId) {
        const { data: existing } = await supabaseAdmin
            .from('franchise_market_watchlist')
            .select('*')
            .eq('id', watchId)
            .maybeSingle();

        if (!existing) throw new Error('감시목록을 찾을 수 없습니다.');
        if (!canAccessCompanyResource(requester, existing as { company_id: string | null })) {
            throw new Error('감시목록 수정 권한이 없습니다.');
        }

        const { data, error } = await supabaseAdmin
            .from('franchise_market_watchlist')
            .update({
                brand_id: values.brandId,
                brand_name: values.brandName,
                region: values.region,
                keyword: values.keyword,
                own_store_name: values.ownStoreName,
                risk_keywords: values.riskKeywords,
                is_active: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', watchId)
            .select('*')
            .single();

        if (error) throw error;
        return data as MarketWatchRow;
    }

    const existing = await findExistingWatch(supabaseAdmin, values);
    if (existing) {
        const { data, error } = await supabaseAdmin
            .from('franchise_market_watchlist')
            .update({
                brand_id: values.brandId,
                risk_keywords: values.riskKeywords,
                is_active: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('*')
            .single();

        if (error) throw error;
        return data as MarketWatchRow;
    }

    const { data, error } = await supabaseAdmin
        .from('franchise_market_watchlist')
        .insert({
            company_id: values.companyId,
            brand_id: values.brandId,
            brand_name: values.brandName,
            region: values.region,
            keyword: values.keyword,
            own_store_name: values.ownStoreName,
            risk_keywords: values.riskKeywords,
            is_active: true
        })
        .select('*')
        .single();

    if (error) throw error;
    return data as MarketWatchRow;
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '인증이 필요합니다.');

    const { searchParams } = new URL(request.url);
    const targetCompanyId = await resolveCompanyScope(supabaseAdmin, requester, searchParams.get('company'));
    if (targetCompanyId && !canAccessCompanyScope(requester, targetCompanyId)) {
        return fail(403, 'FORBIDDEN', '회사 데이터 접근 권한이 없습니다.');
    }

    let watchQuery = supabaseAdmin
        .from('franchise_market_watchlist')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(50);
    let snapshotQuery = supabaseAdmin
        .from('franchise_market_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80);

    if (targetCompanyId) {
        watchQuery = watchQuery.eq('company_id', targetCompanyId);
        snapshotQuery = snapshotQuery.eq('company_id', targetCompanyId);
    } else if (!isAdmin(requester)) {
        return fail(403, 'FORBIDDEN', '회사 데이터 접근 권한이 없습니다.');
    }

    const [{ data: watchlist, error: watchError }, { data: snapshots, error: snapshotError }] = await Promise.all([
        watchQuery,
        snapshotQuery
    ]);

    if (watchError) return fail(500, 'INTERNAL_ERROR', watchError.message);
    if (snapshotError) return fail(500, 'INTERNAL_ERROR', snapshotError.message);

    return ok({
        watchlist: ((watchlist || []) as MarketWatchRow[]).map(transformWatch),
        snapshots: ((snapshots || []) as MarketSnapshotRow[]).map(transformSnapshot),
        config: getMarketMonitoringConfigState()
    });
}

export async function POST(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json().catch(() => ({})) as JsonObject;
    const requester = await getRequesterProfile(supabaseAdmin, request, cleanString(body.requesterId || body.userId));
    if (!requester) return fail(401, 'AUTH_REQUIRED', '인증이 필요합니다.');

    const action = cleanString(body.action || 'scan');

    try {
        const companyId = await resolveMutationCompanyId(supabaseAdmin, requester, body);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canAccessCompanyScope(requester, companyId)) {
            return fail(403, 'FORBIDDEN', '회사 데이터 접근 권한이 없습니다.');
        }

        if (action === 'delete-watch') {
            const watchId = cleanString(body.watchlistId || body.id);
            if (!watchId) return fail(400, 'VALIDATION_ERROR', '감시목록 ID가 필요합니다.');

            const { data: existing } = await supabaseAdmin
                .from('franchise_market_watchlist')
                .select('*')
                .eq('id', watchId)
                .maybeSingle();

            if (!existing) return fail(404, 'NOT_FOUND', '감시목록을 찾을 수 없습니다.');
            if (!canAccessCompanyResource(requester, existing as { company_id: string | null })) {
                return fail(403, 'FORBIDDEN', '감시목록 삭제 권한이 없습니다.');
            }

            const { error } = await supabaseAdmin
                .from('franchise_market_watchlist')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', watchId);

            if (error) throw error;
            return ok({ deleted: true });
        }

        let watch: MarketWatchRow | null = null;
        if (cleanString(body.watchlistId)) {
            const { data: existing, error } = await supabaseAdmin
                .from('franchise_market_watchlist')
                .select('*')
                .eq('id', cleanString(body.watchlistId))
                .maybeSingle();

            if (error) throw error;
            if (!existing) return fail(404, 'NOT_FOUND', '감시목록을 찾을 수 없습니다.');
            if (!canAccessCompanyResource(requester, existing as { company_id: string | null })) {
                return fail(403, 'FORBIDDEN', '감시목록 접근 권한이 없습니다.');
            }
            watch = existing as MarketWatchRow;
        }

        const brandName = cleanString(body.brandName || watch?.brand_name);
        const region = cleanString(body.region || watch?.region);
        const keyword = cleanString(body.keyword || watch?.keyword || '맛집');
        const brandId = cleanNullableString(body.brandId || watch?.brand_id);
        const ownStoreName = cleanNullableString(body.ownStoreName || watch?.own_store_name);
        const riskKeywords = sanitizeRiskKeywords(body.riskKeywords || watch?.risk_keywords);

        if (!brandName || !region || !keyword) {
            return fail(400, 'VALIDATION_ERROR', '브랜드, 지역, 키워드는 필수입니다.');
        }

        const shouldSaveWatch = action === 'upsert-watch' || toBool(body.saveWatch, true);
        if (shouldSaveWatch) {
            watch = await saveWatch(supabaseAdmin, requester, body, {
                companyId,
                brandId,
                brandName,
                region,
                keyword,
                ownStoreName,
                riskKeywords
            });
        }

        if (action === 'upsert-watch') {
            return ok({ watch: watch ? transformWatch(watch) : null });
        }

        const warnings: string[] = [];
        const naver = await collectNaverOfficialSnapshot({ brandName, region, keyword, riskKeywords });
        warnings.push(...naver.warnings);

        let serp: Awaited<ReturnType<typeof collectSerpSnapshot>> | null = null;
        if (toBool(body.includeSerp)) {
            try {
                serp = await collectSerpSnapshot({
                    query: naver.query || buildMonitoringQuery(region, keyword, brandName),
                    ownStoreName,
                    provider: cleanString(body.serpProvider)
                });
                warnings.push(...serp.warnings);
            } catch (error) {
                warnings.push(error instanceof Error ? error.message : 'SERP Provider 조회 실패');
            }
        }

        let previous: MarketSnapshotRow | null = null;
        const { data: previousRow } = await supabaseAdmin
            .from('franchise_market_snapshots')
            .select('*')
            .eq('company_id', companyId)
            .ilike('brand_name', brandName)
            .ilike('region', region)
            .ilike('keyword', keyword)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        previous = previousRow as MarketSnapshotRow | null;

        const summary = {
            blogDeltaTotal: previous ? Number(naver.blogTotal || 0) - Number(previous.naver_blog_total || 0) : 0,
            newsDeltaTotal: previous ? Number(naver.newsTotal || 0) - Number(previous.naver_news_total || 0) : 0,
            ownStoreRankDelta: previous?.own_store_rank && serp?.ownStoreRank ? previous.own_store_rank - serp.ownStoreRank : null,
            riskMentionTotal: naver.riskMentions.reduce((sum, item) => sum + Number(item.blogTotal || 0) + Number(item.newsTotal || 0), 0),
            warnings
        };

        let snapshot: MarketSnapshotRow | null = null;
        if (naver.enabled || serp?.enabled) {
            const { data, error } = await supabaseAdmin
                .from('franchise_market_snapshots')
                .insert({
                    company_id: companyId,
                    watchlist_id: watch?.id || null,
                    brand_id: brandId,
                    brand_name: brandName,
                    region,
                    keyword,
                    provider: serp?.enabled ? 'naver-official+serp' : 'naver-official',
                    naver_query: naver.query,
                    naver_blog_total: naver.blogTotal,
                    naver_news_total: naver.newsTotal,
                    naver_trend_latest: naver.trendLatest,
                    naver_trend_delta: naver.trendDelta,
                    naver_local_top5: naver.localTop5,
                    serp_provider: serp?.provider || null,
                    serp_query: serp?.query || null,
                    serp_results: serp?.results || [],
                    own_store_name: ownStoreName,
                    own_store_rank: serp?.ownStoreRank || null,
                    own_store_visible: Boolean(serp?.ownStoreVisible),
                    risk_mentions: naver.riskMentions,
                    summary,
                    raw: {
                        naverTrendPoints: naver.trendPoints || [],
                        serpRawKeys: serp?.rawKeys || []
                    }
                })
                .select('*')
                .single();

            if (error) throw error;
            snapshot = data as MarketSnapshotRow;
        }

        return ok({
            watch: watch ? transformWatch(watch) : null,
            snapshot: snapshot ? transformSnapshot(snapshot) : null,
            naver,
            serp,
            warnings
        });
    } catch (error) {
        return fail(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : '브랜드 모니터링 처리 중 오류가 발생했습니다.');
    }
}

export async function DELETE(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '인증이 필요합니다.');

    const { searchParams } = new URL(request.url);
    const watchId = cleanString(searchParams.get('id'));
    if (!watchId) return fail(400, 'VALIDATION_ERROR', '감시목록 ID가 필요합니다.');

    const { data: existing, error: findError } = await supabaseAdmin
        .from('franchise_market_watchlist')
        .select('*')
        .eq('id', watchId)
        .maybeSingle();

    if (findError) return fail(500, 'INTERNAL_ERROR', findError.message);
    if (!existing) return fail(404, 'NOT_FOUND', '감시목록을 찾을 수 없습니다.');
    if (!canAccessCompanyResource(requester, existing as { company_id: string | null })) {
        return fail(403, 'FORBIDDEN', '감시목록 삭제 권한이 없습니다.');
    }

    const { error } = await supabaseAdmin
        .from('franchise_market_watchlist')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', watchId);

    if (error) return fail(500, 'INTERNAL_ERROR', error.message);
    return ok({ deleted: true });
}
