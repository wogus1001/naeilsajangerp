'use client';

import { useEffect } from 'react';

export const DEMO_BLOCKED_REQUEST_PREFIX = '/api/' as const;
export const DEMO_ALLOWED_REQUEST_PATHS = ['/api/demo/access'] as const;

export class DemoApiBlockedError extends Error {
    constructor(pathname: string) {
        super(`Demo mode blocked real API request: ${pathname}`);
        this.name = 'DemoApiBlockedError';
    }
}

function getFetchUrl(input: RequestInfo | URL): URL {
    if (typeof input === 'string') {
        return new URL(input, window.location.href);
    }

    if (input instanceof URL) {
        return input;
    }

    return new URL(input.url, window.location.href);
}

export function isDemoFetchAllowed(requestUrl: URL, currentOrigin: string): boolean {
    if (requestUrl.origin !== currentOrigin) return false;
    if (!requestUrl.pathname.startsWith(DEMO_BLOCKED_REQUEST_PREFIX)) return true;
    return DEMO_ALLOWED_REQUEST_PATHS.some(path => path === requestUrl.pathname);
}

export function isDemoNavigationAllowed(requestUrl: URL, currentOrigin: string): boolean {
    return requestUrl.origin === currentOrigin
        && (requestUrl.pathname === '/demo' || requestUrl.pathname.startsWith('/demo/'));
}

export function useDemoApiGuard() {
    useEffect(() => {
        const originalFetch = window.fetch.bind(window);
        const originalOpen = window.open;
        const currentOrigin = window.location.origin;

        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const requestUrl = getFetchUrl(input);
            if (!isDemoFetchAllowed(requestUrl, currentOrigin)) {
                throw new DemoApiBlockedError(requestUrl.pathname);
            }

            return originalFetch(input, init);
        };
        window.open = ((url?: string | URL, target?: string, features?: string) => {
            if (!url) return null;
            const requestUrl = new URL(String(url), window.location.href);
            if (!isDemoNavigationAllowed(requestUrl, currentOrigin)) return null;
            return originalOpen.call(window, url, target, features);
        }) as typeof window.open;

        const blockOperationalNavigation = (event: MouseEvent) => {
            const eventTarget = event.target;
            if (!(eventTarget instanceof Element)) return;
            const anchor = eventTarget.closest<HTMLAnchorElement>('a[href]');
            if (!anchor) return;
            const requestUrl = new URL(anchor.href, window.location.href);
            if (!isDemoNavigationAllowed(requestUrl, currentOrigin)) event.preventDefault();
        };
        document.addEventListener('click', blockOperationalNavigation, true);

        return () => {
            window.fetch = originalFetch;
            window.open = originalOpen;
            document.removeEventListener('click', blockOperationalNavigation, true);
        };
    }, []);
}
