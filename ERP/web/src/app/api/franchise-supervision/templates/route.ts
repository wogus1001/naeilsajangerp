import { fail, ok } from '@/lib/api-response';
import {
    cleanString,
    ensureCanManageSupervision,
    getFirst,
    isMissingSupervisionSchemaError,
    readJsonBody,
    resolveSupervisionAuth,
    resolveSupervisionCompanyId
} from '@/lib/franchise-supervision-api';
import { normalizeTemplateItems } from '@/lib/franchise-supervision';

export const dynamic = 'force-dynamic';

async function readTemplateScope(request: Request) {
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
        const scope = await readTemplateScope(request);
        if (!scope.ok) return scope.response;

        const name = cleanString(getFirst(scope.body, ['name']));
        if (!name) return fail(400, 'VALIDATION_ERROR', '템플릿명을 입력해주세요.');
        const items = normalizeTemplateItems(getFirst(scope.body, ['inspectionItems', 'inspection_items']));

        const now = new Date().toISOString();
        const { error: deactivateError } = await scope.auth.supabaseAdmin
            .from('franchise_supervision_report_templates')
            .update({ active: false, updated_by: scope.auth.requester.id, updated_at: now })
            .eq('company_id', scope.companyId)
            .eq('active', true);
        if (deactivateError) throw deactivateError;

        const { data, error } = await scope.auth.supabaseAdmin
            .from('franchise_supervision_report_templates')
            .insert({
                company_id: scope.companyId,
                name,
                description: cleanString(getFirst(scope.body, ['description'])) || null,
                inspection_items: items,
                active: true,
                created_by: scope.auth.requester.id,
                updated_by: scope.auth.requester.id
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (error) throw error;
        return ok({ id: data.id }, 201);
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 v2 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_v2_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision template POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '점검 템플릿을 저장하지 못했습니다.');
    }
}
