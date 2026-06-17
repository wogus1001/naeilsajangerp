"use client";

import React from 'react';
import { Building2, Save } from 'lucide-react';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import {
    PROPERTY_REGISTRATION_INITIAL_FORM,
    buildPropertyRegistrationSections,
    buildPropertyRegistrationPayload,
    type PropertyRegistrationFileAttachment,
    type PropertyRegistrationFieldKey,
    type PropertyRegistrationForm as PropertyRegistrationFormState
} from '@/lib/franchise-property-registration';
import { getFranchiseIndustryCategoriesForBusinessType } from '@/lib/franchise-industry-options';
import {
    convertPrivateAreaValue,
    readPropertyAreaUnit,
    type PropertyAreaUnit
} from '@/lib/franchise-property-registration-format';
import { useFranchiseIndustryOptionGroups } from '@/components/franchise/useFranchiseIndustryOptions';
import { readApiError } from '@/utils/apiResponse';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getRequesterId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';
import { PropertyRegistrationFileInput } from './PropertyRegistrationFileInput';
import { renderPropertyRegistrationField } from './PropertyRegistrationFieldRenderer';
import styles from './PropertyRegistrationForm.module.css';

type SaveMessage = {
    readonly kind: 'success' | 'error';
    readonly text: string;
};

export function PropertyRegistrationForm() {
    const [form, setForm] = React.useState<PropertyRegistrationFormState>(PROPERTY_REGISTRATION_INITIAL_FORM);
    const [message, setMessage] = React.useState<SaveMessage | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const industryOptionGroups = useFranchiseIndustryOptionGroups();
    const industryOptions = React.useMemo(
        () => getFranchiseIndustryCategoriesForBusinessType(industryOptionGroups, form.desiredBusinessType),
        [form.desiredBusinessType, industryOptionGroups]
    );
    const sections = React.useMemo(
        () => buildPropertyRegistrationSections(industryOptions, industryOptionGroups.businessTypes),
        [industryOptionGroups.businessTypes, industryOptions]
    );

    const updateField = (key: PropertyRegistrationFieldKey, value: string) => {
        setForm(prev => (
            key === 'desiredBusinessType'
                ? { ...prev, desiredBusinessType: value, desiredCategory: '' }
                : { ...prev, [key]: value }
        ));
        setMessage(null);
    };

    const selectAddress = (result: KakaoAddressResult) => {
        setForm(prev => ({
            ...prev,
            propertyAddress: result.address,
            propertyRegion: result.region,
            roadAddress: result.roadAddress,
            jibunAddress: result.jibunAddress,
            zoneNo: result.zoneNo
        }));
        setMessage(null);
    };

    const updatePrivateAreaUnit = (unit: PropertyAreaUnit) => {
        setForm(prev => {
            const currentUnit = readPropertyAreaUnit(prev.privateAreaUnit);
            return {
                ...prev,
                privateArea: convertPrivateAreaValue(prev.privateArea, currentUnit, unit),
                privateAreaUnit: unit
            };
        });
        setMessage(null);
    };

    const updateAttachments = (attachments: readonly PropertyRegistrationFileAttachment[]) => {
        setForm(prev => ({
            ...prev,
            fileAttachments: attachments,
            fileNames: attachments.map(file => file.name)
        }));
        setMessage(null);
    };

    const showFileError = (text: string) => {
        setMessage({ kind: 'error', text });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const storedUser = getStoredUser();
        const requesterId = getRequesterId(storedUser);

        if (!requesterId) {
            setMessage({ kind: 'error', text: '로그인 정보를 확인할 수 없습니다.' });
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/properties', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(buildPropertyRegistrationPayload(form, {
                    requesterId,
                    companyName: getStoredCompanyName(storedUser)
                }))
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));

            setForm(PROPERTY_REGISTRATION_INITIAL_FORM);
            setMessage({ kind: 'success', text: '물건 등록 DB에 저장했습니다.' });
        } catch (error) {
            setMessage({
                kind: 'error',
                text: error instanceof Error ? error.message : '물건 등록 저장 중 오류가 발생했습니다.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <div className={styles.iconBox}><Building2 size={20} /></div>
                <div>
                    <h1>물건 등록</h1>
                    <p>공인중개사용 물건·창업자 매칭 정보를 입력합니다.</p>
                </div>
            </section>

            <form className={styles.form} onSubmit={handleSubmit}>
                {sections.map(section => (
                    <fieldset className={styles.panel} key={section.id}>
                        <legend>{section.title}</legend>
                        <div className={styles.formGrid}>
                            {section.fields.map(field => renderPropertyRegistrationField(
                                field,
                                form,
                                updateField,
                                selectAddress,
                                updatePrivateAreaUnit
                            ))}
                        </div>
                    </fieldset>
                ))}

                <fieldset className={styles.panel}>
                    <legend>사진 및 자료</legend>
                    <PropertyRegistrationFileInput
                        attachments={form.fileAttachments}
                        onChange={updateAttachments}
                        onError={showFileError}
                    />
                </fieldset>

                {message && <p className={message.kind === 'success' ? styles.successMessage : styles.errorMessage}>{message.text}</p>}

                <div className={styles.actions}>
                    <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                        <Save size={16} /> {isSaving ? '저장 중' : '등록'}
                    </button>
                </div>
            </form>
        </main>
    );
}
