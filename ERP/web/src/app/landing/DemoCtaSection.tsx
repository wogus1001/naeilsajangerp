import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import styles from './DemoCtaSection.module.css';

export function DemoCtaSection() {
    return (
        <section className={styles.demoCta} aria-label="공개 데모 시작">
            <div>
                <span>공개 데모</span>
                <h2>ERP 화면은 샘플 데모로 먼저 확인할 수 있습니다.</h2>
                <p>모객 DB, 계약 완료, 출점 후보지, 가맹 운영 흐름을 샘플 데이터로 보고 자동화·자사앱·컨설팅 범위와 함께 검토합니다.</p>
            </div>
            <div className={styles.demoLinks}>
                <Link href="/demo" className={styles.primaryDemoLink}>
                    데모 시작하기 <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
