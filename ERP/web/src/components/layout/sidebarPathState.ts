import { SIDEBAR_MENU_ITEMS, type SidebarMenuItem } from './SidebarMenuConfig';

export function isSidebarItemPathMatch(item: SidebarMenuItem, pathname: string): boolean {
    if (!item.url) return false;
    if (item.url === '/dashboard') return pathname === item.url;
    return pathname === item.url || pathname.startsWith(`${item.url}/`);
}

export function isSidebarItemActive(
    item: SidebarMenuItem,
    pathname: string,
    candidates: readonly SidebarMenuItem[] = SIDEBAR_MENU_ITEMS
): boolean {
    if (!isSidebarItemPathMatch(item, pathname)) return false;
    const itemUrlLength = item.url?.length ?? 0;
    return !candidates.some(candidate => {
        const candidateUrlLength = candidate.url?.length ?? 0;
        return candidateUrlLength > itemUrlLength && isSidebarItemPathMatch(candidate, pathname);
    });
}
