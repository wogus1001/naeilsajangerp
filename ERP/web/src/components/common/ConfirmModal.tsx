'use client';

import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import styles from './ConfirmModal.module.css';
import { useDialogFocusTrap } from './useDialogFocusTrap';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = '확인',
    message,
    confirmText = '확인',
    cancelText = '취소',
    isDanger = false
}: ConfirmModalProps) {
    const cancelButtonRef = React.useRef<HTMLButtonElement>(null);
    const titleId = React.useId();
    const descriptionId = React.useId();
    const dialogRef = useDialogFocusTrap<HTMLDivElement>(isOpen, onClose, cancelButtonRef);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
            <div
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className={styles.dialog}
                ref={dialogRef}
                role="alertdialog"
                tabIndex={-1}
            >
                <div className={`${styles.icon} ${isDanger ? styles.dangerIcon : ''}`}>
                    {isDanger ? <AlertCircle aria-hidden="true" /> : <HelpCircle aria-hidden="true" />}
                </div>

                <h3 id={titleId}>
                    {title}
                </h3>

                <p id={descriptionId}>
                    {message}
                </p>

                <div className={styles.actions}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        ref={cancelButtonRef}
                        type="button"
                    >
                        {cancelText}
                    </button>
                    <button
                        className={isDanger ? styles.dangerButton : styles.confirmButton}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        type="button"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
