'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    buttonText?: string;
}

export function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    buttonText = '확인'
}: AlertModalProps) {
    const dialogRef = React.useRef<HTMLDivElement>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement>(null);
    const onCloseRef = React.useRef(onClose);
    const titleId = React.useId();
    const descriptionId = React.useId();

    React.useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    React.useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements?.length) return;

            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-12 h-12 text-green-700 mx-auto mb-4" />;
            case 'error':
                return <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />;
            default:
                return <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />;
        }
    };

    const getTitle = () => {
        if (title) return title;
        switch (type) {
            case 'success': return '성공';
            case 'error': return '오류';
            default: return '알림';
        }
    };

    return (
        <div
            ref={dialogRef}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {getIcon()}

                <h3 id={titleId} className="text-lg font-bold text-gray-900 mb-2">
                    {getTitle()}
                </h3>

                <p id={descriptionId} className="text-gray-600 mb-6 whitespace-pre-wrap text-sm leading-relaxed">
                    {message}
                </p>

                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                        type === 'success' ? 'bg-green-700 hover:bg-green-800' :
                            'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
