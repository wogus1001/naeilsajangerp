export type ProfileUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly name?: string;
    readonly role?: string;
    readonly companyName?: string;
    readonly companyId?: string;
    readonly companyLogoUrl?: string | null;
};

export type ProfileFormData = {
    readonly id: string;
    readonly name: string;
    readonly companyName: string;
    readonly oldPassword: string;
    readonly newPassword: string;
    readonly confirmPassword: string;
};

export type IdCheckMessage = {
    readonly text: string;
    readonly type: 'success' | 'error';
} | null;

export type AlertType = 'success' | 'error' | 'info';

export type ShowAlert = (message: string, type?: AlertType, onClose?: () => void) => void;
export type ShowConfirm = (message: string, onConfirm: () => void, isDanger?: boolean) => void;
