'use client';

import React from 'react';
import { Pencil } from 'lucide-react';
import type {
    StoreAssignmentRow,
    SupervisorAssignmentRow
} from '@/lib/franchise-supervision-assignments';
import { AssignmentEditor } from './SupervisionAssignmentEditor';
import type { AssignmentFormState, AssignmentPaginationState } from './SupervisionAssignmentTypes';
import type { SupervisionAssignment, SupervisionPayload } from './supervisionTypes';
import styles from './SupervisionPanel.module.css';

export function StoreAssignmentTable(props: {
    readonly assignments: readonly SupervisionAssignment[];
    readonly canManage: boolean;
    readonly data: SupervisionPayload;
    readonly disabled: boolean;
    readonly editorForm: AssignmentFormState;
    readonly pagination: AssignmentPaginationState;
    readonly rows: readonly StoreAssignmentRow[];
    readonly pagedRows: readonly StoreAssignmentRow[];
    readonly selectedAssignmentId: string;
    readonly selectedLocationId: string;
    readonly onChange: (form: AssignmentFormState) => void;
    readonly onEdit: (assignment: SupervisionAssignment) => void;
    readonly onPrepareLocation: (locationId: string) => void;
    readonly onReset: () => void;
    readonly onSubmit: () => void;
}) {
    if (props.rows.length === 0) return <div className={styles.empty}>조건에 맞는 운영점 배정이 없습니다.</div>;
    return (
        <>
            <div className={styles.tableWrap}>
                <table className={styles.compactTable}>
                    <thead>
                        <tr>
                            <th>운영점</th>
                            <th>현재 SV</th>
                            <th>시작일</th>
                            <th>메모</th>
                            <th>상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.pagedRows.map(row => (
                            <React.Fragment key={row.locationId}>
                                <tr className={props.selectedLocationId === row.locationId ? styles.tableRowActive : undefined}>
                                    <td>
                                        <div className={styles.reportTitleCell}>
                                            <strong>{row.locationName}</strong>
                                            <small>{[row.brand, row.address].filter(Boolean).join(' · ') || '-'}</small>
                                        </div>
                                    </td>
                                    <td>{row.supervisorName}</td>
                                    <td>{row.assignedAt || '-'}</td>
                                    <td><span className={styles.mutedText}>{row.memo || '-'}</span></td>
                                    <td>
                                        <div className={styles.statusMeta}>
                                            <span className={row.assigned ? styles.badgeGreen : styles.badgeRed}>{row.assigned ? '배정됨' : '미배정'}</span>
                                            <small>이력 {row.historyCount.toLocaleString()}건</small>
                                        </div>
                                    </td>
                                    <td>
                                        {props.canManage ? (
                                            <button type="button" className={styles.secondaryButton} onClick={() => editStoreRow({ row, assignments: props.assignments, onEdit: props.onEdit, onPrepareLocation: props.onPrepareLocation })}>
                                                <Pencil size={13} /> {row.assigned ? '수정' : '배정'}
                                            </button>
                                        ) : (
                                            <span className={styles.mutedText}>-</span>
                                        )}
                                    </td>
                                </tr>
                                {props.canManage && props.selectedLocationId === row.locationId ? (
                                    <tr className={styles.expandedEditorRow}>
                                        <td colSpan={6}>
                                            <AssignmentEditor
                                                data={props.data}
                                                form={props.editorForm}
                                                isEditing={Boolean(props.selectedAssignmentId)}
                                                disabled={props.disabled}
                                                onChange={props.onChange}
                                                onReset={props.onReset}
                                                onSubmit={props.onSubmit}
                                            />
                                        </td>
                                    </tr>
                                ) : null}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <AssignmentPagination pagination={props.pagination} />
        </>
    );
}

export function SupervisorAssignmentTable(props: {
    readonly rows: readonly SupervisorAssignmentRow[];
    readonly pagination: AssignmentPaginationState;
}) {
    const { rows } = props;
    if (rows.length === 0) return <div className={styles.empty}>조건에 맞는 SV 배정이 없습니다.</div>;
    return (
        <>
            <div className={styles.tableWrap}>
                <table className={styles.compactTable}>
                    <thead>
                        <tr>
                            <th>SV</th>
                            <th>담당 운영점</th>
                            <th>배정 수</th>
                            <th>최근 시작일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.supervisorProfileId}>
                                <td>
                                    <div className={styles.reportTitleCell}>
                                        <strong>{row.supervisorName}</strong>
                                        <small>{row.role || '-'}</small>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.resultPills}>
                                        {row.storeNames.length > 0 ? row.storeNames.slice(0, 6).map(name => (
                                            <span key={name} className={styles.badgeBlue}>{name}</span>
                                        )) : <span className={styles.mutedText}>담당 운영점 없음</span>}
                                        {row.storeNames.length > 6 ? <span className={styles.badge}>외 {(row.storeNames.length - 6).toLocaleString()}개</span> : null}
                                    </div>
                                </td>
                                <td>{row.activeStoreCount.toLocaleString()}</td>
                                <td>{row.recentAssignedAt || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <AssignmentPagination pagination={props.pagination} />
        </>
    );
}

function editStoreRow(input: {
    readonly row: StoreAssignmentRow;
    readonly assignments: readonly SupervisionAssignment[];
    readonly onEdit: (assignment: SupervisionAssignment) => void;
    readonly onPrepareLocation: (locationId: string) => void;
}): void {
    const assignment = input.row.assignmentId ? input.assignments.find(candidate => candidate.id === input.row.assignmentId) : null;
    if (assignment) {
        input.onEdit(assignment);
        return;
    }
    input.onPrepareLocation(input.row.locationId);
}

function AssignmentPagination({ pagination }: { readonly pagination: AssignmentPaginationState }) {
    const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    return (
        <div className={styles.paginationBar}>
            <span>총 {pagination.total.toLocaleString()}건</span>
            <div className={styles.paginationControls}>
                <button type="button" className={styles.secondaryButton} disabled={pagination.page <= 1} onClick={pagination.onPrevious}>
                    이전
                </button>
                <strong>{pagination.page.toLocaleString()} / {maxPage.toLocaleString()}</strong>
                <button type="button" className={styles.secondaryButton} disabled={pagination.page >= maxPage} onClick={pagination.onNext}>
                    다음
                </button>
            </div>
        </div>
    );
}
