"use client";

import { CheckCircle, Key, Trash2 } from 'lucide-react';
import {
    AdminUserRoleSelect,
    type AssignableAdminUserRole
} from './AdminUserRoleSelect';
import { adminUsersStyles as styles } from './adminUsersStyles';
import type { AdminUserRow } from './adminUsersRequests';

type AdminUsersTableProps = {
    readonly users: readonly AdminUserRow[];
    readonly updatingRoleUserId: string | null;
    readonly onApprove: (user: AdminUserRow) => void;
    readonly onRoleChange: (user: AdminUserRow, role: AssignableAdminUserRole) => void;
    readonly onDelete: (userId: string) => void;
    readonly onResetPassword: (userId: string) => void;
};

function getStatusBadge(status: string | null) {
    switch (status) {
        case 'active':
            return <span style={{ ...styles.statusBadge, backgroundColor: '#e6fcf5', color: '#0ca678' }}>활성</span>;
        case 'pending_approval':
            return <span style={{ ...styles.statusBadge, backgroundColor: '#fff9db', color: '#f08c00' }}>승인대기</span>;
        case 'blocked':
            return <span style={{ ...styles.statusBadge, backgroundColor: '#fff5f5', color: '#fa5252' }}>차단됨</span>;
        default:
            return <span style={{ ...styles.statusBadge, backgroundColor: '#f8f9fa', color: '#868e96' }}>-</span>;
    }
}

function formatJoinedDate(value: string | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
}

function displayLoginId(user: AdminUserRow): string {
    return user.loginId || user.id || '-';
}

export function AdminUsersTable({
    users,
    updatingRoleUserId,
    onApprove,
    onRoleChange,
    onDelete,
    onResetPassword
}: AdminUsersTableProps) {
    return (
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>사용자 정보</th>
                        <th style={styles.th}>소속 회사</th>
                        <th style={styles.th}>직급/권한</th>
                        <th style={styles.th}>상태</th>
                        <th style={styles.th}>가입일</th>
                        <th style={styles.th}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length > 0 ? users.map(user => (
                        <tr key={user.uuid} style={styles.tr}>
                            <td style={styles.td}>
                                <div style={{ fontWeight: 'bold', color: '#343a40' }}>{user.name || '-'}</div>
                                <div style={{ fontSize: '12px', color: '#495057' }}>로그인 ID: {displayLoginId(user)}</div>
                                <div style={{ fontSize: '12px', color: '#868e96' }}>{user.id || '-'}</div>
                            </td>
                            <td style={styles.td}>{user.companyName || '-'}</td>
                            <td style={styles.td}>
                                <AdminUserRoleSelect
                                    role={user.role}
                                    userName={user.name || user.id || '사용자'}
                                    isUpdating={updatingRoleUserId === user.uuid}
                                    onChange={role => onRoleChange(user, role)}
                                />
                            </td>
                            <td style={styles.td}>{getStatusBadge(user.status)}</td>
                            <td style={styles.td}>
                                <span style={{ color: '#868e96', fontSize: '13px' }}>{formatJoinedDate(user.joinedAt)}</span>
                            </td>
                            <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {user.status === 'pending_approval' && (
                                        <button style={{ ...styles.actionBtn, ...styles.approveBtn }} onClick={() => onApprove(user)}>
                                            <CheckCircle size={14} /> 승인
                                        </button>
                                    )}
                                    <button
                                        style={{ ...styles.actionBtn, backgroundColor: '#f1f3f5', color: '#495057' }}
                                        onClick={() => onResetPassword(user.uuid)}
                                        title="비밀번호 변경"
                                    >
                                        <Key size={14} /> <span style={{ fontSize: '11px' }}>비번변경</span>
                                    </button>
                                    {user.role !== 'admin' && (
                                        <button
                                            style={{ ...styles.actionBtn, color: '#fa5252', backgroundColor: 'transparent' }}
                                            onClick={() => onDelete(user.uuid)}
                                            title="삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#adb5bd' }}>
                                데이터가 없습니다.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
