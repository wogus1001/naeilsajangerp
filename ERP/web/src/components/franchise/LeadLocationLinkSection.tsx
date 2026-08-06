"use client";

import React from 'react';
import { ExternalLink, Link2, MapPin, Search, Store, Trash2, X } from 'lucide-react';
import {
    buildLeadLocationLinkView,
    LEAD_LOCATION_LINK_STATUSES,
    type LeadLocationLink,
    type LeadLocationLinkStatus,
    type LeadLocationTargetType
} from '@/lib/franchise-lead-location-links';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type LeadLinkFranchiseLocation = {
    readonly id: string;
    readonly name: string;
    readonly locationType?: string | null;
    readonly brand?: string | null;
    readonly status?: string | null;
    readonly region?: string | null;
    readonly address?: string | null;
    readonly memo?: string | null;
};

export type LeadLinkExternalListing = {
    readonly id: string;
    readonly source?: string | null;
    readonly title?: string | null;
    readonly address?: string | null;
    readonly region?: string | null;
    readonly sourceUrl?: string | null;
    readonly depositAmount?: number | null;
    readonly monthlyRent?: number | null;
    readonly salePrice?: number | null;
    readonly areaPyeong?: string | null;
    readonly floorInfo?: string | null;
    readonly collectedAt?: string | null;
    readonly data?: Record<string, unknown> | null;
};

type Props = {
    readonly links: readonly LeadLocationLink[];
    readonly locations: readonly LeadLinkFranchiseLocation[];
    readonly externalListings: readonly LeadLinkExternalListing[];
    readonly isLoading: boolean;
    readonly isSaving: boolean;
    readonly onAddLinkAction: (targetType: LeadLocationTargetType, targetId: string) => void;
    readonly onUpdateLinkAction: (linkId: string, patch: { readonly status?: LeadLocationLinkStatus; readonly memo?: string }) => void;
    readonly onRemoveLinkAction: (linkId: string) => void;
};

type SourceTab = 'franchise_location' | 'external_property_listing';

