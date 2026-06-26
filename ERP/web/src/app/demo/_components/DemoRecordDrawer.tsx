'use client';

import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import styles from './DemoDashboardGuide.module.css';

export type DemoRecordField = {
    readonly label: string;
    readonly value: string;
};

export type DemoRecordStep = {
    readonly title: string;
    readonly description: string;
};

type DemoRecordDrawerProps = {
    readonly badge: string;
    readonly title: string;
    readonly description: string;
    readonly fields: readonly DemoRecordField[];
    readonly steps: readonly DemoRecordStep[];
    readonly primaryActionLabel?: string;
    readonly onPrimaryAction?: () => void;
    readonly onCloseAction: () => void;
};

export function DemoRecordDrawer({
    badge,
    title,
    description,
    fields,
    steps,
    primaryActionLabel,
    onPrimaryAction,
    onCloseAction
}: DemoRecordDrawerProps) {
    return (
        <div className={styles.demoDrawerBackdrop} onClick={onCloseAction}>
            <aside
                className={styles.demoDrawer}
                aria-label={`${title} 샘플 상세`}
                onClick={event => event.stopPropagation()}
            >
                <header className={styles.demoDrawerHeader}>
                    <div>
                        <span>{badge}</span>
                        <h2>{title}</h2>
                        <p>{description}</p>
                    </div>
                    <button type="button" className={styles.demoDrawerClose} onClick={onCloseAction} aria-label="샘플 상세 닫기">
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>
                <div className={styles.demoDrawerBody}>
                    <div className={styles.demoDrawerQuickActions}>
                        <button type="button" onClick={onPrimaryAction || onCloseAction}>
                            {primaryActionLabel || '샘플 화면 확인'}
                            <ExternalLink size={15} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={onCloseAction}>
                            닫기
                        </button>
                    </div>
                    <section className={styles.demoDrawerSection}>
                        <div className={styles.demoDrawerSectionHeader}>
                            <h3>기본정보</h3>
                            <p>실제 상세 패널과 같은 순서로 핵심 정보를 먼저 확인합니다.</p>
                        </div>
                        <div className={styles.demoDrawerFields}>
                            {fields.map(field => (
                                <div key={field.label} className={styles.demoDrawerField}>
                                    <span>{field.label}</span>
                                    <strong>{field.value || '-'}</strong>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className={styles.demoDrawerSection}>
                        <div className={styles.demoDrawerSectionHeader}>
                            <h3>업무 흐름</h3>
                            <p>각 번호는 오른쪽 가이드와 같은 순서로 이어집니다.</p>
                        </div>
                        {steps.map((step, index) => (
                            <div key={`${step.title}-${index}`} className={styles.demoDrawerStep}>
                                <b>{index + 1}</b>
                                <div>
                                    <strong>{step.title}</strong>
                                    <p>{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </section>
                    <section className={styles.demoDrawerSection}>
                        <div className={styles.demoDrawerCompletion}>
                            <CheckCircle2 size={17} aria-hidden="true" />
                            <div>
                                <strong>샘플 전용 상세입니다.</strong>
                                <p>버튼과 입력은 실제 화면 구조를 설명하기 위한 데모이며 운영 데이터는 변경하지 않습니다.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </aside>
        </div>
    );
}
