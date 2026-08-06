'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { isElementInVisibleTree } from '@/components/common/useModalFocusTrap';
import type { DemoGuideAction, DemoTourStep } from '../demoTypes';
import styles from '../demo.module.css';

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 12;

type TargetRect = {
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly height: number;
};

type ViewportSize = {
    readonly width: number;
    readonly height: number;
};

type DemoTourOverlayProps = {
    readonly steps: readonly DemoTourStep[];
    readonly finalAction: DemoGuideAction | undefined;
    readonly onCloseAction?: () => void;
    readonly onCompleteAction?: () => void;
    readonly onFinalAction?: (action: DemoGuideAction) => void;
    readonly onStepAdvanceAction?: (currentStep: DemoTourStep, nextStep: DemoTourStep | undefined) => void;
};

export function DemoTourOverlay({
    steps,
    finalAction,
    onCloseAction,
    onCompleteAction,
    onFinalAction,
    onStepAdvanceAction
}: DemoTourOverlayProps) {
    const cardRef = useRef<HTMLElement | null>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);
    const [active, setActive] = useState(true);
    const [isSuspended, setIsSuspended] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRects, setTargetRects] = useState<readonly TargetRect[]>([]);
    const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
    const step = steps[stepIndex] ?? null;
    const stableStepId = (step?.id || 'step').replace(/[^a-zA-Z0-9_-]/g, '-');
    const maskId = `demo-tour-mask-${stableStepId}`;
    const titleId = `demo-tour-title-${stableStepId}`;
    const primaryTargetRect = targetRects[0] ?? null;

    const refreshTarget = useCallback(() => {
        setViewportSize({ width: window.innerWidth, height: window.innerHeight });

        if (!step) {
            setTargetRects([]);
            return;
        }

        const primaryElement = findTourTarget(step.targetSelector ?? `[data-demo-id="${step.targetId}"]`);
        if (!primaryElement) {
            setTargetRects([]);
            return;
        }

        primaryElement.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
        setTargetRects(getTourTargetElements(step, primaryElement).map(getPaddedRect));
    }, [step]);

    useEffect(() => {
        if (!active || isSuspended) {
            return;
        }

        const initialFrame = window.requestAnimationFrame(refreshTarget);
        window.addEventListener('resize', refreshTarget);
        window.addEventListener('scroll', refreshTarget, true);

        return () => {
            window.cancelAnimationFrame(initialFrame);
            window.removeEventListener('resize', refreshTarget);
            window.removeEventListener('scroll', refreshTarget, true);
        };
    }, [active, isSuspended, refreshTarget]);

    useEffect(() => {
        if (!active || isSuspended) {
            return;
        }

        previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const tourCard = cardRef.current;
        const focusFrame = window.requestAnimationFrame(() => {
            cardRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setActive(false);
                onCloseAction?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
            const hasProductionDialog = Array.from(
                document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
            ).some(dialog => (
                dialog !== tourCard
                && dialog.getAttribute('aria-hidden') !== 'true'
                && isElementInVisibleTree(dialog)
            ));
            if (!hasProductionDialog) previouslyFocusedRef.current?.focus({ preventScroll: true });
        };
    }, [active, isSuspended, onCloseAction]);

    useEffect(() => {
        if (!active) return;

        const updateSuspendedState = () => {
            const productionDialogs = Array.from(
                document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
            ).filter(dialog => (
                dialog !== cardRef.current
                && dialog.getAttribute('aria-hidden') !== 'true'
                && isElementInVisibleTree(dialog)
            ));
            const hasProductionDialog = productionDialogs.length > 0;
            const targetSelector = step?.targetSelector ?? (step ? `[data-demo-id="${step.targetId}"]` : '');
            const target = targetSelector ? findTourTarget(targetSelector) : null;
            const targetInsideProductionDialog = Boolean(
                target && productionDialogs.some(dialog => dialog.contains(target))
            );
            setIsSuspended(hasProductionDialog && !targetInsideProductionDialog);
        };
        const observer = new MutationObserver(updateSuspendedState);
        updateSuspendedState();
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['aria-hidden', 'aria-modal'],
            childList: true,
            subtree: true
        });

        return () => {
            observer.disconnect();
        };
    }, [active, step]);

    const cardStyle = useMemo<CSSProperties>(() => {
        if (!primaryTargetRect) {
            return {
                top: 96,
                left: '50%',
                transform: 'translateX(-50%)'
            };
        }

        if (window.innerWidth <= 900) {
            return {
                right: 16,
                bottom: 16,
                left: 16,
                width: 'auto'
            };
        }

        const margin = 16;
        const cardWidth = 320;
        const estimatedCardHeight = 220;
        const maxLeft = window.innerWidth - cardWidth - margin;
        const maxTop = window.innerHeight - estimatedCardHeight - margin;
        const clampLeft = (left: number) => Math.min(Math.max(margin, left), maxLeft);
        const clampTop = (top: number) => Math.min(Math.max(margin, top), maxTop);
        const wideTarget = primaryTargetRect.width > window.innerWidth * 0.55;
        const centeredLeft = clampLeft(primaryTargetRect.left + (primaryTargetRect.width - cardWidth) / 2);
        const canPlaceRight = primaryTargetRect.left + primaryTargetRect.width + cardWidth + margin <= window.innerWidth;
        const canPlaceLeft = primaryTargetRect.left - cardWidth - margin >= margin;
        const canPlaceBelow = primaryTargetRect.top + primaryTargetRect.height + estimatedCardHeight + margin <= window.innerHeight;
        const canPlaceAbove = primaryTargetRect.top - estimatedCardHeight - margin >= margin;

        if (wideTarget && canPlaceBelow) {
            return {
                top: primaryTargetRect.top + primaryTargetRect.height + margin,
                left: centeredLeft
            };
        }

        if (wideTarget && canPlaceAbove) {
            return {
                top: primaryTargetRect.top - estimatedCardHeight - margin,
                left: centeredLeft
            };
        }

        if (!wideTarget && canPlaceRight) {
            return {
                top: clampTop(primaryTargetRect.top),
                left: primaryTargetRect.left + primaryTargetRect.width + margin
            };
        }

        if (!wideTarget && canPlaceLeft) {
            return {
                top: clampTop(primaryTargetRect.top),
                left: primaryTargetRect.left - cardWidth - margin
            };
        }

        if (canPlaceBelow) {
            return {
                top: primaryTargetRect.top + primaryTargetRect.height + margin,
                left: clampLeft(primaryTargetRect.left)
            };
        }

        if (canPlaceAbove) {
            return {
                top: primaryTargetRect.top - estimatedCardHeight - margin,
                left: clampLeft(primaryTargetRect.left)
            };
        }

        return {
            top: clampTop(primaryTargetRect.top + primaryTargetRect.height + margin),
            left: clampLeft(primaryTargetRect.left)
        };
    }, [primaryTargetRect]);

    if (!active || !step) {
        return null;
    }

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === steps.length - 1;
    const closeTour = () => {
        setActive(false);
        onCloseAction?.();
    };
    const completeTour = () => {
        setActive(false);
        if (finalAction) {
            onCloseAction?.();
            onFinalAction?.(finalAction);
            return;
        }

        if (onCompleteAction) {
            onCompleteAction();
            return;
        }

        onCloseAction?.();
    };
    const advanceTour = () => {
        if (isLast) {
            completeTour();
            return;
        }

        const nextStep = steps[stepIndex + 1];
        onStepAdvanceAction?.(step, nextStep);
        setStepIndex(index => Math.min(steps.length - 1, index + 1));
    };
    const retreatTour = () => {
        if (isFirst) return;
        const previousStep = steps[stepIndex - 1];
        onStepAdvanceAction?.(step, previousStep);
        setStepIndex(index => Math.max(0, index - 1));
    };

    return (
        <div className={styles.tourLayer} aria-live="polite" hidden={isSuspended} aria-hidden={isSuspended}>
            <svg
                className={styles.tourScrim}
                viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
                aria-hidden="true"
            >
                <defs>
                    <mask id={maskId}>
                        <rect x="0" y="0" width={viewportSize.width} height={viewportSize.height} fill="#ffffff" />
                        {targetRects.map((rect, index) => (
                            <rect
                                key={`${rect.top}-${rect.left}-${index}`}
                                x={rect.left}
                                y={rect.top}
                                width={rect.width}
                                height={rect.height}
                                rx={SPOTLIGHT_RADIUS}
                                fill="#000000"
                            />
                        ))}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width={viewportSize.width}
                    height={viewportSize.height}
                    fill="rgba(25, 31, 40, 0.62)"
                    mask={`url(#${maskId})`}
                />
            </svg>
            <section
                ref={cardRef}
                className={styles.tourCard}
                style={cardStyle}
                role="region"
                aria-labelledby={titleId}
                data-demo-id="demo-tour-card"
                tabIndex={-1}
            >
                <button type="button" className={styles.tourClose} onClick={closeTour} aria-label="데모 설명 닫기">
                    <X size={16} aria-hidden="true" />
                </button>
                <span className={styles.tourCount}>{stepIndex + 1} / {steps.length}</span>
                <h2 id={titleId}>{step.title}</h2>
                <p>{step.description}</p>
                <div className={styles.tourActions}>
                    <button type="button" onClick={closeTour} className={styles.secondaryButton}>둘러보기</button>
                    <button type="button" onClick={retreatTour} disabled={isFirst} className={styles.secondaryButton}>
                        이전
                    </button>
                    <button
                        type="button"
                        onClick={advanceTour}
                        className={styles.primaryButton}
                    >
                        {isLast
                            ? finalAction?.label ?? (onCompleteAction ? '핵심 체험 완료' : '설명 마치기')
                            : '다음'}
                    </button>
                </div>
            </section>
        </div>
    );
}

