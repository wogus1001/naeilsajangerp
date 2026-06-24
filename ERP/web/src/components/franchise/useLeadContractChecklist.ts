import React from 'react';
import type {
    LeadContractApplicability,
    LeadContractChecklistStep,
    LeadContractChecklistSummary
} from '@/lib/franchise-lead-contract-checklist';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type UseLeadContractChecklistInput = {
    readonly leadId: string;
    readonly onSaved?: () => void;
    readonly userId: string;
};

type ChecklistResponse = {
    readonly step?: LeadContractChecklistStep;
    readonly steps?: readonly LeadContractChecklistStep[];
    readonly summary?: LeadContractChecklistSummary;
};

type SaveStepPatch = {
    readonly completed?: boolean;
    readonly memo?: string;
    readonly applicability?: LeadContractApplicability;
};

const EMPTY_SUMMARY: LeadContractChecklistSummary = {
    total: 0,
    completed: 0,
    resolved: 0,
    remaining: 0,
    progressPercent: 0,
    missingRequiredCount: 0,
    groups: {
        required: { total: 0, completed: 0, resolved: 0, remaining: 0, progressPercent: 0, missingDocumentCount: 0 },
        report: { total: 0, completed: 0, resolved: 0, remaining: 0, progressPercent: 0, missingDocumentCount: 0 },
        optional: { total: 0, completed: 0, resolved: 0, remaining: 0, progressPercent: 0, missingDocumentCount: 0 }
    }
};

export function useLeadContractChecklist({ leadId, onSaved, userId }: UseLeadContractChecklistInput) {
    const [steps, setSteps] = React.useState<readonly LeadContractChecklistStep[]>([]);
    const [summary, setSummary] = React.useState<LeadContractChecklistSummary>(EMPTY_SUMMARY);
    const [isLoading, setIsLoading] = React.useState(false);
    const [savingStepKey, setSavingStepKey] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

    const fetchChecklist = React.useCallback(async () => {
        if (!leadId || !userId) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const params = new URLSearchParams({ requesterId: userId, leadId });
            const response = await fetch(`/api/franchise-lead-contract-checklist?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<ChecklistResponse>(payload);
            setSteps(data.steps || []);
            setSummary(data.summary || EMPTY_SUMMARY);
        } catch (error) {
            setSteps([]);
            setSummary(EMPTY_SUMMARY);
            setErrorMessage(error instanceof Error ? error.message : '구비서류를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [leadId, userId]);

    React.useEffect(() => {
        setSteps([]);
        setSummary(EMPTY_SUMMARY);
        setMessage('');
        setErrorMessage('');
        void fetchChecklist();
    }, [fetchChecklist]);

    const saveStep = React.useCallback(async (stepKey: string, patch: SaveStepPatch) => {
        if (!leadId || !userId || !stepKey) return;
        setSavingStepKey(stepKey);
        setMessage('');
        setErrorMessage('');
        try {
            const response = await fetch('/api/franchise-lead-contract-checklist', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    leadId,
                    stepKey,
                    ...patch
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<ChecklistResponse>(payload);
            setSteps(data.steps || []);
            setSummary(data.summary || EMPTY_SUMMARY);
            setMessage('구비서류를 저장했습니다.');
            onSaved?.();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '구비서류 저장에 실패했습니다.');
        } finally {
            setSavingStepKey('');
        }
    }, [leadId, onSaved, userId]);

    return {
        errorMessage,
        fetchChecklist,
        isLoading,
        message,
        saveStep,
        savingStepKey,
        steps,
        summary
    };
}
