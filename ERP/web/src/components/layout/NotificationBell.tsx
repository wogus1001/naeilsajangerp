"use client";

import React from 'react';
import { Bell } from 'lucide-react';
import type { StoredUser } from '@/utils/userUtils';
import {
    fetchHeaderNotifications,
    markAllHeaderNotificationsRead,
    markHeaderNotificationRead,
    type HeaderNotification
} from './notificationRequests';
import styles from './Header.module.css';

type NotificationBellProps = {
    readonly user: StoredUser;
};

function formatNotificationTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
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

export function NotificationBell({ user }: NotificationBellProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [notifications, setNotifications] = React.useState<readonly HeaderNotification[]>([]);
    const panelRef = React.useRef<HTMLDivElement>(null);

    const refreshNotifications = React.useCallback(async () => {
        try {
            const result = await fetchHeaderNotifications(user);
            setNotifications(result.notifications);
            setUnreadCount(result.unreadCount);
            setSchemaReady(result.schemaReady);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }, [user]);

    React.useEffect(() => {
        void refreshNotifications();
        const intervalId = window.setInterval(() => {
            void refreshNotifications();
        }, 60_000);
        return () => window.clearInterval(intervalId);
    }, [refreshNotifications]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openNotification = async (notification: HeaderNotification) => {
        await markHeaderNotificationRead(user, notification.id);
        await refreshNotifications();
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    };

    const markAllRead = async () => {
        await markAllHeaderNotificationsRead(user);
        await refreshNotifications();
    };

    return (
        <div className={styles.notificationWrap} ref={panelRef}>
            <button
                type="button"
                className={styles.notificationBtn}
                aria-label={`알림 ${unreadCount}건`}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <Bell size={18} aria-hidden="true" />
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {isOpen && (
                <div className={styles.notificationPanel}>
                    <div className={styles.notificationPanelHeader}>
                        <div>
                            <strong>알림</strong>
                            <span>{schemaReady ? `${unreadCount.toLocaleString()}건 미확인` : '설정 필요'}</span>
                        </div>
                        <button type="button" onClick={markAllRead} disabled={unreadCount === 0 || !schemaReady}>
                            모두 읽음
                        </button>
                    </div>
                    {!schemaReady ? (
                        <div className={styles.notificationEmpty}>
                            알림 스키마 적용 후 사용할 수 있습니다.
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.notificationEmpty}>확인할 알림이 없습니다.</div>
                    ) : (
                        <div className={styles.notificationList}>
                            {notifications.map(notification => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    className={notification.readAt ? styles.notificationItem : styles.notificationItemUnread}
                                    onClick={() => void openNotification(notification)}
                                >
                                    <span className={`${styles.notificationSeverity} ${styles[`notificationSeverity_${notification.severity}`]}`}>
                                        {getSeverityLabel(notification.severity)}
                                    </span>
                                    <strong>{notification.title}</strong>
                                    <small>{notification.body}</small>
                                    {notification.dueAt && <em>{formatNotificationTime(notification.dueAt)}</em>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
