"use client";

import React from 'react';
import {
    addUniqueLeadLocationLink,
    createLeadLocationLink,
    normalizeLeadLocationLinks,
    updateLeadLocationLink
} from '@/lib/franchise-lead-location-links';
import type { LeadLocationLink, LeadLocationLinkStatus, LeadLocationTargetType } from '@/lib/franchise-lead-location-links';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { createActivityId } from './utils';
import type { ExternalPropertyListing, FranchiseLead, FranchiseLocation, LeadActivity } from './types';

type LeadAlertType = 'success' | 'error' | 'info';

type UseLeadLocationLinksParams = {
    readonly userId: string;
    readonly userName?: string;
    readonly companyName: string;
    readonly selectedLead: FranchiseLead | null;
    readonly onLeadPatchAction: (lead: FranchiseLead, patch: Record<string, unknown>) => Promise<FranchiseLead | null>;
    readonly showAlertAction: (message: string, type?: LeadAlertType, title?: string) => void;
};

export function useLeadLocationLinks({
    userId,
    userName,
    companyName,
    selectedLead,
    onLeadPatchAction,
    showAlertAction
}: UseLeadLocationLinksParams) {
    const [franchiseLocations, setFranchiseLocations] = React.useState<FranchiseLocation[]>([]);
    const [externalListings, setExternalListings] = React.useState<ExternalPropertyListing[]>([]);
    const [isLocationMatchLoading, setIsLocationMatchLoading] = React.useState(false);
    const [isLocationLinkSaving, setIsLocationLinkSaving] = React.useState(false);
    const selectedLeadLocationLinks = React.useMemo(
        () => normalizeLeadLocationLinks(selectedLead?.locationLinks),
        [selectedLead?.locationLinks]
    );

    React.useEffect(() => {
        if (!userId) return;

        const controller = new AbortController();
        const params = new URLSearchParams({ requesterId: userId });
        if (companyName) params.set('company', companyName);

        const listingParams = new URLSearchParams(params);
        listingParams.set('limit', '500');

        setIsLocationMatchLoading(true);
        void getApiAuthHeaders()
            .then(headers => Promise.allSettled([
                fetch(`/api/franchise-locations?${params.toString()}`, { cache: 'no-store', signal: controller.signal, headers })
                    .then(async response => {
                        const payload = await response.json();
                        if (!response.ok) throw new Error(readApiError(payload));
                        return unwrapApiData<{ locations?: FranchiseLocation[] }>(payload);
                    }),
                fetch(`/api/realty/listings?${listingParams.toString()}`, { cache: 'no-store', signal: controller.signal })
                    .then(async response => {
                        const payload = await response.json();
                        if (!response.ok) throw new Error(readApiError(payload));
                        return unwrapApiData<{ listings?: ExternalPropertyListing[] }>(payload);
                    })
            ]))
            .then(([locationResult, listingResult]) => {
                if (locationResult.status === 'fulfilled') {
                    setFranchiseLocations(locationResult.value.locations || []);
                } else {
                    console.error('Failed to fetch franchise locations for lead links:', locationResult.reason);
                    setFranchiseLocations([]);
                }

                if (listingResult.status === 'fulfilled') {
                    setExternalListings(listingResult.value.listings || []);
                } else {
                    console.error('Failed to fetch external listings for lead links:', listingResult.reason);
                    setExternalListings([]);
                }
            })
            .catch(error => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch lead location link targets:', error);
                setFranchiseLocations([]);
                setExternalListings([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLocationMatchLoading(false);
            });

        return () => controller.abort();
    }, [companyName, userId]);

    const getLinkTargetName = (targetType: LeadLocationTargetType, targetId: string) => {
        if (targetType === 'franchise_location') {
            return franchiseLocations.find(location => location.id === targetId)?.name || '출점 후보지';
        }
        const listing = externalListings.find(item => item.id === targetId);
        return listing?.title || listing?.address || '외부 상가';
    };

    const saveLocationLinks = async (links: readonly LeadLocationLink[], activityContent: string) => {
        if (!selectedLead) return;

        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '메모',
            content: activityContent,
            createdAt: new Date().toISOString(),
            createdBy: userName || userId
        };

        setIsLocationLinkSaving(true);
        try {
            await onLeadPatchAction(selectedLead, {
                locationLinks: links,
                activityLog: [nextActivity, ...(selectedLead.activityLog || [])]
            });
        } finally {
            setIsLocationLinkSaving(false);
        }
    };

    const addLocationLink = async (targetType: LeadLocationTargetType, targetId: string) => {
        if (!selectedLead) return;
        const currentLinks = normalizeLeadLocationLinks(selectedLead.locationLinks);
        const targetName = getLinkTargetName(targetType, targetId);
        const nextLink = createLeadLocationLink({
            id: createActivityId(),
            targetType,
            targetId,
            createdAt: new Date().toISOString(),
            createdBy: userName || userId
        });

        try {
            const nextLinks = addUniqueLeadLocationLink(currentLinks, nextLink);
            if (nextLinks.length === currentLinks.length) {
                showAlertAction('이미 연결된 후보지입니다.', 'info', '중복 연결');
                return;
            }

            await saveLocationLinks(nextLinks, `후보지 연결: ${targetName}`);
            showAlertAction('가맹 희망자에 후보지를 연결했습니다.', 'success', '연결 완료');
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '후보지 연결에 실패했습니다.', 'error', '연결 실패');
        }
    };

    const updateLocationLink = async (
        linkId: string,
        patch: { readonly status?: LeadLocationLinkStatus; readonly memo?: string }
    ) => {
        if (!selectedLead) return;
        const currentLinks = normalizeLeadLocationLinks(selectedLead.locationLinks);
        const targetLink = currentLinks.find(link => link.id === linkId);
        if (!targetLink) return;

        const nextLinks = updateLeadLocationLink(currentLinks, linkId, {
            ...patch,
            updatedAt: new Date().toISOString()
        });
        const targetName = getLinkTargetName(targetLink.targetType, targetLink.targetId);
        const activityContent = patch.status
            ? `후보지 상태 변경: ${targetName} · ${patch.status}`
            : `후보지 메모 업데이트: ${targetName}`;

        try {
            await saveLocationLinks(nextLinks, activityContent);
            showAlertAction('후보지 연결 정보를 저장했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '후보지 연결 정보 저장에 실패했습니다.', 'error', '저장 실패');
        }
    };

    const removeLocationLink = async (linkId: string) => {
        if (!selectedLead) return;
        const currentLinks = normalizeLeadLocationLinks(selectedLead.locationLinks);
        const targetLink = currentLinks.find(link => link.id === linkId);
        if (!targetLink) return;

        const targetName = getLinkTargetName(targetLink.targetType, targetLink.targetId);
        const nextLinks = currentLinks.filter(link => link.id !== linkId);

        try {
            await saveLocationLinks(nextLinks, `후보지 연결 삭제: ${targetName}`);
            showAlertAction('후보지 연결을 삭제했습니다.', 'success', '삭제 완료');
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '후보지 연결 삭제에 실패했습니다.', 'error', '삭제 실패');
        }
    };

    return {
        addLocationLink,
        externalListings,
        franchiseLocations,
        isLocationLinkSaving,
        isLocationMatchLoading,
        removeLocationLink,
        selectedLeadLocationLinks,
        updateLocationLink
    };
}
