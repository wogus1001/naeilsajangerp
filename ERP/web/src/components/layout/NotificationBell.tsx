"use client";

import React from 'react';
import { Bell, Check } from 'lucide-react';
import type { StoredUser } from '@/utils/userUtils';
import {
    fetchHeaderNotifications,
    markAllHeaderNotificationsRead,
    markHeaderNotificationRead,
    type HeaderNotification,
    type HeaderNotificationCategory
} from './notificationRequests';
import {
    getHeaderNotificationPollingInterval,
    navigateToSafeHeaderNotificationAction,
    type HeaderNotificationDataSource
} from './headerNotificationDataSource';
import styles from './NotificationBell.module.css';
export type NotificationBellProps = {
    readonly user: StoredUser;
    readonly dataSource?: HeaderNotificationDataSource;
};
export type { HeaderNotificationDataSource } from './headerNotificationDataSource';
function formatNotificationTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getSeverityLabel(severity: HeaderNotification['severity']): string {
    switch (severity) {
        case 'danger':
            return '긴급';
        case 'warning':
            return '확인';
        case 'success':
            return '완료';
        case 'info':
            return '안내';
    }
}

const NOTIFICATION_CATEGORY_FILTERS = [
    { value: 'all', label: '전체' },
    { value: 'approval', label: '전자결재' },
    { value: 'franchise', label: '가맹운영' }
] as const satisfies readonly { readonly value: 'all' | HeaderNotificationCategory; readonly label: string }[];

function getCategoryLabel(category: HeaderNotificationCategory): string {
    switch (category) {
        case 'approval':
            return '전자결재';
        case 'franchise':
            return '가맹운영';
        case 'system':
            return '시스템';
    }
}

export function NotificationBell({ user, dataSource }: NotificationBellProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [categoryFilter, setCategoryFilter] = React.useState<'all' | HeaderNotificationCategory>('all');
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [notifications, setNotifications] = React.useState<readonly HeaderNotification[]>([]);
    const [markingNotificationId, setMarkingNotificationId] = React.useState<string | null>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const panelId = React.useId();
    const visibleNotifications = React.useMemo(() => (
        categoryFilter === 'all'
            ? notifications
            : notifications.filter(notification => notification.category === categoryFilter)
    ), [categoryFilter, notifications]);

    const refreshNotifications = React.useCallback(async () => {
        try {
            const result = dataSource
                ? await dataSource.load(categoryFilter)
                : await fetchHeaderNotifications(user, categoryFilter);
            setNotifications(result.notifications);
            setUnreadCount(result.unreadCount);
            setSchemaReady(result.schemaReady);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }, [categoryFilter, dataSource, user]);

    React.useEffect(() => {
        void refreshNotifications();
        const pollingInterval = getHeaderNotificationPollingInterval(dataSource);
        if (pollingInterval === null) return;
        const intervalId = window.setInterval(() => {
            void refreshNotifications();
        }, pollingInterval);
        return () => window.clearInterval(intervalId);
    }, [dataSource, refreshNotifications]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (!isOpen) return;
        const focusFrame = window.requestAnimationFrame(() => {
            panelRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen]);

    const markNotificationRead = async (notificationId: string): Promise<void> => {
        if (dataSource) {
            await dataSource.markOneRead(notificationId);
            return;
        }
        await markHeaderNotificationRead(user, notificationId);
    };

    const openNotification = async (notification: HeaderNotification) => {
        if (!notification.readAt) {
            try {
                await markNotificationRead(notification.id);
                await refreshNotifications();
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }
        navigateToSafeHeaderNotificationAction(notification.actionUrl, safeActionUrl => {
            if (dataSource) {
                dataSource.navigate(safeActionUrl);
                return;
            }
            window.location.href = safeActionUrl;
        });
    };

    const markOneRead = async (notification: HeaderNotification) => {
        if (notification.readAt) return;
        setMarkingNotificationId(notification.id);
        try {
            await markNotificationRead(notification.id);
            await refreshNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        } finally {
            setMarkingNotificationId(null);
        }
    };

    const markAllRead = async () => {
        try {
            if (dataSource) {
                await dataSource.markAllRead();
            } else {
                await markAllHeaderNotificationsRead(user);
            }
            await refreshNotifications();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    return (
        <div className={styles.notificationWrap} ref={panelRef}>
            <button
                ref={triggerRef}
                type="button"
                className={styles.notificationBtn}
                aria-label={`알림 ${unreadCount}건`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-haspopup="dialog"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <Bell size={18} aria-hidden="true" />
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {isOpen && (
                <div
                    id={panelId}
                    className={styles.notificationPanel}
                    role="dialog"
                    aria-modal="false"
                    aria-label="알림 목록"
                    tabIndex={-1}
                >
                    <div className={styles.notificationPanelHeader}>
                        <div>
                            <strong>알림</strong>
                            <span>{schemaReady ? `${unreadCount.toLocaleString()}건 미확인` : '설정 필요'}</span>
                        </div>
                        <button type="button" onClick={markAllRead} disabled={unreadCount === 0 || !schemaReady}>
                            모두 읽음
                        </button>
                    </div>
                    {schemaReady && (unreadCount > 0 || notifications.length > 0) ? (
                        <div className={styles.notificationFilters} aria-label="알림 구분">
                            {NOTIFICATION_CATEGORY_FILTERS.map(filter => (
                                <button
                                    aria-pressed={categoryFilter === filter.value}
                                    className={categoryFilter === filter.value ? styles.notificationFilterActive : styles.notificationFilter}
                                    key={filter.value}
                                    onClick={() => setCategoryFilter(filter.value)}
                                    type="button"
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    {!schemaReady ? (
                        <div className={styles.notificationEmpty}>
                            알림 스키마 적용 후 사용할 수 있습니다.
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.notificationEmpty}>
                            {categoryFilter === 'all' ? '확인할 알림이 없습니다.' : '선택한 구분의 알림이 없습니다.'}
                        </div>
                    ) : visibleNotifications.length === 0 ? (
                        <div className={styles.notificationEmpty}>선택한 구분의 알림이 없습니다.</div>
                    ) : (
                        <div className={styles.notificationList}>
                            {visibleNotifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={notification.readAt ? styles.notificationItem : styles.notificationItemUnread}
                                >
                                    <button
                                        type="button"
                                        className={notification.readAt ? styles.notificationItemContentFull : styles.notificationItemContent}
                                        onClick={() => void openNotification(notification)}
                                    >
                                        <span className={`${styles.notificationSeverity} ${styles[`notificationSeverity_${notification.severity}`]}`}>
                                            {getSeverityLabel(notification.severity)}
                                        </span>
                                        <span className={`${styles.notificationCategory} ${styles[`notificationCategory_${notification.category}`]}`}>
                                            {getCategoryLabel(notification.category)}
                                        </span>
                                        <strong>{notification.title}</strong>
                                        <small>{notification.body}</small>
                                        {notification.dueAt && <em>{formatNotificationTime(notification.dueAt)}</em>}
                                    </button>
                                    {!notification.readAt && (
                                        <button
                                            type="button"
                                            className={styles.notificationReadButton}
                                            disabled={markingNotificationId === notification.id}
                                            aria-label={`${notification.title} 읽음 처리`}
                                            onClick={() => void markOneRead(notification)}
                                        >
                                            <Check size={12} aria-hidden="true" />
                                            읽음
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
