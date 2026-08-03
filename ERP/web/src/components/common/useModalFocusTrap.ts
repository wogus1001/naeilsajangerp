"use client";

import React from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not(:disabled)',
    'input:not(:disabled)',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

type ModalFocusTrapOptions = {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly dialogRef: React.RefObject<HTMLElement | null>;
    readonly initialFocusRef?: React.RefObject<HTMLElement | null>;
};

export function isElementInVisibleTree(element: HTMLElement): boolean {
    return element.closest('[hidden], [aria-hidden="true"]') === null;
}

function isTopModal(dialog: HTMLElement): boolean {
    const activeModals = Array.from(
        document.querySelectorAll<HTMLElement>(
            '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"]), [role="alertdialog"][aria-modal="true"]:not([aria-hidden="true"])'
        )
    ).filter(isElementInVisibleTree);
    return activeModals.at(-1) === dialog;
}

export function useModalFocusTrap({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef
}: ModalFocusTrapOptions) {
    const openerRef = React.useRef<HTMLElement | null>(null);
    const onCloseRef = React.useRef(onClose);
    React.useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    React.useEffect(() => {
        if (!isOpen) return;
        const dialog = dialogRef.current;
        if (!dialog) return;

        openerRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const focusFrame = window.requestAnimationFrame(() => {
            const initialFocus = initialFocusRef?.current
                ?? dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
                ?? dialog;
            initialFocus.focus();
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isTopModal(dialog)) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
                .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown, true);
            openerRef.current?.focus({ preventScroll: true });
        };
    }, [dialogRef, initialFocusRef, isOpen]);
}
