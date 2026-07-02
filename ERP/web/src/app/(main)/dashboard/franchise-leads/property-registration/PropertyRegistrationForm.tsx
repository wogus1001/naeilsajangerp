"use client";

import React from 'react';
import { Building2, Save } from 'lucide-react';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import {
    PROPERTY_REGISTRATION_INITIAL_FORM,
    buildPropertyRegistrationSections,
    buildPropertyRegistrationPayload,
    updatePropertyRegistrationAttachments,
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
import { uploadPropertyRegistrationAttachments } from '@/lib/franchise-property-registration-uploads';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
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
    const [pendingFiles, setPendingFiles] = React.useState<readonly File[]>([]);
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
        setForm(prev => updatePropertyRegistrationAttachments(prev, attachments));
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
            const companyName = getStoredCompanyName(storedUser);
            const payloadContext = { requesterId, companyName };
            const response = await fetch('/api/properties', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(buildPropertyRegistrationPayload(form, payloadContext))
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const inserted = unwrapApiData<{ readonly id?: string }>(payload);

            if (pendingFiles.length > 0) {
                if (!inserted.id) throw new Error('입점 요청 저장 후 파일 업로드 대상을 확인하지 못했습니다.');
                const uploadedAttachments = await uploadPropertyRegistrationAttachments({
                    propertyId: inserted.id,
                    files: pendingFiles,
                    attachments: form.fileAttachments
                });
                if (uploadedAttachments !== form.fileAttachments) {
                    const uploadResponse = await fetch(`/api/properties?id=${encodeURIComponent(inserted.id)}`, {
                        method: 'PUT',
                        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(buildPropertyRegistrationPayload(
                            updatePropertyRegistrationAttachments(form, uploadedAttachments),
                            payloadContext
                        ))
                    });
                    const uploadPayload: unknown = await uploadResponse.json();
                    if (!uploadResponse.ok) throw new Error(readApiError(uploadPayload));
                }
            }

            setForm(PROPERTY_REGISTRATION_INITIAL_FORM);
            setPendingFiles([]);
            setMessage({ kind: 'success', text: '입점 요청 DB에 저장했습니다.' });
        } catch (error) {
            setMessage({
                kind: 'error',
                text: error instanceof Error ? error.message : '입점 요청 저장 중 오류가 발생했습니다.'
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
                    <h1>입점 요청</h1>
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
                        pendingFiles={pendingFiles}
                        onChange={updateAttachments}
                        onPendingFilesChange={setPendingFiles}
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
