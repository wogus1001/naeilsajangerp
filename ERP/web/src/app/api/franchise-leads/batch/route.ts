import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    normalizeLeadGrade,
    normalizeLeadPhone,
    normalizeLeadStatus
} from '@/lib/franchise-leads';

export const dynamic = 'force-dynamic';

type BatchRow = Record<string, any>;

const NAME_KEYS = ['이름', '성명', '고객명', '후보자명', 'name'];
const MOBILE_KEYS = ['연락처', '휴대폰', '전화번호', '핸드폰', 'mobile', 'phone'];
const SOURCE_KEYS = ['유입경로', '유입', 'source'];
const STATUS_KEYS = ['상태', '진행상태', 'status'];
const GRADE_KEYS = ['등급', '온도', 'grade'];
const REGION_KEYS = ['희망지역', '관심지역', '지역', 'desiredRegion'];
const BUDGET_KEYS = ['창업예산', '예산', 'budget'];
const BUDGET_MIN_KEYS = ['예산최소', '최소예산', 'budgetMin'];
const BUDGET_MAX_KEYS = ['예산최대', '최대예산', 'budgetMax'];
const BRAND_KEYS = ['관심브랜드', '브랜드', 'brand', 'interestedBrand'];
const MEMO_KEYS = ['메모', '상담메모', '비고', 'memo'];
const MANAGER_KEYS = ['담당자', 'manager', 'managerId'];
const NEXT_CONTACT_KEYS = ['다음연락일', '다음연락', 'nextContactAt'];

function getCell(row: BatchRow, keys: string[]) {
    for (const key of keys) {
        if (row[key] !== undefined) return row[key];
        const foundKey = Object.keys(row).find(candidate => candidate.trim() === key.trim());
        if (foundKey) return row[foundKey];
    }
    return undefined;
}

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function parseBudgetRange(row: BatchRow) {
    const explicitMin = parseNullableNumber(getCell(row, BUDGET_MIN_KEYS));
    const explicitMax = parseNullableNumber(getCell(row, BUDGET_MAX_KEYS));
    if (explicitMin !== null || explicitMax !== null) {
        return { min: explicitMin, max: explicitMax };
    }

    const raw = cleanString(getCell(row, BUDGET_KEYS));
    const numbers = raw.match(/\d[\d,]*/g)?.map(parseNullableNumber).filter((num): num is number => num !== null) || [];
    return {
        min: numbers[0] ?? null,
        max: numbers[1] ?? null
    };
}

