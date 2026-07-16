"use client";

import React from 'react';
import styles from './page.module.css';
import type { WorkIntakePageMeta } from './types';

type Props = {
    readonly meta: WorkIntakePageMeta;
    readonly onPageChangeAction: (page: number) => void;
};

export function WorkIntakePagination(props: Props) {
    const canGoPrev = props.meta.page > 1;
    const canGoNext = props.meta.page < props.meta.pageCount;

    return (
        <div className={styles.pagination}>
            <span>총 {props.meta.total}건</span>
            <div>
                <button type="button" onClick={() => props.onPageChangeAction(props.meta.page - 1)} disabled={!canGoPrev}>
                    이전
                </button>
                <strong>{props.meta.page} / {props.meta.pageCount}</strong>
                <button type="button" onClick={() => props.onPageChangeAction(props.meta.page + 1)} disabled={!canGoNext}>
                    다음
                </button>
            </div>
        </div>
    );
}
