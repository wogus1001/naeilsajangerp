'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, PanelRightClose } from 'lucide-react';
import { DEMO_SCREEN_GUIDES } from '../demoContent';
import type { DemoScreenId } from '../demoTypes';
import styles from './DemoScreenGuide.module.css';

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
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const hasOpenedRef = useRef(false);
    const guide = DEMO_SCREEN_GUIDES[screen];

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1200px)');
        const updateMode = () => setIsOverlayMode(mediaQuery.matches);
        updateMode();
        mediaQuery.addEventListener('change', updateMode);
        return () => mediaQuery.removeEventListener('change', updateMode);
    }, []);

    useEffect(() => {
        if (isCollapsed) {
            if (hasOpenedRef.current) {
                triggerRef.current?.focus();
                hasOpenedRef.current = false;
            }
            return;
        }

        hasOpenedRef.current = true;
        closeButtonRef.current?.focus();
    }, [isCollapsed]);

    useEffect(() => {
        if (isCollapsed) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsCollapsed(true);
                return;
            }
            if (!isOverlayMode || event.key !== 'Tab') return;

            const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable?.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isCollapsed, isOverlayMode]);

    if (isCollapsed) {
        return (
            <button
                ref={triggerRef}
                type="button"
                className={styles.guideCollapsedButton}
                data-demo-id="dashboard-guide"
                onClick={() => setIsCollapsed(false)}
                aria-label={`${guide.title} 가이드 열기`}
            >
                <BookOpen size={15} aria-hidden="true" />
                가이드 열기
            </button>
        );
    }

    return (
        <div className={styles.guideOverlay}>
            <button
                type="button"
                className={styles.guideBackdrop}
                onClick={() => setIsCollapsed(true)}
                aria-label={`${guide.title} 가이드 닫기`}
            />
            <aside
                ref={panelRef}
                className={styles.guidePanel}
                data-demo-id="dashboard-guide"
                role={isOverlayMode ? 'dialog' : undefined}
                aria-modal={isOverlayMode || undefined}
                aria-label={`${guide.title} 사용 가이드`}
            >
                <div className={styles.guidePanelTop}>
                    <span>{guide.badge}</span>
                    <button
                        ref={closeButtonRef}
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
        </div>
    );
}
