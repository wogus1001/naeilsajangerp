import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_STATUSES,
    normalizeLeadGrade,
    normalizeLeadPhone,
    normalizeLeadStage,
    normalizeLeadStatus
} from '@/lib/franchise-leads';
import { buildPostgrestIlikeOrFilter, normalizeSearchValue, parseSearchTerms, sanitizePostgrestSearchTerm } from '@/utils/search';

export const dynamic = 'force-dynamic';

const LEAD_DB_SEARCH_COLUMNS = [
    'name',
    'mobile',
    'mobile_normalized',
    'source',
    'status',
    'grade',
    'desired_region',
    'interested_brand',
    'memo',
    'data->>campaign',
    'data->>memo',
    'data->>externalId'
];

const CONTROL_FIELDS = new Set([
    'id',
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'managerId',
    'manager_id',
    'name',
    'mobile',
    'mobileNormalized',
    'mobile_normalized',
    'source',
    'status',
    'grade',
    'desiredRegion',
    'desired_region',
    'budgetMin',
    'budget_min',
    '예산최소',
    '예산최소(만원)',
    'budgetMax',
    'budget_max',
    '예산최대',
    '예산최대(만원)',
    'interestedBrand',
    'interested_brand',
    'memo',
    'nextContactAt',
    'next_contact_at',
    'lastContactedAt',
    'last_contacted_at'
]);

function getFirst(body: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            return body[key];
        }
    }
    return undefined;
}

