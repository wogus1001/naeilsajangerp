import React from 'react';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    parseLeadDetailDeepLinkId,
    resolveLeadDetailDeepLinkTarget,
    type LeadDetailDeepLinkTarget
} from './leadDetailDeepLink';
import type { FranchiseLead } from './types';

type LeadByIdResponse = {
    readonly lead?: FranchiseLead | null;
};

type UseLeadDetailDeepLinkArgs = {
    readonly userId: string;
    readonly companyName: string;
    readonly leads: readonly FranchiseLead[];
    readonly onLeadLoadedAction: (lead: FranchiseLead) => void;
    readonly onOpenLeadAction: (target: LeadDetailDeepLinkTarget) => void;
    readonly showAlertAction: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
};

export function useLeadDetailDeepLink({
    userId,
    companyName,
    leads,
    onLeadLoadedAction,
    onOpenLeadAction,
    showAlertAction
}: UseLeadDetailDeepLinkArgs): void {
    const [pendingLeadId, setPendingLeadId] = React.useState('');
    const [openedLeadId, setOpenedLeadId] = React.useState('');

    React.useEffect(() => {
        setPendingLeadId(parseLeadDetailDeepLinkId(window.location.search));
    }, []);

    React.useEffect(() => {
        if (!pendingLeadId || !userId || pendingLeadId === openedLeadId) return;

        const existingLead = leads.find(lead => lead.id === pendingLeadId);
        if (existingLead) {
            onOpenLeadAction(resolveLeadDetailDeepLinkTarget(existingLead));
            setOpenedLeadId(existingLead.id);
            return;
        }

        const controller = new AbortController();

        const fetchLead = async () => {
            try {
                const params = new URLSearchParams({
                    requesterId: userId,
                    id: pendingLeadId
                });
                if (companyName) params.set('company', companyName);

                const response = await fetch(`/api/franchise-leads?${params.toString()}`, {
                    cache: 'no-store',
                    signal: controller.signal
                });
                const payload: unknown = await response.json();

                if (!response.ok) {
                    throw new Error(readApiError(payload));
                }

                const data = unwrapApiData<LeadByIdResponse>(payload);
                const lead = data.lead || null;
                if (!lead) {
                    showAlertAction('알림 대상 가맹 희망자를 찾지 못했습니다.', 'error', '알림 이동 실패');
                    setOpenedLeadId(pendingLeadId);
                    return;
                }

                onLeadLoadedAction(lead);
                onOpenLeadAction(resolveLeadDetailDeepLinkTarget(lead));
                setOpenedLeadId(lead.id);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                if (error instanceof Error) {
                    console.error('Failed to open deep-linked lead:', error);
                    showAlertAction(error.message, 'error', '알림 이동 실패');
                    setOpenedLeadId(pendingLeadId);
                    return;
                }
                throw error;
            }
        };

        void fetchLead();

        return () => controller.abort();
    }, [
        companyName,
        leads,
        onLeadLoadedAction,
        onOpenLeadAction,
        openedLeadId,
        pendingLeadId,
        showAlertAction,
        userId
    ]);
}
