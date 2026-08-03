"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronLeft, Users } from 'lucide-react';
import { getDefaultCompanyMenuFlags, isCompanyMenuEnabled, type CompanyMenuFeatureKey, type CompanyMenuFlagMap } from '@/lib/company-menu-features';
import {
    SIDEBAR_MENU_ITEMS,
    SIDEBAR_SECTIONS,
    type SidebarMenuSection,
    type SidebarSectionKey
} from './SidebarMenuConfig';
import { SidebarNavSection } from './SidebarNavSection';
import styles from './Sidebar.module.css';
import logoStyles from './SidebarLogo.module.css';

export type SidebarNavigationAdapter = {
    readonly pathname: string;
    readonly sections: readonly SidebarMenuSection[];
    readonly onNavigate: (href: string) => void;
    readonly getItemTestId?: (href: string) => string | undefined;
    readonly navigationLabel?: string;
    readonly logoHref?: string;
};

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    menuFlags?: CompanyMenuFlagMap;
    companyName?: string;
    companyLogoUrl?: string | null;
    navigationAdapter?: SidebarNavigationAdapter;
    runtime?: 'live' | 'demo';
}

const Sidebar = ({
    isOpen,
    onToggle,
    menuFlags = getDefaultCompanyMenuFlags(),
    companyName,
    companyLogoUrl,
    navigationAdapter,
    runtime = 'live'
}: SidebarProps) => {
    const livePathname = usePathname();
    const pathname = navigationAdapter?.pathname ?? livePathname;
    const sections = navigationAdapter?.sections ?? SIDEBAR_SECTIONS;
    const [isDashboardOpen, setIsDashboardOpen] = useState(true);
    const [isFranchiseOpen, setIsFranchiseOpen] = useState(true);
    const [isFranchiseWorkOpen, setIsFranchiseWorkOpen] = useState(true);
    const [isConsultingOpen, setIsConsultingOpen] = useState(true);
    const [isCustomersOpen, setIsCustomersOpen] = useState(true);
    const [isBusinessCardsOpen, setIsBusinessCardsOpen] = useState(true);
    const [isContractsOpen, setIsContractsOpen] = useState(true);
    const [userRole, setUserRole] = useState<string>('');

    const [features, setFeatures] = useState({ electronicContracts: true, mapService: true });

    React.useEffect(() => {
        if (runtime === 'demo') return;

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserRole(user.role || '');
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }

        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/system/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.features) {
                        setFeatures(data.features);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchSettings();
    }, [runtime]);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<typeof SIDEBAR_MENU_ITEMS>([]);
    const isEnabled = (key: CompanyMenuFeatureKey) => isCompanyMenuEnabled(menuFlags, key);
    const visibleMenuItems = (navigationAdapter ? sections.flatMap(section => section.items) : SIDEBAR_MENU_ITEMS)
        .filter(item => Boolean(item.url) && !item.group && isEnabled(item.featureKey));
    const displayCompanyName = companyName?.trim() || '부동산 ERP';

    const isSectionExpanded = (key: SidebarSectionKey) => {
        switch (key) {
            case 'dashboard':
                return isDashboardOpen;
            case 'approvals':
                return true;
            case 'franchise':
                return isFranchiseOpen;
            case 'franchiseWork':
                return isFranchiseWorkOpen;
            case 'consulting':
                return isConsultingOpen;
            case 'customers':
                return isCustomersOpen;
            case 'businessCards':
                return isBusinessCardsOpen;
            case 'contracts':
                return isContractsOpen;
        }
    };

    const toggleSection = (key: SidebarSectionKey) => {
        switch (key) {
            case 'dashboard':
                setIsDashboardOpen(prev => !prev);
                return;
            case 'approvals':
                return;
            case 'franchise':
                setIsFranchiseOpen(prev => !prev);
                return;
            case 'franchiseWork':
                setIsFranchiseWorkOpen(prev => !prev);
                return;
            case 'consulting':
                setIsConsultingOpen(prev => !prev);
                return;
            case 'customers':
                setIsCustomersOpen(prev => !prev);
                return;
            case 'businessCards':
                setIsBusinessCardsOpen(prev => !prev);
                return;
            case 'contracts':
                setIsContractsOpen(prev => !prev);
                return;
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.trim() === '') {
            setSearchResults([]);
        } else {
            const results = visibleMenuItems.filter(item =>
                item.title.toLowerCase().includes(term.toLowerCase()) ||
                item.category.toLowerCase().includes(term.toLowerCase())
            );
            setSearchResults(results);
        }
    };

    const handleLinkClick = () => {
        setSearchTerm('');
        setSearchResults([]);
    };

    return (
        <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''} global-sidebar`}>
            {/* Floating Toggle Button */}
            <button
                className={styles.toggleBtn}
                onClick={onToggle}
                title={isOpen ? "메뉴 접기" : "메뉴 펼치기"}
                aria-label={runtime === 'demo'
                    ? (isOpen ? '데모 메뉴 접기' : '데모 메뉴 열기')
                    : (isOpen ? '메뉴 접기' : '메뉴 펼치기')}
            >
                {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Content Container - hidden when closed */}
            <div className={styles.contentContainer} style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}>
                <Link
                    href={navigationAdapter?.logoHref ?? '/dashboard'}
                    className={logoStyles.logo}
                    style={{ textDecoration: 'none' }}
                    onClick={event => {
                        if (!navigationAdapter) return;
                        event.preventDefault();
                        navigationAdapter.onNavigate(navigationAdapter.logoHref ?? '/dashboard');
                    }}
                >
                    <div className={logoStyles.logoIcon}>
                        {companyLogoUrl ? (
                            <Image
                                className={logoStyles.companyLogoImage}
                                src={companyLogoUrl}
                                alt={`${displayCompanyName} 로고`}
                                width={32}
                                height={32}
                                unoptimized
                            />
                        ) : (
                            <div className={logoStyles.gridIcon} />
                        )}
                    </div>
                    <span className={logoStyles.logoText} title={displayCompanyName}>
                        {displayCompanyName} {process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' && '(DEV)'}
                    </span>
                </Link>

                {isOpen && (
                    <div className={styles.searchWrapper}>
                        <input
                            type="text"
                            placeholder="메뉴검색"
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                        {/* Search Results Dropdown */}
                        {searchTerm && (
                            <div className={styles.searchResults}>
                                {searchResults.length > 0 ? (
                                    searchResults.map((item, index) => item.url ? (
                                        <Link
                                            key={index}
                                            href={item.url}
                                            className={styles.searchResultItem}
                                            onClick={event => {
                                                handleLinkClick();
                                                if (!navigationAdapter) return;
                                                event.preventDefault();
                                                navigationAdapter.onNavigate(item.url!);
                                            }}
                                        >
                                            <span className={styles.resultTitle}>{item.title}</span>
                                            <span className={styles.resultCategory}>{item.category}</span>
                                        </Link>
                                    ) : null)
                                ) : (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
                                        검색 결과가 없습니다.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <nav className={styles.nav} aria-label={navigationAdapter?.navigationLabel ?? '주 메뉴'}>
                    {sections.map(section => (
                        <SidebarNavSection
                            key={section.key}
                            section={section}
                            pathname={pathname}
                            isSidebarOpen={isOpen}
                            isExpanded={isSectionExpanded(section.key)}
                            isVisible={section.key !== 'contracts' || features.electronicContracts}
                            isFeatureEnabled={isEnabled}
                            activeItems={visibleMenuItems}
                            onToggle={() => toggleSection(section.key)}
                            onNavigate={navigationAdapter?.onNavigate}
                            getItemTestId={navigationAdapter?.getItemTestId}
                        />
                    ))}


                    {/* Manager Menu - Only visible to manager */}
                    {userRole === 'manager' && isEnabled('companyStaff') && (
                        <div className={styles.navGroup}>
                            <Link href="/company/staff" className={styles.navLink} title={!isOpen ? "직원 관리" : undefined}>
                                <div className={styles.navGroupLabel}>
                                    <Users size={18} />
                                    {isOpen && <span>직원 관리</span>}
                                </div>
                            </Link>
                        </div>
                    )}


                </nav>
            </div >
        </aside >
    );
};

export default Sidebar;