function hasAny(body: Record<string, any>, keys: string[]) {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const compact = raw.replace(/,/g, '');
    const eokMatch = compact.match(/(-?\d+(?:\.\d+)?)\s*억/);
    const manMatch = compact.match(/(-?\d+(?:\.\d+)?)\s*만/);

    if (eokMatch || manMatch) {
        const eok = eokMatch ? Number(eokMatch[1]) * 100_000_000 : 0;
        const man = manMatch ? Number(manMatch[1]) * 10_000 : 0;
        const total = eok + man;
        return Number.isFinite(total) ? total : null;
    }

    const parsed = Number(compact.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    if (raw.includes('원') && !raw.includes('만원')) return parsed;
    return Math.abs(parsed) > 0 && Math.abs(parsed) < 1_000_000 ? parsed * 10_000 : parsed;
}

function parseNullableDate(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function transformLead(row: any) {
    if (!row) return null;
    const data = row.data || {};

    return {
        ...data,
        id: row.id,
        companyId: row.company_id,
        managerId: row.manager_id,
        name: row.name || '',
        mobile: row.mobile || '',
        mobileNormalized: row.mobile_normalized || normalizeLeadPhone(row.mobile),
        source: row.source || '',
        status: row.status || DEFAULT_FRANCHISE_LEAD_STATUS,
        grade: row.grade || '',
        leadStage: normalizeLeadStage(data.leadStage),
        desiredRegion: row.desired_region || '',
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        interestedBrand: row.interested_brand || '',
        memo: row.memo || '',
        nextContactAt: row.next_contact_at,
        lastContactedAt: row.last_contacted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function parseRequestedLimit(limitParam: string | null, hasSearch: boolean) {
    if (hasSearch || limitParam === 'all') return null;
    const parsed = parseInt(limitParam || '500', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

function splitFilter(value: string | null) {
    if (!value || value === '전체') return [];
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

function buildLeadDbSearchFilter(terms: string[]) {
    const baseFilter = buildPostgrestIlikeOrFilter(terms, LEAD_DB_SEARCH_COLUMNS);
    const phoneConditions = terms.flatMap(term => {
        const cleanTerm = sanitizePostgrestSearchTerm(normalizeLeadPhone(term));
        if (cleanTerm.length < 3) return [];
        return [`mobile_normalized.ilike.%${cleanTerm}%`];
    });

    const filters = [baseFilter, ...phoneConditions].filter(Boolean);
    return filters.length > 0 ? filters.join(',') : null;
}

function matchesLeadSearch(lead: any, terms: string[]) {
    if (terms.length === 0) return true;

    const phone = normalizeLeadPhone(lead.mobile);
    const fields = [
        lead.name,
        lead.source,
        lead.status,
        lead.grade,
        lead.desiredRegion,
        lead.interestedBrand,
        lead.memo,
        JSON.stringify(lead.data || {})
    ].map(normalizeSearchValue);

    return terms.some(term => {
        const cleanTerm = normalizeLeadPhone(term);
        return (cleanTerm.length > 0 && phone.includes(cleanTerm)) ||
            fields.some(field => field.includes(term));
    });
}

function buildSummary(leads: any[]) {
    const byStatus = FRANCHISE_LEAD_STATUSES.reduce<Record<string, number>>((acc, status) => {
        acc[status] = 0;
        return acc;
    }, {});
    const bySource: Record<string, number> = {};
    const createdByDate: Record<string, number> = {};
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);

    let hotCount = 0;
    let nextContactCount = 0;

    leads.forEach(lead => {
        const status = lead.status || DEFAULT_FRANCHISE_LEAD_STATUS;
        byStatus[status] = (byStatus[status] || 0) + 1;

        const source = lead.source || '미지정';
        bySource[source] = (bySource[source] || 0) + 1;

        if (lead.grade === 'HOT') hotCount++;
        if (lead.nextContactAt) nextContactCount++;

        if (lead.createdAt) {
            const created = new Date(lead.createdAt);
            if (!Number.isNaN(created.getTime()) && created >= weekAgo) {
                const key = created.toISOString().slice(0, 10);
                createdByDate[key] = (createdByDate[key] || 0) + 1;
            }
        }
    });

    return {
        total: leads.length,
        byStatus,
        bySource,
        hotCount,
        nextContactCount,
        createdByDate
    };
}

async function resolveCompanyScope(supabaseAdmin: any, requesterProfile: any, companyName: string | null) {
    const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    if (companyName && !requestedCompanyId) {
        return { error: ok({ leads: [], summary: buildSummary([]), total: 0 }) };
    }

    if (isAdmin(requesterProfile)) {
        return { scopeMode: 'admin' as const, companyId: requestedCompanyId };
    }

    if (requesterProfile.company_id) {
        if (requestedCompanyId && requestedCompanyId !== requesterProfile.company_id) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
        }
        return { scopeMode: 'company' as const, companyId: requesterProfile.company_id };
    }

    return { scopeMode: 'owner' as const, companyId: null };
}

async function resolveMutationScope(supabaseAdmin: any, requesterProfile: any, body: Record<string, any>) {
    const companyName = cleanString(body.companyName);
    const resolvedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    const companyId = resolvedCompanyId || requesterProfile.company_id;
    const managerUuid = await resolveUserUuid(supabaseAdmin, getFirst(body, ['managerId', 'manager_id']) || requesterProfile.id);

    if (!companyId || !managerUuid) {
        return { error: fail(400, 'VALIDATION_ERROR', 'Valid managerId and company scope are required') };
    }

    const { data: managerProfile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', managerUuid)
        .maybeSingle();

    if (!managerProfile || managerProfile.company_id !== companyId) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch') };
    }

    if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, companyId)) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied') };
    }

    return { companyId, managerUuid };
}

function buildDataPayload(body: Record<string, any>, existingData: Record<string, any> = {}) {
    const extras: Record<string, any> = {};
    Object.entries(body).forEach(([key, value]) => {
        if (!CONTROL_FIELDS.has(key)) {
            extras[key] = value;
        }
    });

    return {
        ...existingData,
        ...extras,
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId } : {})
    };
}

