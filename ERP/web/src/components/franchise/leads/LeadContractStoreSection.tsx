"use client";

import React from 'react';
import { ExternalLink, MapPin, Save, Store, Wand2 } from 'lucide-react';
import KakaoAddressSearch, { type KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import {
    buildContractStoreFormState,
    readContractStoreFormStatus,
    type ContractStoreFormState
} from '@/lib/franchise-contract-store-form';
import {
    readContractStoreSourceType
} from '@/lib/franchise-contract-store';
import { isLeadLocationCandidate } from '@/lib/franchise-lead-location-links';
import type {
    ExternalPropertyListing,
    FranchiseLead,
    FranchiseLocation,
    LeadLocationLink
} from './types';
import { LeadExistingStoreLinkPanel } from './LeadExistingStoreLinkPanel';
import { useLeadDetailRuntime } from './LeadDetailRuntimeProvider';
import styles from './LeadContractStoreSection.module.css';

type SourceOption = {
    readonly key: string;
    readonly sourceType: 'franchise_location' | 'external_property_listing';
    readonly targetId: string;
    readonly title: string;
    readonly meta: string;
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
};

type LeadContractStoreSectionProps = {
    readonly lead: FranchiseLead;
    readonly userId: string;
    readonly companyName: string;
    readonly selectedLocationLinks: readonly LeadLocationLink[];
    readonly franchiseLocations: readonly FranchiseLocation[];
    readonly externalListings: readonly ExternalPropertyListing[];
    readonly isLocationMatchLoading: boolean;
};

const STORE_STATUSES = ['오픈준비', '운영중', '휴점', '폐점'];

function buildSourceKey(sourceType: SourceOption['sourceType'], targetId: string): string {
    return `${sourceType}:${targetId}`;
}

function parseSourceKey(value: string): Pick<SourceOption, 'sourceType' | 'targetId'> | null {
    const [rawType, targetId] = value.split(':');
    const sourceType = readContractStoreSourceType(rawType);
    if (sourceType === 'direct' || !targetId) return null;
    return { sourceType, targetId };
}

function formatMoney(value?: number | null): string {
    if (!value || !Number.isFinite(value)) return '';
    return `${Math.round(value / 10_000).toLocaleString()}만원`;
}

function updateAddressFromKakao(result: KakaoAddressResult): Pick<ContractStoreFormState, 'address' | 'region' | 'latitude' | 'longitude'> {
    return {
        address: result.address,
        region: result.region,
        latitude: result.latitude,
        longitude: result.longitude
    };
}

function formatListingMeta(listing: ExternalPropertyListing): string {
    const price = listing.salePrice
        ? `매매 ${formatMoney(listing.salePrice)}`
        : `보증금 ${formatMoney(listing.depositAmount) || '-'} / 월세 ${formatMoney(listing.monthlyRent) || '-'}`;
    return [listing.source || '외부 상가', price, listing.areaPyeong || '', listing.floorInfo || '']
        .filter(Boolean)
        .join(' · ');
}

export function LeadContractStoreSection({
    lead,
    userId,
    companyName,
    selectedLocationLinks,
    franchiseLocations,
    externalListings,
    isLocationMatchLoading
}: LeadContractStoreSectionProps) {
    const { store: storeRuntime } = useLeadDetailRuntime();
    const [storeLocation, setStoreLocation] = React.useState<FranchiseLocation | null>(null);
    const [selectedSourceKey, setSelectedSourceKey] = React.useState('');
    const [isDirectEntry, setIsDirectEntry] = React.useState(false);
    const [form, setForm] = React.useState<ContractStoreFormState>(() => buildContractStoreFormState(lead));
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

    const sourceOptions = React.useMemo<readonly SourceOption[]>(() => {
        const locationsById = new Map(franchiseLocations.map(location => [location.id, location]));
        const listingsById = new Map(externalListings.map(listing => [listing.id, listing]));
        const options: SourceOption[] = [];
        selectedLocationLinks.forEach(link => {
            if (link.targetType === 'franchise_location') {
                const location = locationsById.get(link.targetId);
                if (!location) return;
                if (!isLeadLocationCandidate(location)) return;
                options.push({
                    key: buildSourceKey('franchise_location', location.id),
                    sourceType: 'franchise_location',
                    targetId: location.id,
                    title: location.name,
                    meta: [location.locationType || '예정점', location.status || '상태 미지정', location.brand || '브랜드 미지정'].join(' · '),
                    region: location.region || '',
                    address: location.address || location.region || '',
                    latitude: location.latitude ?? null,
                    longitude: location.longitude ?? null
                });
                return;
            }
            const listing = listingsById.get(link.targetId);
            if (!listing) return;
            options.push({
                key: buildSourceKey('external_property_listing', listing.id),
                sourceType: 'external_property_listing',
                targetId: listing.id,
                title: listing.title || listing.address || '외부 상가',
                meta: formatListingMeta(listing),
                region: listing.region || '',
                address: listing.address || listing.region || '',
                latitude: null,
                longitude: null
            });
        });
        return options;
    }, [externalListings, franchiseLocations, selectedLocationLinks]);

    const selectedSource = sourceOptions.find(option => option.key === selectedSourceKey) || null;

    const fetchStoreLocation = React.useCallback(async () => {
        if (!userId || !lead.id) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const location = await storeRuntime.load({ leadId: lead.id, userId, companyName });
            setStoreLocation(location);
            if (location) setForm(buildContractStoreFormState(lead, location));
        } catch (error) {
            setStoreLocation(null);
            setErrorMessage(error instanceof Error ? error.message : '가맹점 정보를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, lead, storeRuntime, userId]);

    React.useEffect(() => {
        void fetchStoreLocation();
    }, [fetchStoreLocation]);

    React.useEffect(() => {
        if (!isDirectEntry && !selectedSourceKey && sourceOptions.length === 1) {
            setSelectedSourceKey(sourceOptions[0]?.key || '');
        }
    }, [isDirectEntry, selectedSourceKey, sourceOptions]);

    React.useEffect(() => {
        if (!storeLocation) setForm(buildContractStoreFormState(lead, null, selectedSource));
    }, [lead, selectedSource, storeLocation]);

    const updateForm = (patch: Partial<ContractStoreFormState>) => {
        setForm(prev => ({ ...prev, ...patch }));
    };

    const selectSource = (sourceKey: string) => {
        setIsDirectEntry(false);
        setSelectedSourceKey(sourceKey);
    };

    const switchToDirectEntry = () => {
        setIsDirectEntry(true);
        setSelectedSourceKey('');
        setForm(buildContractStoreFormState(lead));
    };

    const saveExistingStore = async () => {
        if (!storeLocation) return;
        setIsSaving(true);
        setErrorMessage('');
        setMessage('');
        try {
            const location = await storeRuntime.save({
                locationId: storeLocation.id,
                form,
                userId,
                companyName
            });
            setStoreLocation(location);
            setMessage('가맹점 정보를 저장했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '가맹점 정보를 저장하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const createStore = async (useSource: boolean) => {
        const parsedSource = useSource ? parseSourceKey(selectedSourceKey) : null;
        if (!form.address.trim()) {
            setErrorMessage('주소 검색으로 가맹점 주소를 선택해주세요.');
            setMessage('');
            return;
        }
        setIsSaving(true);
        setErrorMessage('');
        setMessage('');
        try {
            const result = await storeRuntime.create({
                leadId: lead.id,
                form,
                sourceType: parsedSource?.sourceType || 'direct',
                sourceId: parsedSource?.targetId || '',
                userId,
                companyName
            });
            setStoreLocation(result.location);
            setMessage(result.created ? '가맹점 정보를 생성했습니다.' : '이미 연결된 가맹점 정보를 불러왔습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '가맹점 정보를 생성하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const linkExistingStore = async (locationId: string) => {
        if (!locationId) return;
        setIsSaving(true);
        setErrorMessage('');
        setMessage('');
        try {
            const location = await storeRuntime.link({
                leadId: lead.id,
                locationId,
                userId,
                companyName
            });
            if (!location) throw new Error('연결한 가맹점 정보를 확인하지 못했습니다.');
            setStoreLocation(location);
            setForm(buildContractStoreFormState(lead, location));
            setMessage('기존 가맹점 목록과 계약 점주를 연결했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '기존 가맹점 연결에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <div>
                    <h3><Store size={16} /> 가맹점 정보</h3>
                    <p>계약 완료 점주를 오픈준비 가맹점 마스터로 이어받습니다.</p>
                </div>
                {storeLocation ? <span className={styles.readyBadge}>연동됨</span> : <span className={styles.pendingBadge}>등록 전</span>}
            </div>

            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
            {message && <div className={styles.message}>{message}</div>}

            {!storeLocation && (
                <LeadExistingStoreLinkPanel
                    leadId={lead.id}
                    locations={franchiseLocations}
                    isBusy={isSaving || isLoading || isLocationMatchLoading}
                    onLinkAction={(locationId) => void linkExistingStore(locationId)}
                />
            )}

            {!storeLocation && (
                <>
                    <div className={styles.createDivider}><span>새 가맹점 만들기</span></div>
                    <div className={styles.sourcePanel}>
                        <div className={styles.sourceHeader}>
                            <strong>가맹 운영으로 전환할 후보지</strong>
                            <span>{isLocationMatchLoading ? '후보지를 불러오는 중입니다.' : `${sourceOptions.length}건 연결됨`}</span>
                        </div>
                        {sourceOptions.length > 0 ? (
                            <div className={styles.sourceList}>
                                {sourceOptions.map(option => (
                                    <label key={option.key} className={selectedSourceKey === option.key ? styles.sourceOptionActive : styles.sourceOption}>
                                        <input
                                            type="radio"
                                            name="contract-store-source"
                                            checked={selectedSourceKey === option.key}
                                            onChange={() => selectSource(option.key)}
                                        />
                                        <span>
                                            <strong>{option.title}</strong>
                                            <small>{option.meta}</small>
                                            <em><MapPin size={13} /> {option.address || '주소 미입력'}</em>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty}>연결된 후보지가 없습니다. 직접 입력으로 먼저 등록할 수 있습니다.</div>
                        )}
                        {sourceOptions.length > 0 && (
                            <button type="button" className={styles.directEntryButton} onClick={switchToDirectEntry} disabled={isSaving || isLoading}>
                                직접 입력으로 전환
                            </button>
                        )}
                    </div>
                </>
            )}

            <div className={styles.formGrid} aria-busy={isLoading}>
                <label>
                    가맹점명
                    <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} disabled={isSaving || isLoading} />
                </label>
                <label>
                    브랜드
                    <input value={form.brand} onChange={(event) => updateForm({ brand: event.target.value })} disabled={isSaving || isLoading} />
                </label>
                <label>
                    상태
                    <select value={form.status} onChange={(event) => updateForm({ status: readContractStoreFormStatus(event.target.value) })} disabled={isSaving || isLoading}>
                        {STORE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <label>
                    지역
                    <input value={form.region} onChange={(event) => updateForm({ region: event.target.value })} disabled={isSaving || isLoading} />
                </label>
                <KakaoAddressSearch
                    requesterId={userId}
                    value={form.address}
                    disabled={isSaving || isLoading}
                    onAddressChange={(address) => updateForm({ address, latitude: null, longitude: null })}
                    onSelect={(result) => updateForm(updateAddressFromKakao(result))}
                    classNames={{
                        field: styles.wideField,
                        row: styles.addressSearchRow,
                        button: styles.addressSearchButton
                    }}
                />
                <label>
                    오픈예정일/오픈일
                    <input type="date" value={form.openedAt} onChange={(event) => updateForm({ openedAt: event.target.value })} disabled={isSaving || isLoading} />
                </label>
                <label className={styles.memoField}>
                    운영 이관 메모
                    <textarea value={form.memo} onChange={(event) => updateForm({ memo: event.target.value })} disabled={isSaving || isLoading} />
                </label>
            </div>

            <div className={styles.actionRow}>
                {storeLocation ? (
                    <>
                        <a href={`/dashboard/franchise-operations?locationId=${storeLocation.id}`} className={styles.secondaryAction}>
                            <ExternalLink size={15} />
                            운영 화면
                        </a>
                        <button type="button" className={styles.primaryAction} onClick={() => void saveExistingStore()} disabled={isSaving || isLoading}>
                            <Save size={15} />
                            가맹점 수정
                        </button>
                    </>
                ) : (
                    <>
                        {(isDirectEntry || sourceOptions.length === 0) && (
                            <button
                                type="button"
                                className={styles.secondaryAction}
                                onClick={() => void createStore(false)}
                                disabled={isSaving || isLoading}
                            >
                                직접 입력 생성
                            </button>
                        )}
                        {sourceOptions.length > 0 && (
                            <button
                                type="button"
                                className={styles.primaryAction}
                                onClick={() => void createStore(true)}
                                disabled={isSaving || isLoading || !selectedSourceKey}
                            >
                                <Wand2 size={15} />
                                가맹 운영에 생성
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
