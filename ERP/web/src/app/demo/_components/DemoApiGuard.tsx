'use client';

import { useEffect } from 'react';
import { getDemoFeatureApiResponse } from './DemoFeatureApiFixtures';

export const DEMO_BLOCKED_REQUEST_PREFIX = '/api/' as const;
export const DEMO_ALLOWED_REQUEST_PATHS = ['/api/demo/access'] as const;
export const DEMO_NAVIGATION_REQUEST_EVENT = 'demo-navigation-request' as const;

export type DemoNavigationRequestEventDetail = {
    readonly path: string;
    readonly kind: 'link' | 'popup';
};

declare global {
    interface WindowEventMap {
        'demo-navigation-request': CustomEvent<DemoNavigationRequestEventDetail>;
    }
}

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

function getFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
    if (init?.method) return init.method.toUpperCase();
    if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
    return 'GET';
}

export function isDemoFetchAllowed(requestUrl: URL, currentOrigin: string): boolean {
    if (requestUrl.origin !== currentOrigin) return false;
    if (
        requestUrl.pathname.startsWith('/_next/')
        || requestUrl.pathname === '/favicon.ico'
        || requestUrl.pathname === '/demo'
        || requestUrl.pathname.startsWith('/demo/')
    ) return true;
    if (!requestUrl.pathname.startsWith(DEMO_BLOCKED_REQUEST_PREFIX)) return false;
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
        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);
        const currentOrigin = window.location.origin;
        const requestDemoNavigation = (path: string, kind: DemoNavigationRequestEventDetail['kind']) => {
            window.dispatchEvent(new CustomEvent<DemoNavigationRequestEventDetail>(DEMO_NAVIGATION_REQUEST_EVENT, {
                detail: { path, kind }
            }));
        };

        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const requestUrl = getFetchUrl(input);
            const fixtureResponse = getDemoFeatureApiResponse(requestUrl, getFetchMethod(input, init), init);
            if (fixtureResponse) return fixtureResponse;
            if (!isDemoFetchAllowed(requestUrl, currentOrigin)) {
                throw new DemoApiBlockedError(requestUrl.pathname);
            }

            return originalFetch(input, init);
        };
        window.open = ((url?: string | URL, target?: string, features?: string) => {
            if (!url) return null;
            const requestUrl = new URL(String(url), window.location.href);
            if (!isDemoNavigationAllowed(requestUrl, currentOrigin)) {
                requestDemoNavigation(`${requestUrl.pathname}${requestUrl.search}`, 'popup');
                return null;
            }
            return originalOpen.call(window, url, target, features);
        }) as typeof window.open;
        const guardHistoryChange = (
            original: typeof window.history.pushState,
            data: unknown,
            unused: string,
            url?: string | URL | null
        ) => {
            if (!url) {
                original(data, unused, url);
                return;
            }
            const requestUrl = new URL(String(url), window.location.href);
            if (!isDemoNavigationAllowed(requestUrl, currentOrigin)) {
                requestDemoNavigation(`${requestUrl.pathname}${requestUrl.search}`, 'link');
                return;
            }
            original(data, unused, url);
        };
        window.history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
            guardHistoryChange(originalPushState, data, unused, url);
        }) as typeof window.history.pushState;
        window.history.replaceState = ((data: unknown, unused: string, url?: string | URL | null) => {
            guardHistoryChange(originalReplaceState, data, unused, url);
        }) as typeof window.history.replaceState;

        const blockOperationalNavigation = (event: MouseEvent) => {
            const eventTarget = event.target;
            if (!(eventTarget instanceof Element)) return;
            const anchor = eventTarget.closest<HTMLAnchorElement>('a[href]');
            if (!anchor) return;
            const requestUrl = new URL(anchor.href, window.location.href);
            if (!isDemoNavigationAllowed(requestUrl, currentOrigin)) {
                event.preventDefault();
                requestDemoNavigation(`${requestUrl.pathname}${requestUrl.search}`, 'link');
            }
        };
        document.addEventListener('click', blockOperationalNavigation, true);

        return () => {
            window.fetch = originalFetch;
            window.open = originalOpen;
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
            document.removeEventListener('click', blockOperationalNavigation, true);
        };
    }, []);
}
