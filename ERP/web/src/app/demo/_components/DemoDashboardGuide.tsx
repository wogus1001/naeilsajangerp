'use client';

import { ArrowRight, ChartNoAxesColumnIncreasing, Database, FileCheck2, Route } from 'lucide-react';
import type { DemoScreenId } from '../demoTypes';
import styles from './DemoDashboardGuide.module.css';

type DemoDashboardGuideProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
};

const GUIDE_STEPS = [
    {
        icon: ChartNoAxesColumnIncreasing,
        title: '상단 숫자부터 확인',
        description: '1차 유입, 가맹 희망자, 상담 진행, 계약 전환율로 오늘의 흐름을 먼저 봅니다.'
    },
    {
        icon: Route,
        title: '파이프라인 병목 확인',
        description: '문의접수부터 계약완료까지 어느 단계에 고객이 몰려 있는지 확인합니다.'
    },
    {
        icon: Database,
        title: 'DB 관리로 작업 이동',
        description: '상담 상태, 담당자, 다음 연락일은 DB 관리 탭에서 바로 수정합니다.'
    },
    {
        icon: FileCheck2,
        title: '계약 완료 체크',
        description: '계약 완료 탭에서 완료 점주의 후속 체크리스트를 이어서 확인합니다.'
    }
] as const;

export function DemoDashboardGuide({ onScreenChange }: DemoDashboardGuideProps) {
    return (
        <aside className={styles.guidePanel} data-demo-id="dashboard-guide" aria-label="대시보드 사용 설명">
            <div className={styles.guideHeader}>
                <span>사용 방법</span>
                <h2>대시보드는 오늘 봐야 할 흐름을 먼저 보여줍니다.</h2>
                <p>샘플 데이터로 작동하며 실제 저장, 발송, 삭제는 일어나지 않습니다.</p>
            </div>
            <ol className={styles.guideSteps}>
                {GUIDE_STEPS.map(step => {
                    const Icon = step.icon;
                    return (
                        <li key={step.title} className={styles.guideStep}>
                            <span className={styles.guideStepIcon}>
                                <Icon size={15} aria-hidden="true" />
                            </span>
                            <div>
                                <strong>{step.title}</strong>
                                <p>{step.description}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
            <div className={styles.guideActions}>
                <button type="button" className={styles.guideActionButton} onClick={() => onScreenChange('leadDb')}>
                    DB 관리로 이동
                    <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button type="button" className={styles.guideActionButton} onClick={() => onScreenChange('contractOwners')}>
                    계약 완료 보기
                    <ArrowRight size={15} aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}
