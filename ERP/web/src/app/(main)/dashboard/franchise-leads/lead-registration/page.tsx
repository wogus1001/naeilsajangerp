"use client";

import React from 'react';
import { Save, Users } from 'lucide-react';
import { LeadRegionMultiSelect } from '@/components/franchise/leads/LeadRegionMultiSelect';
import { formatLeadPhoneInput, normalizeLeadDesiredRegionValue } from '@/components/franchise/leads/leadFormFormatters';
import { buildLeadRegistrationPayload, LEAD_REGISTRATION_INITIAL_FORM, type LeadRegistrationForm } from '@/lib/franchise-lead-registration';
import {
    FRANCHISE_LEAD_GRADES,
    FRANCHISE_LEAD_REGISTRATION_SOURCE,
    FRANCHISE_LEAD_SOURCES,
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadGradeLabel,
    getFranchiseLeadSourceLabel,
    normalizeLeadStatus
} from '@/lib/franchise-leads';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getRequesterId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';
import styles from './page.module.css';

type SaveMessage = {
    readonly kind: 'success' | 'error';
    readonly text: string;
};

type ManagerOption = {
    readonly id: string;
    readonly uuid?: string;
    readonly name?: string;
    readonly companyName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function parseManagerOptions(value: unknown): readonly ManagerOption[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => {
        const id = readString(item.id);
        const uuid = readString(item.uuid);
        const name = readString(item.name);
        const companyName = readString(item.companyName);
        return {
            id,
            ...(uuid ? { uuid } : {}),
            ...(name ? { name } : {}),
            ...(companyName ? { companyName } : {})
        };
    }).filter(item => Boolean(item.id || item.uuid));
}

function managerOptionValue(manager: ManagerOption): string {
    return manager.uuid || manager.id;
}

function formatManwonInput(value: string): string {
    const digits = value.replace(/\D/g, '');
    return digits ? new Intl.NumberFormat('ko-KR').format(Number(digits)) : '';
}

