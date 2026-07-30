import { RANGE_OPTIONS } from './constants';
import { toRangeOption } from './utils';

export const DEFAULT_LEAD_RANGE: typeof RANGE_OPTIONS[number] = '전체';
export const LEAD_RANGE_PREFERENCE_STORAGE_KEY = 'franchiseLeadDateRange';

type LeadRangePreferenceReader = {
    getItem(key: string): string | null;
};

type LeadRangePreferenceWriter = {
    setItem(key: string, value: string): void;
};

export function readLeadRangePreference(
    storage: LeadRangePreferenceReader
): typeof RANGE_OPTIONS[number] {
    return toRangeOption(
        storage.getItem(LEAD_RANGE_PREFERENCE_STORAGE_KEY) || DEFAULT_LEAD_RANGE
    );
}

export function writeLeadRangePreference(
    storage: LeadRangePreferenceWriter,
    range: typeof RANGE_OPTIONS[number]
) {
    storage.setItem(LEAD_RANGE_PREFERENCE_STORAGE_KEY, range);
}
