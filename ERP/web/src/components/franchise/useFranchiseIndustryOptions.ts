"use client";

import React from 'react';
import {
    buildFranchiseIndustryOptionGroups,
    buildFranchiseIndustryOptions,
    type FranchiseIndustryOptionGroups,
    type FranchiseIndustrySource
} from '@/lib/franchise-industry-options';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getRequesterId, getStoredCompanyId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';

type IndustrySourceState = {
    readonly sources: readonly FranchiseIndustrySource[];
    readonly customCategoryNames: readonly string[];
};

const EMPTY_INDUSTRY_STATE: IndustrySourceState = {
    sources: [],
    customCategoryNames: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    return typeof value === 'string' ? value : '';
}

function payloadData(payload: unknown): unknown {
    return isRecord(payload) && 'data' in payload ? payload.data : payload;
}

function parseBrandSources(payload: unknown): readonly FranchiseIndustrySource[] {
    const data = payloadData(payload);
    const brands = isRecord(data) && Array.isArray(data.brands) ? data.brands : [];
    return brands.filter(isRecord).map(brand => ({
        industry: readString(brand, 'industry'),
        businessType: readString(brand, 'businessType'),
        categoryMajor: readString(brand, 'categoryMajor'),
        categoryMiddle: readString(brand, 'categoryMiddle'),
        categorySmall: readString(brand, 'categorySmall')
    }));
}

function parseCustomCategoryNames(payload: unknown): readonly string[] {
    const data = payloadData(payload);
    if (!Array.isArray(data)) return [];
    return data.filter(isRecord).map(row => readString(row, 'name')).filter(Boolean);
}

async function fetchJson(url: string): Promise<unknown | null> {
    const response = await fetch(url, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    if (!response.ok) return null;
    return await response.json();
}

export function useFranchiseIndustryOptions(): readonly string[] {
    const data = useFranchiseIndustrySourceData();
    return React.useMemo(
        () => buildFranchiseIndustryOptions(data.sources, data.customCategoryNames),
        [data]
    );
}

export function useFranchiseIndustryOptionGroups(): FranchiseIndustryOptionGroups {
    const data = useFranchiseIndustrySourceData();
    return React.useMemo(
        () => buildFranchiseIndustryOptionGroups(data.sources, data.customCategoryNames),
        [data]
    );
}

function useFranchiseIndustrySourceData(): IndustrySourceState {
    const [state, setState] = React.useState<IndustrySourceState>(EMPTY_INDUSTRY_STATE);

    React.useEffect(() => {
        let cancelled = false;

        const loadOptions = async () => {
            const storedUser = getStoredUser();
            const requesterId = getRequesterId(storedUser);
            if (!requesterId) return;

            const brandParams = new URLSearchParams({ requesterId, limit: '80' });
            const companyName = getStoredCompanyName(storedUser);
            if (companyName) brandParams.set('company', companyName);

            const companyId = getStoredCompanyId(storedUser);
            const categoryUrl = companyId
                ? `/api/categories?${new URLSearchParams({ companyId, type: 'industry_detail' }).toString()}`
                : '';

            const [brandPayload, categoryPayload] = await Promise.all([
                fetchJson(`/api/franchise-brands?${brandParams.toString()}`),
                categoryUrl ? fetchJson(categoryUrl) : Promise.resolve(null)
            ]);

            if (cancelled) return;
            setState({
                sources: brandPayload ? parseBrandSources(brandPayload) : [],
                customCategoryNames: categoryPayload ? parseCustomCategoryNames(categoryPayload) : []
            });
        };

        void loadOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    return state;
}
