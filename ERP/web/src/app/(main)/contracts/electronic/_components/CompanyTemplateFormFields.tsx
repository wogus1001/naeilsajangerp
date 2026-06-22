"use client";

import type { TemplateFormField } from '@/lib/electronic-contracts/company-template';
import styles from './electronicContracts.module.css';

type Props = {
    readonly fields: readonly TemplateFormField[];
    readonly values: Readonly<Record<string, string>>;
    readonly onChange: (fieldKey: string, value: string) => void;
};

export function CompanyTemplateFormFields({ fields, values, onChange }: Props) {
    return (
        <div className={styles.formGrid}>
            {fields.map(field => (
                <label className={styles.field} key={field.fieldKey}>
                    <span>{field.label}{field.required ? ' *' : ''}</span>
                    <input
                        type={field.inputType === 'checkbox' ? 'text' : field.inputType}
                        value={values[field.fieldKey] || ''}
                        onChange={event => onChange(field.fieldKey, event.target.value)}
                        required={field.required}
                    />
                </label>
            ))}
        </div>
    );
}
