import Link from 'next/link';
import styles from '../_components/electronicContracts.module.css';

export default function UcansignConnectPage() {
    return (
        <main className={styles.container}>
            <section className={styles.panel}>
                <h1 className={styles.sectionTitle}>공용 UCanSign 발송</h1>
                <p className={styles.description}>
                    새 전자계약은 서버에 등록된 UCANSIGN_API_KEY로 발송합니다. 사용자는 별도로 UCanSign 계정을 연결하지 않습니다.
                </p>
                <div className={styles.actions}>
                    <Link className={styles.primaryButton} href="/contracts/electronic">전자계약으로 돌아가기</Link>
                </div>
            </section>
        </main>
    );
}
