"use client";

import React from 'react';
import DaumPostcodeEmbed from 'react-daum-postcode';
import { X } from 'lucide-react';

export type KakaoAddressResult = {
    address: string;
    roadAddress: string;
    jibunAddress: string;
    region: string;
    latitude: number | null;
    longitude: number | null;
    buildingName: string;
    zoneNo: string;
    addressType: string;
};

type ClassNames = {
    field?: string;
    row?: string;
    button?: string;
    results?: string;
    resultItem?: string;
    resultMeta?: string;
    empty?: string;
};

type KakaoAddressSearchProps = {
    requesterId: string;
    label?: string;
    value: string;
    placeholder?: string;
    disabled?: boolean;
    classNames?: ClassNames;
    onAddressChange: (value: string) => void;
    onSelect: (result: KakaoAddressResult) => void;
};

function cleanString(value: unknown) {
    return String(value || '').trim();
}

function buildFullAddress(data: any) {
    let fullAddress = cleanString(data.address);
    let extraAddress = '';

    if (data.addressType === 'R') {
        if (data.bname) extraAddress += data.bname;
        if (data.buildingName) extraAddress += (extraAddress ? `, ${data.buildingName}` : data.buildingName);
        if (extraAddress) fullAddress += ` (${extraAddress})`;
    }

    return fullAddress;
}

function normalizeRegion(data: any, fallbackAddress: string) {
    const sido = cleanString(data.sido);
    const sigungu = cleanString(data.sigungu);
    if (sido && sigungu) return `${sido} ${sigungu}`;

    return fallbackAddress.split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
}

export default function KakaoAddressSearch({
    label = '주소',
    value,
    placeholder = '주소 검색',
    disabled = false,
    classNames = {},
    onAddressChange,
    onSelect
}: KakaoAddressSearchProps) {
    const [query, setQuery] = React.useState(value);
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        setQuery(value);
    }, [value]);

    const openSearch = () => {
        if (!disabled) setIsOpen(true);
    };

    const selectAddress = (data: any) => {
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

        setQuery(fullAddress);
        setIsOpen(false);
        onAddressChange(fullAddress);
        onSelect(result);
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
                                onClick={() => setIsOpen(false)}
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
                        <DaumPostcodeEmbed
                            onComplete={selectAddress}
                            autoClose={false}
                            style={{ width: '100%', height: 460 }}
                        />
                    </div>
                </div>
            )}
        </label>
    );
}
