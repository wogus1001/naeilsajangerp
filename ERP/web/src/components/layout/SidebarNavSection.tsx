import Link from 'next/link';
import { Briefcase, ChevronDown, ChevronRight, Contact, FileText, LayoutDashboard, ListChecks, MapPin, Store, Target, Users } from 'lucide-react';
import type { CompanyMenuFeatureKey } from '@/lib/company-menu-features';
import type { SidebarLinkIcon, SidebarMenuSection, SidebarSectionKey } from './SidebarMenuConfig';
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
        default:
            return null;
    }
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

    const visibleItems = section.items.filter(item => isFeatureEnabled(item.featureKey));
    if (visibleItems.length === 0) return null;

    if (section.direct) {
        const item = visibleItems[0];
        return (
            <div className={styles.navGroup}>
                <Link
                    href={item.url}
                    className={`${styles.navGroupTitle} ${pathname === item.url ? styles.active : ''}`}
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
                    {visibleItems.map(item => {
                        const icon = renderLinkIcon(item.icon);
                        return (
                            <Link
                                key={item.url}
                                href={item.url}
                                className={`${styles.navSubLink} ${pathname === item.url ? styles.active : ''}`}
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