function buildInsertPayload(body: Record<string, any>, companyId: string, managerUuid: string) {
    const name = cleanString(getFirst(body, ['name', '이름', '성명']));
    const mobile = cleanString(getFirst(body, ['mobile', '연락처', '휴대폰', '전화번호'])) || '';

    if (!name) {
        return { error: fail(400, 'VALIDATION_ERROR', 'Lead name is required') };
    }

    return {
        payload: {
            id: randomUUID(),
            company_id: companyId,
            manager_id: managerUuid,
            name,
            mobile,
            mobile_normalized: normalizeLeadPhone(mobile),
            source: cleanString(getFirst(body, ['source', '유입경로'])) || '',
            status: normalizeLeadStatus(getFirst(body, ['status', '상태'])),
            grade: normalizeLeadGrade(getFirst(body, ['grade', '등급'])),
            desired_region: cleanString(getFirst(body, ['desiredRegion', 'desired_region', '희망지역'])) || '',
            budget_min: parseNullableNumber(getFirst(body, ['budgetMin', 'budget_min', '예산최소', '예산최소(만원)'])),
            budget_max: parseNullableNumber(getFirst(body, ['budgetMax', 'budget_max', '예산최대', '예산최대(만원)'])),
            interested_brand: cleanString(getFirst(body, ['interestedBrand', 'interested_brand', '관심브랜드', '브랜드'])) || '',
            memo: cleanString(getFirst(body, ['memo', '메모', '상담메모'])) || '',
            next_contact_at: parseNullableDate(getFirst(body, ['nextContactAt', 'next_contact_at', '다음연락일'])),
            last_contacted_at: parseNullableDate(getFirst(body, ['lastContactedAt', 'last_contacted_at', '최근연락일'])),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            data: buildDataPayload(body)
        }
    };
}

