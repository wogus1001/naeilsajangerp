"use client";

import { AlimtalkOperationsPanel } from './AlimtalkOperationsPanel';
import styles from './page.module.css';

export default function AdminAlimtalkPage() {
    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1>알림톡 운영 관리</h1>
                <p>발송 시나리오, 템플릿 검수, 회사별 발송량을 관리합니다.</p>
            </header>
            <AlimtalkOperationsPanel />
        </div>
    );
}
