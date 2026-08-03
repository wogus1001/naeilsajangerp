"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminCompanySelector } from './AdminCompanySelector';
import {
    HeaderProfileMenu,
    type HeaderProfileActions,
    type HeaderUser
} from './HeaderProfileMenu';
import { NotificationBell } from './NotificationBell';
import {
    resolveHeaderBreadcrumb,
    type HeaderBreadcrumb
} from './headerBreadcrumbs';
import type { HeaderNotificationDataSource } from './headerNotificationDataSource';
import styles from './Header.module.css';

export type HeaderProps = {
    readonly user: HeaderUser | null;
    readonly onLogout: () => Promise<void> | void;
    readonly breadcrumb?: HeaderBreadcrumb;
    readonly extraActions?: ReactNode;
    readonly notificationDataSource?: HeaderNotificationDataSource;
    readonly showCompanySelector?: boolean;
    readonly companySelector?: ReactNode;
    readonly profileActions?: HeaderProfileActions;
};

export type {
    HeaderBreadcrumb,
    HeaderNotificationDataSource,
    HeaderProfileActions,
    HeaderUser
};

export function Header({
    user,
    onLogout,
    breadcrumb,
    extraActions,
    notificationDataSource,
    showCompanySelector = true,
    companySelector,
    profileActions
}: HeaderProps) {
    const pathname = usePathname();
    const resolvedBreadcrumb = resolveHeaderBreadcrumb(pathname, breadcrumb);

    return (
        <header className={`${styles.header} global-header`}>
            <div className={styles.breadcrumbs}>
                <span className={styles.crumbRoot}>{resolvedBreadcrumb.category}</span>
                <span className={styles.crumbSeparator}>&gt;</span>
                <span className={styles.crumbCurrent}>{resolvedBreadcrumb.title}</span>
            </div>

            <div className={styles.actions}>
                {showCompanySelector && (companySelector ?? <AdminCompanySelector user={user} />)}
                {extraActions}
                <NotificationBell user={user} dataSource={notificationDataSource} />
                <HeaderProfileMenu
                    user={user}
                    onLogout={onLogout}
                    actions={profileActions}
                />
            </div>
        </header>
    );
}

export default Header;
