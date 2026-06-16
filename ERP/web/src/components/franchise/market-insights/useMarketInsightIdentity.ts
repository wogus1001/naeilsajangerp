"use client";

import React from 'react';
import {
    ADMIN_COMPANY_SCOPE_CHANGE_EVENT,
    getRequesterId,
    getStoredCompanyName,
    getStoredUser
} from '@/utils/userUtils';

export type MarketInsightIdentity = {
    readonly userId: string;
    readonly companyName: string;
    readonly currentUserName: string;
    readonly currentUserRole: string;
};

const EMPTY_IDENTITY: MarketInsightIdentity = {
    userId: '',
    companyName: '',
    currentUserName: '',
    currentUserRole: ''
};

function getStoredUserName(storedUser: ReturnType<typeof getStoredUser>): string {
    return storedUser?.name || storedUser?.managerName || '';
}

function readMarketInsightIdentity(): MarketInsightIdentity {
    const storedUser = getStoredUser();
    return {
        userId: getRequesterId(storedUser) || localStorage.getItem('userId') || '',
        companyName: getStoredCompanyName(storedUser) || '',
        currentUserName: getStoredUserName(storedUser),
        currentUserRole: storedUser?.role || ''
    };
}

export function useMarketInsightIdentity(): MarketInsightIdentity {
    const [identity, setIdentity] = React.useState<MarketInsightIdentity>(EMPTY_IDENTITY);

    React.useEffect(() => {
        const syncIdentity = () => setIdentity(readMarketInsightIdentity());

        syncIdentity();
        window.addEventListener(ADMIN_COMPANY_SCOPE_CHANGE_EVENT, syncIdentity);
        window.addEventListener('storage', syncIdentity);

        return () => {
            window.removeEventListener(ADMIN_COMPANY_SCOPE_CHANGE_EVENT, syncIdentity);
            window.removeEventListener('storage', syncIdentity);
        };
    }, []);

    return identity;
}
