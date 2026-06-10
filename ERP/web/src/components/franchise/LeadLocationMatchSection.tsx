"use client";

import React from 'react';
import { MapPin, Target } from 'lucide-react';
import type { LeadLocationMatch } from '@/lib/franchise-lead-location-matching';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly matches: readonly LeadLocationMatch[];
    readonly isLoading: boolean;
};

export function LeadLocationMatchSection({ matches, isLoading }: Props) {
    return (
        <section className={styles.detailSection}>
            <h3><Target size={16} /> 점포·상권 매칭</h3>
            {isLoading ? (
                <div className={styles.locationMatchEmpty}>추천 후보지를 불러오고 있습니다.</div>
            ) : matches.length === 0 ? (
                <div className={styles.locationMatchEmpty}>희망지역이나 관심브랜드와 맞는 점포 후보가 아직 없습니다.</div>
            ) : (
                <div className={styles.locationMatchList}>
                    {matches.map(match => (
                        <article key={match.location.id} className={styles.locationMatchCard}>
                            <div className={styles.locationMatchHead}>
                                <div>
                                    <strong>{match.location.name}</strong>
                                    <span>{match.location.locationType || '구분 미지정'} · {match.location.status || '상태 미지정'}</span>
                                </div>
                                <b>{match.score}점</b>
                            </div>
                            <p><MapPin size={13} /> {match.location.address || match.location.region || '주소 미입력'}</p>
                            <div className={styles.locationMatchTags}>
                                {(match.reasons.length > 0 ? match.reasons : ['추천 근거 보강 필요']).slice(0, 4).map(reason => (
                                    <span key={reason}>{reason}</span>
                                ))}
                            </div>
                            {match.risks.length > 0 && (
                                <div className={styles.locationMatchRisks}>
                                    {match.risks.slice(0, 3).map(risk => (
                                        <span key={risk}>{risk}</span>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
