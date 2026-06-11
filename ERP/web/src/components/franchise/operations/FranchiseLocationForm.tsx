import KakaoAddressSearch, { type KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import FranchiseBrandSelector from '@/components/franchise/FranchiseBrandSelector';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    FRANCHISE_LOCATION_STATUSES,
    FRANCHISE_LOCATION_TYPES,
    type LocationFormState,
    toFranchiseLocationStatus,
    toFranchiseLocationType
} from './types';

type FranchiseLocationFormProps = {
    readonly userId: string;
    readonly companyName: string;
    readonly form: LocationFormState;
    readonly isSaving: boolean;
    readonly onChange: (patch: Partial<LocationFormState>) => void;
    readonly onReset: () => void;
    readonly onSave: () => void;
    readonly onSelectAddress: (result: KakaoAddressResult) => void;
    readonly onSelectBrand: (brand: FranchiseBrand) => void;
};

export function FranchiseLocationForm({
    userId,
    companyName,
    form,
    isSaving,
    onChange,
    onReset,
    onSave,
    onSelectAddress,
    onSelectBrand
}: FranchiseLocationFormProps) {
    return (
        <div className={styles.locationFormGrid}>
            <label>
                가맹점명
                <input value={form.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="예: 강남역점" />
            </label>
            <label>
                구분
                <select value={form.locationType} onChange={(event) => onChange({ locationType: toFranchiseLocationType(event.target.value) })}>
                    {FRANCHISE_LOCATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </label>
            <label>
                상태
                <select value={form.status} onChange={(event) => onChange({ status: toFranchiseLocationStatus(event.target.value) })}>
                    {FRANCHISE_LOCATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
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
            <label>
                경쟁검색 키워드
                <input value={form.competitionKeyword} onChange={(event) => onChange({ competitionKeyword: event.target.value })} placeholder="예: 한식, 고기집, 카페" />
            </label>
            <label>
                지역
                <input value={form.region} onChange={(event) => onChange({ region: event.target.value })} placeholder="예: 서울 강남구" />
            </label>
            <KakaoAddressSearch
                requesterId={userId}
                value={form.address}
                onAddressChange={(address) => onChange({ address, latitude: null, longitude: null })}
                onSelect={onSelectAddress}
                classNames={{
                    row: styles.locationAddressSearchRow,
                    button: styles.locationAddressSearchButton,
                    results: styles.locationAddressResults,
                    resultItem: styles.locationAddressResult,
                    resultMeta: styles.locationAddressResultMeta,
                    empty: styles.locationAddressEmpty
                }}
            />
            <label>
                오픈일
                <input type="date" value={form.openedAt} onChange={(event) => onChange({ openedAt: event.target.value })} />
            </label>
            <label className={styles.locationMemoField}>
                운영 메모
                <textarea value={form.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="SV 점검, 오픈 준비, 운영 이슈 메모" />
            </label>
            <div className={styles.locationFormActions}>
                <button className={styles.secondaryButton} onClick={onReset} disabled={isSaving}>초기화</button>
                <button className={styles.primaryButton} onClick={onSave} disabled={isSaving}>
                    {isSaving ? '저장 중' : form.id ? '가맹점 수정' : '가맹점 등록'}
                </button>
            </div>
        </div>
    );
}
