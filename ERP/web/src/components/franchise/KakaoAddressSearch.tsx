"use client";

import React from 'react';
import DaumPostcodeEmbed, { type Address } from 'react-daum-postcode';
import { X } from 'lucide-react';
import { useModalFocusTrap } from '@/components/common/useModalFocusTrap';

export type KakaoAddressResult = {
    readonly address: string;
    readonly roadAddress: string;
    readonly jibunAddress: string;
    readonly region: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly buildingName: string;
    readonly zoneNo: string;
    readonly addressType: string;
};

export type KakaoAddressLookupSource = {
    readonly search: (params: {
        readonly query: string;
        readonly requesterId: string;
    }) => Promise<readonly KakaoAddressResult[]>;
};

type ClassNames = {
    readonly field?: string;
    readonly row?: string;
    readonly button?: string;
    readonly results?: string;
    readonly resultItem?: string;
    readonly resultMeta?: string;
    readonly empty?: string;
};

type KakaoAddressSearchProps = {
    readonly requesterId: string;
    readonly label?: string;
    readonly value: string;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly classNames?: ClassNames;
    readonly lookupSource?: KakaoAddressLookupSource;
    readonly onAddressChange: (value: string) => void;
    readonly onSelect: (result: KakaoAddressResult) => void;
};

type LookupStatus = 'idle' | 'loading' | 'success' | 'error';

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function buildFullAddress(data: Address): string {
    let fullAddress = cleanString(data.address);
    let extraAddress = '';

    if (data.addressType === 'R') {
        if (data.bname) extraAddress += data.bname;
        if (data.buildingName) extraAddress += (extraAddress ? `, ${data.buildingName}` : data.buildingName);
        if (extraAddress) fullAddress += ` (${extraAddress})`;
    }

    return fullAddress;
}

function normalizeRegion(data: Address, fallbackAddress: string): string {
    const sido = cleanString(data.sido);
    const sigungu = cleanString(data.sigungu);
    if (sido && sigungu) return `${sido} ${sigungu}`;

    return fallbackAddress.split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
}