function findTourTarget(selector: string): HTMLElement | null {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.find((element): element is HTMLElement => (
        element instanceof HTMLElement && element.closest('[hidden]') === null
    )) ?? null;
}

function getTourTargetElements(step: DemoTourStep, primaryElement: HTMLElement): readonly HTMLElement[] {
    const targetSelectors = [
        ...(step.emphasisTargetIds ?? []).map(targetId => `[data-demo-id="${targetId}"]`),
        ...(step.emphasisTargetSelectors ?? [])
    ];
    const emphasisElements = targetSelectors.flatMap(selector => {
        const element = findTourTarget(selector);
        return element ? [element] : [];
    });

    return [primaryElement, ...emphasisElements.filter((element, index, elements) => (
        element !== primaryElement && elements.indexOf(element) === index
    ))];
}

function getPaddedRect(element: HTMLElement): TargetRect {
    const rect = element.getBoundingClientRect();
    const top = Math.max(rect.top - SPOTLIGHT_PADDING, 0);
    const left = Math.max(rect.left - SPOTLIGHT_PADDING, 0);
    const right = Math.min(rect.right + SPOTLIGHT_PADDING, window.innerWidth);
    const bottom = Math.min(rect.bottom + SPOTLIGHT_PADDING, window.innerHeight);

    return {
        top,
        left,
        width: Math.max(right - left, 0),
        height: Math.max(bottom - top, 0)
    };
}
