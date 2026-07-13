import {
    parseTemplateFields,
    parseTemplateSteps,
    type StepTargetSelector,
    type TemplateField,
    type TemplateStep
} from '@/lib/approvals';
import { ApprovalInputError, type JsonRecord } from './boundary';

type StepTargetWire =
    | { readonly kind: 'profiles'; readonly profileIds: readonly string[] }
    | { readonly kind: 'role'; readonly roleKey: string; readonly unitId: string | null }
    | { readonly kind: 'unit_manager'; readonly unitId: string }
    | { readonly kind: 'unit_members'; readonly unitId: string }
    | { readonly kind: 'author_manager' };

export type TemplateStepWire = Omit<TemplateStep, 'target'> & {
    readonly target: StepTargetWire;
};

export type TemplateDefinition = {
    readonly fields: readonly TemplateField[];
    readonly steps: readonly TemplateStepWire[];
};

function issueMessage(field: string, issues: readonly { readonly index: number; readonly message: string }[]): string {
    const first = issues[0];
    return first ? `${field}[${first.index}]: ${first.message}` : `${field} is invalid`;
}

function targetWire(target: StepTargetSelector): StepTargetWire {
    switch (target.kind) {
        case 'profiles':
            return { kind: 'profiles', profileIds: target.profileIds.map(id => id.value) };
        case 'role':
            return { kind: 'role', roleKey: target.roleKey, unitId: target.unitId?.value ?? null };
        case 'unit_manager':
            return { kind: 'unit_manager', unitId: target.unitId.value };
        case 'unit_members':
            return { kind: 'unit_members', unitId: target.unitId.value };
        case 'author_manager':
            return { kind: 'author_manager' };
        default:
            return assertNever(target);
    }
}

function assertNever(value: never): never {
    throw new TypeError(`Unsupported approval target: ${JSON.stringify(value)}`);
}

export function parseTemplateDefinition(body: JsonRecord): TemplateDefinition {
    const fields = parseTemplateFields(body.fields);
    if (!fields.ok) throw new ApprovalInputError('fields', issueMessage('fields', fields.issues));
    const steps = parseTemplateSteps(body.steps);
    if (!steps.ok) throw new ApprovalInputError('steps', issueMessage('steps', steps.issues));
    if (steps.value.length === 0) throw new ApprovalInputError('steps', 'steps must contain at least one item');
    return {
        fields: fields.value,
        steps: steps.value.map(step => ({ ...step, target: targetWire(step.target) }))
    };
}
