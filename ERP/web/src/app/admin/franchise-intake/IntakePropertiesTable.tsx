import React from 'react';
import { ArrowRight } from 'lucide-react';
import { syncAdminProperty } from './requests';
import type { AdminIntakeProperty } from './types';
import styles from './page.module.css';

type IntakePropertiesTableProps = {
    readonly properties: readonly AdminIntakeProperty[];
    readonly requesterId: string;
    readonly onPromoteAction: (property: AdminIntakeProperty) => void;
    readonly onSyncedAction: () => void;
    readonly onErrorAction: (message: string) => void;
};

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatPromotionTargets(names: readonly string[]): string {
    const visibleNames = names.map(name => name.trim()).filter(Boolean);
    if (visibleNames.length === 0) return '';
    if (visibleNames.length <= 2) return visibleNames.join(', ');
    return `${visibleNames.slice(0, 2).join(', ')} 외 ${visibleNames.length - 2}곳`;
}

export function IntakePropertiesTable({
    properties,
    requesterId,
    onPromoteAction,
    onSyncedAction,
    onErrorAction
}: IntakePropertiesTableProps) {
    const [syncingId, setSyncingId] = React.useState('');

    const handleSync = async (property: AdminIntakeProperty) => {
        if (!requesterId) return;
        setSyncingId(property.id);
        try {
            await syncAdminProperty({
                propertyId: property.id,
                requesterId,
                targetCompanyId: property.promotedCompanyId || undefined
            });
            onSyncedAction();
        } catch (error) {
            onErrorAction(error instanceof Error ? error.message : '출점 후보지 업데이트에 실패했습니다.');
        } finally {
            setSyncingId('');
        }
    };

    return (
        <section className={styles.panel}>
            <table className={styles.table}>
                <thead>
                    <tr><th>물건명</th><th>지역/주소</th><th>상태</th><th>등록일</th><th>후보지 반영</th><th>관리</th></tr>
                </thead>
                <tbody>
                    {properties.map(property => {
                        const promoted = property.promotionCount > 0;
                        const targetPromoted = Boolean(property.promotedLocationId);
                        const stale = targetPromoted && property.syncStatus === 'stale';
                        const promotionTargets = formatPromotionTargets(property.promotedCompanyNames);
                        return (
                            <tr key={property.id}>
                                <td><strong>{property.name}</strong><small>{property.companyName}</small><small>{property.operationType || '-'}</small></td>
                                <td><span>{property.region || '-'}</span><small>{property.address || '-'}</small></td>
                                <td>{property.status || '-'}</td>
                                <td>{formatDate(property.createdAt)}</td>
                                <td className={styles.promotionCell}>
                                    {stale && <span className={styles.staleBadge}>수정</span>}
                                    {!stale && targetPromoted && <span className={styles.doneBadge}>반영 완료</span>}
                                    {!stale && !targetPromoted && promoted && <span className={styles.doneBadge}>{property.promotionCount}곳 반영</span>}
                                    {!promoted && <span className={styles.waitBadge}>대기</span>}
                                    {promotionTargets && <small className={styles.promotionTargets}>{promotionTargets}</small>}
                                </td>
                                <td>
                                    {stale ? (
                                        <button className={styles.actionButton} onClick={() => void handleSync(property)} disabled={syncingId === property.id}>
                                            {syncingId === property.id ? '업데이트 중' : '업데이트'}
                                        </button>
                                    ) : (
                                        <button className={styles.actionButton} onClick={() => onPromoteAction(property)}>
                                            {promoted ? '추가 밀어넣기' : '밀어넣기'} <ArrowRight size={14} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {properties.length === 0 && <tr><td colSpan={6} className={styles.emptyCell}>등록된 물건이 없습니다.</td></tr>}
                </tbody>
            </table>
        </section>
    );
}
