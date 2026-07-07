import styles from './page.module.css';

const ENGAGEMENT_MODELS = [
    {
        title: '초기 도입비',
        label: 'Start',
        price: '0원',
        description: '본사가 부담 없이 시작하도록 전문가가 본부 운영 흐름을 진단하고 초기 구축 범위를 잡아드립니다.',
        items: ['6개월 운영 파트너십 기준', 'ERP·앱·랜딩 구조 진단 포함', '광고비·촬영비·발송비는 별도']
    },
    {
        title: '월 운영 파트너십',
        label: 'Operate',
        price: '월 99만~250만원',
        description: '월 운영비에는 영업대행, 상담 DB 관리, 마케팅 소재 제작, 푸시·쇼츠 운영처럼 매달 실제로 진행되는 마케팅 운영 업무가 포함됩니다.',
        items: ['월간 마케팅 운영 리포트 제공', '영업·소재·푸시·쇼츠 운영 범위별 조정', '전문가 정착 지원 포함']
    },
    {
        title: '오픈 성공보수',
        label: 'Scale',
        price: '오픈 1건당 계약금액',
        description: '가맹계약 체결과 실제 매장 오픈처럼 본사가 체감하는 결과에 맞춰 계약금액 기준으로 성공보수를 협의합니다.',
        items: ['계약금액·역할 범위 기준 협의', '순수 성공형은 계약금액 비율 조정', '고급 앱 기능은 별도 확장 옵션']
    }
] as const;

export function EngagementModelSection() {
    return (
        <section id="engagement" className={styles.section}>
            <div className={styles.inner}>
                <div className={styles.sectionHeader}>
                    <span className={styles.eyebrow}>과금 구조</span>
                    <h2>단순히 시스템만 쓰라는 제안이 아니라, 전문가가 본사 운영을 정착시키는 방식입니다.</h2>
                </div>
                <div className={styles.engagementGrid}>
                    {ENGAGEMENT_MODELS.map(model => (
                        <article key={model.title} className={styles.engagementCard}>
                            <span className={styles.modelPill}>{model.label}</span>
                            <h3>{model.title}</h3>
                            <strong className={styles.modelPrice}>{model.price}</strong>
                            <p>{model.description}</p>
                            <ul>
                                {model.items.map(item => <li key={item}>{item}</li>)}
                            </ul>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
