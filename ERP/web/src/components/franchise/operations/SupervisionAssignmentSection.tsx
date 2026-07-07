'use client';

import React from 'react';
import {
    buildStoreAssignmentRows,
    buildSupervisorAssignmentRows,
    type StoreAssignmentRow,
    type SupervisorAssignmentRow
} from '@/lib/franchise-supervision-assignments';
import { getUserRoleLabel } from '@/lib/user-role-policy';
import type { SupervisionAssignment, SupervisionPayload } from './supervisionTypes';
import type { AssignmentFormState, AssignmentPaginationState } from './SupervisionAssignmentTypes';
import {
    StoreAssignmentTable,
    SupervisorAssignmentTable
} from './SupervisionAssignmentTables';
import { formatSupervisorOptionLabel, getDuplicateSupervisorNames } from './supervisorDisplay';
import styles from './SupervisionPanel.module.css';

type AssignmentViewMode = 'store' | 'supervisor';
type AssignmentStatusFilter = 'all' | 'assigned' | 'unassigned';
const ASSIGNMENT_PAGE_SIZE = 8;

export function SupervisionAssignmentSection(props: {
    readonly data: SupervisionPayload;
    readonly form: AssignmentFormState;
    readonly selectedAssignmentId: string;
    readonly selectedLocationId: string;
    readonly disabled: boolean;
    readonly onChange: (form: AssignmentFormState) => void;
    readonly onEdit: (assignment: SupervisionAssignment) => void;
    readonly onPrepareLocation: (locationId: string) => void;
    readonly onReset: () => void;
    readonly onSubmit: () => void;
}) {
    const [viewMode, setViewMode] = React.useState<AssignmentViewMode>('store');
    const [supervisorFilter, setSupervisorFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState<AssignmentStatusFilter>('all');
    const [query, setQuery] = React.useState('');
    const [page, setPage] = React.useState(1);
    const storeRows = React.useMemo(() => buildStoreAssignmentRows(props.data), [props.data]);
    const supervisorRows = React.useMemo(() => buildSupervisorAssignmentRows(props.data), [props.data]);
    const duplicateSupervisorNames = React.useMemo(() => getDuplicateSupervisorNames(props.data.supervisors), [props.data.supervisors]);
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    const visibleStoreRows = filterStoreRows({ rows: storeRows, supervisorFilter, statusFilter, query: normalizedQuery });
    const visibleSupervisorRows = filterSupervisorRows({ rows: supervisorRows, supervisorFilter, query: normalizedQuery });
    const visibleRowCount = viewMode === 'store' ? visibleStoreRows.length : visibleSupervisorRows.length;
    const maxPage = Math.max(1, Math.ceil(visibleRowCount / ASSIGNMENT_PAGE_SIZE));
    const safePage = Math.min(page, maxPage);
    const pageStart = (safePage - 1) * ASSIGNMENT_PAGE_SIZE;
    const pagedStoreRows = visibleStoreRows.slice(pageStart, pageStart + ASSIGNMENT_PAGE_SIZE);
    const pagedSupervisorRows = visibleSupervisorRows.slice(pageStart, pageStart + ASSIGNMENT_PAGE_SIZE);
    const pagination: AssignmentPaginationState = {
        page: safePage,
        pageSize: ASSIGNMENT_PAGE_SIZE,
        total: visibleRowCount,
        onPrevious: () => setPage(current => Math.max(1, current - 1)),
        onNext: () => setPage(current => Math.min(maxPage, current + 1))
    };

    React.useEffect(() => {
        setPage(1);
    }, [normalizedQuery, statusFilter, supervisorFilter, viewMode]);

    return (
        <div className={styles.assignmentLayout}>
            <div className={styles.assignmentBoard}>
                <div className={styles.assignmentToolbar}>
                    <div className={styles.viewTabs}>
                        <button type="button" className={viewMode === 'store' ? styles.viewTabActive : styles.viewTab} onClick={() => setViewMode('store')}>
                            운영점별 보기
                        </button>
                        <button type="button" className={viewMode === 'supervisor' ? styles.viewTabActive : styles.viewTab} onClick={() => setViewMode('supervisor')}>
                            SV별 보기
                        </button>
                    </div>
                    <div className={styles.assignmentFilters}>
                        <input
                            type="search"
                            value={query}
                            placeholder="운영점, SV, 주소 검색"
                            onChange={event => setQuery(event.currentTarget.value)}
                        />
                        <select value={supervisorFilter} onChange={event => setSupervisorFilter(event.currentTarget.value)}>
                            <option value="all">전체 SV</option>
                            {props.data.supervisors.map(supervisor => (
                                <option key={supervisor.id} value={supervisor.id}>
                                    {formatSupervisorOptionLabel(supervisor, duplicateSupervisorNames)}
                                </option>
                            ))}
                        </select>
                        {viewMode === 'store' ? (
                            <select value={statusFilter} onChange={event => setStatusFilter(readStatusFilter(event.currentTarget.value))}>
                                <option value="all">전체 상태</option>
                                <option value="assigned">배정됨</option>
                                <option value="unassigned">미배정</option>
                            </select>
                        ) : null}
                    </div>
                </div>
                {viewMode === 'store' ? (
                    <StoreAssignmentTable
                        assignments={props.data.assignments}
                        canManage={props.data.canManage}
                        data={props.data}
                        disabled={props.disabled}
                        editorForm={props.form}
                        pagination={pagination}
                        rows={visibleStoreRows}
                        selectedAssignmentId={props.selectedAssignmentId}
                        selectedLocationId={props.selectedLocationId}
                        onChange={props.onChange}
                        onEdit={props.onEdit}
                        onPrepareLocation={props.onPrepareLocation}
                        onReset={props.onReset}
                        onSubmit={props.onSubmit}
                        pagedRows={pagedStoreRows}
                    />
                ) : (
                    <SupervisorAssignmentTable
                        duplicateSupervisorNames={duplicateSupervisorNames}
                        rows={pagedSupervisorRows}
                        pagination={pagination}
                    />
                )}
            </div>
        </div>
    );
}

function filterStoreRows(input: {
    readonly rows: readonly StoreAssignmentRow[];
    readonly supervisorFilter: string;
    readonly statusFilter: AssignmentStatusFilter;
    readonly query: string;
}): readonly StoreAssignmentRow[] {
    return input.rows.filter(row => {
        if (input.supervisorFilter !== 'all' && row.supervisorProfileId !== input.supervisorFilter) return false;
        if (input.statusFilter === 'assigned' && !row.assigned) return false;
        if (input.statusFilter === 'unassigned' && row.assigned) return false;
        if (!input.query) return true;
        return [row.locationName, row.brand, row.address, row.supervisorName].some(value => value.toLocaleLowerCase('ko-KR').includes(input.query));
    });
}

function filterSupervisorRows(input: {
    readonly rows: readonly SupervisorAssignmentRow[];
    readonly supervisorFilter: string;
    readonly query: string;
}): readonly SupervisorAssignmentRow[] {
    return input.rows.filter(row => {
        if (input.supervisorFilter !== 'all' && row.supervisorProfileId !== input.supervisorFilter) return false;
        if (!input.query) return true;
        return [
            row.supervisorName,
            row.role,
            getUserRoleLabel(row.role),
            row.loginId,
            row.email,
            ...row.storeNames
        ].some(value => value.toLocaleLowerCase('ko-KR').includes(input.query));
    });
}

function readStatusFilter(value: string): AssignmentStatusFilter {
    if (value === 'assigned' || value === 'unassigned') return value;
    return 'all';
}
