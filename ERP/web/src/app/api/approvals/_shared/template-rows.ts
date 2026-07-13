import { isRecord } from './boundary';

export type ApprovalTemplateRow = {
    readonly id: string;
    readonly company_id: string;
    readonly name: string;
    readonly description: string;
    readonly template_key: string;
    readonly document_type: string;
    readonly category: string;
    readonly security_level: string;
    readonly retention_years: number;
    readonly current_version_id: string | null;
    readonly active: boolean;
    readonly deleted_at: string | null;
    readonly created_by: string | null;
    readonly updated_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type ApprovalTemplateVersionRow = {
    readonly id: string;
    readonly company_id: string;
    readonly template_id: string;
    readonly version_number: number;
    readonly status: string;
    readonly name: string;
    readonly description: string;
    readonly category: string;
    readonly security_level: string;
    readonly retention_years: number;
    readonly fields: unknown;
    readonly created_by: string | null;
    readonly published_at: string | null;
    readonly created_at: string;
};

export type ApprovalTemplateStepRow = {
    readonly id: string;
    readonly template_version_id: string;
    readonly step_order: number;
    readonly step_key: string;
    readonly name: string;
    readonly action_kind: string;
    readonly completion_mode: string;
    readonly target_type: string;
    readonly target_config: unknown;
    readonly due_hours: number | null;
};

export function templateView(row: ApprovalTemplateRow) {
    return {
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        description: row.description,
        templateKey: row.template_key,
        documentType: row.document_type,
        category: row.category,
        securityLevel: row.security_level,
        retentionYears: row.retention_years,
        currentVersionId: row.current_version_id,
        active: row.active,
        deletedAt: row.deleted_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export function templateVersionView(row: ApprovalTemplateVersionRow, steps: readonly ApprovalTemplateStepRow[]) {
    return {
        id: row.id,
        companyId: row.company_id,
        templateId: row.template_id,
        version: row.version_number,
        status: row.status,
        name: row.name,
        description: row.description,
        category: row.category,
        securityLevel: row.security_level,
        retentionYears: row.retention_years,
        fields: row.fields,
        steps: steps.map(step => ({
            id: step.id,
            order: step.step_order,
            key: step.step_key,
            label: step.name,
            action: step.action_kind,
            mode: step.completion_mode,
            target: templateStepTargetView(step),
            dueHours: step.due_hours
        })),
        createdBy: row.created_by,
        publishedAt: row.published_at,
        createdAt: row.created_at
    };
}

function templateStepTargetView(step: ApprovalTemplateStepRow) {
    const config = isRecord(step.target_config) ? step.target_config : {};
    switch (step.target_type) {
        case 'profiles':
            return {
                kind: 'profiles',
                profileIds: Array.isArray(config.profile_ids)
                    ? config.profile_ids.filter((value): value is string => typeof value === 'string')
                    : []
            };
        case 'role':
            return {
                kind: 'role',
                roleKey: typeof config.role_key === 'string' ? config.role_key : '',
                unitId: typeof config.unit_id === 'string' ? config.unit_id : null
            };
        case 'unit_manager':
        case 'unit_members':
            return { kind: step.target_type, unitId: typeof config.unit_id === 'string' ? config.unit_id : '' };
        case 'author_manager':
            return { kind: 'author_manager' };
        default:
            return { kind: step.target_type };
    }
}
