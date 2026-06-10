"use client";

import { FileSearch } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { RealtyImportResult } from './types';
import { REALTY_REGION_OPTIONS } from './regions';

type FormProps = {
    readonly realtySido: string;
    readonly realtyDistrict: string;
    readonly realtyDistrictOptions: readonly string[];
    readonly isRealtyImporting: boolean;
    readonly importLimit: number;
    readonly onChangeSido: (value: string) => void;
    readonly onChangeDistrict: (value: string) => void;
    readonly onRunImport: () => void;
};

export function RealtyImportForm(props: FormProps) {
    return (
        <div className={styles.realtyImportForm}>
            <div className={styles.realtyRegionPicker}>
                <label>
                    시도
                    <select value={props.realtySido} onChange={(event) => props.onChangeSido(event.target.value)}>
                        {REALTY_REGION_OPTIONS.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}
                    </select>
                </label>
                <label>
                    시군구
                    <select value={props.realtyDistrict} onChange={(event) => props.onChangeDistrict(event.target.value)}>
                        {props.realtyDistrictOptions.map(district => <option key={district} value={district}>{district}</option>)}
                    </select>
                </label>
            </div>
            <div className={styles.realtySourceBox}>
                <span>수집 소스</span>
                <div><span className={styles.realtySourcePill}>당근 상가</span></div>
                <small>네이버부동산은 향후 고도화 예정입니다. 현재 MVP는 당근 상가 공개 목록만 저장합니다.</small>
                <small>1회 최대 {props.importLimit.toLocaleString()}건까지 저장합니다.</small>
            </div>
            <button className={styles.primaryButton} onClick={props.onRunImport} disabled={props.isRealtyImporting}>
                <FileSearch size={15} />
                {props.isRealtyImporting ? '수집 중' : '상가 수집 실행'}
            </button>
        </div>
    );
}

export function RealtyImportResultPanel({ result, selectedRegion }: {
    readonly result: RealtyImportResult | null;
    readonly selectedRegion: string;
}) {
    return (
        <div className={styles.realtyResultPanel}>
            <div className={styles.realtyResultHeader}>
                <div>
                    <strong>수집 결과</strong>
                    <span>{result?.job ? `${result.job.region} · ${result.job.status}` : '아직 실행 전'}</span>
                </div>
                <span className={styles.realtySourcePill}>{selectedRegion}</span>
            </div>
            <div className={styles.realtySummaryCards}>
                {[
                    ['수집', result?.job?.totalCount || 0],
                    ['신규수집', result?.job?.createdCount || 0],
                    ['업데이트', result?.job?.updatedCount || 0],
                    ['중복후보', result?.job?.duplicateCount || 0],
                    ['실패', result?.job?.failedCount || 0]
                ].map(([label, count]) => (
                    <article key={label}>
                        <span>{label}</span>
                        <strong>{Number(count).toLocaleString()}건</strong>
                    </article>
                ))}
            </div>
            {(result?.job?.warnings || []).length > 0 && (
                <div className={styles.realtyNotice}>
                    {(result?.job?.warnings || []).map((warning, index) => <span key={`${warning}-${index}`}>{warning}</span>)}
                </div>
            )}
            {(result?.job?.errors || []).length > 0 && (
                <div className={styles.realtyErrorNotice}>
                    {(result?.job?.errors || []).map((error, index) => (
                        <span key={`realty-error-${index}`}>{typeof error === 'string' ? error : error.message || '수집 오류'}</span>
                    ))}
                </div>
            )}
            <div className={styles.realtyResultEmpty}>
                {result?.job
                    ? '수집된 원본은 아래 저장된 상가 목록에 반영됩니다. 같은 매물은 중복 추가하지 않고 최신 정보만 갱신합니다.'
                    : '지역을 선택하고 상가 수집을 실행하면 수집 요약이 표시됩니다.'}
            </div>
        </div>
    );
}
