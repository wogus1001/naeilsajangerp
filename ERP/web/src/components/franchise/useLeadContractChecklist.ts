import React from 'react';
import type {
    LeadContractApplicability,
    LeadContractChecklistStep,
    LeadContractChecklistSummary
} from '@/lib/franchise-lead-contract-checklist';
import { useLeadDetailRuntime } from './leads/LeadDetailRuntimeProvider';
import { EMPTY_LEAD_CHECKLIST_SUMMARY } from './leads/leadDetailRuntime';

type UseLeadContractChecklistInput = {
    readonly leadId: string;
    readonly onSaved?: () => void;
    readonly userId: string;
};

type SaveStepPatch = {
    readonly completed?: boolean;
    readonly memo?: string;
    readonly applicability?: LeadContractApplicability;
};

export function useLeadContractChecklist({ leadId, onSaved, userId }: UseLeadContractChecklistInput) {
    const { checklist } = useLeadDetailRuntime();
    const [steps, setSteps] = React.useState<readonly LeadContractChecklistStep[]>([]);
    const [summary, setSummary] = React.useState<LeadContractChecklistSummary>(EMPTY_LEAD_CHECKLIST_SUMMARY);
    const [isLoading, setIsLoading] = React.useState(false);
    const [savingStepKey, setSavingStepKey] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

    const fetchChecklist = React.useCallback(async () => {
        if (!leadId || !userId) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const data = await checklist.load({ userId, leadId });
            setSteps(data.steps);
            setSummary(data.summary);
        } catch (error) {
            setSteps([]);
            setSummary(EMPTY_LEAD_CHECKLIST_SUMMARY);
            setErrorMessage(error instanceof Error ? error.message : '구비서류를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [checklist, leadId, userId]);

    React.useEffect(() => {
        setSteps([]);
        setSummary(EMPTY_LEAD_CHECKLIST_SUMMARY);
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
            const data = await checklist.saveStep({
                userId,
                leadId,
                stepKey,
                patch
            });
            setSteps(data.steps);
            setSummary(data.summary);
            setMessage('구비서류를 저장했습니다.');
            onSaved?.();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '구비서류 저장에 실패했습니다.');
        } finally {
            setSavingStepKey('');
        }
    }, [checklist, leadId, onSaved, userId]);

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
