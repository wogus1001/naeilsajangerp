'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Building2,
    FileClock,
    FilePenLine,
    Files,
    House,
    Settings2,
    Stamp
} from 'lucide-react';
import type { ApprovalNavigationItem } from './approvalsNavigation';
import { APPROVAL_LOCAL_NAVIGATION } from './approvalsNavigation';
import styles from './ApprovalsShell.module.css';

type ApprovalsShellProps = {
    readonly children: React.ReactNode;
};

function navigationIcon(icon: ApprovalNavigationItem['icon']) {
    switch (icon) {
        case 'home': return <House size={17} aria-hidden="true" />;
        case 'write': return <FilePenLine size={17} aria-hidden="true" />;
        case 'waiting': return <FileClock size={17} aria-hidden="true" />;
        case 'mine': return <Files size={17} aria-hidden="true" />;
        case 'department': return <Building2 size={17} aria-hidden="true" />;
        case 'templates': return <Stamp size={17} aria-hidden="true" />;
        case 'settings': return <Settings2 size={17} aria-hidden="true" />;
    }
}

function isActive(pathname: string, href: string): boolean {
    if (href === '/approvals') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function ApprovalsShell({ children }: ApprovalsShellProps) {
    const pathname = usePathname();
    return (
        <div className={styles.workspace}>
            <header className={styles.moduleHeader}>
                <div>
                    <h1>전자결재</h1>
                    <p>작성부터 승인, 수신과 보관까지 회사 문서를 한 흐름으로 관리합니다.</p>
                </div>
                <Link className={styles.writeButton} href="/approvals/write">
                    <FilePenLine size={17} aria-hidden="true" />
                    문서 작성
                </Link>
            </header>
            <nav className={styles.localNav} aria-label="전자결재 메뉴">
                {APPROVAL_LOCAL_NAVIGATION.map(item => (
                    <Link
                        aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                        className={isActive(pathname, item.href) ? styles.active : undefined}
                        href={item.href}
                        key={item.href}
                    >
                        {navigationIcon(item.icon)}
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className={styles.content}>{children}</div>
        </div>
    );
}
