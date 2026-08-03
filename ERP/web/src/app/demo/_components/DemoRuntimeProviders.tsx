'use client';

import React, { type ReactNode } from 'react';
import { AppDialogProvider } from '@/components/common/AppDialogProvider';
import { LeadDetailRuntimeProvider } from '@/components/franchise/leads/LeadDetailRuntimeProvider';
import { createDemoLeadDetailRuntime } from './DemoLeadDetailRuntime';

type DemoRuntimeProvidersProps = {
    readonly children: ReactNode;
};

export function DemoRuntimeProviders({ children }: DemoRuntimeProvidersProps) {
    const [leadDetailRuntime] = React.useState(createDemoLeadDetailRuntime);

    return (
        <AppDialogProvider>
            <LeadDetailRuntimeProvider runtime={leadDetailRuntime}>
                {children}
            </LeadDetailRuntimeProvider>
        </AppDialogProvider>
    );
}
