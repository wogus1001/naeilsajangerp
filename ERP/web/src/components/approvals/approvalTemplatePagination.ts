import type { ApprovalField, ApprovalTemplateStep } from './approvalTypes';

export type ApprovalPreviewPage = {
    readonly fields: readonly ApprovalField[];
    readonly steps: readonly ApprovalTemplateStep[];
    readonly stepOffset: number;
};

const FIRST_PAGE_CAPACITY = 4;
const CONTINUATION_PAGE_CAPACITY = 4;

function fieldWeight(field: ApprovalField): number {
    const base = (() => {
        switch (field.type) {
            case 'longText': return 1.8;
            case 'table': return 2.2;
            case 'checklist': return Math.max(1.2, (field.options?.length ?? 2) * 0.55);
            case 'attachment': return 1.2;
            case 'description': return 0.8;
            default: return 1;
        }
    })();
    return field.columns === 2 ? base * 0.55 : base;
}

const APPROVAL_LINE_HEADER_WEIGHT = 0.8;
const APPROVAL_STEP_WEIGHT = 0.75;

function stepCapacity(availableWeight: number): number {
    return Math.max(0, Math.floor((availableWeight - APPROVAL_LINE_HEADER_WEIGHT) / APPROVAL_STEP_WEIGHT));
}

export function paginateApprovalPreview(
    fields: readonly ApprovalField[],
    steps: readonly ApprovalTemplateStep[]
): readonly ApprovalPreviewPage[] {
    const fieldPages: Array<{ fields: ApprovalField[]; weight: number }> = [];

    for (const field of fields) {
        const weight = fieldWeight(field);
        const current = fieldPages[fieldPages.length - 1];
        const capacity = fieldPages.length <= 1 ? FIRST_PAGE_CAPACITY : CONTINUATION_PAGE_CAPACITY;
        if (!current || (current.fields.length > 0 && current.weight + weight > capacity)) {
            fieldPages.push({ fields: [field], weight });
        } else {
            current.fields.push(field);
            current.weight += weight;
        }
    }

    if (fieldPages.length === 0) fieldPages.push({ fields: [], weight: 0 });
    const pages: ApprovalPreviewPage[] = fieldPages.map(page => ({ fields: page.fields, steps: [], stepOffset: 0 }));
    if (steps.length === 0) return pages;

    const lastFieldPage = fieldPages[fieldPages.length - 1];
    const lastPage = pages[pages.length - 1];
    if (!lastFieldPage || !lastPage) return [{ fields: [], steps, stepOffset: 0 }];
    const lastCapacity = fieldPages.length === 1 ? FIRST_PAGE_CAPACITY : CONTINUATION_PAGE_CAPACITY;
    const firstStepCount = stepCapacity(lastCapacity - lastFieldPage.weight);
    let offset = 0;

    if (firstStepCount > 0) {
        const pageSteps = steps.slice(0, firstStepCount);
        pages[pages.length - 1] = { ...lastPage, steps: pageSteps, stepOffset: 0 };
        offset = pageSteps.length;
    }

    const continuationStepCount = Math.max(1, stepCapacity(CONTINUATION_PAGE_CAPACITY));
    while (offset < steps.length) {
        const pageSteps = steps.slice(offset, offset + continuationStepCount);
        pages.push({ fields: [], steps: pageSteps, stepOffset: offset });
        offset += pageSteps.length;
    }
    return pages;
}
