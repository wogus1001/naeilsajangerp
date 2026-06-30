import { ERP_BENEFITS, SHEET_COMPARISON } from './content';
import styles from './page.module.css';

export function SheetsComparisonSection() {
    return (
        <section className={styles.section}>
            <div className={styles.inner}>
                <div className={styles.sectionHeader}>
                    <span className={styles.eyebrow}>도입 이유</span>
                    <h2>구글시트로는 기록할 수 있지만, 다음 업무까지 이어지기 어렵습니다.</h2>
                </div>
                <div className={styles.sheetComparisonGrid}>
                    {SHEET_COMPARISON.map(column => {
                        const cardClassName = column.title === 'FC ERP'
                            ? `${styles.sheetComparisonCard} ${styles.sheetComparisonCardPrimary}`
                            : styles.sheetComparisonCard;

                        return (
                            <article key={column.title} className={cardClassName}>
                                <span className={styles.comparisonBadge}>{column.title}</span>
                                <p>{column.description}</p>
                                <ul>
                                    {column.items.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </article>
                        );
                    })}
                </div>
                <div className={styles.erpBenefitGrid}>
                    {ERP_BENEFITS.map(benefit => (
                        <article key={benefit.title} className={styles.erpBenefitItem}>
                            <strong>{benefit.title}</strong>
                            <p>{benefit.description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
