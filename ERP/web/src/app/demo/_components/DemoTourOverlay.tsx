'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
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
    readonly onFinalAction?: (action: DemoGuideAction) => void;
    readonly onStepAdvanceAction?: (currentStep: DemoTourStep, nextStep: DemoTourStep | undefined) => void;
};

export function DemoTourOverlay({ steps, finalAction, onCloseAction, onFinalAction, onStepAdvanceAction }: DemoTourOverlayProps) {
    const maskId = useId().replaceAll(':', '');
    const [active, setActive] = useState(true);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRects, setTargetRects] = useState<readonly TargetRect[]>([]);
    const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
    const step = steps[stepIndex] ?? null;
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
        if (!active) {
            return;
        }

        refreshTarget();
        window.addEventListener('resize', refreshTarget);
        window.addEventListener('scroll', refreshTarget, true);

        return () => {
            window.removeEventListener('resize', refreshTarget);
            window.removeEventListener('scroll', refreshTarget, true);
        };
    }, [active, refreshTarget]);

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
        if (finalAction) {
            setActive(false);
            onCloseAction?.();
            onFinalAction?.(finalAction);
            return;
        }

        closeTour();
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

    return (
        <div className={styles.tourLayer} aria-live="polite">
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
            {targetRects.map((rect, index) => (
                <div
                    key={`${rect.width}-${rect.height}-${index}`}
                    className={styles.spotlight}
                    style={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    }}
                />
            ))}
            <section className={styles.tourCard} style={cardStyle} role="dialog" aria-label="데모 기능 설명" data-demo-id="demo-tour-card">
                <button type="button" className={styles.tourClose} onClick={closeTour} aria-label="데모 설명 닫기">
                    <X size={16} aria-hidden="true" />
                </button>
                <span className={styles.tourCount}>{stepIndex + 1} / {steps.length}</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
                <div className={styles.tourActions}>
                    <button type="button" onClick={closeTour} className={styles.secondaryButton}>둘러보기</button>
                    <button type="button" onClick={() => setStepIndex(index => Math.max(0, index - 1))} disabled={isFirst} className={styles.secondaryButton}>
                        이전
                    </button>
                    <button
                        type="button"
                        onClick={advanceTour}
                        className={styles.primaryButton}
                    >
                        {isLast ? finalAction?.label ?? '직접 사용하기' : '다음'}
                    </button>
                </div>
            </section>
        </div>
    );
}

function findTourTarget(selector: string): HTMLElement | null {
    const element = document.querySelector(selector);
    return element instanceof HTMLElement ? element : null;
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
    return {
        top: Math.max(rect.top - SPOTLIGHT_PADDING, 12),
        left: Math.max(rect.left - SPOTLIGHT_PADDING, 12),
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2
    };
}
