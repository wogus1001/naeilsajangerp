"use client";

import React from 'react';
import { Plus, X } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    REALTY_REGION_OPTIONS,
    buildRealtyRegionQuery,
    getRealtyRegionOption,
    parseRealtyRegionToSelection
} from '@/components/franchise/realty-import/regions';
import { parseLeadDesiredRegions } from './leadFormFormatters';

type RegionSelection = {
    readonly sido: string;
    readonly district: string;
};

type LeadRegionMultiSelectProps = {
    readonly value: string;
    readonly onChangeAction: (value: string) => void;
};

const DEFAULT_SIDO = '서울특별시';

function getFirstDistrict(sido: string): string {
    return getRealtyRegionOption(sido).districts.find(Boolean) || '';
}

function getInitialSelection(value: string): RegionSelection {
    const firstRegion = parseLeadDesiredRegions(value).find(Boolean);
    if (!firstRegion) return { sido: DEFAULT_SIDO, district: getFirstDistrict(DEFAULT_SIDO) };
    return parseRealtyRegionToSelection(firstRegion);
}

function serializeRegions(regions: readonly string[]): string {
    return regions.join(', ');
}

export function LeadRegionMultiSelect({ value, onChangeAction }: LeadRegionMultiSelectProps) {
    const initialSelection = React.useMemo(() => getInitialSelection(value), [value]);
    const [sido, setSido] = React.useState(initialSelection.sido);
    const [district, setDistrict] = React.useState(initialSelection.district);
    const selectedRegions = React.useMemo(() => parseLeadDesiredRegions(value), [value]);
    const districtOptions = getRealtyRegionOption(sido).districts;
    const selectedRegion = buildRealtyRegionQuery(sido, district);
    const canAdd = Boolean(selectedRegion) && !selectedRegions.includes(selectedRegion);

    const handleSidoChange = (nextSido: string) => {
        setSido(nextSido);
        setDistrict(getFirstDistrict(nextSido));
    };

    const handleAddRegion = () => {
        if (!canAdd) return;
        onChangeAction(serializeRegions([...selectedRegions, selectedRegion]));
    };

    const handleRemoveRegion = (region: string) => {
        onChangeAction(serializeRegions(selectedRegions.filter(item => item !== region)));
    };

    return (
        <div className={styles.regionMultiSelect}>
            <div className={styles.regionPickerRow}>
                <select value={sido} onChange={(event) => handleSidoChange(event.target.value)} aria-label="희망지역 시도">
                    {REALTY_REGION_OPTIONS.map(option => (
                        <option key={option.label} value={option.label}>{option.label}</option>
                    ))}
                </select>
                <select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="희망지역 시군구">
                    {districtOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <button type="button" className={styles.regionAddButton} onClick={handleAddRegion} disabled={!canAdd}>
                    <Plus size={15} />
                    추가
                </button>
            </div>
            <div className={styles.regionChipList} aria-label="선택된 희망지역">
                {selectedRegions.length > 0 ? selectedRegions.map(region => (
                    <span key={region} className={styles.regionChip}>
                        {region}
                        <button type="button" onClick={() => handleRemoveRegion(region)} aria-label={`${region} 삭제`}>
                            <X size={13} />
                        </button>
                    </span>
                )) : (
                    <span className={styles.regionEmptyText}>희망지역을 여러 개 선택할 수 있습니다.</span>
                )}
            </div>
        </div>
    );
}
