import styles from './page.module.css';

export function ProductPreview() {
    return (
        <section className={styles.preview} aria-label="제품 화면 미리보기">
            <div className={styles.previewTopbar}>
                <strong>상태별 모객 파이프라인</strong>
                <span>오늘 처리 기준</span>
            </div>
            <div className={styles.previewStats}>
                <PreviewStat label="문의접수" value="128" />
                <PreviewStat label="상담중" value="42" />
                <PreviewStat label="계약예정" value="9" />
            </div>
            <div className={styles.previewBody}>
                <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}>
                        <strong>모객 상태 추적</strong>
                        <span>병목 확인</span>
                    </div>
                    <PreviewRow name="문의접수" meta="광고·박람회 유입 DB" progress="100%" />
                    <PreviewRow name="상담중" meta="담당자 후속 연락 관리" progress="72%" />
                    <PreviewRow name="입지검토" meta="희망지역·후보지 연결" progress="48%" />
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
