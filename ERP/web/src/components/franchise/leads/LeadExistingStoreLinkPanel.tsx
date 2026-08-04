"use client";

import React from 'react';
import { Link2, Store } from 'lucide-react';
import { getExistingContractStoreLinkError } from '@/lib/franchise-contract-store';
import type { FranchiseLocation } from './types';
import styles from './LeadContractStoreSection.module.css';

type LeadExistingStoreLinkPanelProps = {
    readonly leadId: string;
    readonly locations: readonly FranchiseLocation[];
    readonly isBusy: boolean;
    readonly onLinkAction: (locationId: string) => void;
};

function formatStoreOption(location: FranchiseLocation): string {
    return [
        location.name || '이름 미등록',
        location.brand || '브랜드 미지정',
        location.region || location.address || '지역 미지정',
        location.status || '상태 미지정'
    ].join(' · ');
}

export function LeadExistingStoreLinkPanel({
    leadId,
    locations,
    isBusy,
    onLinkAction
}: LeadExistingStoreLinkPanelProps) {
    const options = React.useMemo(
        () => locations.filter(location => !getExistingContractStoreLinkError(location, leadId)),
        [leadId, locations]
    );
    const [selectedLocationId, setSelectedLocationId] = React.useState('');

    React.useEffect(() => {
        if (selectedLocationId && !options.some(location => location.id === selectedLocationId)) {
            setSelectedLocationId('');
        }
    }, [options, selectedLocationId]);

    return (
        <div className={styles.existingStorePanel}>
            <div className={styles.existingStoreHeading}>
                <span className={styles.existingStoreIcon}><Store size={16} /></span>
                <div>
                    <strong>기존 가맹점 목록에서 연결</strong>
                    <p>이미 등록된 가맹점은 새로 만들지 않고 이 계약 점주와 바로 연결합니다.</p>
                </div>
                <span className={styles.existingStoreCount}>{options.length}건 선택 가능</span>
            </div>

            {options.length > 0 ? (
                <div className={styles.existingStoreControls}>
                    <label>
                        가맹점 선택
                        <select
                            value={selectedLocationId}
                            onChange={(event) => setSelectedLocationId(event.target.value)}
                            disabled={isBusy}
                        >
                            <option value="">연결할 가맹점을 선택해주세요.</option>
                            {options.map(location => (
                                <option key={location.id} value={location.id}>
                                    {formatStoreOption(location)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => onLinkAction(selectedLocationId)}
                        disabled={isBusy || !selectedLocationId}
                    >
                        <Link2 size={15} />
                        선택 가맹점 연결
                    </button>
                </div>
            ) : (
                <div className={styles.empty}>연결 가능한 가맹점이 없습니다. 아래에서 새 가맹점을 만들어주세요.</div>
            )}
        </div>
    );
}
