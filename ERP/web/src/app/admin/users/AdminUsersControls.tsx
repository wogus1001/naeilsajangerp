"use client";

import {
    parseAdminUserRoleFilter,
    parseAdminUserSortDirection,
    parseAdminUserSortKey,
    parseAdminUserStatusFilter,
    type AdminUserRoleFilter,
    type AdminUserSortDirection,
    type AdminUserSortKey,
    type AdminUserStatusFilter
} from './adminUsersTableState';
import { adminUsersStyles as styles } from './adminUsersStyles';

type AdminUsersControlsProps = {
    readonly totalCount: number;
    readonly pendingCount: number;
    readonly query: string;
    readonly statusFilter: AdminUserStatusFilter;
    readonly roleFilter: AdminUserRoleFilter;
    readonly companyFilter: string;
    readonly sortKey: AdminUserSortKey;
    readonly sortDirection: AdminUserSortDirection;
    readonly companyOptions: readonly string[];
    readonly onQueryChange: (value: string) => void;
    readonly onStatusFilterChange: (value: AdminUserStatusFilter) => void;
    readonly onRoleFilterChange: (value: AdminUserRoleFilter) => void;
    readonly onCompanyFilterChange: (value: string) => void;
    readonly onSortKeyChange: (value: AdminUserSortKey) => void;
    readonly onSortDirectionChange: (value: AdminUserSortDirection) => void;
};

type AdminUsersPaginationProps = {
    readonly filteredCount: number;
    readonly visibleCount: number;
    readonly page: number;
    readonly pageCount: number;
    readonly pageSize: number;
    readonly onPageChange: (value: number) => void;
    readonly onPageSizeChange: (value: number) => void;
};

export function AdminUsersControls({
    totalCount,
    pendingCount,
    query,
    statusFilter,
    roleFilter,
    companyFilter,
    sortKey,
    sortDirection,
    companyOptions,
    onQueryChange,
    onStatusFilterChange,
    onRoleFilterChange,
    onCompanyFilterChange,
    onSortKeyChange,
    onSortDirectionChange
}: AdminUsersControlsProps) {
    return (
        <>
            <div style={styles.tabContainer}>
                <button
                    style={{ ...styles.tab, ...(statusFilter === 'all' ? styles.activeTab : {}) }}
                    type="button"
                    onClick={() => onStatusFilterChange('all')}
                >
                    전체 사용자
                    <span style={{ fontSize: '12px', color: '#adb5bd', fontWeight: 400 }}>{totalCount}</span>
                </button>
                <button
                    style={{ ...styles.tab, ...(statusFilter === 'pending_approval' ? styles.activeTab : {}) }}
                    type="button"
                    onClick={() => onStatusFilterChange('pending_approval')}
                >
                    승인 대기
                    {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
                </button>
            </div>

            <div style={styles.toolbar}>
                <input
                    style={styles.searchInput}
                    type="search"
                    value={query}
                    onChange={event => onQueryChange(event.currentTarget.value)}
                    placeholder="이름, 로그인 ID, 이메일, 회사명 검색"
                />
                <select style={styles.filterSelect} value={statusFilter} onChange={event => onStatusFilterChange(parseAdminUserStatusFilter(event.currentTarget.value))}>
                    <option value="all">전체 상태</option>
                    <option value="active">활성</option>
                    <option value="pending_approval">승인대기</option>
                    <option value="blocked">차단됨</option>
                    <option value="empty">상태 없음</option>
                </select>
                <select style={styles.filterSelect} value={roleFilter} onChange={event => onRoleFilterChange(parseAdminUserRoleFilter(event.currentTarget.value))}>
                    <option value="all">전체 권한</option>
                    <option value="admin">관리자</option>
                    <option value="manager">팀장</option>
                    <option value="sub_manager">매니저</option>
                    <option value="partner_vendor">협력업체</option>
                    <option value="staff">직원</option>
                    <option value="empty">권한 없음</option>
                </select>
                <select style={styles.filterSelect} value={companyFilter} onChange={event => onCompanyFilterChange(event.currentTarget.value)}>
                    <option value="">전체 회사</option>
                    {companyOptions.map(companyName => (
                        <option key={companyName} value={companyName}>{companyName}</option>
                    ))}
                </select>
                <select style={styles.filterSelect} value={sortKey} onChange={event => onSortKeyChange(parseAdminUserSortKey(event.currentTarget.value))}>
                    <option value="joinedAt">가입일</option>
                    <option value="name">이름</option>
                    <option value="loginId">로그인 ID</option>
                    <option value="companyName">회사명</option>
                    <option value="role">권한</option>
                    <option value="status">상태</option>
                </select>
                <select style={styles.filterSelect} value={sortDirection} onChange={event => onSortDirectionChange(parseAdminUserSortDirection(event.currentTarget.value))}>
                    <option value="desc">내림차순</option>
                    <option value="asc">오름차순</option>
                </select>
            </div>
        </>
    );
}

export function AdminUsersPagination({
    filteredCount,
    visibleCount,
    page,
    pageCount,
    pageSize,
    onPageChange,
    onPageSizeChange
}: AdminUsersPaginationProps) {
    return (
        <div style={styles.pagination}>
            <span style={styles.pageInfo}>
                {filteredCount.toLocaleString('ko-KR')}명 중 {visibleCount.toLocaleString('ko-KR')}명 표시
            </span>
            <div style={styles.pageControls}>
                <select style={styles.pageSizeSelect} value={pageSize} onChange={event => onPageSizeChange(Number(event.currentTarget.value))}>
                    <option value={10}>10명씩</option>
                    <option value={20}>20명씩</option>
                    <option value={50}>50명씩</option>
                </select>
                <button style={styles.pageButton} type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
                    이전
                </button>
                <span style={styles.pageNumber}>{page} / {pageCount}</span>
                <button style={styles.pageButton} type="button" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page === pageCount}>
                    다음
                </button>
            </div>
        </div>
    );
}
