'use client';

import {
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Header, { type HeaderBreadcrumb, type HeaderNotificationDataSource, type HeaderProfileActions, type HeaderUser } from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import type { HeaderNotification } from '@/components/layout/notificationRequests';
import mainStyles from '@/components/layout/MainLayout.module.css';
import type { DemoActionHandler, DemoScreenId, DemoScenario } from '../demoTypes';
import styles from '../demo.module.css';
import {
    buildDemoSidebarSections,
    DEMO_PATH_TO_SCREEN,
    DEMO_ROLE_PROFILES,
    DEMO_SCREEN_TO_PATH,
    getDemoBreadcrumbRoot
} from './DemoErpShellConfig';

type DemoErpShellProps = {
    readonly scenario: DemoScenario;
    readonly activeScreen: DemoScreenId;
    readonly activePath?: string;
    readonly activeTitle?: string;
    readonly children: ReactNode;
    readonly onLogout: () => void;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onPreviewPathChange: (path: string) => void;
    readonly onSimulate: DemoActionHandler;
    readonly onOpenExperience: () => void;
};

const DEMO_HEADER_NOTIFICATIONS: readonly HeaderNotification[] = [
    {
        id: 'demo-notification-documents',
        category: 'franchise',
        sourceType: 'franchise',
        severity: 'warning',
        title: '필수 서류 2건 누락',
        body: '계약 완료 점주 상세에서 문서 연결 흐름을 확인하세요.',
        actionUrl: '/dashboard/franchise-leads',
        dueAt: null,
        readAt: null
    },
    {
        id: 'demo-notification-opening',
        category: 'franchise',
        sourceType: 'franchise',
        severity: 'danger',
        title: '초도물류 일정 확인 필요',
        body: '오픈 준비 프로젝트의 기한임박 항목을 샘플로 확인합니다.',
        actionUrl: '/dashboard/franchise-operations',
        dueAt: '2026-06-27T09:00:00.000Z',
        readAt: null
    },
    {
        id: 'demo-notification-map',
        category: 'system',
        sourceType: 'system',
        severity: 'info',
        title: '반경분석 결과 업데이트',
        body: '지도에서 선택 마커 기준 주변 후보지를 확인해보세요.',
        actionUrl: '/dashboard/franchise-locations',
        dueAt: null,
        readAt: null
    }
] as const;

export function DemoErpShell({
    scenario,
    activeScreen,
    activePath,
    activeTitle,
    children,
    onLogout,
    onScreenChange,
    onPreviewPathChange,
    onSimulate,
    onOpenExperience
}: DemoErpShellProps) {
    const profile = DEMO_ROLE_PROFILES[scenario.role];
    const activeNav = scenario.navItems.find(item => item.id === activeScreen) ?? scenario.navItems[0];
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState<readonly HeaderNotification[]>(DEMO_HEADER_NOTIFICATIONS);
    const sidebarSections = useMemo(() => buildDemoSidebarSections(scenario.role), [scenario.role]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            if (window.innerWidth <= 900) setIsSidebarCollapsed(true);
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activeScreen]);

    const handleScreenChange = useCallback((screen: DemoScreenId) => {
        onScreenChange(screen);
        if (window.innerWidth <= 900) setIsSidebarCollapsed(true);
    }, [onScreenChange]);

    const handleDemoPath = useCallback((href: string) => {
        const pathname = href.split(/[?#]/, 1)[0] || href;
        const screen = DEMO_PATH_TO_SCREEN[href] ?? DEMO_PATH_TO_SCREEN[pathname];
        if (screen && scenario.navItems.some(item => item.id === screen)) {
            handleScreenChange(screen);
            return;
        }
        const menuItem = sidebarSections
            .flatMap(section => section.items)
            .find(item => item.url === href || item.url === pathname);
        if (menuItem?.url) {
            onPreviewPathChange(pathname);
            return;
        }
        onSimulate('현재 데모에서는 핵심 프랜차이즈 흐름을 먼저 확인해 주세요.');
    }, [handleScreenChange, onPreviewPathChange, onSimulate, scenario.navItems, sidebarSections]);

    const notificationDataSource = useMemo<HeaderNotificationDataSource>(() => ({
        load: category => {
            const unreadNotifications = notifications.filter(notification => notification.readAt === null);
            const visibleNotifications = category === 'all'
                ? unreadNotifications
                : unreadNotifications.filter(notification => notification.category === category);
            return {
                notifications: visibleNotifications,
                unreadCount: visibleNotifications.filter(notification => notification.readAt === null).length,
                schemaReady: true
            };
        },
        markOneRead: notificationId => {
            setNotifications(current => current.map(notification => (
                notification.id === notificationId && notification.readAt === null
                    ? { ...notification, readAt: '2026-06-25T09:00:00.000Z' }
                    : notification
            )));
        },
        markAllRead: () => {
            setNotifications(current => current.map(notification => (
                notification.readAt === null
                    ? { ...notification, readAt: '2026-06-25T09:00:00.000Z' }
                    : notification
            )));
        },
        navigate: handleDemoPath
    }), [handleDemoPath, notifications]);

    const headerUser: HeaderUser = useMemo(() => ({
        id: `demo-${scenario.role}`,
        name: profile.name,
        role: scenario.role,
        companyName: profile.company
    }), [profile.company, profile.name, scenario.role]);

    const breadcrumb: HeaderBreadcrumb = useMemo(() => ({
        category: getDemoBreadcrumbRoot(activeScreen),
        title: activeTitle || activeNav?.label || scenario.title
    }), [activeNav?.label, activeScreen, activeTitle, scenario.title]);

    const profileActions: HeaderProfileActions = useMemo(() => ({
        onProfile: () => handleDemoPath('/profile'),
        onAdmin: () => handleDemoPath('/admin'),
        onLogin: () => handleDemoPath('/login')
    }), [handleDemoPath]);

    return (
        <main className={`${mainStyles.container} ${styles.demoActualLayout} ${isSidebarCollapsed ? styles.demoSidebarCollapsed : ''}`}>
            <Sidebar
                isOpen={!isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(value => !value)}
                companyName={profile.company}
                runtime="demo"
                navigationAdapter={{
                    pathname: activePath || DEMO_SCREEN_TO_PATH[activeScreen],
                    sections: sidebarSections,
                    onNavigate: handleDemoPath,
                    navigationLabel: '데모 메뉴',
                    logoHref: '/dashboard',
                    getItemTestId: href => {
                        const pathname = href.split(/[?#]/, 1)[0] || href;
                        const screen = DEMO_PATH_TO_SCREEN[href] ?? DEMO_PATH_TO_SCREEN[pathname];
                        return screen ? `nav-${screen}` : undefined;
                    }
                }}
            />
            <section className={`${mainStyles.mainWrapper} ${isSidebarCollapsed ? mainStyles.collapsed : ''}`}>
                <Header
                    user={headerUser}
                    onLogout={onLogout}
                    breadcrumb={breadcrumb}
                    showCompanySelector={false}
                    notificationDataSource={notificationDataSource}
                    profileActions={profileActions}
                    extraActions={(
                        <>
                            <button
                                type="button"
                                className={`${styles.demoHeaderButton} ${styles.demoMobileMenuButton}`}
                                onClick={() => setIsSidebarCollapsed(value => !value)}
                                data-demo-id="demo-mobile-menu-button"
                            >
                                {isSidebarCollapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}
                                {isSidebarCollapsed ? '메뉴 열기' : '메뉴 접기'}
                            </button>
                            <button type="button" className={`${styles.demoHeaderButton} ${styles.demoTourButton}`} onClick={onOpenExperience}>체험 선택</button>
                            <button type="button" className={`${styles.demoHeaderButton} ${styles.demoLogoutButton}`} onClick={onLogout}>데모 로그아웃</button>
                            <span className={styles.demoModeBadge}>샘플 데이터 데모</span>
                        </>
                    )}
                />
                <div className={mainStyles.content}>
                    {children}
                </div>
            </section>
        </main>
    );
}
