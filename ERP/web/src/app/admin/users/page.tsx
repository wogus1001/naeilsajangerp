"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
    getAdminUserRoleLabel,
    type AssignableAdminUserRole
} from './AdminUserRoleSelect';
import { AdminUsersControls, AdminUsersPagination } from './AdminUsersControls';
import { AdminUserModals } from './AdminUserModals';
import { AdminUsersPageHeader } from './AdminUsersPageHeader';
import { AdminUsersTable } from './AdminUsersTable';
import {
    approveAdminUser,
    deleteAdminUser,
    fetchAdminUsers,
    updateAdminUserRole,
    type AdminUserRow
} from './adminUsersRequests';
import { adminUsersStyles as styles } from './adminUsersStyles';
import { getRequesterId, getStoredUser } from '@/utils/userUtils';
import {
    countPendingAdminUsers,
    filterAndSortAdminUsers,
    getAdminUserCompanyOptions,
    pageAdminUsers,
    type AdminUserRoleFilter,
    type AdminUserSortDirection,
    type AdminUserSortKey,
    type AdminUserStatusFilter
} from './adminUsersTableState';
import { useAdminUserPasswordReset } from './useAdminUserPasswordReset';

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>('all');
    const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>('all');
    const [companyFilter, setCompanyFilter] = useState('');
    const [sortKey, setSortKey] = useState<AdminUserSortKey>('joinedAt');
    const [sortDirection, setSortDirection] = useState<AdminUserSortDirection>('desc');
    const [pageSize, setPageSize] = useState(20);
    const [page, setPage] = useState(1);
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
        const user = getStoredUser();
        if (user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        fetchUsers();
    }, []);

    const getCurrentRequesterId = () => getRequesterId(getStoredUser());

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
                await approveAdminUser(requesterId, user.uuid, user.id);
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
                await updateAdminUserRole(requesterId, user.uuid, role, user.id);
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

    const pendingCount = React.useMemo(() => countPendingAdminUsers(users), [users]);
    const companyOptions = React.useMemo(() => getAdminUserCompanyOptions(users), [users]);
    const filteredUsers = React.useMemo(() => filterAndSortAdminUsers(users, {
        query,
        status: statusFilter,
        role: roleFilter,
        company: companyFilter,
        sortKey,
        sortDirection
    }), [companyFilter, query, roleFilter, sortDirection, sortKey, statusFilter, users]);
    const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visibleUsers = pageAdminUsers(filteredUsers, currentPage, pageSize);

    useEffect(() => {
        setPage(1);
    }, [companyFilter, pageSize, query, roleFilter, sortDirection, sortKey, statusFilter]);

    const {
        resetTargetId,
        newPassword,
        resetLoading,
        setResetTargetId,
        setNewPassword,
        handlePasswordReset
    } = useAdminUserPasswordReset({ showAlert, showConfirm });

    if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={styles.container}>
            <AdminUsersPageHeader />

            <AdminUsersControls
                totalCount={users.length}
                pendingCount={pendingCount}
                query={query}
                statusFilter={statusFilter}
                roleFilter={roleFilter}
                companyFilter={companyFilter}
                sortKey={sortKey}
                sortDirection={sortDirection}
                companyOptions={companyOptions}
                onQueryChange={setQuery}
                onStatusFilterChange={setStatusFilter}
                onRoleFilterChange={setRoleFilter}
                onCompanyFilterChange={setCompanyFilter}
                onSortKeyChange={setSortKey}
                onSortDirectionChange={setSortDirection}
            />

            <AdminUsersTable
                users={visibleUsers}
                updatingRoleUserId={updatingRoleUserId}
                onApprove={handleApprove}
                onRoleChange={handleRoleChange}
                onDelete={setDeleteTargetId}
                onResetPassword={(userId) => {
                    setResetTargetId(userId);
                    setNewPassword('');
                }}
            />

            <AdminUsersPagination
                filteredCount={filteredUsers.length}
                visibleCount={visibleUsers.length}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
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
