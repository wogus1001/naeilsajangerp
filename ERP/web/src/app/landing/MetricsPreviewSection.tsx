import localStyles from './MetricsPreviewSection.module.css';
import pageStyles from './page.module.css';

type DashboardMetric = {
    readonly label: string;
    readonly value: string;
    readonly helper: string;
};

type HorizontalChartItem = {
    readonly label: string;
    readonly value: string;
    readonly percent: string;
};

type TrendChartItem = {
    readonly label: string;
    readonly value: string;
    readonly height: string;
};

const DASHBOARD_METRICS = [
    { label: '유입 DB', value: '128건', helper: '최근 30일 상담 대상' },
    { label: '콘텐츠 제작', value: '24건', helper: '쇼츠·이미지·랜딩' },
    { label: '채널 운영', value: '6개', helper: '푸시·앱·알림 흐름' }
] as const satisfies readonly DashboardMetric[];

const PIPELINE_CHART = [
    { label: '유입 설계', value: '128', percent: '100%' },
    { label: '상담 연결', value: '42', percent: '64%' },
    { label: '계약 검토', value: '18', percent: '42%' },
    { label: '운영 인계', value: '9', percent: '28%' }
] as const satisfies readonly HorizontalChartItem[];

const SOURCE_CHART = [
    { label: '영업대행', value: '38', percent: '100%' },
    { label: '쇼츠', value: '31', percent: '82%' },
    { label: '푸시', value: '27', percent: '72%' },
    { label: '자사앱', value: '16', percent: '44%' }
] as const satisfies readonly HorizontalChartItem[];

const MANAGER_CHART = [
    { label: '가맹개발', value: '26', percent: '100%' },
    { label: '마케팅', value: '19', percent: '73%' },
    { label: '운영/SV', value: '14', percent: '54%' }
] as const satisfies readonly HorizontalChartItem[];

const TREND_CHART = [
    { label: '월', value: '12', height: '58%' },
    { label: '화', value: '18', height: '82%' },
    { label: '수', value: '10', height: '48%' },
    { label: '목', value: '22', height: '100%' },
    { label: '금', value: '16', height: '74%' }
] as const satisfies readonly TrendChartItem[];

export function MetricsPreviewSection() {
    return (
        <section id="metrics" className={`${pageStyles.section} ${localStyles.metricsSection}`}>
            <div className={pageStyles.inner}>
                <div className={pageStyles.sectionHeader}>
                    <span className={pageStyles.eyebrow}>운영 지표</span>
                    <h2>시스템 구축과 실행 서비스를 같은 운영 지표로 확인합니다.</h2>
                </div>
                <div className={localStyles.metricsGrid}>
                    <article className={localStyles.metricPanel}>
                        <PanelHeader title="본사 성장 파이프라인" description="유입 설계부터 상담, 계약, 운영 인계까지 병목과 다음 액션을 확인합니다." label="샘플 대시보드" />
                        <div className={localStyles.metricSummary}>
                            {DASHBOARD_METRICS.map(metric => (
                                <div key={metric.label}>
                                    <span>{metric.label}</span>
                                    <strong>{metric.value}</strong>
                                    <p>{metric.helper}</p>
                                </div>
                            ))}
                        </div>
                        <HorizontalBars items={PIPELINE_CHART} />
                    </article>
                    <div className={localStyles.sidePanels}>
                        <article className={localStyles.sidePanel}>
                            <PanelHeader title="실행 채널" description="영업대행, 쇼츠, 푸시, 자사앱의 유입 흐름을 비교합니다." label="채널" />
                            <HorizontalBars items={SOURCE_CHART} />
                        </article>
                        <article className={localStyles.sidePanel}>
                            <PanelHeader title="작업 추이" description="주요 제작·상담 작업량 변화를 확인합니다." label="최근 5일" />
                            <TrendBars />
                        </article>
                        <article className={localStyles.sidePanel}>
                            <PanelHeader title="팀별 실행" description="가맹개발, 마케팅, 운영팀의 실행 규모를 확인합니다." label="팀" />
                            <HorizontalBars items={MANAGER_CHART} />
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PanelHeader({ title, description, label }: { readonly title: string; readonly description: string; readonly label: string }) {
    return (
        <div className={localStyles.panelHeader}>
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <span>{label}</span>
        </div>
    );
}

function HorizontalBars({ items }: { readonly items: readonly HorizontalChartItem[] }) {
    return (
        <div className={localStyles.barList}>
            {items.map(item => (
                <div key={item.label} className={localStyles.barRow}>
                    <span>{item.label}</span>
                    <i className={localStyles.barTrack}>
                        <b className={localStyles.barFill} style={{ width: item.percent }} />
                    </i>
                    <strong>{item.value}</strong>
                </div>
            ))}
        </div>
    );
}

function TrendBars() {
    return (
        <div className={localStyles.trendChart}>
            {TREND_CHART.map(item => (
                <div key={item.label} className={localStyles.trendBar}>
                    <strong>{item.value}</strong>
                    <i style={{ height: item.height }} />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}
