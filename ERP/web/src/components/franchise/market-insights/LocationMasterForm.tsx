"use client";

import React from 'react';
import KakaoAddressSearch, { type KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import FranchiseBrandSelector from '@/components/franchise/FranchiseBrandSelector';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import {
    LOCATION_DEVELOPMENT_STAGES,
    LOCATION_IMPORTANCE_LEVELS,
    parseLocationMoney,
    toLocationDevelopmentStage,
    toLocationImportanceLevel,
    type LocationSiteCondition,
    type SiteConditionItem
} from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { LocationConditionControl } from './LocationConditionControl';
import { LocationAreaInput } from './LocationAreaInput';
import {
    FRANCHISE_LOCATION_STATUSES,
    FRANCHISE_LOCATION_TYPES,
    type LocationFormState,
    type LocationManagerOption
} from './locationMasterTypes';
import {
    toFranchiseLocationStatus,
    toFranchiseLocationType
} from './locationMasterUtils';

type ConditionKey = 'restroom' | 'elevator' | 'demolition' | 'parking';

type LocationMasterFormProps = {
    readonly userId: string;
    readonly companyName: string;
    readonly form: LocationFormState;
    readonly managerOptions: readonly LocationManagerOption[];
    readonly isManagerLoading: boolean;
    readonly isSaving: boolean;
    readonly onChange: (patch: Partial<LocationFormState>) => void;
    readonly onReset: () => void;
    readonly onSave: () => void;
    readonly onSelectAddress: (result: KakaoAddressResult) => void;
    readonly onSelectBrand: (brand: FranchiseBrand) => void;
};

function formatInputNumber(value: number | null): string {
    return value === null ? '' : String(value);
}

export function LocationMasterForm({
    userId,
    companyName,
    form,
    managerOptions,
    isManagerLoading,
    isSaving,
    onChange,
    onReset,
    onSave,
    onSelectAddress,
    onSelectBrand
}: LocationMasterFormProps) {
    const updateSiteCondition = (patch: Partial<LocationSiteCondition>) => {
        onChange({ siteCondition: { ...form.siteCondition, ...patch } });
    };
    const updateCondition = (key: ConditionKey, patch: Partial<SiteConditionItem>) => {
        onChange({
            siteCondition: {
                ...form.siteCondition,
                [key]: { ...form.siteCondition[key], ...patch }
            }
        });
    };
    const hasSelectedManager = managerOptions.some(
        option => option.id === form.managerId || option.displayId === form.managerId
    );
    const managerPlaceholder = isManagerLoading
        ? '담당자 불러오는 중'
        : managerOptions.length > 0 ? '담당자를 선택해주세요' : '선택 가능한 담당자 없음';

    return (
        <div className={styles.locationFormStack}>
            <section className={styles.locationFormSection}>
                <h4>기본 위치</h4>
                <div className={styles.locationFormGrid}>
                    <label>
                        후보지명
                        <input value={form.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="예: 강남역 1층 후보지" />
                    </label>
                    <label>
                        중요도
                        <select value={form.importance} onChange={(event) => onChange({ importance: toLocationImportanceLevel(event.target.value) })}>
                            {LOCATION_IMPORTANCE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </label>
                    <label>
                        구분
                        <select value={form.locationType} onChange={(event) => onChange({ locationType: toFranchiseLocationType(event.target.value) })}>
                            {FRANCHISE_LOCATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </label>
                    <label>
                        진행상태
                        <select value={form.status} onChange={(event) => onChange({ status: toFranchiseLocationStatus(event.target.value) })}>
                            {FRANCHISE_LOCATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </label>
                    <label>
                        개발상태
                        <select value={form.developmentStage} onChange={(event) => onChange({ developmentStage: toLocationDevelopmentStage(event.target.value) })}>
                            {LOCATION_DEVELOPMENT_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                    </label>
                    <label>
                        담당자
                        <select value={form.managerId} onChange={(event) => onChange({ managerId: event.target.value })}>
                            {!form.managerId ? <option value="">{managerPlaceholder}</option> : null}
                            {!hasSelectedManager && form.managerId ? <option value={form.managerId}>담당자 재선택 필요</option> : null}
                            {managerOptions.map(manager => (
                                <option key={manager.id} value={manager.id}>
                                    {manager.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <FranchiseBrandSelector
                        requesterId={userId}
                        companyName={companyName}
                        value={form.brand}
                        onBrandChange={(brand) => onChange({ brand, brandId: '' })}
                        onSelectBrand={onSelectBrand}
                        classNames={{
                            row: styles.locationAddressSearchRow,
                            button: styles.locationAddressSearchButton,
                            results: styles.locationAddressResults,
                            resultItem: styles.locationAddressResult,
                            resultMeta: styles.locationAddressResultMeta,
                            badge: styles.locationBrandSavedBadge,
                            empty: styles.locationAddressEmpty
                        }}
                    />
                    <KakaoAddressSearch
                        requesterId={userId}
                        value={form.address}
                        onAddressChange={(address) => onChange({ address, latitude: null, longitude: null })}
                        onSelect={onSelectAddress}
                        classNames={{
                            field: styles.locationWideField,
                            row: styles.locationAddressSearchRow,
                            button: styles.locationAddressSearchButton,
                            results: styles.locationAddressResults,
                            resultItem: styles.locationAddressResult,
                            resultMeta: styles.locationAddressResultMeta,
                            empty: styles.locationAddressEmpty
                        }}
                    />
                    <label className={styles.locationWideField}>
                        상세주소
                        <input value={form.addressDetail} onChange={(event) => onChange({ addressDetail: event.target.value })} placeholder="예: 1층, 101호, 출입구 방향" />
                    </label>
                    <label className={styles.locationWideField}>
                        경쟁검색 키워드
                        <input value={form.competitionKeyword} onChange={(event) => onChange({ competitionKeyword: event.target.value })} placeholder="예: 한식, 고기집, 카페" />
                    </label>
                </div>
            </section>

            <section className={styles.locationFormSection}>
                <h4>면적 · 시설</h4>
                <div className={styles.locationFormGrid}>
                    <LocationAreaInput
                        value={form.siteCondition.exclusiveAreaPyeong}
                        onChange={(exclusiveAreaPyeong) => updateSiteCondition({ exclusiveAreaPyeong })}
                    />
                    <label>
                        면적 메모
                        <input value={form.siteCondition.exclusiveAreaMemo} onChange={(event) => updateSiteCondition({ exclusiveAreaMemo: event.target.value })} placeholder="전용/공용 면적 확인사항" />
                    </label>
                    <LocationConditionControl label="화장실" value={form.siteCondition.restroom} onChange={(patch) => updateCondition('restroom', patch)} />
                    <LocationConditionControl label="엘리베이터" value={form.siteCondition.elevator} onChange={(patch) => updateCondition('elevator', patch)} />
                    <LocationConditionControl label="철거" value={form.siteCondition.demolition} onChange={(patch) => updateCondition('demolition', patch)} />
                    <LocationConditionControl label="주차" value={form.siteCondition.parking} onChange={(patch) => updateCondition('parking', patch)} />
                </div>
            </section>

            <section className={styles.locationFormSection}>
                <h4>입점 비용</h4>
                <div className={styles.locationFormGrid}>
                    <label>
                        보증금
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.cost.deposit)} onChange={(event) => onChange({ cost: { ...form.cost, deposit: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label>
                        권리금
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.cost.premium)} onChange={(event) => onChange({ cost: { ...form.cost, premium: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label className={styles.locationMemoField}>
                        입점 비용 메모
                        <textarea value={form.cost.memo} onChange={(event) => onChange({ cost: { ...form.cost, memo: event.target.value } })} placeholder="권리금 협의, 보증금 조정 여지" />
                    </label>
                </div>
            </section>

            <section className={styles.locationFormSection}>
                <h4>임차조건</h4>
                <div className={styles.locationFormGrid}>
                    <label>
                        월세
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.lease.monthlyRent)} onChange={(event) => onChange({ lease: { ...form.lease, monthlyRent: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label>
                        관리비
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.lease.maintenanceFee)} onChange={(event) => onChange({ lease: { ...form.lease, maintenanceFee: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label className={styles.locationMemoField}>
                        임차조건 메모
                        <textarea value={form.lease.memo} onChange={(event) => onChange({ lease: { ...form.lease, memo: event.target.value } })} placeholder="렌트프리, 관리비 포함 항목, 계약 조건" />
                    </label>
                </div>
            </section>

            <section className={styles.locationFormSection}>
                <h4>임대인 · 종합메모</h4>
                <div className={styles.locationFormGrid}>
                    <label>
                        임대인명
                        <input value={form.landlord.name} onChange={(event) => onChange({ landlord: { ...form.landlord, name: event.target.value } })} placeholder="내부 확인용" />
                    </label>
                    <label>
                        임대인 연락처
                        <input value={form.landlord.phone} onChange={(event) => onChange({ landlord: { ...form.landlord, phone: event.target.value } })} placeholder="내부 확인용" />
                    </label>
                    <label className={styles.locationMemoField}>
                        임대인정보 및 성향
                        <textarea value={form.landlord.tendency} onChange={(event) => onChange({ landlord: { ...form.landlord, tendency: event.target.value } })} placeholder="협의 성향, 의사결정 속도, 주의사항" />
                    </label>
                    <label className={styles.locationMemoField}>
                        종합메모
                        <textarea value={form.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="현장 판단, 리스크, 다음 확인사항" />
                    </label>
                </div>
            </section>

            <div className={styles.locationFormActions}>
                <button className={styles.secondaryButton} onClick={onReset} disabled={isSaving}>초기화</button>
                <button className={styles.primaryButton} onClick={onSave} disabled={isSaving}>
                    {isSaving ? '저장 중' : form.id ? '후보지 수정' : '후보지 등록'}
                </button>
            </div>
        </div>
    );
}