export default function FranchiseLeadRegistrationPage() {
    const [form, setForm] = React.useState<LeadRegistrationForm>(LEAD_REGISTRATION_INITIAL_FORM);
    const [managers, setManagers] = React.useState<readonly ManagerOption[]>([]);
    const [message, setMessage] = React.useState<SaveMessage | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isManagerLoading, setIsManagerLoading] = React.useState(true);

    React.useEffect(() => {
        const storedUser = getStoredUser();
        const requesterId = getRequesterId(storedUser);
        const companyName = getStoredCompanyName(storedUser);
        if (!requesterId) { setIsManagerLoading(false); return; }

        const controller = new AbortController();
        const loadManagers = async () => {
            try {
                const params = new URLSearchParams({ requesterId });
                if (companyName) params.set('company', companyName);
                const response = await fetch(`/api/users?${params.toString()}`, {
                    cache: 'no-store',
                    headers: await getApiAuthHeaders(),
                    signal: controller.signal
                });
                if (!response.ok) {
                    setManagers([{ id: requesterId, name: storedUser?.name || '현재 담당자' }]);
                    return;
                }
                const nextManagers = parseManagerOptions(await response.json());
                setManagers(nextManagers.length > 0 ? nextManagers : [{ id: requesterId, name: storedUser?.name || '현재 담당자' }]);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setManagers([{ id: requesterId, name: storedUser?.name || '현재 담당자' }]);
            } finally {
                setIsManagerLoading(false);
            }
        };

        void loadManagers();
        return () => controller.abort();
    }, []);

    const updateField = <K extends keyof LeadRegistrationForm>(key: K, value: LeadRegistrationForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setMessage(null);
    };

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const storedUser = getStoredUser();
        const requesterId = getRequesterId(storedUser);
        if (!requesterId) {
            setMessage({ kind: 'error', text: '로그인 정보를 확인할 수 없습니다.' });
            return;
        }
        if (!form.name.trim()) {
            setMessage({ kind: 'error', text: '가맹 희망자명을 입력해주세요.' });
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/franchise-lead-registration-requests', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(buildLeadRegistrationPayload({
                    ...form,
                    mobile: formatLeadPhoneInput(form.mobile),
                    desiredRegion: normalizeLeadDesiredRegionValue(form.desiredRegion)
                }, {
                    requesterId,
                    companyName: getStoredCompanyName(storedUser)
                }))
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<{ readonly deduplicated?: boolean }>(payload);
            setForm(LEAD_REGISTRATION_INITIAL_FORM);
            setMessage({
                kind: 'success',
                text: data.deduplicated
                    ? '같은 연락처의 접수 정보를 업데이트했습니다.'
                    : '가맹 희망자 접수 DB에 저장했습니다. 어드민 확인 후 모객 DB로 반영할 수 있습니다.'
            });
        } catch (error) {
            setMessage({
                kind: 'error',
                text: error instanceof Error ? error.message : '가맹 희망자 접수 저장 중 오류가 발생했습니다.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <div className={styles.iconBox}><Users size={20} /></div>
                <div>
                    <h1>가맹 희망자 등록</h1>
                    <p>접수 DB에 먼저 저장하고, 어드민 검수 후 모객 DB로 밀어넣습니다.</p>
                </div>
            </section>

            <form className={styles.form} onSubmit={submit}>
                <fieldset className={styles.panel}>
                    <legend>기본 정보</legend>
                    <div className={styles.formGrid}>
                        <label>
                            가맹 희망자명 *
                            <input value={form.name} onChange={event => updateField('name', event.target.value)} placeholder="홍길동" />
                        </label>
                        <label>
                            연락처
                            <input
                                value={form.mobile}
                                onChange={event => updateField('mobile', formatLeadPhoneInput(event.target.value))}
                                placeholder="010-0000-0000"
                                inputMode="numeric"
                                autoComplete="tel"
                            />
                        </label>
                        <label>
                            상태
                            <select value={form.status} onChange={event => updateField('status', normalizeLeadStatus(event.target.value))}>
                                {FRANCHISE_LEAD_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </label>
                        <label>
                            등급
                            <select value={form.grade} onChange={event => updateField('grade', event.target.value)}>
                                <option value="">미지정</option>
                                {FRANCHISE_LEAD_GRADES.map(grade => (
                                    <option key={grade} value={grade}>{getFranchiseLeadGradeLabel(grade)}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            유입경로
                            <select value={form.source} onChange={event => updateField('source', event.target.value)}>
                                <option value="">미지정</option>
                                {FRANCHISE_LEAD_SOURCES
                                    .filter(source => source !== FRANCHISE_LEAD_REGISTRATION_SOURCE)
                                    .map(source => <option key={source} value={source}>{getFranchiseLeadSourceLabel(source)}</option>)}
                            </select>
                        </label>
                        <div className={styles.formField}>
                            <span>희망지역</span>
                            <LeadRegionMultiSelect
                                value={form.desiredRegion}
                                onChangeAction={desiredRegion => updateField('desiredRegion', desiredRegion)}
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className={styles.panel}>
                    <legend>상담 조건</legend>
                    <div className={styles.formGrid}>
                        <label>
                            예산 최소(만원)
                            <input value={form.budgetMin} onChange={event => updateField('budgetMin', formatManwonInput(event.target.value))} placeholder="10,000" inputMode="numeric" />
                        </label>
                        <label>
                            예산 최대(만원)
                            <input value={form.budgetMax} onChange={event => updateField('budgetMax', formatManwonInput(event.target.value))} placeholder="20,000" inputMode="numeric" />
                        </label>
                        <label>
                            관심브랜드
                            <input value={form.interestedBrand} onChange={event => updateField('interestedBrand', event.target.value)} placeholder="미카도" />
                        </label>
                        <label>
                            담당자
                            <select value={form.managerId} onChange={event => updateField('managerId', event.target.value)} disabled={isManagerLoading}>
                                <option value="">현재 담당자</option>
                                {managers.map(manager => (
                                    <option key={managerOptionValue(manager)} value={managerOptionValue(manager)}>
                                        {manager.name || manager.id}{manager.companyName ? ` · ${manager.companyName}` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            다음 연락일
                            <input type="datetime-local" value={form.nextContactAt} onChange={event => updateField('nextContactAt', event.target.value)} />
                        </label>
                    </div>
                    <label className={styles.memoLabel}>
                        메모
                        <textarea value={form.memo} onChange={event => updateField('memo', event.target.value)} placeholder="상담 내용, 관심 조건, 후속 액션을 기록하세요." />
                    </label>
                </fieldset>

                {message && <p className={message.kind === 'success' ? styles.successMessage : styles.errorMessage}>{message.text}</p>}

                <div className={styles.actions}>
                    <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                        <Save size={16} /> {isSaving ? '저장 중' : '접수 등록'}
                    </button>
                </div>
            </form>
        </main>
    );
}
