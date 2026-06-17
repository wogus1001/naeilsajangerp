"use client";

import React from 'react';
import KakaoAddressSearch, { type KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import type {
    PropertyRegistrationField,
    PropertyRegistrationFieldKey,
    PropertyRegistrationForm as PropertyRegistrationFormState
} from '@/lib/franchise-property-registration';
import {
    buildAreaHint,
    formatMoneyText,
    normalizeDecimalText,
    readPropertyAreaUnit,
    type PropertyAreaUnit
} from '@/lib/franchise-property-registration-format';
import styles from './PropertyRegistrationForm.module.css';

export type PropertyRegistrationUpdateField = (key: PropertyRegistrationFieldKey, value: string) => void;

function fieldClassName(field: PropertyRegistrationField): string {
    if (field.full) return styles.full;
    if (field.wide) return styles.wide;
    return '';
}

export function renderPropertyRegistrationField(
    field: PropertyRegistrationField,
    form: PropertyRegistrationFormState,
    updateField: PropertyRegistrationUpdateField,
    selectAddress: (result: KakaoAddressResult) => void,
    updatePrivateAreaUnit: (unit: PropertyAreaUnit) => void
) {
    const label = (
        <span>
            {field.label} {field.required && <b>*</b>}
        </span>
    );
    const value = form[field.key];

    if (field.key === 'propertyAddress') {
        return (
            <KakaoAddressSearch
                key={field.key}
                requesterId="property-registration"
                label={`${field.label}${field.required ? ' *' : ''}`}
                value={value}
                placeholder="주소 검색"
                classNames={{
                    field: `${fieldClassName(field)} ${styles.addressField}`.trim(),
                    row: styles.addressRow,
                    button: styles.addressButton
                }}
                onAddressChange={address => updateField(field.key, address)}
                onSelect={selectAddress}
            />
        );
    }

    if (field.kind === 'select') {
        const isCategoryDisabled = field.key === 'desiredCategory' && !form.desiredBusinessType;
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <select
                    value={value}
                    onChange={event => updateField(field.key, event.target.value)}
                    required={field.required}
                    disabled={isCategoryDisabled}
                >
                    {(field.options || []).map(option => <option key={option || 'empty'} value={option}>{option || '선택'}</option>)}
                </select>
                {isCategoryDisabled && <small className={styles.helpText}>업태를 먼저 선택하면 중분류 업종만 표시됩니다.</small>}
            </label>
        );
    }

    if (field.kind === 'textarea') {
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <textarea value={value} onChange={event => updateField(field.key, event.target.value)} />
            </label>
        );
    }

    if (field.key === 'privateArea') {
        const unit = readPropertyAreaUnit(form.privateAreaUnit);
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <span className={styles.areaInputGroup}>
                    <input
                        value={value}
                        type="text"
                        inputMode="decimal"
                        onChange={event => updateField(field.key, normalizeDecimalText(event.target.value))}
                    />
                    <span className={styles.areaUnitSwitch} aria-label="전용면적 단위 선택">
                        <button
                            type="button"
                            className={unit === 'squareMeter' ? styles.activeUnit : ''}
                            onClick={() => updatePrivateAreaUnit('squareMeter')}
                        >
                            ㎡
                        </button>
                        <button
                            type="button"
                            className={unit === 'pyeong' ? styles.activeUnit : ''}
                            onClick={() => updatePrivateAreaUnit('pyeong')}
                        >
                            평
                        </button>
                    </span>
                </span>
                <small className={styles.helpText}>{buildAreaHint(value, form.privateAreaUnit)}</small>
            </label>
        );
    }

    const isMoneyField = field.unit === '만원';
    const input = (
        <input
            value={value}
            type={isMoneyField ? 'text' : field.kind}
            inputMode={field.kind === 'number' ? (isMoneyField ? 'numeric' : 'decimal') : undefined}
            onChange={event => updateField(field.key, isMoneyField ? formatMoneyText(event.target.value) : event.target.value)}
            required={field.required}
        />
    );

    return (
        <label className={fieldClassName(field)} key={field.key}>
            {label}
            {field.unit ? <span className={styles.inputUnit}>{input}<em>{field.unit}</em></span> : input}
        </label>
    );
}
