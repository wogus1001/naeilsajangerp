import {
    AlignLeft,
    CalendarDays,
    CalendarRange,
    CheckSquare,
    CircleDollarSign,
    FilePlus2,
    Hash,
    ListChecks,
    ListFilter,
    Star,
    Table2,
    TextCursorInput
} from 'lucide-react';
import { APPROVAL_FIELD_CATALOG } from './approvalFieldCatalog';
import type { ApprovalFieldType } from './approvalTypes';
import styles from './ApprovalTemplates.module.css';

type ApprovalFieldPaletteProps = {
    readonly onAdd: (type: ApprovalFieldType) => void;
};

function fieldIcon(type: ApprovalFieldType) {
    switch (type) {
        case 'shortText': return <TextCursorInput size={17} aria-hidden="true" />;
        case 'longText': return <AlignLeft size={17} aria-hidden="true" />;
        case 'number': return <Hash size={17} aria-hidden="true" />;
        case 'money': return <CircleDollarSign size={17} aria-hidden="true" />;
        case 'date': return <CalendarDays size={17} aria-hidden="true" />;
        case 'period': return <CalendarRange size={17} aria-hidden="true" />;
        case 'select': return <ListFilter size={17} aria-hidden="true" />;
        case 'checklist': return <CheckSquare size={17} aria-hidden="true" />;
        case 'table': return <Table2 size={17} aria-hidden="true" />;
        case 'score': return <Star size={17} aria-hidden="true" />;
        case 'attachment': return <FilePlus2 size={17} aria-hidden="true" />;
        case 'description': return <ListChecks size={17} aria-hidden="true" />;
    }
}

export function ApprovalFieldPalette({ onAdd }: ApprovalFieldPaletteProps) {
    return (
        <div className={styles.palette}>
            {APPROVAL_FIELD_CATALOG.map(item => (
                <button key={item.type} onClick={() => onAdd(item.type)} type="button">
                    <span>{fieldIcon(item.type)}</span>
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                </button>
            ))}
        </div>
    );
}
