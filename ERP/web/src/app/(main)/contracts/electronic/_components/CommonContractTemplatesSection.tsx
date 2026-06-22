import Link from 'next/link';
import { FileText } from 'lucide-react';
import { COMMON_ELECTRONIC_CONTRACT_TEMPLATES } from '@/lib/electronic-contracts/common-templates';
import styles from './electronicContracts.module.css';

export function CommonContractTemplatesSection() {
    return (
        <section className={styles.panel}>
            <h3 className={styles.templateSectionTitle}>공통 템플릿</h3>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>템플릿</th>
                            <th>구분</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {COMMON_ELECTRONIC_CONTRACT_TEMPLATES.map(template => (
                            <tr key={template.id}>
                                <td>
                                    <div className={styles.mainText}>
                                        <FileText size={14} />
                                        {template.name}
                                    </div>
                                    <div className={styles.subText}>{template.description}</div>
                                </td>
                                <td><span className={styles.badge}>{template.sourceLabel}</span></td>
                                <td>
                                    <Link className={styles.primaryButton} href={template.href}>
                                        작성
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
