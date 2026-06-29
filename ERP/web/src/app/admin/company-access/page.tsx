"use client";

import { CompanyAccessManager } from '@/components/admin/company-access/CompanyAccessManager';

const styles = {
    container: { padding: 'clamp(16px, 3vw, 32px)', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-pretendard)' },
    header: { marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: '#191f28' },
    subtitle: { fontSize: '15px', color: '#6b7684', margin: 0, lineHeight: 1.57 }
} as const;

export default function AdminCompanyAccessPage() {
    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>회사별 메뉴 관리</h1>
                <p style={styles.subtitle}>회사별 대시보드 타입과 메뉴 접근 권한을 설정합니다.</p>
            </header>
            <CompanyAccessManager />
        </div>
    );
}
