"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './electronicContracts.module.css';

type Props = {
    readonly title: string;
};

export function CompanyTemplateCreateHeader({ title }: Props) {
    return (
        <section className={`${styles.panel} ${styles.header}`}>
            <div>
                <h1 className={styles.title}>{title}</h1>
            </div>
            <Link className={styles.secondaryButton} href="/contracts/electronic">
                <ArrowLeft size={16} />
                템플릿 목록
            </Link>
        </section>
    );
}
