import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ApprovalField, ApprovalTemplateStep } from './approvalTypes.js';
import { paginateApprovalPreview } from './approvalTemplatePagination.js';

function field(id: string, type: ApprovalField['type'] = 'shortText'): ApprovalField {
    return { id, type, label: id, required: false, columns: 1, editableBy: 'author' };
}

function step(index: number): ApprovalTemplateStep {
    return {
        id: `step-${index}`,
        label: `${index}단계`,
        action: 'approval',
        mode: 'sequential',
        target: { kind: 'author_manager' },
        targetLabel: '작성자 소속 부서장'
    };
}

test('Given a long template When preview pages are calculated Then every field remains visible in order', () => {
    const fields = [
        field('one'), field('two', 'longText'), field('three'), field('four', 'table'), field('five'), field('six')
    ];
    const steps = [step(1), step(2)];
    const pages = paginateApprovalPreview(fields, steps);

    assert.ok(pages.length > 1);
    assert.deepEqual(pages.flatMap(page => page.fields.map(item => item.id)), fields.map(item => item.id));
    assert.deepEqual(pages.flatMap(page => page.steps.map(item => item.id)), steps.map(item => item.id));
});

test('Given no fields and no approval steps When preview pages are calculated Then one empty page remains', () => {
    assert.deepEqual(paginateApprovalPreview([], []), [{ fields: [], steps: [], stepOffset: 0 }]);
});

test('Given a long approval line When preview pages are calculated Then every step is split across A4 pages', () => {
    const steps = Array.from({ length: 10 }, (_, index) => step(index + 1));
    const pages = paginateApprovalPreview([], steps);

    assert.ok(pages.length > 1);
    assert.deepEqual(pages.flatMap(page => page.steps.map(item => item.id)), steps.map(item => item.id));
    assert.deepEqual(pages.filter(page => page.steps.length > 0).map(page => page.stepOffset), [0, 4, 9]);
});
