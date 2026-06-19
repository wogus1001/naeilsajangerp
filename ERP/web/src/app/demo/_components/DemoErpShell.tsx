'use client';

import {
    Bell,
    Briefcase,
    ChevronDown,
    FileText,
    LayoutDashboard,
    ListChecks,
    MapPin,
    Store,
    Target,
    User
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import mainStyles from '@/components/layout/MainLayout.module.css';
import sidebarStyles from '@/components/layout/Sidebar.module.css';
import headerStyles from '@/components/layout/Header.module.css';
import logoStyles from '@/components/layout/SidebarLogo.module.css';
import { SIDEBAR_SECTIONS, type SidebarLinkIcon, type SidebarSectionKey } from '@/components/layout/SidebarMenuConfig';
import type { DemoScreenId, DemoScenario } from '../demoTypes';
import styles from '../demo.module.css';
import {
    DEMO_PATH_TO_SCREEN,
    DEMO_ROLE_PROFILES,
    getDemoBreadcrumbRoot
} from './DemoErpShellConfig';

type DemoErpShellProps = {
    readonly scenario: DemoScenario;
    readonly activeScreen: DemoScreenId;
    readonly notice: string;
    readonly children: ReactNode;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onRestartTour: () => void;
};

export function DemoErpShell({
    scenario,
    activeScreen,
    notice,
    children,
    onScreenChange,
    onRestartTour
}: DemoErpShellProps) {
    const profile = DEMO_ROLE_PROFILES[scenario.role];
    const logoText = '데모';
    const activeNav = scenario.navItems.find(item => item.id === activeScreen) ?? scenario.navItems[0];

    return (
        <main className={`${mainStyles.container} ${styles.demoActualLayout}`}>
            <aside className={`${sidebarStyles.sidebar} global-sidebar`}>
                <div className={sidebarStyles.contentContainer}>
                    <Link href="/demo" className={logoStyles.logo} style={{ textDecoration: 'none' }}>
                        <div className={logoStyles.logoIcon}><div className={logoStyles.gridIcon} /></div>
                        <span className={logoStyles.logoText}>{logoText}</span>
                    </Link>
                    <div className={sidebarStyles.searchWrapper}>
                        <input className={sidebarStyles.searchInput} value="샘플 데모" readOnly aria-label="데모 메뉴 검색" />
                    </div>
                    <nav className={sidebarStyles.nav} aria-label="데모 메뉴">
                        {SIDEBAR_SECTIONS.filter(section => section.key === 'dashboard' || section.key === 'franchise').map(section => (
                            <DemoSidebarSection
                                key={section.key}
                                activeScreen={activeScreen}
                                sectionKey={section.key}
                                title={section.title}
                                items={section.items.flatMap(item => {
                                    const screen = DEMO_PATH_TO_SCREEN[item.url];
                                    if (!screen || !scenario.navItems.some(nav => nav.id === screen)) return [];
                                    return [{ label: item.title, screen, icon: item.icon }];
                                })}
                                onScreenChange={onScreenChange}
                            />
                        ))}
                    </nav>
                </div>
            </aside>
            <section className={mainStyles.mainWrapper}>
                <header className={`${headerStyles.header} global-header`}>
                    <div className={headerStyles.breadcrumbs}>
                        <span className={headerStyles.crumbRoot}>{getDemoBreadcrumbRoot(activeScreen)}</span>
                        <span className={headerStyles.crumbSeparator}>&gt;</span>
                        <span className={headerStyles.crumbCurrent}>{activeNav?.label ?? scenario.title}</span>
                    </div>
                    <div className={headerStyles.actions}>
                        <button type="button" className={styles.demoHeaderButton} onClick={onRestartTour}>설명 다시 보기</button>
                        <span className={styles.demoModeBadge}>샘플 데이터 데모</span>
                        <button type="button" className={styles.demoBellButton} aria-label="데모 알림">
                            <Bell size={17} aria-hidden="true" />
                        </button>
                        <div className={headerStyles.profile}>
                            <div className={headerStyles.profileInfo}>
                                <span className={headerStyles.name}>{profile.name}</span>
                                <span className={headerStyles.role}>{profile.company}</span>
                            </div>
                            <User size={16} className={headerStyles.profileIcon} aria-hidden="true" />
                        </div>
                    </div>
                </header>
                <div className={mainStyles.content}>
                    {children}
                    <p className={styles.erpNotice}>{notice}</p>
                </div>
            </section>
        </main>
    );
}

function DemoSidebarSection({
    activeScreen,
    sectionKey,
    title,
    items,
    onScreenChange
}: {
    readonly activeScreen: DemoScreenId;
    readonly sectionKey: SidebarSectionKey;
    readonly title: string;
    readonly items: readonly { readonly label: string; readonly screen: DemoScreenId; readonly icon?: SidebarLinkIcon }[];
    readonly onScreenChange: (screen: DemoScreenId) => void;
}) {
    if (items.length === 0) return null;
    const isDirect = sectionKey === 'dashboard';
    const firstItem = items[0];

    if (isDirect && firstItem) {
        return (
            <div className={sidebarStyles.navGroup}>
                <button
                    type="button"
                    className={`${sidebarStyles.navGroupTitle} ${activeScreen === firstItem.screen ? sidebarStyles.active : ''} ${styles.demoNavButton}`}
                    onClick={() => onScreenChange(firstItem.screen)}
                    data-demo-id={`nav-${firstItem.screen}`}
                >
                    <div className={sidebarStyles.navGroupLabel}>
                        {renderSectionIcon(sectionKey)}
                        <span>{title}</span>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className={sidebarStyles.navGroup}>
            <button type="button" className={`${sidebarStyles.navGroupTitle} ${styles.demoNavButton}`}>
                <div className={sidebarStyles.navGroupLabel}>
                    {renderSectionIcon(sectionKey)}
                    <span>{title}</span>
                </div>
                <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div className={sidebarStyles.navSubMenu}>
                {items.map(item => (
                    <button
                        key={`${item.label}-${item.screen}`}
                        type="button"
                        className={`${sidebarStyles.navSubLink} ${activeScreen === item.screen ? sidebarStyles.active : ''} ${styles.demoNavButton}`}
                        onClick={() => onScreenChange(item.screen)}
                        data-demo-id={`nav-${item.screen}`}
                    >
                        <span className={sidebarStyles.navSubLinkContent}>
                            {renderLinkIcon(item.icon)}
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function renderSectionIcon(key: SidebarSectionKey) {
    switch (key) {
        case 'dashboard':
            return <LayoutDashboard size={18} aria-hidden="true" />;
        case 'franchise':
            return <Store size={18} aria-hidden="true" />;
        case 'franchiseWork':
        case 'consulting':
            return <Briefcase size={18} aria-hidden="true" />;
        case 'customers':
            return <User size={18} aria-hidden="true" />;
        case 'businessCards':
            return <ListChecks size={18} aria-hidden="true" />;
        case 'contracts':
            return <FileText size={18} aria-hidden="true" />;
    }
}

function renderLinkIcon(icon: SidebarLinkIcon | undefined) {
    switch (icon) {
        case 'target':
            return <Target size={14} aria-hidden="true" />;
        case 'mapPin':
            return <MapPin size={14} aria-hidden="true" />;
        case 'store':
            return <Store size={14} aria-hidden="true" />;
        case 'users':
            return <User size={14} aria-hidden="true" />;
        case 'list':
            return <ListChecks size={14} aria-hidden="true" />;
        default:
            return null;
    }
}
