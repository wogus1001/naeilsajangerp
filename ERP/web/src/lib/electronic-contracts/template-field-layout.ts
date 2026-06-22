import type { CompanyTemplateField } from './company-template';

export type TemplatePointerBounds = {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
};

export type TemplatePointerPercent = {
    readonly x: number;
    readonly y: number;
};

export type TemplateFieldDragInput = {
    readonly field: CompanyTemplateField;
    readonly pointer: TemplatePointerPercent;
    readonly offsetX: number;
    readonly offsetY: number;
};

export type TemplateFieldResizeInput = {
    readonly field: CompanyTemplateField;
    readonly pointer: TemplatePointerPercent;
};

function clampPercent(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number): number {
    return Math.round(value * 10) / 10;
}

export function getTemplatePointerPercent(
    bounds: TemplatePointerBounds,
    clientX: number,
    clientY: number
): TemplatePointerPercent {
    if (bounds.width <= 0 || bounds.height <= 0) return { x: 0, y: 0 };
    return {
        x: clampPercent(((clientX - bounds.left) / bounds.width) * 100, 0, 100),
        y: clampPercent(((clientY - bounds.top) / bounds.height) * 100, 0, 100)
    };
}

export function calculateTemplateFieldDragPatch(input: TemplateFieldDragInput): Pick<CompanyTemplateField, 'x' | 'y'> {
    const maxX = Math.max(0, 100 - input.field.width);
    const maxY = Math.max(0, 100 - input.field.height);
    return {
        x: roundPercent(clampPercent(input.pointer.x - input.offsetX, 0, maxX)),
        y: roundPercent(clampPercent(input.pointer.y - input.offsetY, 0, maxY))
    };
}

export function calculateTemplateFieldResizePatch(input: TemplateFieldResizeInput): Pick<CompanyTemplateField, 'width' | 'height'> {
    const maxWidth = Math.max(4, 100 - input.field.x);
    const maxHeight = Math.max(4, 100 - input.field.y);
    return {
        width: roundPercent(clampPercent(input.pointer.x - input.field.x, 4, maxWidth)),
        height: roundPercent(clampPercent(input.pointer.y - input.field.y, 4, maxHeight))
    };
}
