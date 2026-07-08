"use client";

import React from 'react';
import Link from 'next/link';
import styles from '../owner.module.css';
import {
    EMPTY_BASICS,
    OwnerPortalFrame,
    readOwnerApiData,
    type OwnerBasics,
    type OwnerDashboardData
} from './ownerPortalShared';

export function OwnerStorePage() {
    return (
        <OwnerPortalFrame activeKey="store">
            {(data, reload) => <OwnerStoreContent data={data} reload={reload} />}
        </OwnerPortalFrame>
    );
}

function OwnerStoreContent({ data, reload }: { readonly data: OwnerDashboardData; readonly reload: () => Promise<void> }) {
    const [basics, setBasics] = React.useState<OwnerBasics>(data.location.basics || EMPTY_BASICS);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        setBasics(data.location.basics || EMPTY_BASICS);
    }, [data.location.basics]);

    const updateBasics = (patch: Partial<OwnerBasics>) => setBasics(current => ({ ...current, ...patch }));

    const saveBasics = async () => {
        setIsSaving(true);
        setMessage('');
        setError('');
        try {
            await readOwnerApiData(await fetch('/api/owner/store-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(basics)
            }));
            setMessage('매장 정보가 본사에 전달됐습니다.');
            await reload();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '매장 정보를 저장하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <h1>내 매장</h1>
                    <p>계약, 오픈 준비, 정산에 필요한 기본 정보를 본사에 전달합니다.</p>
                </div>
                <div className={styles.actionRow}>
                    <Link className={styles.secondaryButton} href="/owner/change-password">비밀번호 변경</Link>
                    <button className={styles.button} type="button" disabled={isSaving} onClick={() => void saveBasics()}>
                        정보 저장
                    </button>
                </div>
            </div>
            <div className={styles.panelBody}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                <div className={styles.formGrid}>
                    <OwnerField label="사업자등록번호" value={basics.businessNumber} onChange={value => updateBasics({ businessNumber: value })} />
                    <OwnerField label="대표자명" value={basics.representativeName} onChange={value => updateBasics({ representativeName: value })} />
                    <OwnerField label="연락처" value={basics.contactPhone} onChange={value => updateBasics({ contactPhone: value })} />
                    <OwnerField label="보증금" value={basics.deposit} onChange={value => updateBasics({ deposit: value })} />
                    <OwnerField label="월세" value={basics.monthlyRent} onChange={value => updateBasics({ monthlyRent: value })} />
                    <OwnerField label="관리비" value={basics.maintenanceFee} onChange={value => updateBasics({ maintenanceFee: value })} />
                    <OwnerField label="평수" value={basics.areaSize} onChange={value => updateBasics({ areaSize: value })} />
                    <OwnerField label="테이블 수" value={basics.tableCount} onChange={value => updateBasics({ tableCount: value })} />
                    <OwnerField label="좌석 수" value={basics.seatCount} onChange={value => updateBasics({ seatCount: value })} />
                </div>
                <label className={styles.field}>
                    비고
                    <textarea className={styles.textarea} value={basics.memo} onChange={event => updateBasics({ memo: event.currentTarget.value })} />
                </label>
            </div>
        </section>
    );
}

function OwnerField({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void }) {
    return (
        <label className={styles.field}>
            {label}
            <input className={styles.input} value={value} onChange={event => onChange(event.currentTarget.value)} />
        </label>
    );
}
