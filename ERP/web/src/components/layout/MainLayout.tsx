"use client";

import React from 'react';
import { Megaphone, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { setAdminCompanyScope } from '@/utils/userUtils';
import Sidebar from './Sidebar';
import Header from './Header';
import { useResponsiveSidebar } from './useResponsiveSidebar';
import { CompanyMenuDisabledNotice } from './CompanyMenuDisabledNotice';
import { MaintenanceScreen } from './MaintenanceScreen';
import { useCompanyMenuFeatures } from './useCompanyMenuFeatures';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

type AuthUser = {
    id?: string;
    uid?: string;
    email?: string;
    name?: string;
    role?: string;
    companyName?: string;
    companyId?: string;
    status?: string;
};

type AnnouncementConfig = {
    active?: boolean;
    message?: string;
    level?: string;
} | null;

type MaintenanceConfig = {
    active?: boolean;
    message?: string;
} | null;

const MainLayout = ({ children }: MainLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useResponsiveSidebar();
    const [announcement, setAnnouncement] = React.useState<AnnouncementConfig>(null);
    const [maintenance, setMaintenance] = React.useState<MaintenanceConfig>(null);
    const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
    const [isAuthReady, setIsAuthReady] = React.useState(false);
    const [userRole, setUserRole] = React.useState<string>('');

    const router = useRouter();
    const pathname = usePathname();
    const { flags: menuFlags, blockedFeature } = useCompanyMenuFeatures(authUser, pathname);

    React.useEffect(() => {
        let cancelled = false;

        const clearAuthAndRedirect = async () => {
            try {
                const supabase = getSupabase();
                await supabase.auth.signOut();
            } catch (error) {
                console.error('Failed to sign out stale session:', error);
            }
            localStorage.removeItem('user');
            setAdminCompanyScope(null);
            if (!cancelled) {
                setIsAuthReady(true);
                router.replace('/login');
            }
        };

        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/system/settings', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();

                    // Maintenance logic
                    if (data.maintenance?.active) {
                        setMaintenance(data.maintenance);
                    }

                    // Announcement logic
                    if (data.announcement?.active) {
                        const savedDismissed = localStorage.getItem('dismissed_banner_msg');
                        if (savedDismissed !== data.announcement.message) {
                            setAnnouncement(data.announcement);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
        };

        const verifyAuth = async (): Promise<AuthUser | null> => {
            const supabase = getSupabase();

            // 로그인 직후 세션이 저장되기 전에 호출될 수 있어 재시도 로직 적용 (최대 3회, 500ms 간격)
            let sessionData = null;
            let sessionError = null;
            let retryCount = 0;
            const MAX_RETRIES = 3;

            while (retryCount < MAX_RETRIES) {
                const result = await supabase.auth.getSession();
                sessionData = result.data;
                sessionError = result.error;

                if (sessionData?.session?.access_token) {
                    break;
                }

                if (retryCount < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                retryCount++;
            }

            if (sessionError || !sessionData?.session?.access_token) {
                return null;
            }

            const meRes = await fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                    'x-access-token': sessionData.session.access_token,
                },
                cache: 'no-store'
            });

            if (!meRes.ok) {
                console.error(`[AuthCheck] /api/auth/me failed with status: ${meRes.status}`);

                // 401/403: 유효하지 않은 토큰 → 강제 로그아웃 처리
                if (meRes.status === 401 || meRes.status === 403) {
                    await supabase.auth.signOut();
                    localStorage.removeItem('user');
                    setAdminCompanyScope(null);
                }

                return null;
            }

            const payload = await meRes.json() as { user?: AuthUser };
            if (!payload.user) {
                return null;
            }

            const storedRaw = localStorage.getItem('user');
            let storedUser: Partial<AuthUser> = {};

            if (storedRaw) {
                try {
                    storedUser = JSON.parse(storedRaw) as Partial<AuthUser>;
                } catch {
                    storedUser = {};
                }
            }

            const mergedUser: AuthUser = {
                ...storedUser,
                ...payload.user,
                id: storedUser.id || payload.user.id || payload.user.uid || payload.user.email
            };
            localStorage.setItem('user', JSON.stringify(mergedUser));
            return mergedUser;
        };

        const initializeLayout = async () => {
            const verifiedUser = await verifyAuth();
            if (!verifiedUser) {
                await clearAuthAndRedirect();
                return;
            }

            if (cancelled) return;

            setAuthUser(verifiedUser);
            setUserRole(verifiedUser.role || '');
            await fetchSettings();

            if (!cancelled) {
                setIsAuthReady(true);
            }
        };

        void initializeLayout();

        return () => {
            cancelled = true;
        };
    }, [router]);

    const handleDismissBanner = () => {
        if (announcement?.message) {
            localStorage.setItem('dismissed_banner_msg', announcement.message);
        }
        setAnnouncement(null);
    };

    const handleLogout = async () => {
        try {
            const userId = authUser?.uid || authUser?.id;
            if (userId) {
                await fetch(`/api/ucansign/disconnect?userId=${encodeURIComponent(userId)}`, {
                    method: 'DELETE'
                });
            }
        } catch (error) {
            console.error('Failed to disconnect uCanSign on logout:', error);
        }

        try {
            const supabase = getSupabase();
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Failed to sign out:', error);
        }

        localStorage.removeItem('user');
        setAdminCompanyScope(null);
        router.replace('/login');
    };

    const getBannerColor = (level?: string) => {
        switch (level) {
            case 'error': return '#fa5252'; // Red
            case 'warning': return '#fd7e14'; // Orange
            default: return '#1971c2'; // Blue
        }
    };

    if (!isAuthReady) {
        return null;
    }

    // If maintenance mode is active and user is NOT an admin, block the whole page
    if (maintenance?.active && userRole !== 'admin') {
        return <MaintenanceScreen message={maintenance.message} />;
    }

    return (
        <div className={`${styles.container} global-layout-container`}>
            {announcement && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    backgroundColor: getBannerColor(announcement.level),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '0 16px'
                }}>
                    <Megaphone size={16} style={{ marginRight: '8px' }} />
                    <span style={{ marginRight: '16px' }}>[공지] {announcement.message}</span>
                    <button
                        onClick={handleDismissBanner}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} menuFlags={menuFlags} />

            <div
                className={`${styles.mainWrapper} ${!isSidebarOpen ? styles.collapsed : ''} global-main-wrapper`}
                style={{ marginTop: announcement ? '40px' : 0, height: announcement ? 'calc(100vh - 40px)' : '100vh' }}
            >
                <Header user={authUser} onLogout={handleLogout} />
                <main className={`${styles.content} global-content`}>
                    {blockedFeature ? <CompanyMenuDisabledNotice feature={blockedFeature} /> : children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
