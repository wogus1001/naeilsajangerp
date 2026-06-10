"use client";

import React from 'react';
import { Search, X } from 'lucide-react';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { inferBrandKeywords } from '@/lib/franchise-brands';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type ClassNames = {
    field?: string;
    row?: string;
    input?: string;
    button?: string;
    results?: string;
    resultItem?: string;
    resultMeta?: string;
    badge?: string;
    empty?: string;
};

type FranchiseBrandSelectorProps = {
    requesterId: string;
    companyName?: string;
    value: string;
    disabled?: boolean;
    classNames?: ClassNames;
    onBrandChange: (value: string) => void;
    onSelectBrand: (brand: FranchiseBrand) => void;
};

type BrandListResponse = {
    brands: FranchiseBrand[];
};

type FranchiseCacheBrand = {
    brandNm?: string;
    indutyLclasNm?: string;
    indutyMlsfcNm?: string;
};

const OFFICIAL_SEARCH_WAIT_MS = 3500;

function buildCustomBrand(brandName: string): FranchiseBrand {
    return {
        id: `custom-${brandName}`,
        brandName,
        recommendedKeywords: inferBrandKeywords({ brandName }),
        source: 'custom',
        isSaved: false
    };
}

function mapFranchiseCacheBrand(brand: FranchiseCacheBrand, index: number): FranchiseBrand | null {
    const brandName = String(brand.brandNm || '').trim();
    if (!brandName) return null;

    const categoryMajor = String(brand.indutyLclasNm || '').trim();
    const categoryMiddle = String(brand.indutyMlsfcNm || '').trim();

    return {
        id: `disclosure-cache-${brandName}-${index}`,
        brandName,
        industry: categoryMiddle || categoryMajor,
        categoryMajor,
        categoryMiddle,
        recommendedKeywords: inferBrandKeywords({
            brandName,
            industry: categoryMiddle || categoryMajor,
            categoryMajor,
            categoryMiddle
        }),
        source: 'disclosure-cache',
        isSaved: false,
        data: { raw: brand }
    };
}

