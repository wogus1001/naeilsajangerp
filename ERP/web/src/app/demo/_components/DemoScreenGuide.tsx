'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ArrowRight, BookOpen, PanelRightClose } from 'lucide-react';
import { DEMO_SCREEN_GUIDES } from '../demoContent';
import type { DemoScreenId } from '../demoTypes';
import styles from './DemoDashboardGuide.module.css';

type DemoScreenGuideProps = {
    readonly screen: DemoScreenId;
    readonly onScreenChange: (screen: DemoScreenId) => void;
};

type DemoGuidedLayoutProps = DemoScreenGuideProps & {
    readonly children: ReactNode;
};

type DemoGuideTargetProps = {
    readonly children: ReactNode;
    readonly marker: number;
    readonly targetId: string;
    readonly label: string;
    readonly className?: string;
};

export function DemoGuidedLayout({ children, screen, onScreenChange }: DemoGuidedLayoutProps) {
    return (
        <div className={styles.dashboardGuideLayout}>
            <div className={styles.dashboardGuideMain}>{children}</div>
            <DemoScreenGuide screen={screen} onScreenChange={onScreenChange} />
        </div>
    );
}

export function DemoGuideTarget({ children, marker, targetId, label, className }: DemoGuideTargetProps) {
    return (
        <div data-demo-id={targetId} className={[styles.guideTarget, className].filter(Boolean).join(' ')}>
            <span className={styles.guideMarker} aria-label={`가이드 ${marker}번: ${label}`}>{marker}</span>
            {children}
        </div>
    );
}

export function DemoScreenGuide({ screen, onScreenChange }: DemoScreenGuideProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const guide = DEMO_SCREEN_GUIDES[screen];

    if (isCollapsed) {
        return (
            <button
                type="button"
                className={styles.guideCollapsedButton}
                onClick={() => setIsCollapsed(false)}
                aria-label={`${guide.title} 가이드 열기`}
            >
                <BookOpen size={15} aria-hidden="true" />
                가이드 열기
            </button>
        );
    }

    return (
        <aside className={styles.guidePanel} data-demo-id="dashboard-guide" aria-label={`${guide.title} 사용 가이드`}>
            <div className={styles.guidePanelTop}>
                <span>{guide.badge}</span>
                <button
                    type="button"
                    className={styles.guideCloseButton}
                    onClick={() => setIsCollapsed(true)}
                    aria-label={`${guide.title} 가이드 접기`}
                >
                    <PanelRightClose size={15} aria-hidden="true" />
                    접기
                </button>
            </div>
            <div className={styles.guideHeader}>
                <h2>{guide.title}</h2>
                <p>{guide.description}</p>
            </div>
            <ol className={styles.guideSteps}>
                {guide.steps.map((step, index) => (
                    <li key={step.title} className={styles.guideStep}>
                        <span className={styles.guideStepIcon}>
                            {index + 1}
                        </span>
                        <div>
                            <strong>{step.title}</strong>
                            <p>{step.description}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <div className={styles.guideActions}>
                {guide.actions.map(action => (
                    <button
                        key={`${screen}-${action.screen}`}
                        type="button"
                        className={styles.guideActionButton}
                        onClick={() => onScreenChange(action.screen)}
                    >
                        {action.label}
                        <ArrowRight size={15} aria-hidden="true" />
                    </button>
                ))}
            </div>
        </aside>
    );
}
