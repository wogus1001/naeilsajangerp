"use client";

import { AlertTriangle, CheckCircle2, Clock3, UserRound, WalletCards } from 'lucide-react';
import type { VendorContractQueueItem, VendorContractQueueKey } from './vendorContractsModel';
import styles from './vendorContractQueue.module.css';

type Props = {
    readonly activeQueue: VendorContractQueueKey;
    readonly items: readonly VendorContractQueueItem[];
    readonly onSelect: (queue: VendorContractQueueKey) => void;
};

const QUEUE_ICONS: Readonly<Record<VendorContractQueueKey, typeof WalletCards>> = {
    all: WalletCards,
    expired: AlertTriangle,
    ownerless: UserRound,
    renewal: Clock3,
    terminal: CheckCircle2
};

export function VendorContractQueue({ activeQueue, items, onSelect }: Props) {
    return (
        <section className={styles.queuePanel} aria-label="업체 계약 업무 큐">
            {items.map(item => {
                const Icon = QUEUE_ICONS[item.key];
                return (
                    <button
                        aria-pressed={activeQueue === item.key}
                        className={`${styles.queueButton} ${activeQueue === item.key ? styles.queueButtonActive : ''}`}
                        key={item.key}
                        type="button"
                        onClick={() => onSelect(item.key)}
                    >
                        <Icon size={16} />
                        <span>{item.label}</span>
                        <strong>{item.count.toLocaleString('ko-KR')}</strong>
                    </button>
                );
            })}
        </section>
    );
}
