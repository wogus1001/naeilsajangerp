import type {
    ApprovalField,
    ApprovalFieldType,
    ApprovalStepTarget,
    ApprovalTemplateStep
} from './approvalTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function fieldType(value: unknown): ApprovalFieldType {
    switch (value) {
        case 'textarea': return 'longText';
        case 'text': return 'shortText';
        case 'shortText':
        case 'longText':
        case 'number':
        case 'money':
        case 'date':
        case 'period':
        case 'select':
        case 'checkbox':
        case 'checklist':
        case 'table':
        case 'score':
        case 'attachment':
        case 'description':
        case 'person': return value;
        default: return 'shortText';
    }
}

export function templateFields(value: unknown): readonly ApprovalField[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const options = Array.isArray(item.options) ? item.options.filter(option => typeof option === 'string') : [];
        return [{
            id: text(item.id) || text(item.key) || `field-${index + 1}`,
            type: fieldType(item.type),
            label: text(item.label, '제목 없음'),
            description: text(item.description) || text(item.placeholder),
            required: item.required === true,
            columns: item.columns === 2 ? 2 : 1,
            editableBy: item.editableBy === 'approver' || item.editableBy === 'agreement' || item.editableBy === 'all'
                ? item.editableBy
                : 'author',
            options
        }];
    });
}

function stepTarget(value: unknown): ApprovalStepTarget {
    if (!isRecord(value)) return { kind: 'author_manager' };
    switch (value.kind) {
        case 'profiles':
            return { kind: 'profiles', profileIds: Array.isArray(value.profileIds) ? value.profileIds.filter(id => typeof id === 'string') : [] };
        case 'role':
            return { kind: 'role', roleKey: text(value.roleKey), unitId: typeof value.unitId === 'string' ? value.unitId : null };
        case 'unit_manager': return { kind: 'unit_manager', unitId: text(value.unitId) };
        case 'unit_members': return { kind: 'unit_members', unitId: text(value.unitId) };
        default: return { kind: 'author_manager' };
    }
}

function targetLabel(target: ApprovalStepTarget): string {
    switch (target.kind) {
        case 'profiles': return `${target.profileIds.length}명 지정`;
        case 'role': return '결재 담당자';
        case 'unit_manager': return '선택 부서장';
        case 'unit_members': return '선택 부서원';
        case 'author_manager': return '작성자 소속 부서장';
    }
}

export function templateSteps(value: unknown): readonly ApprovalTemplateStep[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const target = stepTarget(item.target);
        return [{
            id: text(item.id) || text(item.key) || `step-${index + 1}`,
            label: text(item.label, `${index + 1}단계`),
            action: item.action === 'agreement' || item.action === 'acknowledgement' ? item.action : 'approval',
            mode: item.mode === 'parallel_all' || item.mode === 'parallel_any' ? item.mode : 'sequential',
            target,
            targetLabel: targetLabel(target)
        }];
    });
}
