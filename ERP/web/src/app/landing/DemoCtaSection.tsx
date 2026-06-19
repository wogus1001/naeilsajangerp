import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import styles from './DemoCtaSection.module.css';

export function DemoCtaSection() {
    return (
        <section className={styles.demoCta} aria-label="공개 데모 시작">
            <div>
                <span>공개 데모</span>
                <h2>실제 ERP 화면에 가까운 샘플 데모를 바로 확인할 수 있습니다.</h2>
                <p>역할 선택 없이 프랜차이즈 대시보드, DB 관리, 계약 완료, 출점 후보지, 가맹 운영 흐름을 샘플 데이터로 체험합니다.</p>
            </div>
            <div className={styles.demoLinks}>
                <Link href="/demo" className={styles.primaryDemoLink}>
                    데모 시작하기 <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
