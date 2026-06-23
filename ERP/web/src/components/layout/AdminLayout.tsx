"use client";

import React from 'react';
import AdminSidebar from './AdminSidebar';
import styles from './MainLayout.module.css';
import adminStyles from './AdminLayout.module.css';

// Reuse Header but maybe we want to pass a prop to indicate Admin Mode?
// For now, let's just reuse MainLayout structure but inject AdminSidebar effectively.

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    return (
        <div className={`${styles.container} ${adminStyles.adminContainer} global-layout-container`}>
            <AdminSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className={`${styles.mainWrapper} ${adminStyles.adminMainWrapper} ${!isSidebarOpen ? styles.collapsed : ''} global-main-wrapper`}>
                {/* Simplified Header for Admin (or reuse Header with limited features) */}
                <header className={adminStyles.adminHeader}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#343a40' }}>관리자 모드</div>
                </header>
                <main className={`${styles.content} ${adminStyles.adminContent} global-content`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
