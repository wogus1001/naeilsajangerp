"use client";

import type { ReactNode } from 'react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type FranchiseWorkspaceHeroProps = {
    readonly title: string;
    readonly description: string;
    readonly actions?: ReactNode;
};

export function FranchiseWorkspaceHero({ title, description, actions }: FranchiseWorkspaceHeroProps) {
    return (
        <section className={styles.hero}>
            <div>
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            {actions && <div className={styles.heroActions}>{actions}</div>}
        </section>
    );
}
