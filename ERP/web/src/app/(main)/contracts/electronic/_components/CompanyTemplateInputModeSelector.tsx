"use client";

import type { CompanyTemplateInputMode } from '@/lib/electronic-contracts/company-template';
import styles from './electronicContracts.module.css';

type Props = {
    readonly value: CompanyTemplateInputMode;
    readonly fieldCount: number;
    readonly onChange: (value: CompanyTemplateInputMode) => void;
};

const OPTIONS: readonly {
    readonly value: CompanyTemplateInputMode;
    readonly title: string;
    readonly description: string;
    readonly badge: string;
}[] = [
    {
        value: 'erp',
        title: 'ERP에서 직접 작성',
        description: '필드값을 이 화면에서 입력하고 발송합니다.',
        badge: '기본'
    },
    {
        value: 'template',
        title: '템플릿에서 직접 작성',
        description: '문서 안 빈칸은 서명 화면에서 작성합니다.',
        badge: '보조'
    }
];

export function CompanyTemplateInputModeSelector({ value, fieldCount, onChange }: Props) {
    return (
        <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>작성 방식</h2>
            <div className={styles.inputModeGrid}>
                {OPTIONS.map(option => (
                    <button
                        className={option.value === value ? styles.inputModeOptionActive : styles.inputModeOption}
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                    >
                        <span className={styles.inputModeTitle}>
                            {option.title}
                            <em>{option.badge}</em>
                        </span>
                        <span className={styles.inputModeMeta}>{option.description}</span>
                        {option.value === 'erp' && (
                            <span className={styles.inputModeMeta}>입력 필드 {fieldCount}개</span>
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
