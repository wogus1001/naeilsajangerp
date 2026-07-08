import { fail, ok } from '@/lib/api-response';
import {
    generateTemporaryOwnerPassword,
    hashOwnerPassword,
    normalizeOwnerLoginId,
    type OwnerAccountRow
} from '@/lib/franchise-owner-auth';
import { cleanOwnerText, isOwnerRecord } from '@/lib/franchise-owner-portal';
import {
    fetchOwnerPortalLocation,
    isMissingOwnerPortalSchemaError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

type OwnerAccountPayload = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly loginId: string;
    readonly ownerName: string;
    readonly ownerPhone: string;
    readonly status: string;
    readonly temporaryPassword: boolean;
};

function toOwnerAccountPayload(account: OwnerAccountRow): OwnerAccountPayload {
    return {
        id: account.id,
        companyId: account.company_id,
        locationId: account.location_id,
        loginId: account.login_id,
        ownerName: account.owner_name || '',
        ownerPhone: account.owner_phone || '',
        status: account.status || 'active',
        temporaryPassword: account.temporary_password === true
    };
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;

        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_accounts')
            .select('id, company_id, location_id, login_id, owner_name, owner_phone, password_hash, status, temporary_password')
            .eq('company_id', companyScope.scope.companyId)
            .order('created_at', { ascending: false })
            .returns<OwnerAccountRow[]>();
        if (error) throw error;
        return ok({ accounts: (data || []).map(toOwnerAccountPayload) });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return ok({ accounts: [], schemaReady: false });
        console.error('Owner portal accounts GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 계정 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '점주 계정을 발급할 권한이 없습니다.');
        }
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '점주 계정 정보를 입력해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            cleanOwnerText(body.companyId),
            cleanOwnerText(body.companyName)
        );
        if (!companyScope.ok) return companyScope.response;
        const locationId = cleanOwnerText(body.locationId);
        const location = await fetchOwnerPortalLocation(authResult.auth.supabaseAdmin, companyScope.scope.companyId, locationId);
        if (!location.ok) return location.response;

        const loginId = cleanOwnerText(body.loginId) || `owner-${location.location.id.slice(0, 8)}`;
        const normalizedLoginId = normalizeOwnerLoginId(loginId);
        const temporaryPassword = generateTemporaryOwnerPassword();
        const passwordHash = await hashOwnerPassword(temporaryPassword);
        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_accounts')
            .upsert({
                company_id: companyScope.scope.companyId,
                location_id: location.location.id,
                login_id: loginId,
                login_id_normalized: normalizedLoginId,
                owner_name: cleanOwnerText(body.ownerName) || null,
                owner_phone: cleanOwnerText(body.ownerPhone) || null,
                password_hash: passwordHash,
                status: 'active',
                temporary_password: true,
                created_by: authResult.auth.requester.id,
                updated_by: authResult.auth.requester.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'company_id,location_id' })
            .select('id, company_id, location_id, login_id, owner_name, owner_phone, password_hash, status, temporary_password')
            .single<OwnerAccountRow>();
        if (error) throw error;
        return ok({ account: toOwnerAccountPayload(data), temporaryPassword }, 201);
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '점주 포털 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_portal_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Owner portal accounts POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 계정을 발급하지 못했습니다.');
    }
}

export async function PUT(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '점주 계정을 수정할 권한이 없습니다.');
        }
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '점주 계정 정보가 필요합니다.');
        const accountId = cleanOwnerText(body.id);
        const action = cleanOwnerText(body.action);
        if (!accountId) return fail(400, 'VALIDATION_ERROR', '점주 계정을 선택해주세요.');

        const { data: account, error: accountError } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_accounts')
            .select('id, company_id, location_id, login_id, owner_name, owner_phone, password_hash, status, temporary_password')
            .eq('id', accountId)
            .maybeSingle<OwnerAccountRow>();
        if (accountError) throw accountError;
        if (!account) return fail(404, 'NOT_FOUND', '점주 계정을 찾을 수 없습니다.');
        if (authResult.auth.requester.role !== 'admin' && authResult.auth.requester.company_id !== account.company_id) {
            return fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.');
        }

        const temporaryPassword = action === 'reset_password' ? generateTemporaryOwnerPassword() : '';
        const patch = action === 'reset_password'
            ? { password_hash: await hashOwnerPassword(temporaryPassword), temporary_password: true, status: 'active' }
            : { status: action === 'suspend' ? 'suspended' : 'active' };
        const { error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_accounts')
            .update({ ...patch, updated_by: authResult.auth.requester.id, updated_at: new Date().toISOString() })
            .eq('id', account.id);
        if (error) throw error;
        return ok({ success: true, temporaryPassword });
    } catch (error) {
        console.error('Owner portal accounts PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 계정을 수정하지 못했습니다.');
    }
}
