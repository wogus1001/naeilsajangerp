"use client";

import React from 'react';
import KakaoAddressSearch, { type KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import { useFranchiseIndustryOptionGroups } from '@/components/franchise/useFranchiseIndustryOptions';
import { getFranchiseIndustryCategoriesForBusinessType } from '@/lib/franchise-industry-options';
import {
    buildPropertyRegistrationSections,
    updatePropertyRegistrationAttachments,
    type PropertyRegistrationFileAttachment,
    type PropertyRegistrationField,
    type PropertyRegistrationFieldKey,
    type PropertyRegistrationForm
} from '@/lib/franchise-property-registration';
import {
    buildAreaHint,
    convertPrivateAreaValue,
    formatMoneyText,
    normalizeDecimalText,
    readPropertyAreaUnit,
    type PropertyAreaUnit
} from '@/lib/franchise-property-registration-format';
import { PropertyRegistrationFileInput } from '../property-registration/PropertyRegistrationFileInput';
import propertyStyles from './PropertyWorkIntakeEditFields.module.css';
import styles from './WorkIntakeEditModal.module.css';

type PropertyWorkIntakeEditFieldsProps = {
    readonly value: PropertyRegistrationForm;
    readonly onChangeAction: (value: PropertyRegistrationForm) => void;
};

function fieldClassName(field: PropertyRegistrationField): string {
    return field.full || field.wide ? styles.fullField : styles.field;
}

function labelFor(field: PropertyRegistrationField) {
    return (
        <span>
            {field.label} {field.required && <b>*</b>}
        </span>
    );
}

function renderTextField(
    field: PropertyRegistrationField,
    value: PropertyRegistrationForm,
    updateField: (key: PropertyRegistrationFieldKey, fieldValue: string) => void
) {
    const isMoneyField = field.unit === '만원';
    const input = (
        <input
            value={value[field.key]}
            type={isMoneyField ? 'text' : field.kind}
            inputMode={field.kind === 'number' ? (isMoneyField ? 'numeric' : 'decimal') : undefined}
            onChange={event => updateField(field.key, isMoneyField ? formatMoneyText(event.target.value) : event.target.value)}
            required={field.required}
        />
    );

    return (
        <label className={fieldClassName(field)} key={field.key}>
            {labelFor(field)}
            {field.unit ? <span className={styles.inputUnit}>{input}<em>{field.unit}</em></span> : input}
        </label>
    );
}

function renderPropertyField(
    field: PropertyRegistrationField,
    value: PropertyRegistrationForm,
    updateField: (key: PropertyRegistrationFieldKey, fieldValue: string) => void,
    selectAddress: (result: KakaoAddressResult) => void,
    updatePrivateAreaUnit: (unit: PropertyAreaUnit) => void
) {
    if (field.key === 'propertyAddress') {
        return (
            <KakaoAddressSearch
                key={field.key}
                requesterId="work-intake-property-edit"
                label={`${field.label}${field.required ? ' *' : ''}`}
                value={value.propertyAddress}
                placeholder="주소 검색"
                classNames={{
                    field: fieldClassName(field),
                    row: propertyStyles.addressRow,
                    button: propertyStyles.addressButton
                }}
                onAddressChange={address => updateField(field.key, address)}
                onSelect={selectAddress}
            />
        );
    }

    if (field.kind === 'select') {
        const isCategoryDisabled = field.key === 'desiredCategory' && !value.desiredBusinessType;
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {labelFor(field)}
                <select
                    value={value[field.key]}
                    onChange={event => updateField(field.key, event.target.value)}
                    required={field.required}
                    disabled={isCategoryDisabled}
                >
                    {(field.options || []).map(option => <option key={option || 'empty'} value={option}>{option || '선택'}</option>)}
                </select>
                {isCategoryDisabled && <small className={propertyStyles.helpText}>업태를 먼저 선택하면 중분류 업종만 표시됩니다.</small>}
            </label>
        );
    }

    if (field.kind === 'textarea') {
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {labelFor(field)}
                <textarea value={value[field.key]} onChange={event => updateField(field.key, event.target.value)} />
            </label>
        );
    }

    if (field.key === 'privateArea') {
        const unit = readPropertyAreaUnit(value.privateAreaUnit);
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {labelFor(field)}
                <span className={propertyStyles.areaInputGroup}>
                    <input
                        value={value.privateArea}
                        type="text"
                        inputMode="decimal"
                        onChange={event => updateField(field.key, normalizeDecimalText(event.target.value))}
                    />
                    <span className={propertyStyles.areaUnitSwitch} aria-label="전용면적 단위 선택">
                        <button
                            type="button"
                            className={unit === 'squareMeter' ? propertyStyles.activeUnit : ''}
                            onClick={() => updatePrivateAreaUnit('squareMeter')}
                        >
                            ㎡
                        </button>
                        <button
                            type="button"
                            className={unit === 'pyeong' ? propertyStyles.activeUnit : ''}
                            onClick={() => updatePrivateAreaUnit('pyeong')}
                        >
                            평
                        </button>
                    </span>
                </span>
                <small className={propertyStyles.helpText}>{buildAreaHint(value.privateArea, value.privateAreaUnit)}</small>
            </label>
        );
    }

    return renderTextField(field, value, updateField);
}

export function PropertyWorkIntakeEditFields({ value, onChangeAction }: PropertyWorkIntakeEditFieldsProps) {
    const [fileError, setFileError] = React.useState('');
    const optionGroups = useFranchiseIndustryOptionGroups();
    const industryOptions = React.useMemo(
        () => getFranchiseIndustryCategoriesForBusinessType(optionGroups, value.desiredBusinessType),
        [optionGroups, value.desiredBusinessType]
    );
    const sections = React.useMemo(
        () => buildPropertyRegistrationSections(industryOptions, optionGroups.businessTypes),
        [industryOptions, optionGroups.businessTypes]
    );

    const updateField = (key: PropertyRegistrationFieldKey, fieldValue: string) => {
        onChangeAction(key === 'desiredBusinessType'
            ? { ...value, desiredBusinessType: fieldValue, desiredCategory: '' }
            : { ...value, [key]: fieldValue });
    };
    const selectAddress = (result: KakaoAddressResult) => onChangeAction({
        ...value,
        propertyAddress: result.address,
        propertyRegion: result.region,
        roadAddress: result.roadAddress,
        jibunAddress: result.jibunAddress,
        zoneNo: result.zoneNo
    });
    const updatePrivateAreaUnit = (unit: PropertyAreaUnit) => {
        const currentUnit = readPropertyAreaUnit(value.privateAreaUnit);
        onChangeAction({
            ...value,
            privateArea: convertPrivateAreaValue(value.privateArea, currentUnit, unit),
            privateAreaUnit: unit
        });
    };
    const updateAttachments = (attachments: readonly PropertyRegistrationFileAttachment[]) => {
        onChangeAction(updatePropertyRegistrationAttachments(value, attachments));
        setFileError('');
    };

    return (
        <>
            {sections.map(section => (
                <section className={styles.section} key={section.id}>
                    <h3 className={styles.sectionTitle}>{section.title}</h3>
                    <div className={styles.editGrid}>
                        {section.fields.map(field => renderPropertyField(field, value, updateField, selectAddress, updatePrivateAreaUnit))}
                    </div>
                </section>
            ))}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>사진 및 자료</h3>
                <PropertyRegistrationFileInput
                    attachments={value.fileAttachments}
                    onChange={updateAttachments}
                    onError={setFileError}
                />
                {fileError && <p className={styles.fileError}>{fileError}</p>}
            </section>
        </>
    );
}
