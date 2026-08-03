import KakaoAddressSearch, {
    type KakaoAddressLookupSource,
    type KakaoAddressResult
} from '@/components/franchise/KakaoAddressSearch';
import FranchiseBrandSelector, {
    type FranchiseBrandSearchSource
} from '@/components/franchise/FranchiseBrandSelector';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { formatManagerDisplayName } from '@/lib/franchise-manager-display';
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
import { LocationAttachmentFileInput } from './LocationAttachmentFileInput';
import { LocationMemoSection } from './LocationMemoSection';
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
    readonly addressLookupSource?: KakaoAddressLookupSource | undefined;
    readonly brandSearchSource?: FranchiseBrandSearchSource | undefined;
    readonly onChangeAction: (patch: Partial<LocationFormState>) => void;
    readonly onResetAction: () => void;
    readonly onSaveAction: () => void;
    readonly onSelectAddressAction: (result: KakaoAddressResult) => void;
    readonly onSelectBrandAction: (brand: FranchiseBrand) => void;
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
    addressLookupSource,
    brandSearchSource,
    onChangeAction,
    onResetAction,
    onSaveAction,
    onSelectAddressAction,
    onSelectBrandAction
}: LocationMasterFormProps) {
    const updateSiteCondition = (patch: Partial<LocationSiteCondition>) => {
        onChangeAction({ siteCondition: { ...form.siteCondition, ...patch } });
    };
    const updateCondition = (key: ConditionKey, patch: Partial<SiteConditionItem>) => {
        onChangeAction({
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
                        <input value={form.name} onChange={(event) => onChangeAction({ name: event.target.value })} placeholder="예: 강남역 1층 후보지" />
                    </label>
                    <label>
                        중요도
                        <select value={form.importance} onChange={(event) => onChangeAction({ importance: toLocationImportanceLevel(event.target.value) })}>
                            {LOCATION_IMPORTANCE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </label>
                    <label>
                        구분
                        <select value={form.locationType} onChange={(event) => onChangeAction({ locationType: toFranchiseLocationType(event.target.value) })}>
                            {FRANCHISE_LOCATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </label>
                    <label>
                        진행상태
                        <select value={form.status} onChange={(event) => onChangeAction({ status: toFranchiseLocationStatus(event.target.value) })}>
                            {FRANCHISE_LOCATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </label>
                    <label>
                        개발상태
                        <select value={form.developmentStage} onChange={(event) => onChangeAction({ developmentStage: toLocationDevelopmentStage(event.target.value) })}>
                            {LOCATION_DEVELOPMENT_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                    </label>
                    <label>
                        담당자
                        <select value={form.managerId} onChange={(event) => onChangeAction({ managerId: event.target.value })}>
                            {!form.managerId ? <option value="">{managerPlaceholder}</option> : null}
                            {!hasSelectedManager && form.managerId ? <option value={form.managerId}>담당자 재선택 필요</option> : null}
                            {managerOptions.map(manager => (
                                <option key={manager.id} value={manager.id}>
                                    {formatManagerDisplayName(manager)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <FranchiseBrandSelector
                        requesterId={userId}
                        companyName={companyName}
                        value={form.brand}
                        searchSource={brandSearchSource}
                        onBrandChange={(brand) => onChangeAction({ brand, brandId: '' })}
                        onSelectBrand={onSelectBrandAction}
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
                        lookupSource={addressLookupSource}
                        onAddressChange={(address) => onChangeAction({ address, latitude: null, longitude: null })}
                        onSelect={onSelectAddressAction}
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
                        <input value={form.addressDetail} onChange={(event) => onChangeAction({ addressDetail: event.target.value })} placeholder="예: 1층, 101호, 출입구 방향" />
                    </label>
                    <label className={styles.locationWideField}>
                        경쟁검색 키워드
                        <input value={form.competitionKeyword} onChange={(event) => onChangeAction({ competitionKeyword: event.target.value })} placeholder="예: 한식, 고기집, 카페" />
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
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.cost.deposit)} onChange={(event) => onChangeAction({ cost: { ...form.cost, deposit: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label>
                        권리금
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.cost.premium)} onChange={(event) => onChangeAction({ cost: { ...form.cost, premium: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label className={styles.locationMemoField}>
                        입점 비용 메모
                        <textarea value={form.cost.memo} onChange={(event) => onChangeAction({ cost: { ...form.cost, memo: event.target.value } })} placeholder="권리금 협의, 보증금 조정 여지" />
                    </label>
                </div>
            </section>

            <section className={styles.locationFormSection}>
                <h4>임차조건</h4>
                <div className={styles.locationFormGrid}>
                    <label>
                        월세
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.lease.monthlyRent)} onChange={(event) => onChangeAction({ lease: { ...form.lease, monthlyRent: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label>
                        관리비
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={formatInputNumber(form.lease.maintenanceFee)} onChange={(event) => onChangeAction({ lease: { ...form.lease, maintenanceFee: parseLocationMoney(event.target.value) } })} placeholder="만원" />
                    </label>
                    <label className={styles.locationMemoField}>
                        임차조건 메모
                        <textarea value={form.lease.memo} onChange={(event) => onChangeAction({ lease: { ...form.lease, memo: event.target.value } })} placeholder="렌트프리, 관리비 포함 항목, 계약 조건" />
                    </label>
                </div>
            </section>

            <section className={styles.locationFormSection}>
                <h4>사진 및 자료</h4>
                <LocationAttachmentFileInput
                    attachments={form.fileAttachments}
                    onChange={(fileAttachments) => onChangeAction({
                        fileAttachments,
                        fileNames: fileAttachments.map(file => file.name)
                    })}
                />
            </section>

            <LocationMemoSection form={form} onChange={onChangeAction} />

            <div className={styles.locationFormActions}>
                <button className={styles.secondaryButton} onClick={onResetAction} disabled={isSaving}>초기화</button>
                <button className={styles.primaryButton} onClick={onSaveAction} disabled={isSaving}>
                    {isSaving ? '저장 중' : form.id ? '후보지 수정' : '후보지 등록'}
                </button>
            </div>
        </div>
    );
}
