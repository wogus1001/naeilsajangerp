'use client';

import {
    Bell,
    Briefcase,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
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
import { useEffect, useState } from 'react';
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
    readonly children: ReactNode;
    readonly onLogout: () => void;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onRestartTour: () => void;
};

type HeaderPanel = 'notifications' | 'profile';

export function DemoErpShell({
    scenario,
    activeScreen,
    children,
    onLogout,
    onScreenChange,
    onRestartTour
}: DemoErpShellProps) {
    const profile = DEMO_ROLE_PROFILES[scenario.role];
    const logoText = '데모';
    const activeNav = scenario.navItems.find(item => item.id === activeScreen) ?? scenario.navItems[0];
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeHeaderPanel, setActiveHeaderPanel] = useState<HeaderPanel | null>(null);

    useEffect(() => {
        if (window.innerWidth <= 900) setIsSidebarCollapsed(true);
    }, []);

    const handleScreenChange = (screen: DemoScreenId) => {
        onScreenChange(screen);
        if (window.innerWidth <= 900) setIsSidebarCollapsed(true);
    };

    return (
        <main className={`${mainStyles.container} ${styles.demoActualLayout} ${isSidebarCollapsed ? styles.demoSidebarCollapsed : ''}`}>
            <aside className={`${sidebarStyles.sidebar} ${isSidebarCollapsed ? sidebarStyles.collapsed : ''} global-sidebar`}>
                <button
                    type="button"
                    className={sidebarStyles.toggleBtn}
                    onClick={() => setIsSidebarCollapsed(value => !value)}
                    aria-label={isSidebarCollapsed ? '데모 메뉴 열기' : '데모 메뉴 접기'}
                    data-demo-id="demo-sidebar-toggle"
                >
                    {isSidebarCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
                </button>
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
                                items={buildDemoSidebarItems(section, scenario)}
                                onScreenChange={handleScreenChange}
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
                        <button
                            type="button"
                            className={`${styles.demoHeaderButton} ${styles.demoMobileMenuButton}`}
                            onClick={() => setIsSidebarCollapsed(value => !value)}
                        >
                            {isSidebarCollapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}
                            {isSidebarCollapsed ? '메뉴 열기' : '메뉴 접기'}
                        </button>
                        <button type="button" className={`${styles.demoHeaderButton} ${styles.demoTourButton}`} onClick={onRestartTour}>설명 다시 보기</button>
                        <button type="button" className={`${styles.demoHeaderButton} ${styles.demoLogoutButton}`} onClick={onLogout}>데모 로그아웃</button>
                        <span className={styles.demoModeBadge}>샘플 데이터 데모</span>
                        <button
                            type="button"
                            className={styles.demoBellButton}
                            aria-label="데모 알림"
                            data-demo-id="demo-notification-button"
                            onClick={() => setActiveHeaderPanel(panel => panel === 'notifications' ? null : 'notifications')}
                        >
                            <Bell size={17} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className={`${headerStyles.profile} ${styles.demoProfileButton}`}
                            data-demo-id="demo-profile-button"
                            onClick={() => setActiveHeaderPanel(panel => panel === 'profile' ? null : 'profile')}
                        >
                            <span className={headerStyles.profileInfo}>
                                <span className={headerStyles.name}>{profile.name}</span>
                                <span className={headerStyles.role}>{profile.company}</span>
                            </span>
                            <User size={16} className={headerStyles.profileIcon} aria-hidden="true" />
                        </button>
                        {activeHeaderPanel ? (
                            <DemoHeaderPopover
                                panel={activeHeaderPanel}
                                profileName={profile.name}
                                profileCompany={profile.company}
                                onScreenChange={screen => {
                                    setActiveHeaderPanel(null);
                                    handleScreenChange(screen);
                                }}
                                onCloseAction={() => setActiveHeaderPanel(null)}
                            />
                        ) : null}
                    </div>
                </header>
                <div className={mainStyles.content}>
                    {children}
                </div>
            </section>
        </main>
    );
}

