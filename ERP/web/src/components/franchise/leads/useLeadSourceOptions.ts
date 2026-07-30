"use client";

import React from 'react';
import {
    DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS,
    type FranchiseLeadSourceOption
} from '@/lib/franchise-lead-source-options';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type UseLeadSourceOptionsParams = {
    readonly userId: string;
    readonly companyName: string;
};

type SourceOptionsResponse = {
    readonly options: readonly FranchiseLeadSourceOption[];
    readonly storageReady: boolean;
};

type SourceOptionResponse = {
    readonly option?: FranchiseLeadSourceOption;
};

export function useLeadSourceOptions({ userId, companyName }: UseLeadSourceOptionsParams) {
    const [options, setOptions] = React.useState<readonly FranchiseLeadSourceOption[]>(
        DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS
    );
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [storageReady, setStorageReady] = React.useState(false);
    const [error, setError] = React.useState('');

    const refresh = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ requesterId: userId });
            if (companyName) params.set('company', companyName);
            const response = await fetch(`/api/franchise-lead-source-options?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<SourceOptionsResponse>(payload);
            setOptions(data.options);
            setStorageReady(data.storageReady);
        } catch (fetchError) {
            setOptions(DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS);
            setStorageReady(false);
            setError(fetchError instanceof Error ? fetchError.message : '유입경로 목록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    const createOption = React.useCallback(async (label: string) => {
        if (!userId) return;
        setIsSaving(true);
        try {
            const response = await fetch('/api/franchise-lead-source-options', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ requesterId: userId, company: companyName, label })
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<SourceOptionResponse>(payload);
            const createdOption = data.option;
            if (createdOption) {
                setOptions(current => [...current, createdOption].sort(
                    (left, right) => left.sortOrder - right.sortOrder
                ));
            }
        } finally {
            setIsSaving(false);
        }
    }, [companyName, userId]);

    const updateOption = React.useCallback(async (
        optionId: string,
        updates: { readonly label?: string; readonly isActive?: boolean; readonly sortOrder?: number }
    ) => {
        if (!userId) return;
        setIsSaving(true);
        try {
            const response = await fetch('/api/franchise-lead-source-options', {
                method: 'PATCH',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    requesterId: userId,
                    company: companyName,
                    id: optionId,
                    ...updates
                })
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<SourceOptionResponse>(payload);
            const updatedOption = data.option;
            if (updatedOption) {
                setOptions(current => current.map(option => (
                    option.id === updatedOption.id ? updatedOption : option
                )));
            }
        } finally {
            setIsSaving(false);
        }
    }, [companyName, userId]);

    return {
        options,
        isLoading,
        isSaving,
        storageReady,
        error,
        refresh,
        createOption,
        updateOption
    } as const;
}
