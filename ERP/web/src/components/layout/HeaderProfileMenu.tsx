"use client";

import React from 'react';
import { ChevronDown, LogIn, LogOut, User } from 'lucide-react';
import styles from './Header.module.css';

export type HeaderUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly name?: string;
    readonly role?: string;
    readonly companyName?: string;
    readonly companyId?: string;
};

export type HeaderProfileActions = {
    readonly onProfile?: () => Promise<void> | void;
    readonly onAdmin?: () => Promise<void> | void;
    readonly onLogin?: () => Promise<void> | void;
};

export type HeaderProfileMenuProps = {
    readonly user: HeaderUser | null;
    readonly onLogout: () => Promise<void> | void;
    readonly actions?: HeaderProfileActions;
};

const MENU_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '160px',
    zIndex: 3500,
    overflow: 'hidden'
};

const MENU_BUTTON_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    textAlign: 'left'
};

const BORDERED_MENU_BUTTON_STYLE: React.CSSProperties = {
    ...MENU_BUTTON_STYLE,
    borderTop: '1px solid #f5f5f5'
};

const LOGOUT_MENU_BUTTON_STYLE: React.CSSProperties = {
    ...MENU_BUTTON_STYLE,
    color: '#ff4444'
};

const ADMIN_BADGE_STYLE: React.CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#fa5252',
    color: 'white',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
};

function navigateTo(path: string): void {
    window.location.href = path;
}

export function HeaderProfileMenu({
    user,
    onLogout,
    actions
}: HeaderProfileMenuProps) {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const menuId = React.useId();

    React.useEffect(() => {
        setIsLoaded(true);
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    React.useEffect(() => {
        if (!isDropdownOpen) return;
        const focusFrame = window.requestAnimationFrame(() => {
            menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsDropdownOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
                return;
            }

            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const items = Array.from(
                menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') || []
            );
            if (items.length === 0) return;

            event.preventDefault();
            const currentIndex = items.findIndex(item => item === document.activeElement);
            if (event.key === 'Home') {
                items[0]?.focus();
                return;
            }
            if (event.key === 'End') {
                items.at(-1)?.focus();
                return;
            }
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const fallbackIndex = direction > 0 ? -1 : 0;
            const nextIndex = (currentIndex < 0 ? fallbackIndex : currentIndex) + direction;
            items[(nextIndex + items.length) % items.length]?.focus();
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isDropdownOpen]);

    const runAction = (
        event: React.MouseEvent<HTMLButtonElement>,
        action: (() => Promise<void> | void) | undefined,
        fallbackPath?: string
    ): void => {
        event.stopPropagation();
        setIsDropdownOpen(false);
        if (action) {
            void action();
            return;
        }
        if (fallbackPath) navigateTo(fallbackPath);
    };

    return (
        <div
            ref={dropdownRef}
            style={{ position: 'relative' }}
        >
            <button
                ref={triggerRef}
                type="button"
                className={styles.profile}
                aria-expanded={isDropdownOpen}
                aria-controls={menuId}
                aria-haspopup="menu"
                onClick={() => setIsDropdownOpen(open => !open)}
            >
                <span className={styles.profileInfo}>
                    {!isLoaded ? (
                        <>
                            <span className={styles.name} style={{ width: '50px', height: '18px', background: '#f1f3f5', borderRadius: '4px', display: 'inline-block' }}></span>
                            <span className={styles.role} style={{ width: '40px', height: '14px', background: '#f1f3f5', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}></span>
                        </>
                    ) : (
                        <>
                            <span className={styles.name}>{user?.name || '게스트'}</span>
                            <span className={styles.role}>{user?.companyName || '부동산 ERP'}</span>
                        </>
                    )}
                </span>
                <ChevronDown size={16} className={styles.profileIcon} />
            </button>

            {isDropdownOpen && (
                <div ref={menuRef} id={menuId} role="menu" aria-label="사용자 메뉴" style={MENU_STYLE}>
                    <button
                        role="menuitem"
                        tabIndex={-1}
                        onClick={event => runAction(event, actions?.onProfile, '/profile')}
                        style={MENU_BUTTON_STYLE}
                    >
                        <User size={16} />
                        <span>개인정보수정</span>
                    </button>
                    {user?.role === 'admin' && (
                        <button
                            role="menuitem"
                            tabIndex={-1}
                            onClick={event => runAction(event, actions?.onAdmin, '/admin')}
                            style={BORDERED_MENU_BUTTON_STYLE}
                        >
                            <div style={ADMIN_BADGE_STYLE}>A</div>
                            <span>관리자 페이지</span>
                        </button>
                    )}
                    <button
                        role="menuitem"
                        tabIndex={-1}
                        onClick={event => {
                            event.stopPropagation();
                            setIsDropdownOpen(false);
                            void onLogout();
                        }}
                        style={LOGOUT_MENU_BUTTON_STYLE}
                    >
                        <LogOut size={16} />
                        <span>로그아웃</span>
                    </button>
                    <button
                        role="menuitem"
                        tabIndex={-1}
                        onClick={event => runAction(event, actions?.onLogin, '/login')}
                        style={BORDERED_MENU_BUTTON_STYLE}
                    >
                        <LogIn size={16} />
                        <span>로그인 페이지</span>
                    </button>
                </div>
            )}
        </div>
    );
}