function DemoHeaderPopover({
    panel,
    profileName,
    profileCompany,
    onScreenChange,
    onCloseAction
}: {
    readonly panel: HeaderPanel;
    readonly profileName: string;
    readonly profileCompany: string;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onCloseAction: () => void;
}) {
    if (panel === 'notifications') {
        return (
            <div className={styles.demoHeaderPopover} data-demo-id="demo-notification-panel">
                <div className={styles.demoHeaderPopoverHeader}>
                    <strong>데모 알림</strong>
                    <button type="button" onClick={onCloseAction}>닫기</button>
                </div>
                <div className={styles.demoNotificationList}>
                    <button type="button" className={styles.demoNotificationItem} onClick={() => onScreenChange('contractOwners')}>
                        <span>구비서류</span>
                        <strong>필수 서류 2건 누락</strong>
                        <small>계약 완료 점주 상세에서 문서 연결 흐름을 확인하세요.</small>
                    </button>
                    <button type="button" className={styles.demoNotificationItem} onClick={() => onScreenChange('operations')}>
                        <span>오픈 준비</span>
                        <strong>초도물류 일정 확인 필요</strong>
                        <small>오픈 준비 프로젝트의 기한임박 항목을 샘플로 확인합니다.</small>
                    </button>
                    <button type="button" className={styles.demoNotificationItem} onClick={() => onScreenChange('locationMap')}>
                        <span>물건지 지도</span>
                        <strong>반경분석 결과 업데이트</strong>
                        <small>지도에서 선택 마커 기준 주변 후보지를 확인해보세요.</small>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.demoHeaderPopover} data-demo-id="demo-profile-panel">
            <div className={styles.demoHeaderPopoverHeader}>
                <strong>마이페이지</strong>
                <button type="button" onClick={onCloseAction}>닫기</button>
            </div>
            <div className={styles.demoProfilePanel}>
                <div className={styles.demoProfileAvatar}>
                    {profileName.slice(0, 1)}
                </div>
                <div>
                    <h3>{profileName}</h3>
                    <p>{profileCompany}</p>
                </div>
            </div>
            <dl className={styles.demoProfileMeta}>
                <div>
                    <dt>권한</dt>
                    <dd>데모 관리자</dd>
                </div>
                <div>
                    <dt>접근 화면</dt>
                    <dd>대시보드 · 모객 DB · 물건지 · 가맹 운영</dd>
                </div>
                <div>
                    <dt>데이터</dt>
                    <dd>샘플 전용, 실제 저장 없음</dd>
                </div>
            </dl>
            <div className={styles.demoProfileActions}>
                <button type="button" onClick={() => onScreenChange('dashboard')}>대시보드 보기</button>
                <button type="button" onClick={() => onScreenChange('leadDb')}>모객 DB 보기</button>
            </div>
        </div>
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
    const [isExpanded, setIsExpanded] = useState(true);
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
            <button
                type="button"
                className={`${sidebarStyles.navGroupTitle} ${styles.demoNavButton}`}
                onClick={() => setIsExpanded(value => !value)}
                aria-expanded={isExpanded}
                data-demo-id={`demo-section-${sectionKey}-toggle`}
            >
                <div className={sidebarStyles.navGroupLabel}>
                    {renderSectionIcon(sectionKey)}
                    <span>{title}</span>
                </div>
                <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div className={`${sidebarStyles.navSubMenu} ${isExpanded ? '' : styles.demoNavSubMenuCollapsed}`}>
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

function buildDemoSidebarItems(section: (typeof SIDEBAR_SECTIONS)[number], scenario: DemoScenario) {
    if (section.key === 'franchise') {
        return scenario.navItems
            .filter(item => item.id !== 'dashboard')
            .map(item => ({
                label: item.label,
                screen: item.id,
                icon: getDemoSidebarIcon(item.id)
            }));
    }

    return section.items.flatMap(item => {
        const screen = DEMO_PATH_TO_SCREEN[item.url];
        if (!screen || !scenario.navItems.some(nav => nav.id === screen)) return [];
        return [{ label: item.title, screen, icon: item.icon }];
    });
}

function getDemoSidebarIcon(screen: DemoScreenId): SidebarLinkIcon {
    switch (screen) {
        case 'leadDb':
            return 'target';
        case 'contractOwners':
            return 'list';
        case 'location':
        case 'locationMap':
            return 'mapPin';
        case 'operations':
            return 'store';
        case 'dashboard':
            return 'list';
    }
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
