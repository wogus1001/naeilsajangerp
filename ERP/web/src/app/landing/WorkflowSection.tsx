import localStyles from './WorkflowSection.module.css';
import pageStyles from './page.module.css';

type WorkflowStep = {
    readonly number: string;
    readonly title: string;
    readonly owner: string;
    readonly description: string;
    readonly handoff: string;
};

type WorkflowHandoff = {
    readonly title: string;
    readonly description: string;
};

const WORKFLOW_STEPS = [
    {
        number: '01',
        title: '진단',
        owner: '대표/본부장',
        description: '브랜드, 본사 조직, 영업 채널, 운영 기준을 먼저 확인합니다.',
        handoff: '구축 범위'
    },
    {
        number: '02',
        title: '시스템 구축',
        owner: '구축팀',
        description: '프랜차이즈 본부 ERP와 자사앱, 랜딩의 기본 흐름을 설계합니다.',
        handoff: 'ERP·앱'
    },
    {
        number: '03',
        title: '유입 채널 설계',
        owner: '마케팅팀',
        description: '푸시, 쇼츠, 랜딩이 어떤 상담으로 이어질지 채널별 운영 기준을 잡습니다.',
        handoff: '채널 기준'
    },
    {
        number: '04',
        title: '영업 실행',
        owner: '가맹개발팀',
        description: '영업대행과 상담 DB 후속 관리를 같은 기준으로 운영합니다.',
        handoff: '상담 DB'
    },
    {
        number: '05',
        title: '콘텐츠 제작',
        owner: '제작팀',
        description: '광고, 상담, 쇼츠에 실제로 쓸 이미지와 스크립트를 제작합니다.',
        handoff: '콘텐츠'
    },
    {
        number: '06',
        title: '매뉴얼',
        owner: '컨설팅팀',
        description: '본사 운영, 가맹점, SV, 계약 관련 매뉴얼을 정리합니다.',
        handoff: '운영 기준'
    },
    {
        number: '07',
        title: '정착',
        owner: '운영/SV팀',
        description: '지표, 알림, 앱 공지, 운영 이력으로 반복 업무를 고도화합니다.',
        handoff: '성장 운영'
    }
] as const satisfies readonly WorkflowStep[];

const WORKFLOW_HANDOFFS = [
    {
        title: '시스템 → 실행',
        description: 'ERP와 자사앱에서 만든 기준을 영업대행, 푸시, 쇼츠 운영으로 바로 연결합니다.'
    },
    {
        title: '마케팅 → 상담',
        description: '채널 운영과 콘텐츠 반응을 상담 DB와 후속 연락으로 정리합니다.'
    },
    {
        title: '매뉴얼 → 운영',
        description: '본사 구축 매뉴얼을 앱 공지, 교육 자료, 운영 체크리스트로 이어갑니다.'
    }
] as const satisfies readonly WorkflowHandoff[];

export function WorkflowSection() {
    return (
        <section id="workflow" className={localStyles.workflowSection}>
            <div className={pageStyles.inner}>
                <div className={pageStyles.sectionHeader}>
                    <span className={pageStyles.eyebrow}>업무 흐름</span>
                    <h2>본사 구축부터 유입, 영업, 운영 정착까지 단계별로 이어집니다.</h2>
                </div>
                <ol className={localStyles.workflowList}>
                    {WORKFLOW_STEPS.map(step => (
                        <li key={step.number}>
                            <div className={localStyles.workflowStepTop}>
                                <span>{step.number}</span>
                                <strong>{step.title}</strong>
                            </div>
                            <p>{step.description}</p>
                            <div className={localStyles.workflowMeta}>
                                <span>{step.owner}</span>
                                <b>{step.handoff}</b>
                            </div>
                        </li>
                    ))}
                </ol>
                <div className={localStyles.handoffGrid}>
                    {WORKFLOW_HANDOFFS.map(handoff => (
                        <article key={handoff.title} className={localStyles.handoffItem}>
                            <strong>{handoff.title}</strong>
                            <p>{handoff.description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