export default function KakaoAddressSearch({
    requesterId,
    label = '주소',
    value,
    placeholder = '주소 검색',
    disabled = false,
    classNames = {},
    lookupSource,
    onAddressChange,
    onSelect
}: KakaoAddressSearchProps) {
    const [query, setQuery] = React.useState(value);
    const [isOpen, setIsOpen] = React.useState(false);
    const [lookupQuery, setLookupQuery] = React.useState(value);
    const [lookupResults, setLookupResults] = React.useState<readonly KakaoAddressResult[]>([]);
    const [lookupStatus, setLookupStatus] = React.useState<LookupStatus>('idle');
    const lookupRunRef = React.useRef(0);
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const lookupInputRef = React.useRef<HTMLInputElement | null>(null);
    const closeSearch = React.useCallback(() => setIsOpen(false), []);
    useModalFocusTrap({
        isOpen,
        onClose: closeSearch,
        dialogRef,
        initialFocusRef: lookupSource ? lookupInputRef : undefined
    });

    React.useEffect(() => {
        setQuery(value);
        if (!isOpen) setLookupQuery(value);
    }, [isOpen, value]);

    const openSearch = () => {
        if (disabled) return;
        setLookupQuery(query);
        setLookupResults([]);
        setLookupStatus('idle');
        setIsOpen(true);
    };

    const applyAddress = (result: KakaoAddressResult) => {
        setQuery(result.address);
        setIsOpen(false);
        onAddressChange(result.address);
        onSelect(result);
    };

    const selectAddress = (data: Address) => {
        const fullAddress = buildFullAddress(data);
        const result: KakaoAddressResult = {
            address: fullAddress,
            roadAddress: cleanString(data.roadAddress || data.address),
            jibunAddress: cleanString(data.jibunAddress || data.autoJibunAddress),
            region: normalizeRegion(data, fullAddress),
            latitude: null,
            longitude: null,
            buildingName: cleanString(data.buildingName),
            zoneNo: cleanString(data.zonecode),
            addressType: cleanString(data.addressType)
        };

        applyAddress(result);
    };

    const selectLookupAddress = (result: KakaoAddressResult) => {
        applyAddress(result);
    };

    const searchLookupAddresses = async () => {
        if (!lookupSource) return;
        const lookupRunId = lookupRunRef.current + 1;
        lookupRunRef.current = lookupRunId;
        const normalizedQuery = lookupQuery.trim();
        if (!normalizedQuery) {
            setLookupResults([]);
            setLookupStatus('idle');
            return;
        }
        setLookupStatus('loading');
        try {
            const results = await lookupSource.search({ query: normalizedQuery, requesterId });
            if (lookupRunRef.current !== lookupRunId) return;
            setLookupResults(results);
            setLookupStatus('success');
        } catch (error) {
            if (!(error instanceof Error)) throw error;
            if (lookupRunRef.current !== lookupRunId) return;
            console.error('Failed to search injected addresses:', error);
            setLookupResults([]);
            setLookupStatus('error');
        }
    };

    return (
        <label className={classNames.field}>
            {label}
            <div className={classNames.row}>
                <input
                    value={query}
                    readOnly
                    disabled={disabled}
                    onClick={openSearch}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    className={classNames.button}
                    disabled={disabled}
                    onClick={openSearch}
                >
                    주소검색
                </button>
            </div>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        background: 'rgba(15, 23, 42, 0.45)'
                    }}
                >
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="주소 검색"
                        tabIndex={-1}
                        style={{
                            width: 'min(520px, 100%)',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            borderRadius: 8,
                            background: '#fff',
                            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 18px',
                                borderBottom: '1px solid #e5e7eb'
                            }}
                        >
                            <strong style={{ fontSize: 16, color: '#111827' }}>주소 검색</strong>
                            <button
                                type="button"
                                onClick={closeSearch}
                                aria-label="주소 검색 닫기"
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
                                <X size={18} />
                            </button>
                        </div>
                        {lookupSource ? (
                            <div style={{ padding: 20 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        ref={lookupInputRef}
                                        value={lookupQuery}
                                        onChange={(event) => setLookupQuery(event.currentTarget.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                void searchLookupAddresses();
                                            }
                                        }}
                                        placeholder="주소를 입력하세요"
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
                                        className={classNames.button}
                                        onClick={() => void searchLookupAddresses()}
                                        disabled={lookupStatus === 'loading'}
                                    >
                                        {lookupStatus === 'loading' ? '검색중' : '검색'}
                                    </button>
                                </div>
                                <div className={classNames.results} style={{ display: 'grid', gap: 8, maxHeight: 360, marginTop: 18, overflowY: 'auto' }}>
                                    {lookupResults.map(result => (
                                        <button
                                            key={`${result.zoneNo}:${result.address}`}
                                            type="button"
                                            className={classNames.resultItem}
                                            onClick={() => selectLookupAddress(result)}
                                        >
                                            <strong>{result.address}</strong>
                                            <span className={classNames.resultMeta}>
                                                {result.roadAddress || result.jibunAddress || result.region}
                                            </span>
                                        </button>
                                    ))}
                                    {lookupStatus === 'success' && lookupResults.length === 0 ? (
                                        <div className={classNames.empty}>검색 결과가 없습니다.</div>
                                    ) : null}
                                    {lookupStatus === 'error' ? (
                                        <div className={classNames.empty}>주소 검색 중 오류가 발생했습니다.</div>
                                    ) : null}
                                    {lookupStatus === 'idle' ? (
                                        <div className={classNames.empty}>주소를 입력하고 검색하세요.</div>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <DaumPostcodeEmbed
                                onComplete={selectAddress}
                                autoClose={false}
                                style={{ width: '100%', height: 460 }}
                            />
                        )}
                    </div>
                </div>
            )}
        </label>
    );
}
