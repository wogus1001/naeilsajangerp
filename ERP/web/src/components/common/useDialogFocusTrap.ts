'use client';

import React from 'react';
import { useModalFocusTrap } from './useModalFocusTrap';

export function useDialogFocusTrap<T extends HTMLElement = HTMLElement>(
    open: boolean,
    onClose: () => void,
    initialFocusRef?: React.RefObject<HTMLElement | null>
) {
    const dialogRef = React.useRef<T>(null);
    useModalFocusTrap({
        dialogRef,
        initialFocusRef,
        isOpen: open,
        onClose
    });

    return dialogRef;
}
