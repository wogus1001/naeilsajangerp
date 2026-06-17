"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { createClient } from '@/utils/supabase/client';
import {
    getAdminUserRoleLabel,
    type AssignableAdminUserRole
} from './AdminUserRoleSelect';
import { AdminUserModals } from './AdminUserModals';
import { AdminUsersTable } from './AdminUsersTable';
import {
    approveAdminUser,
    deleteAdminUser,
    fetchAdminUsers,
    updateAdminUserRole,
    type AdminUserRow
} from './adminUsersRequests';
import { adminUsersStyles as styles } from './adminUsersStyles';

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

    // Alert & Confirm State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', title: '' });
    const showAlert = (message: string, title?: string) => {
        setAlertConfig({ isOpen: true, message, title: title || '알림' });
    };
    const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        onConfirm: () => { },
        isDanger: false
    });
    const showConfirm = (message: string, onConfirm: () => void, isDanger: boolean = false) => {
        setConfirmModal({ isOpen: true, message, onConfirm, isDanger });
    };

    useEffect(() => {
        // Auth check
        const userStr = localStorage.getItem('user');
        if (!userStr || JSON.parse(userStr).role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        fetchUsers();
    }, []);

    const getCurrentRequesterId = () => {
        const userStr = localStorage.getItem('user');
        const parsed: unknown = userStr ? JSON.parse(userStr) : {};
        const currentUser = typeof parsed === 'object' && parsed !== null && 'user' in parsed
            ? (parsed as { readonly user?: { readonly uid?: string; readonly id?: string } }).user
            : parsed as { readonly uid?: string; readonly id?: string };
        return currentUser?.uid || currentUser?.id || '';
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const requesterId = getCurrentRequesterId();
            setUsers([...(await fetchAdminUsers(requesterId))]);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            showAlert(error instanceof Error ? error.message : '회원 목록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = (user: AdminUserRow) => {
        showConfirm(`${user.name || user.id || '사용자'}님의 가입을 승인하시겠습니까?`, async () => {
            try {
                const requesterId = getCurrentRequesterId();
                await approveAdminUser(requesterId, user.uuid);
                showAlert('승인되었습니다.');
                fetchUsers();
            } catch (e) {
                console.error(e);
                showAlert(e instanceof Error ? e.message : '오류가 발생했습니다.');
            }
        });
    };

    const handleRoleChange = (user: AdminUserRow, role: AssignableAdminUserRole) => {
        if (role === user.role) return;

        const targetName = user.name || user.id || '사용자';
        showConfirm(`${targetName}님의 직급을 ${getAdminUserRoleLabel(role)}로 변경하시겠습니까?`, async () => {
            setUpdatingRoleUserId(user.uuid);
            try {
                const requesterId = getCurrentRequesterId();
                await updateAdminUserRole(requesterId, user.uuid, role);
                showAlert('직급이 변경되었습니다.');
                await fetchUsers();
            } catch (error) {
                console.error(error);
                showAlert(error instanceof Error ? `직급 변경 실패: ${error.message}` : '직급 변경 중 오류가 발생했습니다.');
            } finally {
                setUpdatingRoleUserId(null);
            }
        });
    };

    const handleDelete = async () => {
        if (!deleteTargetId) return;

        try {
            const requesterId = getCurrentRequesterId();
            await deleteAdminUser(requesterId, deleteTargetId);
            setDeleteTargetId(null);
            fetchUsers();
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? `삭제 실패: ${error.message}` : '삭제 중 오류 발생');
        }
    };

    // Derived state
    const pendingUsers = users.filter(u => u.status === 'pending_approval');
    const filteredUsers = activeTab === 'pending' ? pendingUsers : users;

    // --- PASSWORD RESET LOGIC ---
    const [resetTargetId, setResetTargetId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handlePasswordReset = async () => {
        if (!resetTargetId || !newPassword) return;
        if (newPassword.length < 6) {
            showAlert('비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        showConfirm('정말 이 사용자의 비밀번호를 변경하시겠습니까?', async () => {
            setResetLoading(true);
            try {
                // Get current session token
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                console.log('[DEBUG-CLIENT] Reset Password Token:', token ? 'Token exists' : 'Token missing');
                if (!token) {
                    showAlert('로그인 세션이 만료된 것 같습니다. 새로고침 후 다시 시도해주세요.');
                    setResetLoading(false);
                    return;
                }

                const res = await fetch('/api/admin/users/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId: resetTargetId,
                        newPassword: newPassword
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showAlert('비밀번호가 성공적으로 변경되었습니다.');
                    setResetTargetId(null);
                    setNewPassword('');
                } else {
                    console.error('Reset failed data:', data);
                    // Production-friendly message
                    showAlert(`변경 실패: ${data.error || '알 수 없는 오류가 발생했습니다.'}`);
                }
            } catch (e: unknown) {
                console.error('Password reset failed', e);
                showAlert('오류가 발생했습니다.');
            } finally {
                setResetLoading(false);
            }
        }, true);
    };

    if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>회원 및 권한 관리</h1>
                <p style={styles.subtitle}>사용자의 가입 승인, 등급 변경, 탈퇴 처리 및 비밀번호 재설정을 관리합니다.</p>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                <div
                    style={{ ...styles.tab, ...(activeTab === 'all' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('all')}
                >
                    전체 사용자
                    <span style={{ fontSize: '12px', color: '#adb5bd', fontWeight: 400 }}>{users.length}</span>
                </div>
                <div
                    style={{ ...styles.tab, ...(activeTab === 'pending' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('pending')}
                >
                    승인 대기
                    {pendingUsers.length > 0 && (
                        <span style={styles.badge}>{pendingUsers.length}</span>
                    )}
                </div>
            </div>

            <AdminUsersTable
                users={filteredUsers}
                updatingRoleUserId={updatingRoleUserId}
                onApprove={handleApprove}
                onRoleChange={handleRoleChange}
                onDelete={setDeleteTargetId}
                onResetPassword={(userId) => {
                    setResetTargetId(userId);
                    setNewPassword('');
                }}
            />

            <AdminUserModals
                deleteTargetId={deleteTargetId}
                resetTargetId={resetTargetId}
                newPassword={newPassword}
                resetLoading={resetLoading}
                onCancelDelete={() => setDeleteTargetId(null)}
                onConfirmDelete={() => void handleDelete()}
                onCancelReset={() => setResetTargetId(null)}
                onPasswordChange={setNewPassword}
                onConfirmReset={() => void handlePasswordReset()}
            />


            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                message={alertConfig.message}
                title={alertConfig.title}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                isDanger={confirmModal.isDanger}
            />
        </div>
    );
}
