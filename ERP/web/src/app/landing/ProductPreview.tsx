import styles from './page.module.css';

export function ProductPreview() {
    return (
        <section className={styles.preview} aria-label="제품 화면 미리보기">
            <div className={styles.previewTopbar}>
                <strong>본부 구축 운영 보드</strong>
                <span>샘플 데이터</span>
            </div>
            <div className={styles.previewStats}>
                <PreviewStat label="채널 운영" value="6" />
                <PreviewStat label="콘텐츠 제작" value="24" />
                <PreviewStat label="상담 진행" value="42" />
            </div>
            <div className={styles.previewBody}>
                <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}>
                        <strong>제공 모듈</strong>
                        <span>구축 현황</span>
                    </div>
                    <PreviewRow name="프랜차이즈 본부 ERP" meta="상담 · 출점 · 계약 · 운영 관리" progress="90%" status="백엔드" />
                    <PreviewRow name="푸시·쇼츠 채널 운영" meta="푸시 발송과 숏폼 유입 운영 기준" progress="72%" status="채널" />
                    <PreviewRow name="자사앱·랜딩" meta="CRM · 프로모션 자동화 · 고객 접점" progress="58%" status="프론트" />
                </div>
                <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}>
                        <strong>실행 지원</strong>
                        <span>운영팀</span>
                    </div>
                    <div className={styles.checkRow}><span />영업대행과 상담 목록 관리</div>
                    <div className={styles.checkRow}><span />콘텐츠 제작 요청</div>
                    <div className={styles.checkRow}><span />가맹관리 매뉴얼 점검</div>
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

function PreviewRow({
    name,
    meta,
    progress,
    status
}: {
    readonly name: string;
    readonly meta: string;
    readonly progress: string;
    readonly status: string;
}) {
    return (
        <div className={styles.previewRow}>
            <div>
                <strong>{name}<em>{status}</em></strong>
                <span>{meta}</span>
            </div>
            <i style={{ width: progress }} />
        </div>
    );
}
