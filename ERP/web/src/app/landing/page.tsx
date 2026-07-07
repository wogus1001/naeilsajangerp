import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BusinessInfoFooter } from '@/components/common/BusinessInfoFooter';
import { BuildExamplesSection } from './BuildExamplesSection';
import { EngagementModelSection } from './EngagementModelSection';
import { FeatureDetailsSection } from './FeatureDetailsSection';
import { MetricsPreviewSection } from './MetricsPreviewSection';
import { ProductPreview } from './ProductPreview';
import { SheetsComparisonSection } from './SheetsComparisonSection';
import { WorkflowSection } from './WorkflowSection';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: '프랜차이즈 본부 ERP | 본부 구축과 성장 자동화',
    description: '자사앱과 랜딩, ERP와 자동화, 영업 운영 기준까지 프랜차이즈 본부가 실제로 굴러가는 구조를 처음부터 함께 구축합니다.'
};

const HERO_FACTS = [
    { label: '프론트', value: '자사앱·랜딩·고객 접점' },
    { label: '백엔드', value: '본부 ERP·자동화·운영 기준' },
    { label: '실행', value: '영업대행·마케팅 소재·매뉴얼' }
] as const;

export default function LandingPage() {
    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div className={styles.inner}>
                    <Link href="/landing" className={styles.logo}>프랜차이즈 본부 ERP</Link>
                    <nav className={styles.nav} aria-label="랜딩 페이지 탐색">
                        <a href="#features">제공 범위</a>
                        <a href="#examples">구축 예시</a>
                        <a href="#metrics">운영 지표</a>
                        <a href="#engagement">과금 구조</a>
                        <a href="#workflow">업무 흐름</a>
                        <Link href="/login" className={styles.loginLink}>로그인</Link>
                    </nav>
                </div>
            </header>

            <section className={styles.hero}>
                <div className={`${styles.inner} ${styles.heroGrid}`}>
                    <div className={styles.heroCopy}>
                        <span className={styles.eyebrow}>구축·운영·성장 파트너십</span>
                        <h1>프랜차이즈 본사 성장 패키지</h1>
                        <p>
                            자사앱과 랜딩, ERP와 자동화, 영업 운영 기준까지 프랜차이즈
                            본부가 실제로 굴러가는 구조를 처음부터 함께 구축합니다.
                        </p>
                        <div className={styles.heroActions}>
                            <a href="#features" className={styles.heroPrimaryLink}>
                                제공 범위 보기 <ArrowRight size={17} aria-hidden="true" />
                            </a>
                        </div>
                        <dl className={styles.heroFacts}>
                            {HERO_FACTS.map(fact => (
                                <div key={fact.label}>
                                    <dt>{fact.label}</dt>
                                    <dd>{fact.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <ProductPreview />
                </div>
            </section>

            <SheetsComparisonSection />

            <BuildExamplesSection />

            <MetricsPreviewSection />

            <FeatureDetailsSection />

            <EngagementModelSection />

            <WorkflowSection />

            <footer className={styles.footer}>
                <div className={styles.inner}>
                    <div className={styles.footerTop}>
                        <div className={styles.footerCopy}>
                            <strong>프랜차이즈 본부 ERP</strong>
                            <span>자사앱, 랜딩, ERP, 자동화, 영업 실행, 마케팅 소재, 가맹관리 매뉴얼 패키지</span>
                        </div>
                        <nav className={styles.footerLinks} aria-label="서비스 정책">
                            <Link href="/privacy">개인정보처리방침</Link>
                        </nav>
                    </div>
                    <BusinessInfoFooter className={styles.businessInfo} />
                </div>
            </footer>
        </main>
    );
}
