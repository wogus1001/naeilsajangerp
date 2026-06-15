"use client";

import type { MarketInsight } from '@/lib/franchise-market-insights';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type MarketInsightOverviewProps = {
    readonly marketInsights: readonly MarketInsight[];
};

function formatBudgetManwon(value: number | null) {
    if (value === null) return '-';
    return `${value.toLocaleString()}만원`;
}

export function MarketInsightOverview({
    marketInsights
}: MarketInsightOverviewProps) {
    return (
        <>
            {marketInsights.length === 0 ? (
                <div className={styles.marketEmpty}>
                    희망지역이 있는 후보자나 주소가 있는 출점 후보지가 쌓이면 지역별 인사이트가 표시됩니다.
                </div>
            ) : (
                <div className={styles.marketInsightTableWrap}>
                    <table className={styles.marketInsightTable}>
                        <thead>
                            <tr>
                                <th>지역</th>
                                <th>리드</th>
                                <th>즉시상담</th>
                                <th>계약권</th>
                                <th>내부점포</th>
                                <th>평균예산</th>
                                <th>경쟁업체</th>
                                <th>마케팅</th>
                                <th>경쟁</th>
                                <th>추천 액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marketInsights.map(item => (
                                <tr key={item.region}>
                                    <td>
                                        <strong>{item.region}</strong>
                                        <small>유입 {item.sourceCount.toLocaleString()}채널</small>
                                    </td>
                                    <td>{item.leadCount.toLocaleString()}</td>
                                    <td>{item.hotCount.toLocaleString()}</td>
                                    <td>{item.contractCount.toLocaleString()}</td>
                                    <td>{item.propertyCount.toLocaleString()}</td>
                                    <td>{formatBudgetManwon(item.avgBudgetManwon)}</td>
                                    <td>{item.externalCompetitorCount.toLocaleString()}</td>
                                    <td><div className={styles.scorePill}>{item.marketingScore}</div></td>
                                    <td>
                                        <div className={item.competitionScore >= 70 ? styles.scorePillWarn : styles.scorePill}>
                                            {item.competitionScore}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={
                                            item.tone === 'good'
                                                ? styles.marketActionGood
                                                : item.tone === 'warning'
                                                    ? styles.marketActionWarn
                                                    : styles.marketActionNeutral
                                        }>
                                            {item.action}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className={styles.marketRoadmap}>
                <strong>다음 확장</strong>
                <span>후보자-후보지 추천 매칭</span>
                <span>Naver 검색 트렌드</span>
                <span>Meta 광고 성과는 HOLD 해제 후 연결</span>
            </div>
        </>
    );
}
