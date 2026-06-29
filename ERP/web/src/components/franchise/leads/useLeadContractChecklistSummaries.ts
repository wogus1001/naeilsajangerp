import React from 'react';
import type { LeadContractChecklistSummaryView } from '@/lib/franchise-lead-contract-checklist';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { getRequesterId } from '@/utils/userUtils';

type UseLeadContractChecklistSummariesInput = {
    readonly leadIds: readonly string[];
    readonly refreshKey?: number;
    readonly userId?: string;
};

type ChecklistSummariesResponse = {
    readonly summaries?: Record<string, LeadContractChecklistSummaryView>;
    readonly schemaReady?: boolean;
};

export function useLeadContractChecklistSummaries({
    leadIds,
    refreshKey = 0,
    userId
}: UseLeadContractChecklistSummariesInput) {
    const leadIdKey = React.useMemo(
        () => Array.from(new Set(leadIds.filter(Boolean))).join(','),
        [leadIds]
    );
    const [summaries, setSummaries] = React.useState<Record<string, LeadContractChecklistSummaryView>>({});
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');

    React.useEffect(() => {
        if (!leadIdKey) {
            setSummaries({});
            setErrorMessage('');
            return;
        }

        const requesterId = userId || getRequesterId();
        if (!requesterId) return;

        const controller = new AbortController();
        async function fetchSummaries() {
            setIsLoading(true);
            setErrorMessage('');
            try {
                const params = new URLSearchParams({ requesterId, leadIds: leadIdKey });
                const response = await fetch(`/api/franchise-lead-contract-checklist/summaries?${params.toString()}`, {
                    cache: 'no-store',
                    signal: controller.signal
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(readApiError(payload));
                const data = unwrapApiData<ChecklistSummariesResponse>(payload);
                setSummaries(data.summaries || {});
                setSchemaReady(data.schemaReady !== false);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setSummaries({});
                setSchemaReady(true);
                setErrorMessage(error instanceof Error ? error.message : '구비서류 요약을 불러오지 못했습니다.');
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }

        void fetchSummaries();
        return () => controller.abort();
    }, [leadIdKey, refreshKey, userId]);

    return {
        errorMessage,
        isLoading,
        schemaReady,
        summaries
    };
}
