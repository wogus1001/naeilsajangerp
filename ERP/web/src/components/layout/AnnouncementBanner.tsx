"use client";

import { Megaphone, X } from 'lucide-react';

type AnnouncementBannerProps = {
    readonly message: string;
    readonly level?: string;
    readonly onDismiss: () => void;
};

function getBannerColor(level?: string): string {
    switch (level) {
        case 'error':
            return '#fa5252';
        case 'warning':
            return '#fd7e14';
        default:
            return '#1971c2';
    }
}

export function AnnouncementBanner({ message, level, onDismiss }: AnnouncementBannerProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            backgroundColor: getBannerColor(level),
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
            <span style={{ marginRight: '16px' }}>[공지] {message}</span>
            <button
                onClick={onDismiss}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
                <X size={16} />
            </button>
        </div>
    );
}
