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
        title: '유입',
        owner: '가맹개발팀',
        description: '광고, 박람회, 소개 DB를 같은 기준으로 등록합니다.',
        handoff: '원천 DB'
    },
    {
        number: '02',
        title: '상담',
        owner: '담당자',
        description: '상담 이력, 다음 연락, 중요 여부를 누적합니다.',
        handoff: '상담 기록'
    },
    {
        number: '03',
        title: '출점 검토',
        owner: '출점개발팀',
        description: '희망지역과 후보지, 외부 상가 검토 상태를 연결합니다.',
        handoff: '후보지 조건'
    },
    {
        number: '04',
        title: '정보공개서',
        owner: '계약 담당',
        description: '발송 기록과 14일 대기 기준을 확인합니다.',
        handoff: '계약 가능일'
    },
    {
        number: '05',
        title: '계약',
        owner: '계약 담당',
        description: '계약 전 체크와 점주 전환 상태를 관리합니다.',
        handoff: '계약 점주'
    },
    {
        number: '06',
        title: '오픈 준비',
        owner: '오픈 담당',
        description: '교육, 인테리어, 물류 등 준비 항목을 추적합니다.',
        handoff: '오픈 현황'
    },
    {
        number: '07',
        title: '운영',
        owner: '운영팀',
        description: '오픈 이후 요청과 본사 후속 조치를 이어받습니다.',
        handoff: '운영 이력'
    }
] as const satisfies readonly WorkflowStep[];

const WORKFLOW_HANDOFFS = [
    {
        title: '모객 DB → 상담',
        description: '담당자, 상태, 다음 연락일이 같은 기준으로 남아 오늘 처리할 DB를 바로 확인합니다.'
    },
    {
        title: '상담 → 계약',
        description: '상담 이력과 정보공개서 발송 기록이 계약 가능일 판단으로 이어집니다.'
    },
    {
        title: '계약 → 오픈/운영',
        description: '계약 점주가 오픈 준비 체크리스트와 운영 이력으로 그대로 이어집니다.'
    }
] as const satisfies readonly WorkflowHandoff[];

export function WorkflowSection() {
    return (
        <section id="workflow" className={localStyles.workflowSection}>
            <div className={pageStyles.inner}>
                <div className={pageStyles.sectionHeader}>
                    <span className={pageStyles.eyebrow}>업무 흐름</span>
                    <h2>유입 이후의 모든 단계가 다음 담당자에게 이어집니다.</h2>
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
