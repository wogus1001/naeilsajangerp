import type { AdminMatchingRequest } from './types';
import styles from './page.module.css';

type MatchingRequestsTableProps = {
    readonly requests: readonly AdminMatchingRequest[];
};

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatManwon(value: string): string {
    if (!value.trim()) return '-';
    const number = Number(value.replace(/,/g, ''));
    if (!Number.isFinite(number)) return value;
    return `${new Intl.NumberFormat('ko-KR').format(number)}만원`;
}

function formatBudget(request: AdminMatchingRequest): string {
    if (request.totalBudget) return formatManwon(request.totalBudget);
    if (request.budgetMax !== null) {
        return `${new Intl.NumberFormat('ko-KR').format(Math.round(request.budgetMax / 10000))}만원`;
    }
    return '-';
}

function joinParts(parts: readonly string[]): string {
    return parts.map(part => part.trim()).filter(Boolean).join(' / ') || '-';
}

export function MatchingRequestsTable({ requests }: MatchingRequestsTableProps) {
    return (
        <section className={styles.panel}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>신청자</th>
                        <th>희망 업종/브랜드</th>
                        <th>예산/임대 조건</th>
                        <th>희망 지역</th>
                        <th>보유 물건</th>
                        <th>매칭 조건</th>
                        <th>내부 메모</th>
                        <th>담당/등록일</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(request => (
                        <tr key={request.id}>
                            <td>
                                <strong>{request.name}</strong>
                                <small>{joinParts([request.mobile, request.email])}</small>
                                <small>{joinParts([request.residence, request.currentJob])}</small>
                            </td>
                            <td>
                                <span>{request.desiredCategory || '-'}</span>
                                <small>{joinParts([request.interestedBrand, request.brandPreference])}</small>
                            </td>
                            <td>
                                <span>총예산 {formatBudget(request)}</span>
                                <small>{joinParts([
                                    request.ownCapital ? `자기자본 ${formatManwon(request.ownCapital)}` : '',
                                    request.loanPreference
                                ])}</small>
                                <small>{joinParts([
                                    request.desiredDeposit ? `보증금 ${formatManwon(request.desiredDeposit)}` : '',
                                    request.desiredRent ? `월세 ${formatManwon(request.desiredRent)}` : '',
                                    request.desiredPremium ? `권리금 ${formatManwon(request.desiredPremium)}` : ''
                                ])}</small>
                            </td>
                            <td>
                                <span>{request.desiredRegion || '-'}</span>
                                <small>{joinParts([
                                    request.excludedRegion ? `제외 ${request.excludedRegion}` : '',
                                    request.desiredSize ? `${request.desiredSize}평` : '',
                                    request.desiredFloor ? `${request.desiredFloor}층` : ''
                                ])}</small>
                            </td>
                            <td>
                                <span>{request.ownedPropertyStatus || '-'}</span>
                                <small>{joinParts([request.ownedPropertyName, request.ownedPropertyAddress])}</small>
                            </td>
                            <td>
                                <span>{joinParts([request.matchPriority, request.proposalRange])}</span>
                                <small>{request.urgency || '-'}</small>
                            </td>
                            <td>
                                <span>{request.summaryNote || request.memo || '-'}</span>
                                <small>{joinParts([request.riskMemo, request.nextAction])}</small>
                                <small>{joinParts([request.recommendedBrands, request.recommendedProperties])}</small>
                            </td>
                            <td>
                                <span>{request.managerName || '-'}</span>
                                <small>{formatDate(request.createdAt)}</small>
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && <tr><td colSpan={8} className={styles.emptyCell}>등록된 매칭 요청이 없습니다.</td></tr>}
                </tbody>
            </table>
        </section>
    );
}
