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
    { label: '문의접수', value: '128건', helper: '최근 30일 유입' },
    { label: '상담중', value: '42건', helper: '담당자 후속 관리' },
    { label: '계약예정', value: '9건', helper: '계약 전 확인 단계' }
] as const satisfies readonly DashboardMetric[];

const PIPELINE_CHART = [
    { label: '문의접수', value: '128', percent: '100%' },
    { label: '상담중', value: '42', percent: '64%' },
    { label: '입지검토', value: '18', percent: '42%' },
    { label: '계약예정', value: '9', percent: '28%' }
] as const satisfies readonly HorizontalChartItem[];

const SOURCE_CHART = [
    { label: 'Meta 광고', value: '38', percent: '100%' },
    { label: '랜딩 페이지', value: '31', percent: '82%' },
    { label: '박람회', value: '27', percent: '72%' },
    { label: '소개', value: '16', percent: '44%' }
] as const satisfies readonly HorizontalChartItem[];

const MANAGER_CHART = [
    { label: '김민준', value: '26', percent: '100%' },
    { label: '박서연', value: '19', percent: '73%' },
    { label: '이도윤', value: '14', percent: '54%' }
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
                    <h2>구글시트에 흩어진 데이터를 운영 지표로 정리합니다.</h2>
                </div>
                <div className={localStyles.metricsGrid}>
                    <article className={localStyles.metricPanel}>
                        <PanelHeader title="상태별 모객 파이프라인" description="문의접수부터 계약예정까지 병목과 다음 액션을 한눈에 확인합니다." label="대시보드" />
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
                            <PanelHeader title="유입 경로" description="Meta 광고와 채널별 유입 규모를 비교합니다." label="채널" />
                            <HorizontalBars items={SOURCE_CHART} />
                        </article>
                        <article className={localStyles.sidePanel}>
                            <PanelHeader title="DB 유입 추이" description="일별 유입량 변화를 확인합니다." label="최근 5일" />
                            <TrendBars />
                        </article>
                        <article className={localStyles.sidePanel}>
                            <PanelHeader title="담당자별 모객" description="직원별 담당 DB 규모를 확인합니다." label="담당자" />
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
