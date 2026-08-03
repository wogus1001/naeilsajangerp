'use client';

import React, { type ReactNode } from 'react';
import { LIVE_LEAD_DETAIL_RUNTIME } from './leadDetailLiveRuntime';
import type {
    LeadDetailRuntime,
    LeadDetailRuntimeOverrides
} from './leadDetailRuntime';

const LeadDetailRuntimeContext = React.createContext<LeadDetailRuntime>(
    LIVE_LEAD_DETAIL_RUNTIME
);

type LeadDetailRuntimeProviderProps = {
    readonly children: ReactNode;
    readonly runtime: LeadDetailRuntimeOverrides;
};

export function resolveLeadDetailRuntime(
    runtime: LeadDetailRuntimeOverrides
): LeadDetailRuntime {
    return {
        ...LIVE_LEAD_DETAIL_RUNTIME,
        ...runtime
    };
}

export function LeadDetailRuntimeProvider({
    children,
    runtime
}: LeadDetailRuntimeProviderProps) {
    const value = React.useMemo(
        () => resolveLeadDetailRuntime(runtime),
        [runtime]
    );

    return (
        <LeadDetailRuntimeContext.Provider value={value}>
            {children}
        </LeadDetailRuntimeContext.Provider>
    );
}

export function useLeadDetailRuntime(): LeadDetailRuntime {
    return React.useContext(LeadDetailRuntimeContext);
}
