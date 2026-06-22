import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    calculateTemplateFieldDragPatch,
    calculateTemplateFieldResizePatch,
    getTemplatePointerPercent
} from './template-field-layout.js';
import type { CompanyTemplateField } from './company-template.js';

const baseField: CompanyTemplateField = {
    fieldKey: 'field_1',
    label: '입력 1',
    type: 'text',
    page: 1,
    x: 8,
    y: 15,
    width: 28,
    height: 7,
    required: false,
    roleKey: ''
};

test('Given pointer coordinates When converting to template percent Then values follow the preview bounds', () => {
    const pointer = getTemplatePointerPercent({ left: 100, top: 200, width: 800, height: 600 }, 500, 500);

    assert.deepEqual(pointer, { x: 50, y: 50 });
});

test('Given a dragged field When pointer moves outside the page Then coordinates stay within field bounds', () => {
    const patch = calculateTemplateFieldDragPatch({
        field: baseField,
        pointer: { x: 120, y: -20 },
        offsetX: 4,
        offsetY: 4
    });

    assert.deepEqual(patch, { x: 72, y: 0 });
});

test('Given a resized field When pointer moves past the page Then size stays within the remaining page', () => {
    const patch = calculateTemplateFieldResizePatch({
        field: { ...baseField, x: 80, y: 90 },
        pointer: { x: 120, y: 130 }
    });

    assert.deepEqual(patch, { width: 20, height: 10 });
});
