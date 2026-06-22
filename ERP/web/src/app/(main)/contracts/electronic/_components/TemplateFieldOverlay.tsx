"use client";

import React from 'react';
import type { CompanyTemplateField } from '@/lib/electronic-contracts/company-template';
import {
    calculateTemplateFieldDragPatch,
    calculateTemplateFieldResizePatch,
    getTemplatePointerPercent
} from '@/lib/electronic-contracts/template-field-layout';
import styles from './electronicContracts.module.css';

type Props = {
    readonly fields: readonly CompanyTemplateField[];
    readonly selectedFieldKey: string;
    readonly onSelect: (fieldKey: string) => void;
    readonly onUpdateField: (fieldKey: string, patch: Partial<CompanyTemplateField>) => void;
};

type DragState = {
    readonly fieldKey: string;
    readonly pointerId: number;
    readonly mode: 'move' | 'resize';
    readonly offsetX: number;
    readonly offsetY: number;
};

function boundsFromElement(element: HTMLElement | null) {
    const rect = element?.getBoundingClientRect();
    if (!rect) return null;
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function TemplateFieldOverlay({ fields, selectedFieldKey, onSelect, onUpdateField }: Props) {
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = React.useState<DragState | null>(null);

    function startDrag(event: React.PointerEvent<HTMLElement>, field: CompanyTemplateField, mode: DragState['mode']) {
        event.preventDefault();
        event.stopPropagation();
        const bounds = boundsFromElement(overlayRef.current);
        if (!bounds) return;
        const pointer = getTemplatePointerPercent(bounds, event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect(field.fieldKey);
        setDrag({
            fieldKey: field.fieldKey,
            pointerId: event.pointerId,
            mode,
            offsetX: pointer.x - field.x,
            offsetY: pointer.y - field.y
        });
    }

    function updateDrag(event: React.PointerEvent<HTMLElement>, field: CompanyTemplateField) {
        if (!drag || drag.fieldKey !== field.fieldKey || drag.pointerId !== event.pointerId) return;
        const bounds = boundsFromElement(overlayRef.current);
        if (!bounds) return;
        const pointer = getTemplatePointerPercent(bounds, event.clientX, event.clientY);
        const patch = drag.mode === 'move'
            ? calculateTemplateFieldDragPatch({ field, pointer, offsetX: drag.offsetX, offsetY: drag.offsetY })
            : calculateTemplateFieldResizePatch({ field, pointer });
        onUpdateField(field.fieldKey, patch);
    }

    function endDrag(event: React.PointerEvent<HTMLElement>) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setDrag(null);
    }

    return (
        <div ref={overlayRef} className={styles.fieldOverlay} aria-label="템플릿 필드 배치">
            {fields.map(field => {
                const selected = field.fieldKey === selectedFieldKey;
                return (
                    <button
                        key={field.fieldKey}
                        type="button"
                        className={`${styles.templateFieldBox} ${selected ? styles.templateFieldBoxSelected : ''}`}
                        style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%` }}
                        onClick={() => onSelect(field.fieldKey)}
                        onPointerDown={event => startDrag(event, field, 'move')}
                        onPointerMove={event => updateDrag(event, field)}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                    >
                        <span className={styles.templateFieldLabel}>{field.label}</span>
                        <span
                            className={styles.fieldResizeHandle}
                            aria-hidden="true"
                            onPointerDown={event => startDrag(event, field, 'resize')}
                            onPointerMove={event => updateDrag(event, field)}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                        />
                    </button>
                );
            })}
        </div>
    );
}
