import {
    formatLocationMoney,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData
} from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { FranchiseLocation } from './locationMasterTypes';

type LocationMeetingToolSummaryCardsProps = {
    readonly location: FranchiseLocation;
};

export function LocationMeetingToolSummaryCards({ location }: LocationMeetingToolSummaryCardsProps) {
    const data = normalizeFranchiseLocationMasterData(location);

    return (
        <section className={styles.meetingToolSummaryGrid}>
            <div>
                <span>브랜드</span>
                <strong>{location.brand || '미지정'}</strong>
            </div>
            <div>
                <span>입점비용</span>
                <strong>{formatLocationMoney(getAcquisitionCostTotal(data.cost))}</strong>
            </div>
            <div>
                <span>보증금 / 권리금</span>
                <strong>{formatLocationMoney(data.cost.deposit)} / {formatLocationMoney(data.cost.premium)}</strong>
            </div>
            <div>
                <span>월세 / 관리비</span>
                <strong>{formatLocationMoney(data.lease.monthlyRent)} / {formatLocationMoney(data.lease.maintenanceFee)}</strong>
            </div>
        </section>
    );
}
