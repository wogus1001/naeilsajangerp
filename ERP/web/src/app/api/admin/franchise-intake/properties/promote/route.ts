import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildFranchisePropertyPromotionDraft,
    type FranchisePropertyPromotionRow
} from '@/lib/franchise-property-promotion';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type PromotionPayload = {
    readonly propertyId: string;
    readonly targetCompanyId: string | null;
    readonly managerId: string | null;
    readonly requesterId: string | null;
};

type CompanyRow = {
    readonly id: string;
};

type ManagerRow = {
    readonly id: string;
    readonly company_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function parsePayload(value: unknown): PromotionPayload | null {
    if (!isRecord(value)) return null;
    const propertyId = readString(value, 'propertyId');
    if (!propertyId) return null;
    return {
        propertyId,
        targetCompanyId: readString(value, 'targetCompanyId'),
        managerId: readString(value, 'managerId'),
        requesterId: readString(value, 'requesterId')
    };
}

function getErrorCode(error: unknown): string {
    if (!isRecord(error)) return '';
    const code = error.code;
    return typeof code === 'string' ? code : '';
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = parsePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid promotion payload');

        const requester = await getRequesterProfile(supabaseAdmin, request, payload.requesterId);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { data: property, error: propertyError } = await supabaseAdmin
            .from('properties')
            .select('id, company_id, manager_id, name, status, operation_type, address, created_at, updated_at, data')
            .eq('id', payload.propertyId)
            .maybeSingle<FranchisePropertyPromotionRow>();

        if (propertyError) throw propertyError;
        if (!property) return fail(404, 'NOT_FOUND', 'Property not found');

        const targetCompanyId = payload.targetCompanyId || property.company_id;
        if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', 'Target company is required');

        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('id', targetCompanyId)
            .maybeSingle<CompanyRow>();
        if (companyError) throw companyError;
        if (!company) return fail(404, 'NOT_FOUND', 'Target company not found');

        let selectedManagerId: string | null = null;
        if (payload.managerId) {
            const { data: manager, error: managerError } = await supabaseAdmin
                .from('profiles')
                .select('id, company_id')
                .eq('id', payload.managerId)
                .maybeSingle<ManagerRow>();
            if (managerError) throw managerError;
            if (!manager || manager.company_id !== targetCompanyId) {
                return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
            }
            selectedManagerId = manager.id;
        } else if (property.company_id === targetCompanyId) {
            selectedManagerId = property.manager_id;
        }

        const { data: duplicate, error: duplicateError } = await supabaseAdmin
            .from('franchise_locations')
            .select('id')
            .eq('company_id', targetCompanyId)
            .eq('source_property_id', property.id)
            .maybeSingle<{ readonly id: string }>();

        if (duplicateError) throw duplicateError;
        if (duplicate) {
            return fail(409, 'VALIDATION_ERROR', '이미 출점 후보지로 반영된 물건입니다.');
        }

        const draft = buildFranchisePropertyPromotionDraft(
            { ...property, manager_id: selectedManagerId },
            targetCompanyId,
            selectedManagerId
        );

        const { data: location, error: insertError } = await supabaseAdmin
            .from('franchise_locations')
            .insert({
                ...draft,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            if (getErrorCode(insertError) === '23505') {
                return fail(409, 'VALIDATION_ERROR', '이미 출점 후보지로 반영된 물건입니다.');
            }
            throw insertError;
        }

        return ok({ location }, 201);
    } catch (error) {
        console.error('Admin property promotion POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to promote property to franchise location');
    }
}
