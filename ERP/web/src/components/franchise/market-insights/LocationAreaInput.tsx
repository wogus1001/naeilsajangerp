"use client";

import { useId, useState } from 'react';
import { parseLocationDecimal } from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type AreaUnit = 'pyeong' | 'squareMeter';

type LocationAreaInputProps = {
    readonly value: number | null;
    readonly onChange: (value: number | null) => void;
};

const SQUARE_METERS_PER_PYEONG = 3.3058;

function formatAreaValue(value: number | null, unit: AreaUnit): string {
    if (value === null) return '';
    const convertedValue = unit === 'pyeong' ? value : value * SQUARE_METERS_PER_PYEONG;
    return String(parseLocationDecimal(convertedValue));
}

function parseAreaToPyeong(value: string, unit: AreaUnit): number | null {
    const parsedValue = parseLocationDecimal(value);
    if (parsedValue === null) return null;
    if (unit === 'pyeong') return parsedValue;
    return parseLocationDecimal(parsedValue / SQUARE_METERS_PER_PYEONG);
}

function getAreaPlaceholder(unit: AreaUnit): string {
    return unit === 'pyeong' ? '예: 32.5' : '예: 107.4';
}

export function LocationAreaInput({ value, onChange }: LocationAreaInputProps) {
    const [unit, setUnit] = useState<AreaUnit>('pyeong');
    const inputId = useId();

    return (
        <div className={styles.locationAreaField}>
            <label htmlFor={inputId}>전용면적</label>
            <div className={styles.locationAreaInputRow}>
                <input
                    id={inputId}
                    inputMode="decimal"
                    value={formatAreaValue(value, unit)}
                    onChange={(event) => onChange(parseAreaToPyeong(event.target.value, unit))}
                    placeholder={getAreaPlaceholder(unit)}
                />
                <span className={styles.locationAreaUnitSwitch} aria-label="면적 단위">
                    <button
                        type="button"
                        className={unit === 'pyeong' ? styles.locationAreaUnitActive : styles.locationAreaUnit}
                        aria-pressed={unit === 'pyeong'}
                        onClick={() => setUnit('pyeong')}
                    >
                        평
                    </button>
                    <button
                        type="button"
                        className={unit === 'squareMeter' ? styles.locationAreaUnitActive : styles.locationAreaUnit}
                        aria-pressed={unit === 'squareMeter'}
                        onClick={() => setUnit('squareMeter')}
                    >
                        ㎡
                    </button>
                </span>
            </div>
        </div>
    );
}