function parseNullableDate(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getDisplayId(profile: any) {
    return profile.email?.endsWith('@example.com') ? profile.email.split('@')[0] : profile.email;
}

async function resolveMutationScope(supabaseAdmin: any, requesterProfile: any, meta: BatchRow) {
    const companyName = cleanString(meta.companyName || meta.userCompanyName);
    const resolvedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    const companyId = resolvedCompanyId || requesterProfile.company_id;
    const managerUuid = await resolveUserUuid(supabaseAdmin, meta.managerId || meta.requesterId || meta.userId || requesterProfile.id);

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

async function buildManagerMap(supabaseAdmin: any, rows: BatchRow[], companyId: string) {
    const emails = new Set<string>();
    const names = new Set<string>();

    rows.forEach(row => {
        const raw = cleanString(getCell(row, MANAGER_KEYS));
        if (!raw) return;
        if (raw.includes('@')) emails.add(raw);
        else names.add(raw.normalize('NFC'));
    });

    const managerMap = new Map<string, { uuid: string; displayId: string }>();

    if (emails.size > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, company_id')
            .eq('company_id', companyId)
            .in('email', Array.from(emails));

        profiles?.forEach((profile: any) => {
            if (profile.email) {
                managerMap.set(profile.email, { uuid: profile.id, displayId: getDisplayId(profile) });
            }
        });
    }

    if (names.size > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email, company_id')
            .eq('company_id', companyId)
            .in('name', Array.from(names));

        profiles?.forEach((profile: any) => {
            if (profile.name) {
                managerMap.set(profile.name.normalize('NFC'), { uuid: profile.id, displayId: getDisplayId(profile) });
            }
        });
    }

    return managerMap;
}

function resolveRowManager(row: BatchRow, managerMap: Map<string, { uuid: string; displayId: string }>, fallbackUuid: string) {
    const raw = cleanString(getCell(row, MANAGER_KEYS));
    if (!raw) return { uuid: fallbackUuid, displayId: fallbackUuid };

    const found = raw.includes('@') ? managerMap.get(raw) : managerMap.get(raw.normalize('NFC'));
    return found || { uuid: fallbackUuid, displayId: fallbackUuid };
}

function buildPayload(row: BatchRow, companyId: string, managerUuid: string) {
    const name = cleanString(getCell(row, NAME_KEYS));
    const mobile = cleanString(getCell(row, MOBILE_KEYS));
    const budget = parseBudgetRange(row);

    if (!name) {
        return { error: '이름이 없어 건너뜀' };
    }

    return {
        payload: {
            company_id: companyId,
            manager_id: managerUuid,
            name,
            mobile,
            mobile_normalized: normalizeLeadPhone(mobile),
            source: cleanString(getCell(row, SOURCE_KEYS)),
            status: normalizeLeadStatus(getCell(row, STATUS_KEYS) || DEFAULT_FRANCHISE_LEAD_STATUS),
            grade: normalizeLeadGrade(getCell(row, GRADE_KEYS)),
            desired_region: cleanString(getCell(row, REGION_KEYS)),
            budget_min: budget.min,
            budget_max: budget.max,
            interested_brand: cleanString(getCell(row, BRAND_KEYS)),
            memo: cleanString(getCell(row, MEMO_KEYS)),
            next_contact_at: parseNullableDate(getCell(row, NEXT_CONTACT_KEYS)),
            data: {
                originalRow: row,
                budgetRaw: cleanString(getCell(row, BUDGET_KEYS))
            }
        }
    };
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const rows: BatchRow[] = Array.isArray(body.rows) ? body.rows : Array.isArray(body.main) ? body.main : [];
        const meta = body.meta || {};

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            meta.requesterId || meta.userId || meta.managerId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const scope = await resolveMutationScope(supabaseAdmin, requesterProfile, meta);
        if (scope.error) return scope.error;

        if (rows.length === 0) {
            return fail(400, 'VALIDATION_ERROR', 'No rows supplied');
        }

        const managerMap = await buildManagerMap(supabaseAdmin, rows, scope.companyId);
        const normalizedPhones = Array.from(new Set(
            rows.map(row => normalizeLeadPhone(getCell(row, MOBILE_KEYS))).filter(Boolean)
        ));

        const existingByPhone = new Map<string, any>();
        for (let i = 0; i < normalizedPhones.length; i += 200) {
            const chunk = normalizedPhones.slice(i, i + 200);
            const { data: existing, error } = await supabaseAdmin
                .from('franchise_leads')
                .select('*')
                .eq('company_id', scope.companyId)
                .in('mobile_normalized', chunk);

            if (error) throw error;
            existing?.forEach((lead: any) => existingByPhone.set(lead.mobile_normalized, lead));
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: Array<{ row: number; reason: string }> = [];

        for (const [index, row] of rows.entries()) {
            const manager = resolveRowManager(row, managerMap, scope.managerUuid);
            const built = buildPayload(row, scope.companyId, manager.uuid);

            if (built.error) {
                skipped++;
                errors.push({ row: index + 2, reason: built.error });
                continue;
            }

            const rowPayload = built.payload;
            if (!rowPayload) {
                skipped++;
                errors.push({ row: index + 2, reason: '행 데이터를 해석하지 못했습니다.' });
                continue;
            }

            const now = new Date().toISOString();
            const normalizedPhone = rowPayload.mobile_normalized;
            const existing = normalizedPhone ? existingByPhone.get(normalizedPhone) : null;

            if (existing) {
                const { error } = await supabaseAdmin
                    .from('franchise_leads')
                    .update({
                        ...rowPayload,
                        data: { ...(existing.data || {}), ...rowPayload.data },
                        updated_at: now
                    })
                    .eq('id', existing.id);

                if (error) {
                    skipped++;
                    errors.push({ row: index + 2, reason: error.message });
                    continue;
                }
                updated++;
            } else {
                const { error } = await supabaseAdmin
                    .from('franchise_leads')
                    .insert({
                        id: randomUUID(),
                        ...rowPayload,
                        created_at: now,
                        updated_at: now
                    });

                if (error) {
                    skipped++;
                    errors.push({ row: index + 2, reason: error.message });
                    continue;
                }
                created++;
                if (normalizedPhone) {
                    existingByPhone.set(normalizedPhone, { mobile_normalized: normalizedPhone });
                }
            }
        }

        return ok({ created, updated, skipped, errors });
    } catch (error) {
        console.error('Franchise leads batch POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to import franchise leads');
    }
}