function mergeBrands(primary: FranchiseBrand[], secondary: FranchiseBrand[]) {
    const seen = new Set<string>();
    return [...primary, ...secondary].filter(brand => {
        const key = brand.brandName.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getBrandSourceLabel(brand: FranchiseBrand) {
    if (brand.isSaved) return '저장 브랜드';
    if (brand.source === 'disclosure-api' || brand.source === 'disclosure-cache') return '정보공개서';
    return '공용 브랜드';
}

function wait(ms: number) {
    return new Promise<null>(resolve => {
        window.setTimeout(() => resolve(null), ms);
    });
}

export default function FranchiseBrandSelector({
    requesterId,
    companyName = '',
    value,
    disabled = false,
    classNames = {},
    onBrandChange,
    onSelectBrand
}: FranchiseBrandSelectorProps) {
    const [query, setQuery] = React.useState(value);
    const [modalQuery, setModalQuery] = React.useState(value);
    const [brands, setBrands] = React.useState<FranchiseBrand[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [hasSearched, setHasSearched] = React.useState(false);
    const searchRunRef = React.useRef(0);

    React.useEffect(() => {
        setQuery(value);
        if (!isModalOpen) setModalQuery(value);
    }, [isModalOpen, value]);

    const fetchBrands = React.useCallback(async (nextQuery: string, options: { includeDisclosure?: boolean } = {}) => {
        const searchRunId = searchRunRef.current + 1;
        searchRunRef.current = searchRunId;
        const normalizedQuery = nextQuery.trim();
        const shouldFetchDisclosure = Boolean(options.includeDisclosure && normalizedQuery && requesterId);
        const shouldFetchCache = Boolean(options.includeDisclosure && normalizedQuery);
        const applyBrands = (nextBrands: FranchiseBrand[]) => {
            if (searchRunRef.current === searchRunId) setBrands(nextBrands);
        };

        setIsSearching(true);
        try {
            let savedBrands: FranchiseBrand[] = [];
            if (requesterId) {
                const params = new URLSearchParams({
                    requesterId,
                    limit: '50',
                    includeDisclosure: 'false'
                });
                if (companyName) params.set('company', companyName);
                if (normalizedQuery) params.set('query', normalizedQuery);

                const response = await fetch(`/api/franchise-brands?${params.toString()}`, { cache: 'no-store' });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(readApiError(payload));

                const data = unwrapApiData<BrandListResponse>(payload);
                savedBrands = data.brands || [];
            }

            let cacheBrands: FranchiseBrand[] = [];
            if (shouldFetchCache) {
                const cacheResponse = await fetch(`/api/franchise?query=${encodeURIComponent(normalizedQuery)}`, { cache: 'no-store' });
                const cachePayload = await cacheResponse.json().catch(() => []);
                if (cacheResponse.ok && Array.isArray(cachePayload)) {
                    cacheBrands = cachePayload
                        .map(mapFranchiseCacheBrand)
                        .filter(Boolean) as FranchiseBrand[];
                }
            }

            applyBrands(mergeBrands(savedBrands, cacheBrands));

            if (shouldFetchDisclosure) {
                const params = new URLSearchParams({
                    requesterId,
                    limit: '50',
                    includeDisclosure: 'true',
                    query: normalizedQuery
                });
                if (companyName) params.set('company', companyName);

                const officialPromise = fetch(`/api/franchise-brands?${params.toString()}`, { cache: 'no-store' })
                    .then(async response => {
                        const payload = await response.json().catch(() => ({}));
                        if (!response.ok) throw new Error(readApiError(payload));
                        return unwrapApiData<BrandListResponse>(payload);
                    });
                const officialData = await Promise.race([
                    officialPromise,
                    wait(OFFICIAL_SEARCH_WAIT_MS)
                ]);

                if (officialData) {
                    applyBrands(mergeBrands(officialData.brands || [], cacheBrands));
                } else {
                    officialPromise
                        .then(data => applyBrands(mergeBrands(data.brands || [], cacheBrands)))
                        .catch(error => console.error('Failed to fetch official disclosure brands:', error));
                }
            }
        } catch (error) {
            applyBrands([]);
            console.error('Failed to fetch franchise brands:', error);
        } finally {
            if (searchRunRef.current === searchRunId) setIsSearching(false);
        }
    }, [companyName, requesterId]);

    React.useEffect(() => {
        if (!requesterId) return;
        void fetchBrands('');
    }, [fetchBrands, requesterId]);

    const openModal = () => {
        if (disabled) return;
        setModalQuery(query);
        setHasSearched(false);
        setIsModalOpen(true);
    };

    const searchBrands = () => {
        setHasSearched(true);
        void fetchBrands(modalQuery, { includeDisclosure: true });
    };

    const selectBrand = (brand: FranchiseBrand) => {
        setQuery(brand.brandName);
        setModalQuery(brand.brandName);
        setIsModalOpen(false);
        onBrandChange(brand.brandName);
        onSelectBrand(brand);
    };

    const customBrand = modalQuery.trim() ? buildCustomBrand(modalQuery.trim()) : null;
    const hasExactBrand = brands.some(brand => brand.brandName.trim().toLowerCase() === modalQuery.trim().toLowerCase());

    return (
        <label className={classNames.field}>
            브랜드
            <div className={classNames.row}>
                <input
                    className={classNames.input}
                    value={query}
                    readOnly
                    disabled={disabled}
                    onClick={openModal}
                    placeholder="브랜드 찾기 버튼을 눌러주세요"
                />
                <button
                    type="button"
                    className={classNames.button}
                    onClick={openModal}
                    disabled={disabled}
                >
                    <Search size={16} />
                    브랜드 찾기
                </button>
            </div>
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        background: 'rgba(15, 23, 42, 0.5)'
                    }}
                >
                    <div
                        style={{
                            width: 'min(500px, 100%)',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            borderRadius: 8,
                            background: '#fff',
                            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '18px 20px',
                                borderBottom: '1px solid #e5e7eb'
                            }}
                        >
                            <strong style={{ color: '#111827', fontSize: 16 }}>프랜차이즈 브랜드 검색</strong>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="브랜드 검색 닫기"
                                style={{
                                    display: 'grid',
                                    placeItems: 'center',
                                    width: 32,
                                    height: 32,
                                    border: 0,
                                    borderRadius: 8,
                                    background: 'transparent',
                                    color: '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    autoFocus
                                    value={modalQuery}
                                    onChange={(event) => setModalQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            searchBrands();
                                        }
                                    }}
                                    placeholder="브랜드명 입력"
                                    style={{
                                        minWidth: 0,
                                        flex: 1,
                                        height: 44,
                                        border: '1px solid #2563eb',
                                        borderRadius: 6,
                                        padding: '0 12px',
                                        color: '#111827',
                                        fontSize: 14,
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={searchBrands}
                                    disabled={isSearching}
                                    style={{
                                        flex: '0 0 auto',
                                        minWidth: 66,
                                        height: 44,
                                        border: 0,
                                        borderRadius: 6,
                                        background: '#228be6',
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        cursor: isSearching ? 'not-allowed' : 'pointer',
                                        opacity: isSearching ? 0.7 : 1
                                    }}
                                >
                                    {isSearching ? '검색중' : '검색'}
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: 8, maxHeight: 320, marginTop: 18, overflowY: 'auto' }}>
                                {brands.map(brand => (
                                    <button
                                        key={brand.id}
                                        type="button"
                                        className={classNames.resultItem}
                                        onClick={() => selectBrand(brand)}
                                    >
                                        <strong>{brand.brandName}</strong>
                                        <span>
                                            {brand.franchisorName || getBrandSourceLabel(brand)}
                                            {brand.industry || brand.businessType ? ` · ${brand.industry || brand.businessType}` : ''}
                                        </span>
                                        <small className={classNames.resultMeta}>
                                            {brand.recommendedKeywords?.length ? `추천 ${brand.recommendedKeywords.join(', ')}` : '검색 결과'}
                                        </small>
                                        {brand.isSaved && <em className={classNames.badge}>저장됨</em>}
                                    </button>
                                ))}
                                {customBrand && !hasExactBrand && hasSearched && (
                                    <button
                                        type="button"
                                        className={classNames.resultItem}
                                        onClick={() => selectBrand(customBrand)}
                                    >
                                        <strong>{customBrand.brandName}</strong>
                                        <span>직접 입력 브랜드로 사용</span>
                                        <small className={classNames.resultMeta}>
                                            저장 후 다음부터 상단에 노출됩니다.
                                        </small>
                                    </button>
                                )}
                                {hasSearched && brands.length === 0 && !customBrand && (
                                    <div className={classNames.empty}>검색 결과가 없습니다.</div>
                                )}
                                {!hasSearched && brands.length === 0 && (
                                    <div className={classNames.empty}>브랜드명을 입력하고 검색하세요.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </label>
    );
}
