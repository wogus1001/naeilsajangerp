import styles from './page.module.css';

export function ProductPreview() {
    return (
        <section className={styles.preview} aria-label="제품 화면 미리보기">
            <div className={styles.previewTopbar}>
                <strong>본사 업무 대시보드</strong>
                <span>오늘 기준</span>
            </div>
            <div className={styles.previewStats}>
                <PreviewStat label="1차 유입 DB" value="128" />
                <PreviewStat label="가맹 희망자" value="42" />
                <PreviewStat label="계약 점주" value="9" />
            </div>
            <div className={styles.previewBody}>
                <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}>
                        <strong>모객 DB</strong>
                        <span>상담 진행</span>
                    </div>
                    <PreviewRow name="김민준" meta="광고 · 서울 송파구" progress="72%" />
                    <PreviewRow name="박서연" meta="박람회 · 대전 유성구" progress="48%" />
                    <PreviewRow name="이도윤" meta="소개 · 부산 해운대구" progress="64%" />
                </div>
                <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}>
                        <strong>계약 전 체크</strong>
                        <span>정보공개서 D-13</span>
                    </div>
                    <div className={styles.checkRow}><span />정보공개서 수령 확인</div>
                    <div className={styles.checkRow}><span />계약 가능일 확인</div>
                    <div className={styles.checkRow}><span />오픈 준비 전환</div>
                </div>
            </div>
        </section>
    );
}

function PreviewStat({ label, value }: { readonly label: string; readonly value: string }) {
    return (
        <div>
            <span>{label}</span>
            <strong>{value}건</strong>
        </div>
    );
}

function PreviewRow({ name, meta, progress }: { readonly name: string; readonly meta: string; readonly progress: string }) {
    return (
        <div className={styles.previewRow}>
            <div>
                <strong>{name}</strong>
                <span>{meta}</span>
            </div>
            <i style={{ width: progress }} />
        </div>
    );
}