function formatMoney(value?: number | null) {
    if (!value || !Number.isFinite(value)) return '';
    if (value >= 100_000_000) {
        const eok = Math.floor(value / 100_000_000);
        const man = Math.round((value % 100_000_000) / 10_000);
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${Math.round(value / 10_000).toLocaleString()}만원`;
}

function formatListingPrice(listing: LeadLinkExternalListing) {
    if (listing.salePrice) return `매매 ${formatMoney(listing.salePrice)}`;
    const deposit = formatMoney(listing.depositAmount);
    const rent = formatMoney(listing.monthlyRent);
    if (deposit || rent) return `보증금 ${deposit || '-'} / 월세 ${rent || '-'}`;
    return '가격 미확인';
}

function getListingSourceLabel(source?: string | null) {
    if (source === 'daangn') return '당근';
    return source || '외부';
}

function getLocationText(location: LeadLinkFranchiseLocation) {
    return [location.locationType || '후보지', location.status || '상태 미지정', location.brand || '브랜드 미지정']
        .filter(Boolean)
        .join(' · ');
}

function getExternalListingText(listing: LeadLinkExternalListing) {
    return [
        getListingSourceLabel(listing.source),
        formatListingPrice(listing),
        listing.areaPyeong || '',
        listing.floorInfo || ''
    ].filter(Boolean).join(' · ');
}

function getTargetTitle(
    link: LeadLocationLink,
    locationsById: ReadonlyMap<string, LeadLinkFranchiseLocation>,
    listingsById: ReadonlyMap<string, LeadLinkExternalListing>
) {
    if (link.targetType === 'franchise_location') {
        return locationsById.get(link.targetId)?.name || '삭제되었거나 찾을 수 없는 출점 후보지';
    }
    return listingsById.get(link.targetId)?.title || listingsById.get(link.targetId)?.address || '삭제되었거나 찾을 수 없는 외부 상가';
}

function getTargetSubText(
    link: LeadLocationLink,
    locationsById: ReadonlyMap<string, LeadLinkFranchiseLocation>,
    listingsById: ReadonlyMap<string, LeadLinkExternalListing>
) {
    if (link.targetType === 'franchise_location') {
        const location = locationsById.get(link.targetId);
        return location ? getLocationText(location) : '출점 후보지';
    }
    const listing = listingsById.get(link.targetId);
    return listing ? getExternalListingText(listing) : '외부 상가 수집 DB';
}

function getTargetAddress(
    link: LeadLocationLink,
    locationsById: ReadonlyMap<string, LeadLinkFranchiseLocation>,
    listingsById: ReadonlyMap<string, LeadLinkExternalListing>
) {
    if (link.targetType === 'franchise_location') {
        const location = locationsById.get(link.targetId);
        return location?.address || location?.region || '';
    }
    const listing = listingsById.get(link.targetId);
    return listing?.address || listing?.region || '';
}

function matchesSearch(value: string, searchTerm: string) {
    if (!searchTerm.trim()) return true;
    return value.toLowerCase().includes(searchTerm.trim().toLowerCase());
}

export function LeadLocationLinkSection({
    links,
    locations,
    externalListings,
    isLoading,
    isSaving,
    onAddLinkAction,
    onUpdateLinkAction,
    onRemoveLinkAction
}: Props) {
    const [sourceTab, setSourceTab] = React.useState<SourceTab>('franchise_location');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isPickerOpen, setIsPickerOpen] = React.useState(false);
    const [memoDrafts, setMemoDrafts] = React.useState<Readonly<Record<string, string>>>({});
    const locationView = React.useMemo(
        () => buildLeadLocationLinkView(locations, links),
        [links, locations]
    );
    const locationsById = locationView.linkedLocationsById;
    const listingsById = React.useMemo(() => new Map(externalListings.map(listing => [listing.id, listing])), [externalListings]);

    React.useEffect(() => {
        setMemoDrafts(Object.fromEntries(links.map(link => [link.id, link.memo])));
    }, [links]);

    React.useEffect(() => {
        if (!isPickerOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsPickerOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isPickerOpen]);

    const availableLocations = React.useMemo(() => {
        return locationView.candidateOptions
            .filter(location => matchesSearch(`${location.name} ${location.brand || ''} ${location.region || ''} ${location.address || ''}`, searchTerm))
            .slice(0, 8);
    }, [locationView.candidateOptions, searchTerm]);

    const availableListings = React.useMemo(() => {
        return externalListings
            .filter(listing => matchesSearch(`${listing.title || ''} ${listing.address || ''} ${listing.region || ''}`, searchTerm))
            .slice(0, 8);
    }, [externalListings, searchTerm]);

    const saveMemo = (link: LeadLocationLink) => {
        onUpdateLinkAction(link.id, { memo: memoDrafts[link.id] || '' });
    };

    const pickerBody = (
        <>
            <div className={styles.leadLinkPickerHead}>
                <div className={styles.viewTabs} aria-label="후보지 연결 소스">
                    <button
                        type="button"
                        className={sourceTab === 'franchise_location' ? styles.viewTabActive : styles.viewTab}
                        onClick={() => setSourceTab('franchise_location')}
                    >
                        <Store size={14} />
                        출점 후보지
                    </button>
                    <button
                        type="button"
                        className={sourceTab === 'external_property_listing' ? styles.viewTabActive : styles.viewTab}
                        onClick={() => setSourceTab('external_property_listing')}
                    >
                        <Link2 size={14} />
                        외부 상가 DB
                    </button>
                </div>
                <label className={styles.leadLinkSearch}>
                    <Search size={14} />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="지역, 주소, 브랜드 검색"
                    />
                </label>
            </div>

            {isLoading ? (
                <div className={styles.locationMatchEmpty}>연결 가능한 후보지를 불러오고 있습니다.</div>
            ) : sourceTab === 'franchise_location' ? (
                <div className={styles.leadLinkCandidateList}>
                    {availableLocations.length === 0 ? (
                        <div className={styles.locationMatchEmpty}>연결 가능한 출점 후보지가 없습니다.</div>
                    ) : availableLocations.map(location => (
                        <article key={location.id} className={styles.leadLinkCandidate}>
                            <div>
                                <strong>{location.name}</strong>
                                <span>{getLocationText(location)}</span>
                                <small>{location.address || location.region || '주소 미입력'}</small>
                            </div>
                            <button type="button" className={styles.secondaryButton} onClick={() => onAddLinkAction('franchise_location', location.id)} disabled={isSaving}>연결</button>
                        </article>
                    ))}
                </div>
            ) : (
                <div className={styles.leadLinkCandidateList}>
                    {availableListings.length === 0 ? (
                        <div className={styles.locationMatchEmpty}>연결 가능한 외부 상가 매물이 없습니다.</div>
                    ) : availableListings.map(listing => (
                        <article key={listing.id} className={styles.leadLinkCandidate}>
                            <div>
                                <strong>{listing.title || listing.address || '외부 상가'}</strong>
                                <span>{getExternalListingText(listing)}</span>
                                <small>{listing.address || listing.region || '주소 미입력'}</small>
                            </div>
                            <div className={styles.leadLinkCandidateActions}>
                                {listing.sourceUrl && (
                                    <a className={styles.secondaryButton} href={listing.sourceUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink size={13} />
                                        원문
                                    </a>
                                )}
                                <button type="button" className={styles.secondaryButton} onClick={() => onAddLinkAction('external_property_listing', listing.id)} disabled={isSaving}>연결</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <>
            <section className={styles.detailSection} aria-label="가맹 희망자 후보지 연결">
                <div className={styles.leadLinkSectionHeader}>
                    <div>
                        <h3><Link2 size={16} /> 연결된 후보지</h3>
                        <p className={styles.detailHint}>상담에 사용할 후보지만 연결해 둡니다.</p>
                    </div>
                    <button type="button" className={styles.primaryButton} onClick={() => setIsPickerOpen(true)}>
                        <Link2 size={15} />
                        후보지 연결
                    </button>
                </div>

                <div className={styles.leadLinkList}>
                    {links.length === 0 ? (
                        <div className={styles.locationMatchEmpty}>아직 연결된 후보지가 없습니다.</div>
                    ) : links.map(link => (
                        <article key={link.id} className={styles.leadLinkCard}>
                            <div className={styles.leadLinkCardHead}>
                                <div>
                                    <strong>{getTargetTitle(link, locationsById, listingsById)}</strong>
                                    <span>{getTargetSubText(link, locationsById, listingsById)}</span>
                                </div>
                                <select
                                    value={link.status}
                                    onChange={(event) => onUpdateLinkAction(link.id, { status: event.target.value as LeadLocationLinkStatus })}
                                    disabled={isSaving}
                                >
                                    {LEAD_LOCATION_LINK_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <p><MapPin size={13} /> {getTargetAddress(link, locationsById, listingsById) || '주소 미입력'}</p>
                            <div className={styles.leadLinkMemoRow}>
                                <textarea
                                    value={memoDrafts[link.id] || ''}
                                    onChange={(event) => setMemoDrafts(prev => ({ ...prev, [link.id]: event.target.value }))}
                                    placeholder="제안 메모, 고객 반응, 보류 사유를 남기세요."
                                />
                                <div>
                                    <button type="button" className={styles.secondaryButton} onClick={() => saveMemo(link)} disabled={isSaving}>메모 저장</button>
                                    <button type="button" className={styles.iconDangerButton} onClick={() => onRemoveLinkAction(link.id)} disabled={isSaving} aria-label="후보지 연결 삭제">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {isPickerOpen && (
                <div className={styles.leadLinkDrawerOverlay} role="presentation" onMouseDown={() => setIsPickerOpen(false)}>
                    <aside
                        className={styles.leadLinkDrawer}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="lead-location-link-drawer-title"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className={styles.leadLinkDrawerHeader}>
                            <div>
                                <strong id="lead-location-link-drawer-title">후보지 연결</strong>
                                <span>출점 후보지와 외부 상가 DB에서 선택</span>
                            </div>
                            <button type="button" className={styles.iconButton} onClick={() => setIsPickerOpen(false)} aria-label="후보지 연결 패널 닫기">
                                <X size={17} />
                            </button>
                        </div>
                        {pickerBody}
                    </aside>
                </div>
            )}
        </>
    );
}
