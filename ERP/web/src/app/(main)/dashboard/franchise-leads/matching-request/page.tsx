"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Send, Users } from 'lucide-react';
import {
    MATCHING_REQUEST_INITIAL_FORM,
    buildMatchingRequestSections,
    buildMatchingRequestPayload,
    type MatchingRequestField,
    type MatchingRequestFieldKey,
    type MatchingRequestForm
} from '@/lib/franchise-matching-request';
import { useFranchiseIndustryOptions } from '@/components/franchise/useFranchiseIndustryOptions';
import { readApiError } from '@/utils/apiResponse';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getRequesterId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';
import styles from './page.module.css';

type SaveMessage = {
    readonly kind: 'success' | 'error';
    readonly text: string;
};

function fieldClassName(field: MatchingRequestField): string {
    if (field.full) return styles.full;
    if (field.wide) return styles.wide;
    return '';
}

function renderField(
    field: MatchingRequestField,
    form: MatchingRequestForm,
    updateField: (key: MatchingRequestFieldKey, value: string | boolean) => void
) {
    const value = form[field.key];
    const label = (
        <span>
            {field.label} {field.required && <b>*</b>}
        </span>
    );

    if (field.kind === 'checkbox') {
        return (
            <label className={`${styles.checkRow} ${fieldClassName(field)}`} key={field.key}>
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={event => updateField(field.key, event.target.checked)}
                />
                {label}
            </label>
        );
    }

    if (field.kind === 'select') {
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <select value={String(value)} onChange={event => updateField(field.key, event.target.value)} required={field.required}>
                    {(field.options || []).map(option => (
                        <option key={option || 'empty'} value={option}>{option || '선택'}</option>
                    ))}
                </select>
            </label>
        );
    }

    if (field.kind === 'textarea') {
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <textarea value={String(value)} onChange={event => updateField(field.key, event.target.value)} />
            </label>
        );
    }

    const input = (
        <input
            value={String(value)}
            type={field.kind === 'number' ? 'number' : field.kind}
            inputMode={field.kind === 'number' ? 'numeric' : undefined}
            onChange={event => updateField(field.key, event.target.value)}
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

export default function FranchiseMatchingRequestPage() {
    const router = useRouter();
    const [form, setForm] = React.useState<MatchingRequestForm>(MATCHING_REQUEST_INITIAL_FORM);
    const [message, setMessage] = React.useState<SaveMessage | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const industryOptions = useFranchiseIndustryOptions();
    const sections = React.useMemo(
        () => buildMatchingRequestSections(industryOptions),
        [industryOptions]
    );

    const updateField = (key: MatchingRequestFieldKey, value: string | boolean) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setMessage(null);
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
            const response = await fetch('/api/franchise-leads', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(buildMatchingRequestPayload(form, {
                    requesterId,
                    companyName: getStoredCompanyName(storedUser)
                }))
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));

            setForm(MATCHING_REQUEST_INITIAL_FORM);
            setMessage({ kind: 'success', text: '예비 창업자 정보가 모객 DB에 등록됐습니다.' });
            router.replace('/dashboard/franchise-leads/work-intake?tab=matchingRequests');
        } catch (error) {
            setMessage({
                kind: 'error',
                text: error instanceof Error ? error.message : '예비 창업자 등록 중 오류가 발생했습니다.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className={styles.page}>
            <form className={styles.form} onSubmit={handleSubmit}>
                {sections
                    .filter(section => section.id !== 'owned-property-detail' || form.ownedPropertyStatus === '보유')
                    .map(section => (
                        <fieldset className={styles.panel} key={section.id}>
                            <legend>{section.title}</legend>
                            {section.id === 'applicant' && (
                                <div className={styles.panelTitleRow}>
                                    <div className={styles.iconBox}><Users size={18} /></div>
                                    <p>가맹 상담과 상권 매칭에 필요한 기본 정보를 입력합니다.</p>
                                </div>
                            )}
                            <div className={styles.formGrid}>
                                {section.fields.map(field => renderField(field, form, updateField))}
                            </div>
                        </fieldset>
                    ))}

                {message && <p className={message.kind === 'success' ? styles.successMessage : styles.errorMessage}>{message.text}</p>}

                <div className={styles.actions}>
                    <button className={styles.primaryButton} type="submit" disabled={isSaving}>
                        <Send size={16} /> {isSaving ? '등록 중' : '매칭 요청 등록'}
                    </button>
                </div>
            </form>
        </main>
    );
}
