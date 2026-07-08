"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import {
    Bell,
    ClipboardCheck,
    Home,
    LogOut,
    Send,
    Store,
    Wrench
} from 'lucide-react';
import styles from '../owner.module.css';

export type OwnerBasics = {
    readonly businessNumber: string;
    readonly representativeName: string;
    readonly contactPhone: string;
    readonly deposit: string;
    readonly monthlyRent: string;
    readonly maintenanceFee: string;
    readonly areaSize: string;
    readonly tableCount: string;
    readonly seatCount: string;
    readonly memo: string;
};

export type OwnerNotice = {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly createdAt: string | null;
    readonly readAt: string | null;
};

export type OwnerTask = {
    readonly id?: string;
    readonly title?: string;
    readonly label?: string;
    readonly status?: string;
    readonly memo?: string;
};

export type OwnerSubmission = {
    readonly id: string;
    readonly title: string;
    readonly submission_type: string;
    readonly body: string | null;
    readonly payload: unknown;
    readonly status: string;
    readonly review_note: string | null;
    readonly created_at: string | null;
    readonly files?: readonly OwnerSubmissionFile[];
};

export type OwnerSubmissionFile = {
    readonly id: string;
    readonly file_name: string;
    readonly mime_type: string;
    readonly file_size: number | null;
    readonly public_url: string | null;
};

export type OwnerDashboardData = {
    readonly account: {
        readonly ownerName: string | null;
        readonly temporaryPassword: boolean;
    };
    readonly location: {
        readonly id: string;
        readonly name: string;
        readonly brand: string;
        readonly status: string;
        readonly region: string;
        readonly address: string;
        readonly basics: OwnerBasics;
    };
    readonly notices: readonly OwnerNotice[];
    readonly openingProject: {
        readonly id: string;
        readonly status: string;
        readonly tasks: readonly OwnerTask[];
    };
    readonly submissions: readonly OwnerSubmission[];
};

type OwnerPortalFrameProps = {
    readonly activeKey: OwnerNavKey;
    readonly children: (data: OwnerDashboardData, reload: () => Promise<void>) => React.ReactNode;
};

type OwnerNavKey = 'dashboard' | 'store' | 'notices' | 'tasks' | 'requests' | 'submissions' | 'password';

const NAV_ITEMS: readonly {
    readonly key: OwnerNavKey;
    readonly label: string;
    readonly href: string;
    readonly icon: React.ComponentType<{ readonly size?: number }>;
}[] = [
    { key: 'dashboard', label: '홈', href: '/owner/dashboard', icon: Home },
    { key: 'store', label: '내 매장', href: '/owner/store', icon: Store },
    { key: 'notices', label: '공지/공문', href: '/owner/notices', icon: Bell },
    { key: 'tasks', label: '운영 체크리스트', href: '/owner/opening-tasks', icon: ClipboardCheck },
    { key: 'requests', label: '시설 문의', href: '/owner/requests', icon: Wrench },
    { key: 'submissions', label: '제출 이력', href: '/owner/submissions', icon: Send }
];

export const EMPTY_BASICS: OwnerBasics = {
    businessNumber: '',
    representativeName: '',
    contactPhone: '',
    deposit: '',
    monthlyRent: '',
    maintenanceFee: '',
    areaSize: '',
    tableCount: '',
    seatCount: '',
    memo: ''
};

export async function readOwnerApiData<T>(response: Response): Promise<T> {
    const payload: unknown = await response.json();
    if (!response.ok) {
        const message = isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : '요청을 처리하지 못했습니다.';
        throw new Error(message);
    }
    if (!isRecord(payload) || !('data' in payload)) throw new Error('응답 데이터를 확인할 수 없습니다.');
    return payload.data as T;
}

export function formatOwnerDate(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}

export function ownerSubmissionTypeLabel(value: string): string {
    if (value === 'store_info') return '매장 정보';
    if (value === 'opening_task_completion') return '운영 체크리스트';
    if (value === 'facility_request') return '시설 문의';
    return '일반 요청';
}

export function ownerStatusLabel(value: string): string {
    if (value === 'approved') return '승인';
    if (value === 'rejected') return '반려';
    if (value === 'resolved') return '처리 완료';
    return '제출';
}

export function getOwnerTaskId(task: OwnerTask): string {
    return (task.id || task.title || task.label || '').trim();
}

export function getRequestedOwnerTaskIds(submissions: readonly OwnerSubmission[]): ReadonlySet<string> {
    const requestedTaskIds = submissions
        .map(submission => {
            if (
                submission.submission_type !== 'opening_task_completion'
                || submission.status === 'rejected'
                || !isRecord(submission.payload)
            ) {
                return '';
            }
            const taskId = submission.payload.taskId;
            return typeof taskId === 'string' ? taskId.trim() : '';
        })
        .filter(taskId => taskId.length > 0);
    return new Set(requestedTaskIds);
}

export function OwnerPortalFrame({ activeKey, children }: OwnerPortalFrameProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [data, setData] = React.useState<OwnerDashboardData | null>(null);
    const [error, setError] = React.useState('');

    const loadDashboard = React.useCallback(async () => {
        setError('');
        try {
            const nextData = await readOwnerApiData<OwnerDashboardData>(
                await fetch('/api/owner/dashboard', { cache: 'no-store' })
            );
            setData(nextData);
        } catch (caught) {
            const nextMessage = caught instanceof Error ? caught.message : '점주 포털 데이터를 불러오지 못했습니다.';
            setError(nextMessage);
            if (nextMessage.includes('로그인')) router.replace('/owner/login');
        }
    }, [router]);

    React.useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const logout = async () => {
        await fetch('/api/owner/auth/logout', { method: 'POST' });
        router.replace('/owner/login');
    };

    if (!data) {
        return (
            <main className={styles.ownerShell}>
                <div className={styles.content}>
                    <div className={styles.hero}>{error || '점주 포털을 불러오는 중입니다.'}</div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.ownerShell}>
            <div className={styles.portalLayout}>
                <aside className={styles.ownerSidebar}>
                    <div className={styles.ownerBrandBlock}>
                        <span className={styles.brandMark}>FC</span>
                        <div>
                            <strong>점주 포털</strong>
                            <span>{data.location.name}</span>
                        </div>
                    </div>
                    <nav className={styles.ownerNav} aria-label="점주 포털 메뉴">
                        {NAV_ITEMS.map(item => {
                            const isActive = item.key === activeKey || pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    className={`${styles.ownerNavLink} ${isActive ? styles.ownerNavLinkActive : ''}`}
                                    href={item.href}
                                    key={item.key}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
                <section className={styles.ownerMain}>
                    <header className={styles.header}>
                        <div className={styles.headerTitle}>
                            <strong>{data.location.name}</strong>
                            <span>{data.location.brand || '브랜드 미지정'} · {data.location.address || data.location.region || '주소 미입력'}</span>
                        </div>
                        <button className={styles.secondaryButton} type="button" onClick={() => void logout()}>
                            <LogOut size={16} />
                            로그아웃
                        </button>
                    </header>
                    <div className={styles.content}>
                        {data.account.temporaryPassword ? (
                            <div className={styles.warning}>
                                임시 비밀번호를 사용 중입니다. 안전한 사용을 위해 비밀번호를 변경해주세요.
                                <Link href="/owner/change-password">변경하기</Link>
                            </div>
                        ) : null}
                        {children(data, loadDashboard)}
                    </div>
                </section>
            </div>
        </main>
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
