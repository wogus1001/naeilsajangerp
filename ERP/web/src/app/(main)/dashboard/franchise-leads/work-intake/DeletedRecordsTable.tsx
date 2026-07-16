"use client";

import React from 'react';
import { Eye } from 'lucide-react';
import styles from './page.module.css';
import { WorkIntakeEditModal } from './WorkIntakeEditModal';
import { buildDeletedRecordEditTarget } from './deleted-record-edit-target';
import { buildDeletedRecordDetails, cleanText, formatDateTime } from './deleted-record-details';
import type { DeletedWorkIntakeItem } from './types';

type Props = {
    readonly records: readonly DeletedWorkIntakeItem[];
};

function DeletedRecordDetailModal({ record, onCloseAction }: {
    readonly record: DeletedWorkIntakeItem;
    readonly onCloseAction: () => void;
}) {
    const details = buildDeletedRecordDetails(record);
    const dialogRef = React.useRef<HTMLElement>(null);
    React.useEffect(() => {
        dialogRef.current?.focus();
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCloseAction();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onCloseAction]);
    return (
        <div className={styles.modalBackdrop} onMouseDown={event => {
            if (event.target === event.currentTarget) onCloseAction();
        }}>
            <section ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="deleted-record-title" tabIndex={-1}>
                <h2 id="deleted-record-title">삭제 항목 상세</h2>
                <p>{record.kindLabel} 삭제 시점에 저장된 내용을 확인합니다.</p>
                <dl className={styles.detailGrid}>
                    {details.map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                    {details.length === 0 && (
                        <div>
                            <dt>상세 내용</dt>
                            <dd>저장된 상세 스냅샷이 없습니다.</dd>
                        </div>
                    )}
                </dl>
                <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={onCloseAction}>닫기</button>
                </div>
            </section>
        </div>
    );
}

export function DeletedRecordsTable(props: Props) {
    const [selectedRecord, setSelectedRecord] = React.useState<DeletedWorkIntakeItem | null>(null);
    const selectedTarget = selectedRecord ? buildDeletedRecordEditTarget(selectedRecord) : null;

    return (
        <>
            <section className={styles.panel}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>유형</th>
                            <th>삭제된 항목</th>
                            <th>회사</th>
                            <th>삭제자</th>
                            <th>삭제일</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.records.map(record => (
                            <tr key={record.id}>
                                <td data-label="유형"><span>{record.kindLabel}</span></td>
                                <td data-label="삭제된 항목">
                                    <strong>{record.title}</strong>
                                    <small>{cleanText(record.summary) || '삭제 시점 요약이 없습니다.'}</small>
                                </td>
                                <td data-label="회사"><span>{record.companyName}</span></td>
                                <td data-label="삭제자"><span>{record.deletedByName}</span></td>
                                <td data-label="삭제일"><span>{formatDateTime(record.deletedAt)}</span></td>
                                <td data-label="관리">
                                    <button type="button" className={styles.actionButton} onClick={() => setSelectedRecord(record)}>
                                        <Eye size={14} /> 상세 확인
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {props.records.length === 0 && (
                            <tr><td colSpan={6} className={styles.emptyCell}>삭제된 진행현황이 없습니다.</td></tr>
                        )}
                    </tbody>
                </table>
            </section>
            {selectedRecord && selectedTarget && (
                <WorkIntakeEditModal
                    target={selectedTarget}
                    requesterId=""
                    isReadOnly
                    titleOverride={`삭제된 ${selectedRecord.kindLabel} 상세`}
                    description="삭제 시점에 저장된 전체 등록 내용입니다."
                    onCloseAction={() => setSelectedRecord(null)}
                    onSavedAction={() => undefined}
                    onErrorAction={() => undefined}
                />
            )}
            {selectedRecord && !selectedTarget && (
                <DeletedRecordDetailModal
                    record={selectedRecord}
                    onCloseAction={() => setSelectedRecord(null)}
                />
            )}
        </>
    );
}
