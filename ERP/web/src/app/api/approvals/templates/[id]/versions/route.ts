import { fail, ok } from '@/lib/api-response';
import { resolveApprovalContext, requireApprovalManager } from '../../../_shared/access';
import {
    parseIntegerValue,
    parseOptionalText,
    parseRequiredText,
    parseRequiredUuid,
    readJsonRecord
} from '../../../_shared/boundary';
import { approvalErrorResponse, ApprovalRouteError, throwDatabaseError } from '../../../_shared/errors';
import {
    templateVersionView,
    type ApprovalTemplateStepRow,
    type ApprovalTemplateRow,
    type ApprovalTemplateVersionRow
} from '../../../_shared/template-rows';
import { parseTemplateDefinition, type TemplateStepWire } from '../../../_shared/template';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };
const VERSION_SELECT = 'id, company_id, template_id, version_number, status, name, description, category, security_level, retention_years, fields, created_by, published_at, created_at';
const STEP_SELECT = 'id, template_version_id, step_order, step_key, name, action_kind, completion_mode, target_type, target_config, due_hours';
const TEMPLATE_SELECT = 'id, company_id, template_key, name, description, document_type, category, security_level, retention_years, current_version_id, active, deleted_at, created_by, updated_by, created_at, updated_at';
const VERSION_STATUSES = ['draft', 'published', 'retired'] as const;

function versionStatus(value: unknown): (typeof VERSION_STATUSES)[number] {
    const parsed = parseRequiredText(value, 'status', 20);
    const status = VERSION_STATUSES.find(candidate => candidate === parsed);
    if (!status) throw new ApprovalRouteError(400, 'VALIDATION_ERROR', 'status is not supported');
    return status;
}

function targetConfig(step: TemplateStepWire): Record<string, unknown> {
    switch (step.target.kind) {
        case 'profiles': return { profile_ids: step.target.profileIds };
        case 'role': return { role_key: step.target.roleKey, unit_id: step.target.unitId };
        case 'unit_manager':
        case 'unit_members': return { unit_id: step.target.unitId };
        case 'author_manager': return {};
        default: return assertNever(step.target);
    }
}

function assertNever(value: never): never {
    throw new TypeError(`Unsupported template step target: ${JSON.stringify(value)}`);
}

async function templateForCompany(
    context: Awaited<ReturnType<typeof resolveApprovalContext>>,
    templateId: string
): Promise<ApprovalTemplateRow | null> {
    const { data, error } = await context.supabase
        .from('approval_templates')
        .select(TEMPLATE_SELECT)
        .eq('id', templateId)
        .eq('company_id', context.companyId)
        .maybeSingle<ApprovalTemplateRow>();
    throwDatabaseError(error);
    return data;
}

export async function GET(request: Request, routeContext: RouteContext) {
    try {
        const context = await resolveApprovalContext(request);
        const templateId = parseRequiredUuid((await routeContext.params).id, 'id');
        if (!await templateForCompany(context, templateId)) return fail(404, 'NOT_FOUND', 'Approval template not found');
        const { data, error } = await context.supabase
            .from('approval_template_versions')
            .select(VERSION_SELECT)
            .eq('company_id', context.companyId)
            .eq('template_id', templateId)
            .order('version_number', { ascending: false })
            .returns<ApprovalTemplateVersionRow[]>();
        throwDatabaseError(error);
        const versions = data || [];
        if (versions.length === 0) return ok({ versions: [] });
        const { data: stepRows, error: stepError } = await context.supabase
            .from('approval_template_steps')
            .select(STEP_SELECT)
            .eq('company_id', context.companyId)
            .in('template_version_id', versions.map(version => version.id))
            .order('step_order', { ascending: true })
            .returns<ApprovalTemplateStepRow[]>();
        throwDatabaseError(stepError);
        return ok({
            versions: versions.map(version => templateVersionView(
                version,
                (stepRows || []).filter(step => step.template_version_id === version.id)
            ))
        });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval template versions');
    }
}

export async function POST(request: Request, routeContext: RouteContext) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        requireApprovalManager(context);
        const templateId = parseRequiredUuid((await routeContext.params).id, 'id');
        const template = await templateForCompany(context, templateId);
        if (!template) return fail(404, 'NOT_FOUND', 'Approval template not found');
        const definition = parseTemplateDefinition(body);
        const status = body.status === undefined ? 'draft' : versionStatus(body.status);
        const versionName = parseOptionalText(body.name, 'name', 120) || template.name;
        const versionDescription = body.description === undefined
            ? template.description
            : parseOptionalText(body.description, 'description', 2_000);
        const versionCategory = parseOptionalText(body.category, 'category', 80) || template.category;
        const versionSecurityLevel = parseOptionalText(body.securityLevel, 'securityLevel', 20) || template.security_level;
        const versionRetentionYears = body.retentionYears === undefined
            ? template.retention_years
            : parseIntegerValue(body.retentionYears, 'retentionYears', 1, 30);
        const stepInserts = definition.steps.map(step => ({
            step_order: step.order,
            step_key: step.key,
            name: step.label,
            action_kind: step.action,
            completion_mode: step.mode,
            target_type: step.target.kind,
            target_config: targetConfig(step)
        }));
        const { data: versionId, error: rpcError } = await context.supabase.rpc('create_company_approval_template_version', {
            p_actor_profile_id: context.requester.id,
            p_category: versionCategory,
            p_company_id: context.companyId,
            p_description: versionDescription,
            p_fields: definition.fields,
            p_name: versionName,
            p_retention_years: versionRetentionYears,
            p_security_level: versionSecurityLevel,
            p_status: status,
            p_steps: stepInserts,
            p_template_id: templateId
        });
        throwDatabaseError(rpcError);
        if (typeof versionId !== 'string') throw new ApprovalRouteError(500, 'INTERNAL_ERROR', 'Approval template version was not returned');
        const [versionResult, stepsResult] = await Promise.all([
            context.supabase.from('approval_template_versions').select(VERSION_SELECT)
                .eq('id', versionId).eq('company_id', context.companyId).single<ApprovalTemplateVersionRow>(),
            context.supabase.from('approval_template_steps').select(STEP_SELECT)
                .eq('template_version_id', versionId).eq('company_id', context.companyId)
                .order('step_order', { ascending: true }).returns<ApprovalTemplateStepRow[]>()
        ]);
        throwDatabaseError(versionResult.error);
        throwDatabaseError(stepsResult.error);
        if (!versionResult.data) throw new ApprovalRouteError(500, 'INTERNAL_ERROR', 'Approval template version was not returned');
        return ok({ version: templateVersionView(versionResult.data, stepsResult.data || []) }, 201);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to create approval template version');
    }
}
