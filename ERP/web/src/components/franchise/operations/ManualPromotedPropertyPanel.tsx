import { ExternalLink, RefreshCw, Store } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { ManualPromotedOperationEntry } from '@/lib/manual-promoted-operations';

type ManualPromotedPropertyPanelProps = {
    readonly entries: readonly ManualPromotedOperationEntry[];
    readonly isLoading: boolean;
    readonly creatingPropertyId: string;
    readonly onRefresh: () => void;
    readonly onCreateLocation: (entry: ManualPromotedOperationEntry) => void;
};

function formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '-';
    const parsed = Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return String(value);
    return `${parsed.toLocaleString()}만 원`;
}

function propertyMeta(entry: ManualPromotedOperationEntry): string {
    const property = entry.property;
    return [
        property.address || property.region || '주소 미입력',
        property.floor ? `${property.floor}` : '',
        property.area ? `${property.area}` : ''
    ].filter(Boolean).join(' · ');
}

export function ManualPromotedPropertyPanel({
    entries,
    isLoading,
    creatingPropertyId,
    onRefresh,
    onCreateLocation
}: ManualPromotedPropertyPanelProps) {
    return (
        <div className={styles.locationMasterPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>외부 승격 물건지 운영 전환</h3>
                    <p>점포목록에서 수동 승격한 외부 상가를 운영점 마스터로 명시 등록합니다.</p>
                </div>
                <button className={styles.secondaryButton} onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw size={14} />
                    {isLoading ? '확인 중' : '승격 물건지 확인'}
                </button>
            </div>
            <div className={styles.locationList}>
                {entries.length === 0 ? (
                    <div className={styles.locationEmpty}>운영 전환할 수동 승격 물건지가 없습니다.</div>
                ) : entries.slice(0, 8).map(entry => (
                    <article key={entry.property.id} className={styles.locationItem}>
                        <div className={styles.locationItemMain}>
                            <strong>{entry.property.name || '외부 승격 물건지'}</strong>
                            <span>{propertyMeta(entry)}</span>
                            <small>
                                보증금 {formatCurrency(entry.property.deposit)}
                                {' · '}
                                월세 {formatCurrency(entry.property.monthlyRent)}
                                {entry.kind === 'linked' ? ` · 운영점 ${entry.location.name} 연결됨` : ' · 오픈준비 등록 대기'}
                            </small>
                        </div>
                        <div className={styles.locationItemActions}>
                            {entry.property.externalSourceUrl ? (
                                <a className={styles.secondaryButton} href={entry.property.externalSourceUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink size={14} />
                                    원문
                                </a>
                            ) : null}
                            {entry.kind === 'linked' ? (
                                <span className={styles.locationScanButton}>{entry.location.status || '연결됨'}</span>
                            ) : (
                                <button
                                    className={styles.primaryButton}
                                    onClick={() => onCreateLocation(entry)}
                                    disabled={creatingPropertyId === entry.property.id}
                                >
                                    <Store size={14} />
                                    {creatingPropertyId === entry.property.id ? '등록 중' : '운영점 등록'}
                                </button>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
