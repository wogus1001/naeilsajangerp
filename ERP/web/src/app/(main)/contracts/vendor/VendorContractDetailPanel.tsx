"use client";

import React from 'react';
import { ArrowRight, FileClock, RotateCw, XCircle } from 'lucide-react';
import {
    canRenewContract,
    canTerminateContract,
    type VendorContract,
    type VendorContractEvent
} from './vendorContractsModel';
import styles from './vendorContractDetail.module.css';

export type RenewInput = {
    readonly contractTitle: string;
    readonly contractStartDate: string;
    readonly contractEndDate: string;
    readonly memo: string;
    readonly reason: string;
};

type Props = {
    readonly contract: VendorContract | null;
    readonly events: readonly VendorContractEvent[];
    readonly eventsLoading: boolean;
    readonly saving: boolean;
    readonly onClose: () => void;
    readonly onRenew: (input: RenewInput) => void;
    readonly onTerminate: (reason: string) => void;
};

function formatDateTime(value: string): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('ko-KR', {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function shortId(value: string): string {
    return value ? value.slice(0, 8) : '';
}

function defaultRenewInput(contract: VendorContract | null): RenewInput {
    return {
        contractEndDate: '',
        contractStartDate: contract?.contractEndDate || '',
        contractTitle: contract ? `${contract.contractTitle || '업체 계약'} 갱신` : '',
        memo: contract?.memo || '',
        reason: ''
    };
}

export function VendorContractDetailPanel({
    contract,
    events,
    eventsLoading,
    saving,
    onClose,
    onRenew,
    onTerminate
}: Props) {
    const [renewInput, setRenewInput] = React.useState<RenewInput>(() => defaultRenewInput(contract));
    const [terminateReason, setTerminateReason] = React.useState('');

    React.useEffect(() => {
        setRenewInput(defaultRenewInput(contract));
        setTerminateReason('');
    }, [contract]);

    if (!contract) {
        return (
            <section className={styles.panel}>
                <div className={styles.emptyDetail}>
                    <FileClock size={22} />
                    <strong>계약을 선택하세요</strong>
                    <span>목록에서 상세를 열면 갱신/종료 처리와 이력을 확인할 수 있습니다.</span>
                </div>
            </section>
        );
    }

    const renewEnabled = canRenewContract(contract);
    const terminateEnabled = canTerminateContract(contract);

    return (
        <section className={styles.panel}>
            <div className={styles.detailHeader}>
                <div>
                    <div className={styles.sectionTitle}><FileClock size={16} /> 계약 상세</div>
                    <p>{contract.vendorName} · {contract.categoryLabel}</p>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={onClose}>닫기</button>
            </div>

            <div className={styles.detailSummary}>
                <div><span>계약명</span><strong>{contract.contractTitle || '-'}</strong></div>
                <div><span>만료일</span><strong>{contract.contractEndDate || '-'}</strong></div>
                <div><span>D-day</span><strong>{contract.ddayLabel}</strong></div>
                <div><span>상태</span><strong>{contract.statusLabel}</strong></div>
            </div>

            <div className={styles.lifecycleGrid}>
                <form
                    className={styles.lifecycleBox}
                    onSubmit={event => {
                        event.preventDefault();
                        onRenew(renewInput);
                    }}
                >
                    <div className={styles.lifecycleTitle}><RotateCw size={15} /> 갱신 처리</div>
                    <label>새 계약명<input value={renewInput.contractTitle} onChange={event => setRenewInput({ ...renewInput, contractTitle: event.target.value })} /></label>
                    <div className={styles.twoColumns}>
                        <label>새 시작일<input type="date" value={renewInput.contractStartDate} onChange={event => setRenewInput({ ...renewInput, contractStartDate: event.target.value })} /></label>
                        <label>새 만료일<input type="date" value={renewInput.contractEndDate} onChange={event => setRenewInput({ ...renewInput, contractEndDate: event.target.value })} /></label>
                    </div>
                    <label>갱신 사유<textarea rows={2} value={renewInput.reason} onChange={event => setRenewInput({ ...renewInput, reason: event.target.value })} placeholder="예: 단가 갱신, 계약 기간 연장" /></label>
                    <label>새 계약 메모<textarea rows={2} value={renewInput.memo} onChange={event => setRenewInput({ ...renewInput, memo: event.target.value })} /></label>
                    <button className={styles.primaryButton} type="submit" disabled={saving || !renewEnabled}>
                        갱신완료 처리
                    </button>
                    {!renewEnabled && <p className={styles.helperText}>이미 종료되었거나 보관된 계약입니다.</p>}
                </form>

                <form
                    className={styles.lifecycleBox}
                    onSubmit={event => {
                        event.preventDefault();
                        onTerminate(terminateReason);
                    }}
                >
                    <div className={styles.lifecycleTitle}><XCircle size={15} /> 종료/해지 처리</div>
                    <label>처리 사유<textarea rows={5} value={terminateReason} onChange={event => setTerminateReason(event.target.value)} placeholder="예: 업체 변경, 계약 만료 후 미갱신" /></label>
                    <button className={styles.dangerButton} type="submit" disabled={saving || !terminateEnabled}>
                        종료 처리
                    </button>
                    {!terminateEnabled && <p className={styles.helperText}>이미 갱신완료, 종료 또는 보관된 계약입니다.</p>}
                </form>
            </div>

            <div className={styles.eventSection}>
                <div className={styles.statusLine}>
                    <div className={styles.sectionTitle}>처리 이력</div>
                    <span>{eventsLoading ? '불러오는 중' : `${events.length.toLocaleString('ko-KR')}건`}</span>
                </div>
                <div className={styles.eventList}>
                    {events.map(event => (
                        <div className={styles.eventItem} key={event.id}>
                            <div>
                                <strong>{event.eventLabel}</strong>
                                <span>{formatDateTime(event.createdAt)}</span>
                            </div>
                            {(event.previousStatusLabel || event.nextStatusLabel) && (
                                <p>
                                    {event.previousStatusLabel || '-'}
                                    <ArrowRight size={13} />
                                    {event.nextStatusLabel || '-'}
                                </p>
                            )}
                            {event.nextContractId && <small>연결 계약 {shortId(event.nextContractId)}</small>}
                            {event.reason && <small>{event.reason}</small>}
                        </div>
                    ))}
                    {!eventsLoading && events.length === 0 && <div className={styles.emptySmall}>아직 처리 이력이 없습니다.</div>}
                </div>
            </div>
        </section>
    );
}
