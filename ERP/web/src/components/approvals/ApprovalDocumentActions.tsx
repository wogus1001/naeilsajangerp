'use client';

import React from 'react';
import { Check, CheckCheck, CircleCheck, CornerUpLeft, Handshake, ThumbsDown, X } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type { ApprovalAction } from './approvalTypes';
import styles from './ApprovalDocument.module.css';

type ApprovalDocumentActionsProps = {
    readonly actions: readonly ApprovalAction[];
    readonly disabled: boolean;
    readonly onAction: (action: ApprovalAction, comment: string) => void;
};

const ACTION_CONFIG = {
    approve: { label: '승인', confirm: '이 문서를 승인할까요?', icon: Check, negative: false },
    reject: { label: '반려', confirm: '보완이 필요한 사유를 남기고 반려할까요?', icon: X, negative: true },
    agree: { label: '합의', confirm: '이 문서에 합의할까요?', icon: Handshake, negative: false },
    disagree: { label: '비합의', confirm: '비합의 사유를 남기고 처리할까요?', icon: ThumbsDown, negative: true },
    withdraw: { label: '회수', confirm: '결재가 시작되기 전 문서를 회수할까요?', icon: CornerUpLeft, negative: true },
    acknowledge: { label: '수신 확인', confirm: '문서를 확인한 것으로 처리할까요?', icon: CheckCheck, negative: false },
    complete: { label: '완료 처리', confirm: '승인된 문서를 최종 완료 처리할까요?', icon: CircleCheck, negative: false }
} as const;

export function ApprovalDocumentActions({ actions, disabled, onAction }: ApprovalDocumentActionsProps) {
    const [comment, setComment] = React.useState('');
    const [selected, setSelected] = React.useState<ApprovalAction | null>(null);
    if (actions.length === 0) return null;
    const selectedConfig = selected ? ACTION_CONFIG[selected] : null;
    return (
        <section className={styles.actionsPanel}>
            <div>
                <strong>문서 처리</strong>
                <span>현재 권한과 결재 단계에서 가능한 작업만 표시됩니다.</span>
            </div>
            <label>
                <span>처리 의견</span>
                <textarea
                    onChange={event => setComment(event.target.value)}
                    placeholder="승인 의견 또는 반려·비합의 사유를 입력하세요"
                    rows={3}
                    value={comment}
                />
            </label>
            <div className={styles.actionButtons}>
                {actions.map(action => {
                    const config = ACTION_CONFIG[action];
                    const Icon = config.icon;
                    return (
                        <button
                            className={config.negative ? styles.negativeAction : styles.positiveAction}
                            disabled={disabled}
                            key={action}
                            onClick={() => setSelected(action)}
                            type="button"
                        >
                            <Icon size={16} aria-hidden="true" />{config.label}
                        </button>
                    );
                })}
            </div>
            <ConfirmModal
                confirmText={selectedConfig?.label ?? '확인'}
                isDanger={selectedConfig?.negative}
                isOpen={selected !== null}
                message={selectedConfig?.confirm ?? ''}
                onClose={() => setSelected(null)}
                onConfirm={() => {
                    if (!selected) return;
                    onAction(selected, comment.trim());
                }}
                title="결재 문서 처리"
            />
        </section>
    );
}
