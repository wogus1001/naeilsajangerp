import { fail, ok } from '@/lib/api-response';
import {
    cleanString,
    ensureCanManageSupervision,
    fetchLocationInCompany,
    getFirst,
    isMissingSupervisionSchemaError,
    readJsonBody,
    resolveProfileInCompany,
    resolveSupervisionAuth,
    resolveSupervisionCompanyId
} from '@/lib/franchise-supervision-api';

export const dynamic = 'force-dynamic';

async function readMutationScope(request: Request) {
    const body = await readJsonBody(request);
    const authResult = await resolveSupervisionAuth(request);
    if (!authResult.ok) return { ok: false as const, response: authResult.response };
    const guard = ensureCanManageSupervision(authResult.auth.requester);
    if (guard) return { ok: false as const, response: guard };

    const companyScope = await resolveSupervisionCompanyId(
        authResult.auth,
        getFirst(body, ['companyId', 'company_id']),
        getFirst(body, ['companyName', 'company'])
    );
    if (!companyScope.ok) return { ok: false as const, response: companyScope.response };
    return { ok: true as const, auth: authResult.auth, body, companyId: companyScope.companyId };
}

export async function POST(request: Request) {
    try {
        const scope = await readMutationScope(request);
        if (!scope.ok) return scope.response;

        const locationId = cleanString(getFirst(scope.body, ['locationId', 'location_id']));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', '운영점을 선택해주세요.');
        const location = await fetchLocationInCompany(scope.auth.supabaseAdmin, locationId, scope.companyId);
        if (!location.ok) return location.response;

        const supervisor = await resolveProfileInCompany({
            supabaseAdmin: scope.auth.supabaseAdmin,
            rawProfileId: getFirst(scope.body, ['supervisorProfileId', 'supervisor_profile_id']),
            companyId: scope.companyId,
            message: 'SV 담당자를 선택해주세요.'
        });
        if (!supervisor.ok) return supervisor.response;

        const { error: deactivateError } = await scope.auth.supabaseAdmin
            .from('franchise_supervisor_assignments')
            .update({ active: false, ended_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
            .eq('company_id', scope.companyId)
            .eq('location_id', location.location.id)
            .eq('active', true);
        if (deactivateError) throw deactivateError;

        const { data, error } = await scope.auth.supabaseAdmin
            .from('franchise_supervisor_assignments')
            .insert({
                company_id: scope.companyId,
                location_id: location.location.id,
                supervisor_profile_id: supervisor.profileId,
                region_scope: cleanString(getFirst(scope.body, ['regionScope', 'region_scope'])) || null,
                memo: cleanString(getFirst(scope.body, ['memo'])) || null,
                active: true,
                assigned_at: cleanString(getFirst(scope.body, ['assignedAt', 'assigned_at'])) || new Date().toISOString().slice(0, 10),
                created_by: scope.auth.requester.id,
                updated_by: scope.auth.requester.id
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (error) throw error;
        return ok({ id: data.id }, 201);
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision assignment POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'SV 배정을 저장하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const scope = await readMutationScope(request);
        if (!scope.ok) return scope.response;

        const id = cleanString(getFirst(scope.body, ['id']));
        if (!id) return fail(400, 'VALIDATION_ERROR', '배정 ID가 필요합니다.');

        const { data: existing, error: findError } = await scope.auth.supabaseAdmin
            .from('franchise_supervisor_assignments')
            .select('id, company_id, location_id')
            .eq('id', id)
            .maybeSingle<{ readonly id: string; readonly company_id: string; readonly location_id: string }>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', 'SV 배정을 찾을 수 없습니다.');
        if (existing.company_id !== scope.companyId) return fail(403, 'FORBIDDEN', 'SV 배정의 회사 범위가 일치하지 않습니다.');

        const supervisor = await resolveProfileInCompany({
            supabaseAdmin: scope.auth.supabaseAdmin,
            rawProfileId: getFirst(scope.body, ['supervisorProfileId', 'supervisor_profile_id']),
            companyId: scope.companyId,
            message: 'SV 담당자를 선택해주세요.'
        });
        if (!supervisor.ok) return supervisor.response;

        const active = getFirst(scope.body, ['active']) !== false;
        if (active) {
            const { error: deactivateError } = await scope.auth.supabaseAdmin
                .from('franchise_supervisor_assignments')
                .update({ active: false, ended_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
                .eq('company_id', scope.companyId)
                .eq('location_id', existing.location_id)
                .neq('id', id)
                .eq('active', true);
            if (deactivateError) throw deactivateError;
        }

        const { error } = await scope.auth.supabaseAdmin
            .from('franchise_supervisor_assignments')
            .update({
                supervisor_profile_id: supervisor.profileId,
                region_scope: cleanString(getFirst(scope.body, ['regionScope', 'region_scope'])) || null,
                memo: cleanString(getFirst(scope.body, ['memo'])) || null,
                active,
                ended_at: active ? null : new Date().toISOString().slice(0, 10),
                updated_by: scope.auth.requester.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision assignment PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', 'SV 배정을 수정하지 못했습니다.');
    }
}

export async function DELETE(request: Request) {
    try {
        const authResult = await resolveSupervisionAuth(request);
        if (!authResult.ok) return authResult.response;
        const guard = ensureCanManageSupervision(authResult.auth.requester);
        if (guard) return guard;

        const id = new URL(request.url).searchParams.get('id');
        if (!id) return fail(400, 'VALIDATION_ERROR', '배정 ID가 필요합니다.');

        const { data: existing, error: findError } = await authResult.auth.supabaseAdmin
            .from('franchise_supervisor_assignments')
            .select('id, company_id')
            .eq('id', id)
            .maybeSingle<{ readonly id: string; readonly company_id: string | null }>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', 'SV 배정을 찾을 수 없습니다.');
        if (!authResult.auth.requester.company_id && authResult.auth.requester.role !== 'admin') {
            return fail(403, 'FORBIDDEN', 'SV 배정의 회사 범위가 일치하지 않습니다.');
        }
        if (authResult.auth.requester.role !== 'admin' && existing.company_id !== authResult.auth.requester.company_id) {
            return fail(403, 'FORBIDDEN', 'SV 배정의 회사 범위가 일치하지 않습니다.');
        }

        const { error } = await authResult.auth.supabaseAdmin
            .from('franchise_supervisor_assignments')
            .update({ active: false, ended_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString(), updated_by: authResult.auth.requester.id })
            .eq('id', id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision assignment DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'SV 배정을 해제하지 못했습니다.');
    }
}
