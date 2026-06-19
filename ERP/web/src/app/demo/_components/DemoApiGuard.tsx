'use client';

import { useEffect } from 'react';

export const DEMO_BLOCKED_REQUEST_PREFIX = '/api/' as const;

export class DemoApiBlockedError extends Error {
    constructor(pathname: string) {
        super(`Demo mode blocked real API request: ${pathname}`);
        this.name = 'DemoApiBlockedError';
    }
}

function getFetchPathname(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return new URL(input, window.location.href).pathname;
    }

    if (input instanceof URL) {
        return input.pathname;
    }

    return new URL(input.url, window.location.href).pathname;
}

export function useDemoApiGuard() {
    useEffect(() => {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const pathname = getFetchPathname(input);
            if (pathname.startsWith(DEMO_BLOCKED_REQUEST_PREFIX)) {
                throw new DemoApiBlockedError(pathname);
            }

            return originalFetch(input, init);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);
}
