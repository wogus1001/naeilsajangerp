import Link from 'next/link';
import {
    Briefcase,
    Calculator,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Contact,
    FileSignature,
    FileText,
    LayoutDashboard,
    ListChecks,
    MapPin,
    Store,
    Target,
    Users
} from 'lucide-react';
import type { CompanyMenuFeatureKey } from '@/lib/company-menu-features';
import type { SidebarLinkIcon, SidebarMenuItem, SidebarMenuSection, SidebarSectionKey } from './SidebarMenuConfig';
import styles from './Sidebar.module.css';

type SidebarNavSectionProps = {
    readonly section: SidebarMenuSection;
    readonly pathname: string;
    readonly isSidebarOpen: boolean;
    readonly isExpanded: boolean;
    readonly isVisible?: boolean;
    readonly isFeatureEnabled: (key: CompanyMenuFeatureKey) => boolean;
    readonly onToggle: () => void;
};

function renderSectionIcon(key: SidebarSectionKey) {
    switch (key) {
        case 'dashboard':
            return <LayoutDashboard size={18} />;
        case 'franchise':
            return <Store size={18} />;
        case 'franchiseWork':
            return <Briefcase size={18} />;
        case 'consulting':
            return <Briefcase size={18} />;
        case 'customers':
            return <Users size={18} />;
        case 'businessCards':
            return <Contact size={18} />;
        case 'contracts':
            return <FileText size={18} />;
    }
}

function renderLinkIcon(icon: SidebarLinkIcon | undefined) {
    switch (icon) {
        case 'target':
            return <Target size={14} />;
        case 'mapPin':
            return <MapPin size={14} />;
        case 'store':
            return <Store size={14} />;
        case 'users':
            return <Users size={14} />;
        case 'list':
            return <ListChecks size={14} />;
        case 'fileSignature':
            return <FileSignature size={14} />;
        case 'clipboardCheck':
            return <ClipboardCheck size={14} />;
        case 'calculator':
            return <Calculator size={14} />;
        case 'calendar':
            return <CalendarDays size={14} />;
        default:
            return null;
    }
}

function isItemPathMatch(item: SidebarMenuItem, pathname: string): boolean {
    return Boolean(item.url && (pathname === item.url || pathname.startsWith(`${item.url}/`)));
}

function isItemActive(item: SidebarMenuItem, pathname: string, items: readonly SidebarMenuItem[]): boolean {
    if (!isItemPathMatch(item, pathname)) return false;
    const itemUrlLength = item.url?.length ?? 0;
    return !items.some(candidate => {
        const candidateUrlLength = candidate.url?.length ?? 0;
        return candidateUrlLength > itemUrlLength && isItemPathMatch(candidate, pathname);
    });
}

function getGroupChildren(items: readonly SidebarMenuItem[], groupIndex: number): readonly SidebarMenuItem[] {
    const children: SidebarMenuItem[] = [];
    for (let index = groupIndex + 1; index < items.length; index += 1) {
        const item = items[index];
        if (!item || item.depth !== 1) break;
        children.push(item);
    }
    return children;
}

export function SidebarNavSection({
    section,
    pathname,
    isSidebarOpen,
    isExpanded,
    isVisible = true,
    isFeatureEnabled,
    onToggle
}: SidebarNavSectionProps) {
    if (!isVisible) return null;

    const visibleItems = section.items.filter((item, index, items) => {
        if (item.group) {
            return getGroupChildren(items, index).some(child => isFeatureEnabled(child.featureKey));
        }
        return isFeatureEnabled(item.featureKey);
    });
    if (visibleItems.length === 0) return null;

    if (section.direct) {
        const item = visibleItems[0];
        if (!item?.url) return null;
        return (
            <div className={styles.navGroup}>
                <Link
                    href={item.url}
                    className={`${styles.navGroupTitle} ${isItemActive(item, pathname, visibleItems) ? styles.active : ''}`}
                    title={!isSidebarOpen ? section.collapsedTitle : undefined}
                >
                    <div className={styles.navGroupLabel}>
                        {renderSectionIcon(section.key)}
                        {isSidebarOpen && <span>{section.title}</span>}
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.navGroup}>
            <button
                className={styles.navGroupTitle}
                onClick={onToggle}
                title={!isSidebarOpen ? section.collapsedTitle : undefined}
            >
                <div className={styles.navGroupLabel}>
                    {renderSectionIcon(section.key)}
                    {isSidebarOpen && <span>{section.title}</span>}
                </div>
                {isSidebarOpen && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
            </button>

            {isExpanded && (
                <div className={styles.navSubMenu}>
                    {visibleItems.map((item, index) => {
                        const icon = renderLinkIcon(item.icon);
                        if (item.group || !item.url) {
                            const isActiveGroup = getGroupChildren(visibleItems, index).some(child => isItemActive(child, pathname, visibleItems));
                            return (
                                <div
                                    key={`group-${item.title}`}
                                    className={`${styles.navSubGroupLabel} ${isActiveGroup ? styles.navSubGroupActive : ''}`}
                                >
                                    {icon ? (
                                        <span className={styles.navSubLinkContent}>
                                            {icon}
                                            {item.title}
                                        </span>
                                    ) : item.title}
                                </div>
                            );
                        }
                        return (
                            <Link
                                key={item.url}
                                href={item.url}
                                className={`${styles.navSubLink} ${item.depth === 1 ? styles.navSubLinkChild : ''} ${isItemActive(item, pathname, visibleItems) ? styles.active : ''}`}
                            >
                                {icon ? (
                                    <span className={styles.navSubLinkContent}>
                                        {icon}
                                        {item.title}
                                    </span>
                                ) : item.title}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
