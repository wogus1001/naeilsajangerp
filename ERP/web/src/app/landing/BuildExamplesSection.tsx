import Image from 'next/image';
import localStyles from './BuildExamplesSection.module.css';
import pageStyles from './page.module.css';

const BUILD_EXAMPLES = [
    {
        title: '고객이 보는 프론트',
        description: '자사앱과 랜딩, CRM, 프로모션 자동화까지 브랜드가 고객과 만나는 화면을 먼저 정리합니다.',
        image: '/landing/franchise-front-touchpoints.png',
        alt: '자사앱, 랜딩, 매장 접점이 함께 보이는 프랜차이즈 프론트 예시'
    },
    {
        title: '본부가 쓰는 백엔드',
        description: '프랜차이즈 본부 ERP에서 상담, 계약, 오픈, 운영 현황을 한 흐름으로 관리합니다.',
        image: '/landing/franchise-headquarters-erp.png',
        alt: '프랜차이즈 본부 ERP 대시보드 예시'
    },
    {
        title: '성장을 만드는 실행 구조',
        description: '푸시, 쇼츠, 영업대행, 마케팅 소재, 매뉴얼 컨설팅을 운영 기준에 연결합니다.',
        image: '/landing/franchise-growth-operations.png',
        alt: '자동화, 영업, 마케팅 소재, 매뉴얼 컨설팅이 연결된 운영 구조 예시'
    }
] as const;

export function BuildExamplesSection() {
    return (
        <section id="examples" className={pageStyles.section}>
            <div className={pageStyles.inner}>
                <div className={pageStyles.sectionHeader}>
                    <span className={pageStyles.eyebrow}>구축 예시</span>
                    <h2>프론트 화면과 백엔드 운영이 따로 놀지 않도록 처음부터 같이 설계합니다.</h2>
                </div>
                <div className={localStyles.exampleGrid}>
                    {BUILD_EXAMPLES.map(example => (
                        <article key={example.title} className={localStyles.exampleCard}>
                            <div className={localStyles.exampleImageFrame}>
                                <Image
                                    src={example.image}
                                    alt={example.alt}
                                    width={1600}
                                    height={1000}
                                    sizes="(max-width: 720px) 100vw, (max-width: 1040px) 50vw, 33vw"
                                    className={localStyles.exampleImage}
                                />
                            </div>
                            <div className={localStyles.exampleCopy}>
                                <strong>{example.title}</strong>
                                <p>{example.description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
