import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoCtaSection } from './DemoCtaSection';
import { FeatureDetailsSection } from './FeatureDetailsSection';
import { MetricsPreviewSection } from './MetricsPreviewSection';
import { ProductPreview } from './ProductPreview';
import { SheetsComparisonSection } from './SheetsComparisonSection';
import { WorkflowSection } from './WorkflowSection';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Franchise OS | 프랜차이즈 본사 통합 운영 솔루션',
    description: '모객 DB부터 출점, 정보공개서, 계약, 오픈 준비, 가맹 운영까지 프랜차이즈 본사 업무를 한 흐름으로 연결합니다.'
};

export default function LandingPage() {
    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div className={styles.inner}>
                    <Link href="/landing" className={styles.logo}>Franchise OS</Link>
                    <nav className={styles.nav} aria-label="랜딩 페이지 탐색">
                        <a href="#features">기능</a>
                        <a href="#metrics">지표</a>
                        <a href="#workflow">업무 흐름</a>
                        <Link href="/demo">데모</Link>
                    </nav>
                </div>
            </header>

            <section className={styles.hero}>
                <div className={`${styles.inner} ${styles.heroGrid}`}>
                    <div className={styles.heroCopy}>
                        <span className={styles.eyebrow}>프랜차이즈 본사 통합 운영 솔루션</span>
                        <h1>상태별 파이프라인으로 모객부터 오픈 이후 운영까지 한눈에</h1>
                        <p>
                            구글시트에 흩어진 모객 DB를 문의접수, 상담중, 입지검토, 계약예정처럼
                            상태별로 추적하고 가맹 희망자, 출점 후보지, 정보공개서, 계약 점주,
                            오픈 준비, 가맹 운영까지 이어지는 본사 업무 흐름으로 연결합니다.
                        </p>
                    </div>
                    <ProductPreview />
                </div>
            </section>

            <DemoCtaSection />

            <SheetsComparisonSection />

            <MetricsPreviewSection />

            <FeatureDetailsSection />

            <WorkflowSection />

            <footer className={styles.footer}>
                <div className={styles.inner}>
                    <div className={styles.footerCopy}>
                        <strong>Franchise OS</strong>
                        <span>프랜차이즈 본사를 위한 모객, 출점, 계약, 오픈, 운영 통합 솔루션</span>
                    </div>
                    <nav className={styles.footerLinks} aria-label="서비스 정책">
                        <Link href="/privacy">개인정보처리방침</Link>
                    </nav>
                </div>
            </footer>
        </main>
    );
}