function buildUpdatePayload(body: Record<string, any>, existingData: Record<string, any> = {}) {
    const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
        data: buildDataPayload(body, existingData)
    };

    if (hasAny(body, ['name', '이름', '성명'])) updates.name = cleanString(getFirst(body, ['name', '이름', '성명'])) || '';
    if (hasAny(body, ['mobile', '연락처', '휴대폰', '전화번호'])) {
        const mobile = cleanString(getFirst(body, ['mobile', '연락처', '휴대폰', '전화번호'])) || '';
        updates.mobile = mobile;
        updates.mobile_normalized = normalizeLeadPhone(mobile);
    }
    if (hasAny(body, ['source', '유입경로'])) updates.source = cleanString(getFirst(body, ['source', '유입경로'])) || '';
    if (hasAny(body, ['status', '상태'])) updates.status = normalizeLeadStatus(getFirst(body, ['status', '상태']));
    if (hasAny(body, ['grade', '등급'])) updates.grade = normalizeLeadGrade(getFirst(body, ['grade', '등급']));
    if (hasAny(body, ['desiredRegion', 'desired_region', '희망지역'])) updates.desired_region = cleanString(getFirst(body, ['desiredRegion', 'desired_region', '희망지역'])) || '';
    if (hasAny(body, ['budgetMin', 'budget_min', '예산최소', '예산최소(만원)'])) updates.budget_min = parseNullableNumber(getFirst(body, ['budgetMin', 'budget_min', '예산최소', '예산최소(만원)']));
    if (hasAny(body, ['budgetMax', 'budget_max', '예산최대', '예산최대(만원)'])) updates.budget_max = parseNullableNumber(getFirst(body, ['budgetMax', 'budget_max', '예산최대', '예산최대(만원)']));
    if (hasAny(body, ['interestedBrand', 'interested_brand', '관심브랜드', '브랜드'])) updates.interested_brand = cleanString(getFirst(body, ['interestedBrand', 'interested_brand', '관심브랜드', '브랜드'])) || '';
    if (hasAny(body, ['memo', '메모', '상담메모'])) updates.memo = cleanString(getFirst(body, ['memo', '메모', '상담메모'])) || '';
    if (hasAny(body, ['nextContactAt', 'next_contact_at', '다음연락일'])) updates.next_contact_at = parseNullableDate(getFirst(body, ['nextContactAt', 'next_contact_at', '다음연락일']));
    if (hasAny(body, ['lastContactedAt', 'last_contacted_at', '최근연락일'])) updates.last_contacted_at = parseNullableDate(getFirst(body, ['lastContactedAt', 'last_contacted_at', '최근연락일']));

    return updates;
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const company = searchParams.get('company');
        const searchTerms = parseSearchTerms(searchParams.get('search') || searchParams.get('q') || '');
        const includeSummary = searchParams.get('summary') === 'true';

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        if (id) {
            const { data: lead, error } = await supabaseAdmin
                .from('franchise_leads')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !lead) {
                return fail(404, 'NOT_FOUND', 'Franchise lead not found');
            }

            if (!canAccessCompanyResource(requesterProfile, lead)) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            }

            return ok({ lead: transformLead(lead) });
        }

        const scope = await resolveCompanyScope(supabaseAdmin, requesterProfile, company);
        if (scope.error) return scope.error;

        const limitParam = searchParams.get('limit');
        const maxLimit = parseRequestedLimit(limitParam, searchTerms.length > 0);
        const needsFullData = includeSummary || maxLimit === null;
        const dbSearchFilter = searchTerms.length > 0 ? buildLeadDbSearchFilter(searchTerms) : null;
        const statusFilters = splitFilter(searchParams.get('status')).map(normalizeLeadStatus);
        const sourceFilters = splitFilter(searchParams.get('source'));
        const managerFilter = searchParams.get('managerId');
        const managerUuid = managerFilter ? await resolveUserUuid(supabaseAdmin, managerFilter) : null;
        const createdFrom = searchParams.get('createdFrom');
        const createdTo = searchParams.get('createdTo');

        let rows: any[] = [];
        const PAGE_SIZE = 1000;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            let query = supabaseAdmin
                .from('franchise_leads')
                .select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: true })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (scope.scopeMode === 'company' && scope.companyId) {
                query = query.eq('company_id', scope.companyId);
            }
            if (scope.scopeMode === 'owner') {
                query = query.eq('manager_id', requesterProfile.id);
            }
            if (scope.scopeMode === 'admin' && scope.companyId) {
                query = query.eq('company_id', scope.companyId);
            }
            if (statusFilters.length > 0) {
                query = query.in('status', statusFilters);
            }
            if (sourceFilters.length > 0) {
                query = query.in('source', sourceFilters);
            }
            if (managerUuid) {
                query = query.eq('manager_id', managerUuid);
            }
            if (createdFrom) {
                query = query.gte('created_at', `${createdFrom}T00:00:00.000Z`);
            }
            if (createdTo) {
                query = query.lte('created_at', `${createdTo}T23:59:59.999Z`);
            }
            if (dbSearchFilter) {
                query = query.or(dbSearchFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                rows = rows.concat(data);
                if (data.length < PAGE_SIZE) hasMore = false;
                page++;
            } else {
                hasMore = false;
            }

            if (!needsFullData && maxLimit !== null && rows.length >= maxLimit) {
                hasMore = false;
                rows = rows.slice(0, maxLimit);
            }
        }

        let leads = rows.map(transformLead).filter(Boolean);
        if (searchTerms.length > 0) {
            leads = leads.filter(lead => matchesLeadSearch(lead, searchTerms));
        }

        const total = leads.length;
        const summary = buildSummary(leads);
        if (maxLimit !== null && leads.length > maxLimit) {
            leads = leads.slice(0, maxLimit);
        }

        return ok({ leads, summary, total });
    } catch (error) {
        console.error('Franchise leads GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise leads');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || body.managerId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const scope = await resolveMutationScope(supabaseAdmin, requesterProfile, body);
        if (scope.error) return scope.error;

        const insert = buildInsertPayload(body, scope.companyId, scope.managerUuid);
        if (insert.error) return insert.error;

        const mobileNormalized = insert.payload.mobile_normalized;
        if (mobileNormalized) {
            const { data: existing } = await supabaseAdmin
                .from('franchise_leads')
                .select('*')
                .eq('company_id', scope.companyId)
                .eq('mobile_normalized', mobileNormalized)
                .maybeSingle();

            if (existing) {
                const updates = {
                    ...buildUpdatePayload(body, existing.data || {}),
                    manager_id: scope.managerUuid
                };
                const { data: updated, error: updateError } = await supabaseAdmin
                    .from('franchise_leads')
                    .update(updates)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return ok({ lead: transformLead(updated), deduplicated: true });
            }
        }

        const { data: inserted, error } = await supabaseAdmin
            .from('franchise_leads')
            .insert(insert.payload)
            .select()
            .single();

        if (error) throw error;
        return ok({ lead: transformLead(inserted), deduplicated: false }, 201);
    } catch (error) {
        console.error('Franchise leads POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to create franchise lead');
    }
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || body.managerId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        if (!body.id) {
            return fail(400, 'VALIDATION_ERROR', 'ID required');
        }

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_leads')
            .select('*')
            .eq('id', body.id)
            .single();

        if (fetchError || !existing) {
            return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        }

        if (!canAccessCompanyResource(requesterProfile, existing)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const updates = buildUpdatePayload(body, existing.data || {});
        let targetCompanyId = existing.company_id;

        if (body.companyName) {
            const companyId = await resolveCompanyIdByName(supabaseAdmin, body.companyName);
            if (companyId) {
                updates.company_id = companyId;
                targetCompanyId = companyId;
            }
        }

        if (body.managerId) {
            const managerUuid = await resolveUserUuid(supabaseAdmin, body.managerId);
            if (!managerUuid) {
                return fail(400, 'VALIDATION_ERROR', 'Invalid managerId');
            }

            const { data: managerProfile } = await supabaseAdmin
                .from('profiles')
                .select('company_id')
                .eq('id', managerUuid)
                .maybeSingle();

            if (!managerProfile || managerProfile.company_id !== targetCompanyId) {
                return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
            }

            updates.manager_id = managerUuid;
        }

        if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, targetCompanyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company update denied');
        }

        if (updates.mobile_normalized) {
            const { data: duplicate } = await supabaseAdmin
                .from('franchise_leads')
                .select('id')
                .eq('company_id', targetCompanyId)
                .eq('mobile_normalized', updates.mobile_normalized)
                .neq('id', body.id)
                .maybeSingle();

            if (duplicate) {
                return fail(400, 'VALIDATION_ERROR', 'A lead with the same mobile already exists');
            }
        }

        const { data: updated, error } = await supabaseAdmin
            .from('franchise_leads')
            .update(updates)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        return ok({ lead: transformLead(updated) });
    } catch (error) {
        console.error('Franchise leads PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update franchise lead');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        let body: any = null;
        try {
            body = await request.json();
        } catch {
            body = null;
        }

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body?.requesterId || body?.userId || body?.managerId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const ids: string[] = body && Array.isArray(body.ids) ? body.ids : id ? [id] : [];
        if (ids.length === 0) {
            return fail(400, 'VALIDATION_ERROR', 'ID or IDs required');
        }

        const { data: targets, error: targetError } = await supabaseAdmin
            .from('franchise_leads')
            .select('id, company_id, manager_id')
            .in('id', ids);

        if (targetError) throw targetError;

        const forbidden = (targets || []).some((target: any) => !canAccessCompanyResource(requesterProfile, target));
        if (forbidden) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company delete denied');
        }

        const { error, count } = await supabaseAdmin
            .from('franchise_leads')
            .delete({ count: 'exact' })
            .in('id', ids);

        if (error) throw error;
        return ok({ success: true, count: count || 0 });
    } catch (error) {
        console.error('Franchise leads DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete franchise lead');
    }
}
