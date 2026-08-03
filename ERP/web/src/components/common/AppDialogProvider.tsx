'use client';

import React from 'react';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { createAppDialogQueue, type AppDialogQueue } from './appDialogQueue';

export type AppAlertOptions = {
    readonly message: string;
    readonly title?: string;
    readonly type?: 'success' | 'error' | 'info';
    readonly buttonText?: string;
};

export type AppConfirmOptions = {
    readonly message: string;
    readonly title?: string;
    readonly confirmText?: string;
    readonly cancelText?: string;
    readonly isDanger?: boolean;
};

type AppDialogContextValue = {
    readonly isDialogOpen: boolean;
    readonly showAlert: (options: string | AppAlertOptions) => Promise<void>;
    readonly showConfirm: (options: string | AppConfirmOptions) => Promise<boolean>;
};

type DialogRequest =
    | { readonly kind: 'alert'; readonly options: AppAlertOptions; readonly resolve: (result: boolean) => void }
    | { readonly kind: 'confirm'; readonly options: AppConfirmOptions; readonly resolve: (result: boolean) => void };

const AppDialogContext = React.createContext<AppDialogContextValue | null>(null);

function alertOptions(value: string | AppAlertOptions): AppAlertOptions {
    return typeof value === 'string' ? { message: value } : value;
}

function confirmOptions(value: string | AppConfirmOptions): AppConfirmOptions {
    return typeof value === 'string' ? { message: value } : value;
}

export function AppDialogProvider({ children }: { readonly children: React.ReactNode }) {
    const [activeDialog, setActiveDialog] = React.useState<DialogRequest | null>(null);
    const dialogQueueRef = React.useRef<AppDialogQueue<DialogRequest> | null>(null);
    const confirmAcceptedRef = React.useRef(false);

    if (dialogQueueRef.current === null) {
        dialogQueueRef.current = createAppDialogQueue<DialogRequest>(setActiveDialog);
    }

    const closeActiveDialog = React.useCallback((result: boolean) => {
        confirmAcceptedRef.current = false;
        dialogQueueRef.current?.resolveActive(result);
    }, []);

    const showAlert = React.useCallback((value: string | AppAlertOptions) => {
        return new Promise<void>(resolve => {
            dialogQueueRef.current?.enqueue({
                kind: 'alert',
                options: alertOptions(value),
                resolve: () => resolve()
            });
        });
    }, []);

    const showConfirm = React.useCallback((value: string | AppConfirmOptions) => {
        return new Promise<boolean>(resolve => {
            dialogQueueRef.current?.enqueue({
                kind: 'confirm',
                options: confirmOptions(value),
                resolve
            });
        });
    }, []);

    React.useEffect(() => () => {
        dialogQueueRef.current?.dispose();
    }, []);

    const contextValue = React.useMemo(
        () => ({ isDialogOpen: activeDialog !== null, showAlert, showConfirm }),
        [activeDialog, showAlert, showConfirm]
    );

    return (
        <AppDialogContext.Provider value={contextValue}>
            {children}
            <AlertModal
                buttonText={activeDialog?.kind === 'alert' ? activeDialog.options.buttonText : undefined}
                isOpen={activeDialog?.kind === 'alert'}
                message={activeDialog?.kind === 'alert' ? activeDialog.options.message : ''}
                onClose={() => closeActiveDialog(false)}
                title={activeDialog?.kind === 'alert' ? activeDialog.options.title : undefined}
                type={activeDialog?.kind === 'alert' ? activeDialog.options.type : undefined}
            />
            <ConfirmModal
                cancelText={activeDialog?.kind === 'confirm' ? activeDialog.options.cancelText : undefined}
                confirmText={activeDialog?.kind === 'confirm' ? activeDialog.options.confirmText : undefined}
                isDanger={activeDialog?.kind === 'confirm' ? activeDialog.options.isDanger : undefined}
                isOpen={activeDialog?.kind === 'confirm'}
                message={activeDialog?.kind === 'confirm' ? activeDialog.options.message : ''}
                onClose={() => closeActiveDialog(confirmAcceptedRef.current)}
                onConfirm={() => { confirmAcceptedRef.current = true; }}
                title={activeDialog?.kind === 'confirm' ? activeDialog.options.title : undefined}
            />
        </AppDialogContext.Provider>
    );
}

export function useAppDialog(): AppDialogContextValue {
    const context = React.useContext(AppDialogContext);
    if (!context) throw new Error('useAppDialog must be used within AppDialogProvider');
    return context;
}
