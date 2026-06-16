"use client";

import {
    SITE_CONDITION_AVAILABILITY,
    toSiteConditionAvailability,
    type SiteConditionItem
} from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type LocationConditionControlProps = {
    readonly label: string;
    readonly value: SiteConditionItem;
    readonly onChange: (patch: Partial<SiteConditionItem>) => void;
};

export function LocationConditionControl({ label, value, onChange }: LocationConditionControlProps) {
    return (
        <div className={styles.locationConditionControl}>
            <label>
                {label}
                <select
                    value={value.value}
                    onChange={(event) => onChange({ value: toSiteConditionAvailability(event.target.value) })}
                >
                    {SITE_CONDITION_AVAILABILITY.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            </label>
            <label>
                메모
                <input
                    value={value.memo}
                    onChange={(event) => onChange({ memo: event.target.value })}
                    placeholder={`${label} 메모`}
                />
            </label>
        </div>
    );
}
