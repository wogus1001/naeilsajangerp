"use client";

import React from 'react';

export type MainDashboardMode = 'b' | 'a';

const MODE_OPTIONS: ReadonlyArray<{
    readonly mode: MainDashboardMode;
    readonly label: string;
    readonly ariaLabel: string;
}> = [
    { mode: 'b', label: 'B 타입', ariaLabel: 'B 타입 기존 요약 대시보드 보기' },
    { mode: 'a', label: 'A 타입', ariaLabel: 'A 타입 가맹 운영 대시보드 보기' }
] as const;

type MainDashboardModeTabsProps = {
    readonly mode: MainDashboardMode;
    readonly onChange: (mode: MainDashboardMode) => void;
};

export function MainDashboardModeTabs({ mode, onChange }: MainDashboardModeTabsProps) {
    return (
        <section style={styles.wrap} aria-label="메인 대시보드 타입 전환">
            <span style={styles.label}>대시보드 보기</span>
            <div style={styles.tabs}>
                {MODE_OPTIONS.map(option => (
                    <button
                        key={option.mode}
                        type="button"
                        aria-label={option.ariaLabel}
                        aria-pressed={mode === option.mode}
                        style={mode === option.mode ? styles.activeTab : styles.tab}
                        onClick={() => onChange(option.mode)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

const styles: Record<string, React.CSSProperties> = {
    wrap: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '-12px 0 24px'
    },
    label: {
        marginTop: '3px',
        color: '#8b95a1',
        fontSize: '13px',
        fontWeight: 600
    },
    tabs: {
        display: 'flex',
        gap: '6px',
        padding: '3px',
        borderRadius: '999px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
    },
    tab: {
        minWidth: '76px',
        height: '34px',
        padding: '0 14px',
        border: '1px solid transparent',
        borderRadius: '999px',
        backgroundColor: 'transparent',
        color: '#6b7684',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 800,
        whiteSpace: 'nowrap'
    },
    activeTab: {
        minWidth: '76px',
        height: '34px',
        padding: '0 14px',
        border: '1px solid #3182f6',
        borderRadius: '999px',
        backgroundColor: '#e8f3ff',
        color: '#1b64da',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 800,
        whiteSpace: 'nowrap'
    }
};
