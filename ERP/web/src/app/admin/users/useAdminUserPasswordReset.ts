import React from 'react';
import { createClient } from '@/utils/supabase/client';

type UseAdminUserPasswordResetParams = {
    readonly showAlert: (message: string, title?: string) => void;
    readonly showConfirm: (message: string, onConfirm: () => void, isDanger?: boolean) => void;
};

export function useAdminUserPasswordReset({ showAlert, showConfirm }: UseAdminUserPasswordResetParams) {
    const [resetTargetId, setResetTargetId] = React.useState<string | null>(null);
    const [newPassword, setNewPassword] = React.useState('');
    const [resetLoading, setResetLoading] = React.useState(false);

    const handlePasswordReset = async () => {
        if (!resetTargetId || !newPassword) return;
        if (newPassword.length < 6) {
            showAlert('비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        showConfirm('정말 이 사용자의 비밀번호를 변경하시겠습니까?', async () => {
            setResetLoading(true);
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    showAlert('로그인 세션이 만료된 것 같습니다. 새로고침 후 다시 시도해주세요.');
                    setResetLoading(false);
                    return;
                }

                const response = await fetch('/api/admin/users/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId: resetTargetId,
                        newPassword
                    })
                });

                const data = await response.json() as { readonly error?: string };
                if (!response.ok) {
                    showAlert(`변경 실패: ${data.error || '알 수 없는 오류가 발생했습니다.'}`);
                    return;
                }

                showAlert('비밀번호가 성공적으로 변경되었습니다.');
                setResetTargetId(null);
                setNewPassword('');
            } catch (error) {
                console.error('Password reset failed', error instanceof Error ? error.message : String(error));
                showAlert('오류가 발생했습니다.');
            } finally {
                setResetLoading(false);
            }
        }, true);
    };

    return {
        resetTargetId,
        newPassword,
        resetLoading,
        setResetTargetId,
        setNewPassword,
        handlePasswordReset
    };
}
