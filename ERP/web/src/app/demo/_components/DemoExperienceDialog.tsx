'use client';

import React from 'react';
import { ArrowRight, Compass, X } from 'lucide-react';
import { useModalFocusTrap } from '@/components/common/useModalFocusTrap';
import { DEMO_STORIES, selectDemoStoriesForRole } from '../demoStories';
import type { DemoRole, DemoStoryId } from '../demoTypes';
import {
    DemoExperienceCompletion,
    DemoExperienceWelcome
} from './DemoExperienceContent';
import styles from './DemoExperienceDialog.module.css';

type DemoExperienceDialogProps = {
    readonly role: DemoRole;
    readonly coreStepCount: number;
    readonly mode: 'welcome' | 'complete';
    readonly completedStoryId: DemoStoryId | undefined;
    readonly onStartCoreAction: () => void;
    readonly onStartStoryAction: (storyId: DemoStoryId) => void;
    readonly onChooseStoryAction: () => void;
    readonly onExploreAction: () => void;
};

export function DemoExperienceDialog({
    role,
    coreStepCount,
    mode,
    completedStoryId,
    onStartCoreAction,
    onStartStoryAction,
    onChooseStoryAction,
    onExploreAction
}: DemoExperienceDialogProps) {
    const dialogRef = React.useRef<HTMLElement>(null);
    const primaryButtonRef = React.useRef<HTMLButtonElement>(null);
    const titleId = React.useId();
    const descriptionId = React.useId();
    const stories = selectDemoStoriesForRole(role);
    const completedStory = completedStoryId ? DEMO_STORIES[completedStoryId] : undefined;

    useModalFocusTrap({
        dialogRef,
        initialFocusRef: primaryButtonRef,
        isOpen: true,
        onClose: onExploreAction
    });

    return (
        <div className={styles.layer}>
            <section
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                data-demo-id="demo-experience-dialog"
            >
                <button type="button" className={styles.close} onClick={onExploreAction} aria-label="데모 안내 닫기">
                    <X size={18} aria-hidden="true" />
                </button>

                {mode === 'complete' ? (
                    <DemoExperienceCompletion
                        role={role}
                        story={completedStory}
                        titleId={titleId}
                        descriptionId={descriptionId}
                    />
                ) : (
                    <DemoExperienceWelcome
                        role={role}
                        stories={stories}
                        coreStepCount={coreStepCount}
                        titleId={titleId}
                        descriptionId={descriptionId}
                        primaryButtonRef={primaryButtonRef}
                        onStartCoreAction={onStartCoreAction}
                        onStartStoryAction={onStartStoryAction}
                    />
                )}

                {mode === 'complete' ? (
                    <div className={styles.actions}>
                        <button type="button" className={styles.secondaryButton} onClick={stories.length > 0 ? onChooseStoryAction : onExploreAction}>
                            {stories.length > 0 ? '다른 시나리오 선택' : '다른 기능 둘러보기'}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={completedStory ? () => onStartStoryAction(completedStory.id) : onStartCoreAction}
                        >
                            처음부터 다시 체험
                        </button>
                        <button ref={primaryButtonRef} type="button" className={styles.primaryButton} onClick={onExploreAction}>
                            가이드 없이 둘러보기
                            <ArrowRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <div className={styles.exploreRow}>
                        <span>안내 없이 실제 메뉴와 팝업을 직접 확인할 수도 있습니다.</span>
                        <button type="button" className={styles.textButton} onClick={onExploreAction}>
                            <Compass size={16} aria-hidden="true" />
                            자유롭게 둘러보기
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
