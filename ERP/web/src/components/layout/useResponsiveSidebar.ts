"use client";

import React from 'react';

const MOBILE_SIDEBAR_MAX_WIDTH = 720;
const MOBILE_SIDEBAR_QUERY = `(max-width: ${MOBILE_SIDEBAR_MAX_WIDTH}px)`;

export function isSidebarOpenByDefault(viewportWidth: number): boolean {
    return viewportWidth > MOBILE_SIDEBAR_MAX_WIDTH;
}

function getInitialSidebarOpen() {
    if (typeof window === 'undefined') return true;
    return isSidebarOpenByDefault(window.innerWidth);
}

export function useResponsiveSidebar(): readonly [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
    const [isOpen, setIsOpen] = React.useState(getInitialSidebarOpen);

    React.useEffect(() => {
        const media = window.matchMedia(MOBILE_SIDEBAR_QUERY);
        const syncSidebarState = () => setIsOpen(!media.matches);
        syncSidebarState();
        media.addEventListener('change', syncSidebarState);
        return () => media.removeEventListener('change', syncSidebarState);
    }, []);

    return [isOpen, setIsOpen] as const;
}
