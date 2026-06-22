"use client";

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import { Save } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { BasicInfoSection } from './components/BasicInfoSection';
import { PasswordSection } from './components/PasswordSection';
import { WithdrawalSection } from './components/WithdrawalSection';
import type { IdCheckMessage, ProfileUser } from './components/profileTypes';

export default function ProfilePage() {
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        companyName: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    // ID duplication check state
    const [isIdChecked, setIsIdChecked] = useState(true); // Default true if unchanged
    const [idCheckMessage, setIdCheckMessage] = useState<IdCheckMessage>(null);

    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info'; onClose?: () => void }>({
        isOpen: false,
        message: '',
        type: 'info'
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; isDanger?: boolean }>({
        isOpen: false,
        message: '',
        onConfirm: () => { },
        isDanger: false
    });

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', onClose?: () => void) => {
        setAlertConfig({ isOpen: true, message, type, onClose });
    };

    const closeAlert = () => {
        if (alertConfig.onClose) alertConfig.onClose();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    const showConfirm = (message: string, onConfirm: () => void, isDanger = false) => {
        setConfirmModal({ isOpen: true, message, onConfirm, isDanger });
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed: ProfileUser = JSON.parse(storedUser);

            // [CRITICAL FIX] If session is old and missing UID, force re-login to ensure UUID availability
            if (!parsed.uid) {
                showAlert('시스템 업데이트로 인해 보안 정보 갱신이 필요합니다.\n다시 로그인해주세요.', 'info', () => {
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                });
                return;
            }

            setUser(parsed);
            setFormData(prev => ({
                ...prev,
                id: parsed.id || '',
                name: parsed.name || '',
                companyName: parsed.companyName || ''
            }));
            setIsIdChecked(true); // Initial ID is valid
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'id') {
            if (value !== user?.id) {
                setIsIdChecked(false);
                setIdCheckMessage(null);
            } else {
                setIsIdChecked(true);
                setIdCheckMessage(null);
            }
        }
    };

    const handleCheckId = async () => {
        if (!formData.id) {
            setIdCheckMessage({ text: '아이디를 입력해주세요.', type: 'error' });
            return;
        }

        try {
            const res = await fetch('/api/users/check-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formData.id,
                    companyId: user?.companyId,
                    currentProfileId: user?.uid
                })
            });
            const data = await res.json();

            if (data.available) {
                setIsIdChecked(true);
                setIdCheckMessage({ text: data.message || '사용 가능한 아이디입니다.', type: 'success' });
            } else {
                setIsIdChecked(false);
                setIdCheckMessage({ text: data.message || '이미 사용 중인 아이디입니다.', type: 'error' });
            }
        } catch (error) {
            console.error('Check ID failed:', error);
            setIdCheckMessage({ text: '확인 중 오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (formData.id !== user.id && !isIdChecked) {
            showAlert('아이디 중복 확인을 해주세요.', 'error');
            return;
        }

        // Validation for password change
        if (formData.newPassword) {
            if (!formData.oldPassword) {
                showAlert('비밀번호를 변경하려면 기존 비밀번호를 입력해주세요.', 'error');
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                showAlert('새 비밀번호가 일치하지 않습니다.', 'error');
                return;
            }
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/user/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUuid: user.uid, // Explicitly target by UUID
                    currentId: user.id,
                    newId: formData.id !== user.id ? formData.id : undefined,
                    name: formData.name,
                    companyName: formData.companyName,
                    oldPassword: formData.newPassword ? formData.oldPassword : undefined,
                    newPassword: formData.newPassword || undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                showAlert('회원정보가 수정되었습니다.', 'success', () => {
                    const updatedUser = { ...data.user, uid: user.uid }; // Preserve UUID
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setUser(updatedUser);

                    // Reset password fields
                    setFormData(prev => ({
                        ...prev,
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                    }));

                    // If ID changed, logout
                    if (data.user.id !== user.id) {
                        showAlert('아이디가 변경되었습니다. 다시 로그인해주세요.', 'info', () => {
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                        });
                    } else {
                        window.location.reload();
                    }
                });

            } else {
                console.error('Update failed response:', data);
                showAlert(`수정 실패: ${data.error || JSON.stringify(data)}`, 'error');
            }

        } catch (error) {
            console.error('Update failed:', error);
            showAlert('오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return <div className={styles.container}>Loading...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2>개인정보 수정</h2>
                    <p>회원님의 정보를 안전하게 관리하고 업데이트하세요.</p>
                </div>

                <form onSubmit={handleSave} className={styles.form}>
                    <BasicInfoSection
                        user={user}
                        formData={formData}
                        idCheckMessage={idCheckMessage}
                        onChangeAction={handleChange}
                        onCheckIdAction={handleCheckId}
                        onUserChangedAction={setUser}
                    />
                    <PasswordSection formData={formData} onChangeAction={handleChange} />
                    <WithdrawalSection
                        user={user}
                        showAlertAction={showAlert}
                        showConfirmAction={showConfirm}
                    />

                    <div className={styles.actions}>
                        <button type="submit" className={styles.saveBtn} disabled={isLoading}>
                            <Save size={18} />
                            {isLoading ? '저장 중...' : '변경사항 저장'}
                        </button>
                    </div>
                </form>
            </div>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
            />
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
}
