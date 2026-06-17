"use client";

import React from 'react';
import { Bell, Check } from 'lucide-react';
import type { StoredUser } from '@/utils/userUtils';
import {
    fetchHeaderNotifications,
    markAllHeaderNotificationsRead,
    markHeaderNotificationRead,
    type HeaderNotification
} from './notificationRequests';
import styles from './NotificationBell.module.css';

type NotificationBellProps = {
    readonly user: StoredUser;
};

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

export function NotificationBell({ user }: NotificationBellProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [notifications, setNotifications] = React.useState<readonly HeaderNotification[]>([]);
    const [markingNotificationId, setMarkingNotificationId] = React.useState<string | null>(null);
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
        if (!notification.readAt) {
            try {
                await markHeaderNotificationRead(user, notification.id);
                await refreshNotifications();
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    };

    const markOneRead = async (notification: HeaderNotification) => {
        if (notification.readAt) return;
        setMarkingNotificationId(notification.id);
        try {
            await markHeaderNotificationRead(user, notification.id);
            await refreshNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        } finally {
            setMarkingNotificationId(null);
        }
    };

    const markAllRead = async () => {
        try {
            await markAllHeaderNotificationsRead(user);
            await refreshNotifications();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
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
