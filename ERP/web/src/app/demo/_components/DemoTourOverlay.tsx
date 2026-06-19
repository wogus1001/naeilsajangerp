'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DemoTourStep } from '../demoTypes';
import styles from '../demo.module.css';

type TargetRect = {
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly height: number;
};

type DemoTourOverlayProps = {
    readonly steps: readonly DemoTourStep[];
    readonly onCloseAction?: () => void;
};

export function DemoTourOverlay({ steps, onCloseAction }: DemoTourOverlayProps) {
    const [active, setActive] = useState(true);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const step = steps[stepIndex] ?? null;

    const refreshTarget = useCallback(() => {
        if (!step) {
            setTargetRect(null);
            return;
        }

        const element = document.querySelector(`[data-demo-id="${step.targetId}"]`);
        if (!(element instanceof HTMLElement)) {
            setTargetRect(null);
            return;
        }

        const rect = element.getBoundingClientRect();
        setTargetRect({
            top: Math.max(rect.top - 8, 12),
            left: Math.max(rect.left - 8, 12),
            width: rect.width + 16,
            height: rect.height + 16
        });
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

    const spotlightStyle = useMemo<CSSProperties>(() => {
        if (!targetRect) {
            return {};
        }

        return {
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
        };
    }, [targetRect]);

    const cardStyle = useMemo<CSSProperties>(() => {
        if (!targetRect) {
            return {};
        }

        if (window.innerWidth <= 900) {
            return {};
        }

        const placeRight = targetRect.left + targetRect.width + 360 < window.innerWidth;
        const nextLeft = placeRight ? targetRect.left + targetRect.width + 16 : Math.max(24, targetRect.left - 336);
        const nextTop = Math.min(Math.max(24, targetRect.top), window.innerHeight - 260);

        return {
            top: nextTop,
            left: nextLeft
        };
    }, [targetRect]);

    if (!active || !step) {
        return null;
    }

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === steps.length - 1;
    const closeTour = () => {
        setActive(false);
        onCloseAction?.();
    };

    return (
        <div className={styles.tourLayer} aria-live="polite">
            <div className={styles.spotlight} style={spotlightStyle} />
            <section className={styles.tourCard} style={cardStyle} role="dialog" aria-label="데모 기능 설명">
                <button type="button" className={styles.tourClose} onClick={closeTour} aria-label="데모 설명 닫기">
                    <X size={16} aria-hidden="true" />
                </button>
                <span className={styles.tourCount}>{stepIndex + 1} / {steps.length}</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
                <div className={styles.tourActions}>
                    <button type="button" onClick={closeTour} className={styles.secondaryButton}>건너뛰기</button>
                    <button type="button" onClick={() => setStepIndex(index => Math.max(0, index - 1))} disabled={isFirst} className={styles.secondaryButton}>
                        이전
                    </button>
                    <button
                        type="button"
                        onClick={() => isLast ? closeTour() : setStepIndex(index => Math.min(steps.length - 1, index + 1))}
                        className={styles.primaryButton}
                    >
                        {isLast ? '직접 사용하기' : '다음'}
                    </button>
                </div>
            </section>
        </div>
    );
}
