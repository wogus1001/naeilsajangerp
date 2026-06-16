"use client";

import React from 'react';
import { fetchLocationManagers } from './locationMasterRequests';
import type { LocationManagerOption } from './locationMasterTypes';

type UseLocationManagersParams = {
    readonly userId: string;
    readonly companyName: string;
    readonly currentUserName: string;
    readonly currentUserRole: string;
};

type UseLocationManagersResult = {
    readonly managerOptions: readonly LocationManagerOption[];
    readonly isManagerLoading: boolean;
    readonly defaultManagerId: string;
};

function isAdminRole(role?: string): boolean {
    return role === 'admin' || role === 'super_admin';
}

function mergeCurrentManagerOption(
    options: readonly LocationManagerOption[],
    currentOption: LocationManagerOption | null
): readonly LocationManagerOption[] {
    if (!currentOption) return options;
    const hasCurrent = options.some(option => option.id === currentOption.id || option.displayId === currentOption.displayId);
    return hasCurrent ? options : [currentOption, ...options];
}

export function useLocationManagers({
    userId,
    companyName,
    currentUserName,
    currentUserRole
}: UseLocationManagersParams): UseLocationManagersResult {
    const [managerOptions, setManagerOptions] = React.useState<readonly LocationManagerOption[]>([]);
    const [isManagerLoading, setIsManagerLoading] = React.useState(false);

    const currentManagerOption = React.useMemo<LocationManagerOption | null>(() => {
        if (!userId || isAdminRole(currentUserRole)) return null;
        return {
            id: userId,
            displayId: userId,
            name: currentUserName || '내 계정'
        };
    }, [currentUserName, currentUserRole, userId]);

    React.useEffect(() => {
        if (!userId || !companyName.trim()) {
            setManagerOptions(mergeCurrentManagerOption([], currentManagerOption));
            setIsManagerLoading(false);
            return;
        }

        let isMounted = true;
        setIsManagerLoading(true);

        const loadManagers = async () => {
            try {
                const options = await fetchLocationManagers({ userId, companyName });
                if (isMounted) setManagerOptions(mergeCurrentManagerOption(options, currentManagerOption));
            } catch (error) {
                if (error instanceof Error) console.error('Failed to fetch location managers:', error);
                else throw error;
                if (isMounted) setManagerOptions(mergeCurrentManagerOption([], currentManagerOption));
            } finally {
                if (isMounted) setIsManagerLoading(false);
            }
        };

        void loadManagers();

        return () => {
            isMounted = false;
        };
    }, [companyName, currentManagerOption, userId]);

    const defaultManagerId = React.useMemo(() => {
        if (!userId) return '';
        const matchedManager = managerOptions.find(option => option.id === userId || option.displayId === userId);
        return matchedManager?.id || managerOptions[0]?.id || '';
    }, [managerOptions, userId]);

    return { managerOptions, isManagerLoading, defaultManagerId };
}
