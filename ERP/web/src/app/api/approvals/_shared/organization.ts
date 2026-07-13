import {
    ApprovalInputError,
    hasOwn,
    parseBoolean,
    parseIntegerValue,
    parseOptionalText,
    parseOptionalUuid,
    parseRecordArray,
    parseRequiredText,
    parseRequiredUuid,
    type JsonRecord
} from './boundary';

type OrganizationPatch = {
    readonly units: readonly Record<string, unknown>[] | null;
    readonly memberships: readonly Record<string, unknown>[] | null;
    readonly roleAssignments: readonly Record<string, unknown>[] | null;
};

function optionalId(value: unknown, field: string): { readonly id?: string } {
    const id = parseOptionalUuid(value, field);
    return id ? { id } : {};
}

function optionalDate(value: unknown, field: string): string | null {
    const date = parseOptionalText(value, field, 10);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ApprovalInputError(field, `${field} must use YYYY-MM-DD`);
    }
    return date || null;
}

export type OrganizationUnitRow = {
    readonly id: string;
    readonly company_id: string;
    readonly parent_id: string | null;
    readonly code: string | null;
    readonly name: string;
    readonly description: string;
    readonly manager_profile_id: string | null;
    readonly sort_order: number;
    readonly active: boolean;
    readonly created_at: string;
    readonly updated_at: string;
};

export type OrganizationMembershipRow = {
    readonly id: string;
    readonly company_id: string;
    readonly unit_id: string;
    readonly profile_id: string;
    readonly job_title: string;
    readonly position_rank: number;
    readonly is_primary: boolean;
    readonly active: boolean;
    readonly starts_on: string | null;
    readonly ends_on: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type ApprovalRoleAssignmentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly role_key: string;
    readonly role_name: string;
    readonly profile_id: string;
    readonly unit_id: string | null;
    readonly active_from: string | null;
    readonly active_until: string | null;
    readonly active: boolean;
    readonly created_at: string;
    readonly updated_at: string;
};

export function organizationUnitView(row: OrganizationUnitRow) {
    return {
        id: row.id, companyId: row.company_id, parentId: row.parent_id, code: row.code,
        name: row.name, description: row.description, managerProfileId: row.manager_profile_id,
        sortOrder: row.sort_order, active: row.active, createdAt: row.created_at, updatedAt: row.updated_at
    };
}

export function organizationMembershipView(row: OrganizationMembershipRow) {
    return {
        id: row.id, companyId: row.company_id, unitId: row.unit_id, profileId: row.profile_id,
        jobTitle: row.job_title, positionRank: row.position_rank, primary: row.is_primary,
        active: row.active, startsOn: row.starts_on, endsOn: row.ends_on,
        createdAt: row.created_at, updatedAt: row.updated_at
    };
}

export function approvalRoleAssignmentView(row: ApprovalRoleAssignmentRow) {
    return {
        id: row.id, companyId: row.company_id, roleKey: row.role_key, roleName: row.role_name,
        profileId: row.profile_id, unitId: row.unit_id, activeFrom: row.active_from,
        activeUntil: row.active_until, active: row.active, createdAt: row.created_at, updatedAt: row.updated_at
    };
}

function unitRow(value: JsonRecord, companyId: string, actorId: string) {
    return {
        ...optionalId(value.id, 'units.id'),
        company_id: companyId,
        parent_id: parseOptionalUuid(value.parentId, 'units.parentId'),
        code: parseOptionalText(value.code, 'units.code', 50) || null,
        name: parseRequiredText(value.name, 'units.name', 120),
        description: parseOptionalText(value.description, 'units.description', 1_000),
        manager_profile_id: parseOptionalUuid(value.managerProfileId, 'units.managerProfileId'),
        sort_order: value.sortOrder === undefined ? 0 : parseIntegerValue(value.sortOrder, 'units.sortOrder', 0, 1_000_000),
        active: value.active === undefined ? true : parseBoolean(value.active, 'units.active'),
        created_by: actorId,
        updated_by: actorId,
        updated_at: new Date().toISOString()
    };
}

function membershipRow(value: JsonRecord, companyId: string) {
    return {
        ...optionalId(value.id, 'memberships.id'),
        company_id: companyId,
        unit_id: parseRequiredUuid(value.unitId, 'memberships.unitId'),
        profile_id: parseRequiredUuid(value.profileId, 'memberships.profileId'),
        job_title: parseOptionalText(value.jobTitle, 'memberships.jobTitle', 120),
        position_rank: value.positionRank === undefined
            ? 0
            : parseIntegerValue(value.positionRank, 'memberships.positionRank', 0, 1_000_000),
        is_primary: value.primary === undefined ? false : parseBoolean(value.primary, 'memberships.primary'),
        active: value.active === undefined ? true : parseBoolean(value.active, 'memberships.active'),
        starts_on: optionalDate(value.startsOn, 'memberships.startsOn'),
        ends_on: optionalDate(value.endsOn, 'memberships.endsOn'),
        updated_at: new Date().toISOString()
    };
}

function roleAssignmentRow(value: JsonRecord, companyId: string, actorId: string) {
    return {
        ...optionalId(value.id, 'roleAssignments.id'),
        company_id: companyId,
        role_key: parseRequiredText(value.roleKey, 'roleAssignments.roleKey', 80),
        role_name: parseRequiredText(value.roleName, 'roleAssignments.roleName', 120),
        profile_id: parseRequiredUuid(value.profileId, 'roleAssignments.profileId'),
        unit_id: parseOptionalUuid(value.unitId, 'roleAssignments.unitId'),
        active_from: parseOptionalText(value.activeFrom, 'roleAssignments.activeFrom', 40) || null,
        active_until: parseOptionalText(value.activeUntil, 'roleAssignments.activeUntil', 40) || null,
        active: value.active === undefined ? true : parseBoolean(value.active, 'roleAssignments.active'),
        created_by: actorId,
        updated_at: new Date().toISOString()
    };
}

export function parseOrganizationPatch(body: JsonRecord, companyId: string, actorId: string): OrganizationPatch {
    return {
        units: hasOwn(body, 'units')
            ? parseRecordArray(body.units, 'units', 500).map(value => unitRow(value, companyId, actorId))
            : null,
        memberships: hasOwn(body, 'memberships')
            ? parseRecordArray(body.memberships, 'memberships', 1_000).map(value => membershipRow(value, companyId))
            : null,
        roleAssignments: hasOwn(body, 'roleAssignments')
            ? parseRecordArray(body.roleAssignments, 'roleAssignments', 500)
                .map(value => roleAssignmentRow(value, companyId, actorId))
            : null
    };
}
