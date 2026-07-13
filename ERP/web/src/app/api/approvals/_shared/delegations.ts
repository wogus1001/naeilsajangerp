import {
    ApprovalInputError,
    parseBoolean,
    parseOptionalText,
    parseOptionalUuid,
    parseRequiredText,
    parseRequiredUuid,
    type JsonRecord
} from './boundary';

export type ApprovalDelegationRow = {
    readonly id: string;
    readonly company_id: string;
    readonly delegator_profile_id: string;
    readonly delegate_profile_id: string;
    readonly action_scope: readonly string[];
    readonly starts_at: string;
    readonly ends_at: string;
    readonly reason: string;
    readonly active: boolean;
    readonly created_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

const ACTION_SCOPES = ['approval', 'agreement', 'acknowledgement'] as const;

function isoDateTime(value: unknown, field: string): string {
    const text = parseRequiredText(value, field, 40);
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) throw new ApprovalInputError(field, `${field} must be an ISO date-time`);
    return parsed.toISOString();
}

function actionScope(value: unknown): readonly (typeof ACTION_SCOPES)[number][] {
    if (value === undefined) return ACTION_SCOPES;
    if (!Array.isArray(value) || value.length === 0 || value.length > ACTION_SCOPES.length) {
        throw new ApprovalInputError('actionScope', 'actionScope must be a non-empty array');
    }
    const normalized = value.map(item => {
        const text = parseRequiredText(item, 'actionScope', 32);
        const scope = ACTION_SCOPES.find(candidate => candidate === text);
        if (!scope) throw new ApprovalInputError('actionScope', 'actionScope contains an unsupported value');
        return scope;
    });
    return [...new Set(normalized)];
}

export function parseDelegationInsert(body: JsonRecord, companyId: string, requesterId: string) {
    const delegatorProfileId = parseOptionalUuid(body.delegatorProfileId, 'delegatorProfileId') || requesterId;
    const delegateProfileId = parseRequiredUuid(body.delegateProfileId, 'delegateProfileId');
    if (delegatorProfileId === delegateProfileId) {
        throw new ApprovalInputError('delegateProfileId', 'Self delegation is not allowed');
    }
    const startsAt = isoDateTime(body.startsAt, 'startsAt');
    const endsAt = isoDateTime(body.endsAt, 'endsAt');
    if (endsAt <= startsAt) throw new ApprovalInputError('endsAt', 'endsAt must be after startsAt');
    return {
        company_id: companyId,
        delegator_profile_id: delegatorProfileId,
        delegate_profile_id: delegateProfileId,
        action_scope: actionScope(body.actionScope),
        starts_at: startsAt,
        ends_at: endsAt,
        reason: parseOptionalText(body.reason, 'reason', 1_000),
        active: body.active === undefined ? true : parseBoolean(body.active, 'active'),
        created_by: requesterId,
        updated_at: new Date().toISOString()
    };
}

export function delegationView(row: ApprovalDelegationRow) {
    return {
        id: row.id,
        companyId: row.company_id,
        delegatorProfileId: row.delegator_profile_id,
        delegateProfileId: row.delegate_profile_id,
        actionScope: row.action_scope,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        reason: row.reason,
        active: row.active,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
