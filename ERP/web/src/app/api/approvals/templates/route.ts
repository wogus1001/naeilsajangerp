import { fail, ok } from '@/lib/api-response';
import { resolveApprovalContext, requireApprovalManager } from '../_shared/access';
import {
    hasOwn,
    parseBoolean,
    parseIntegerValue,
    parseOptionalText,
    parseRequiredText,
    parseRequiredUuid,
    readJsonRecord
} from '../_shared/boundary';
import { approvalErrorResponse, ApprovalRouteError, throwDatabaseError } from '../_shared/errors';
import {
    templateView,
    type ApprovalTemplateRow
} from '../_shared/template-rows';
import { parseTemplateDefinition, templateStepInserts } from '../_shared/template';

export const dynamic = 'force-dynamic';

const TEMPLATE_SELECT = 'id, company_id, template_key, name, description, document_type, category, security_level, retention_years, current_version_id, active, deleted_at, created_by, updated_by, created_at, updated_at';
const SECURITY_LEVELS = ['company', 'restricted', 'confidential'] as const;

function securityLevel(value: unknown): (typeof SECURITY_LEVELS)[number] {
    const parsed = parseRequiredText(value, 'securityLevel', 20);
    const level = SECURITY_LEVELS.find(candidate => candidate === parsed);
    if (!level) throw new ApprovalRouteError(400, 'VALIDATION_ERROR', 'securityLevel is not supported');
    return level;
}

export async function GET(request: Request) {
    try {
        const context = await resolveApprovalContext(request);
        const { searchParams } = new URL(request.url);
        let query = context.supabase
            .from('approval_templates')
            .select(TEMPLATE_SELECT)
            .eq('company_id', context.companyId)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });
        const category = parseOptionalText(searchParams.get('category'), 'category', 80);
        if (category) query = query.eq('category', category);
        if (searchParams.get('includeInactive') !== 'true' ||
            (!context.approvalAdmin && context.requester.role !== 'admin' && context.requester.role !== 'manager')) {
            query = query.eq('active', true);
        }
        const { data, error } = await query.returns<ApprovalTemplateRow[]>();
        throwDatabaseError(error);
        return ok({ templates: (data || []).map(templateView) });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval templates');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        requireApprovalManager(context);
        const name = parseRequiredText(body.name, 'name', 120);
        const description = parseOptionalText(body.description, 'description', 2_000);
        const category = parseOptionalText(body.category, 'category', 80) || 'general';
        const security = body.securityLevel === undefined ? 'company' : securityLevel(body.securityLevel);
        const retentionYears = body.retentionYears === undefined
            ? 5
            : parseIntegerValue(body.retentionYears, 'retentionYears', 1, 30);
        if (hasOwn(body, 'fields') || hasOwn(body, 'steps')) {
            const definition = parseTemplateDefinition(body);
            const status = parseOptionalText(body.status, 'status', 20) || 'draft';
            if (!['draft', 'published', 'retired'].includes(status)) {
                return fail(400, 'VALIDATION_ERROR', 'status is not supported');
            }
            const { data: templateId, error: rpcError } = await context.supabase.rpc('create_company_approval_template_with_version', {
                p_actor_profile_id: context.requester.id,
                p_category: category,
                p_company_id: context.companyId,
                p_description: description,
                p_fields: definition.fields,
                p_name: name,
                p_retention_years: retentionYears,
                p_security_level: security,
                p_status: status,
                p_steps: templateStepInserts(definition.steps)
            });
            throwDatabaseError(rpcError);
            const { data, error } = await context.supabase.from('approval_templates').select(TEMPLATE_SELECT)
                .eq('id', templateId).eq('company_id', context.companyId).single<ApprovalTemplateRow>();
            throwDatabaseError(error);
            if (!data) throw new ApprovalRouteError(500, 'INTERNAL_ERROR', 'Approval template was not returned');
            return ok({ template: templateView(data) }, 201);
        }
        const now = new Date().toISOString();
        const { data, error } = await context.supabase
            .from('approval_templates')
            .insert({
                company_id: context.companyId,
                template_key: parseOptionalText(body.templateKey, 'templateKey', 100) || undefined,
                name,
                description,
                document_type: parseOptionalText(body.documentType, 'documentType', 80) || 'general',
                category,
                security_level: security,
                retention_years: retentionYears,
                active: body.active === undefined ? true : parseBoolean(body.active, 'active'),
                created_by: context.requester.id,
                updated_by: context.requester.id,
                created_at: now,
                updated_at: now
            })
            .select(TEMPLATE_SELECT)
            .single<ApprovalTemplateRow>();
        throwDatabaseError(error);
        if (!data) throw new ApprovalRouteError(500, 'INTERNAL_ERROR', 'Approval template was not returned');
        return ok({ template: templateView(data) }, 201);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to create approval template');
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        requireApprovalManager(context);
        const id = parseRequiredUuid(body.id, 'id');
        const updates: Record<string, unknown> = {
            updated_by: context.requester.id,
            updated_at: new Date().toISOString()
        };
        if (hasOwn(body, 'name')) updates.name = parseRequiredText(body.name, 'name', 120);
        if (hasOwn(body, 'description')) updates.description = parseOptionalText(body.description, 'description', 2_000);
        if (hasOwn(body, 'documentType')) updates.document_type = parseRequiredText(body.documentType, 'documentType', 80);
        if (hasOwn(body, 'category')) updates.category = parseRequiredText(body.category, 'category', 80);
        if (hasOwn(body, 'securityLevel')) updates.security_level = securityLevel(body.securityLevel);
        if (hasOwn(body, 'retentionYears')) {
            updates.retention_years = parseIntegerValue(body.retentionYears, 'retentionYears', 1, 30);
        }
        if (hasOwn(body, 'active')) updates.active = parseBoolean(body.active, 'active');
        if (Object.keys(updates).length === 2) return fail(400, 'VALIDATION_ERROR', 'No template changes were provided');
        const { data, error } = await context.supabase
            .from('approval_templates')
            .update(updates)
            .eq('id', id)
            .eq('company_id', context.companyId)
            .select(TEMPLATE_SELECT)
            .maybeSingle<ApprovalTemplateRow>();
        throwDatabaseError(error);
        if (!data) return fail(404, 'NOT_FOUND', 'Approval template not found');
        return ok({ template: templateView(data) });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to update approval template');
    }
}
