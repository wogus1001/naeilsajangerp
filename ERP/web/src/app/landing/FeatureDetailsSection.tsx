import type { FeatureMock } from './content';
import { FEATURE_DETAILS, TEAM_SCENES } from './content';
import styles from './page.module.css';

export function FeatureDetailsSection() {
    return (
        <section id="features" className={styles.section}>
            <div className={styles.inner}>
                <div className={styles.sectionHeader}>
                    <span className={styles.eyebrow}>기능</span>
                    <h2>본사 직원이 매일 쓰는 업무 단위로 기능을 나눴습니다.</h2>
                </div>
                <div className={styles.featureGrid}>
                    {FEATURE_DETAILS.map(feature => (
                        <article key={feature.title} className={styles.featureCard}>
                            <div className={styles.featureCopy}>
                                <span className={styles.featureLabel}>업무 상황</span>
                                <h3>{feature.title}</h3>
                                <p>{feature.situation}</p>
                                <ul>
                                    {feature.capabilities.map(capability => (
                                        <li key={capability}>{capability}</li>
                                    ))}
                                </ul>
                                <strong>{feature.outcome}</strong>
                            </div>
                            <FeatureMockPanel mock={feature.mock} />
                        </article>
                    ))}
                </div>
                <div className={styles.teamScenePanel}>
                    <div className={styles.teamSceneHeader}>
                        <span className={styles.eyebrow}>팀별 사용 장면</span>
                        <h3>같은 데이터가 다음 팀의 업무로 이어집니다.</h3>
                    </div>
                    <ol className={styles.teamSceneList}>
                        {TEAM_SCENES.map(scene => (
                            <li key={scene.team}>
                                <span>{scene.team}</span>
                                <strong>{scene.title}</strong>
                                <p>{scene.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

function FeatureMockPanel({ mock }: { readonly mock: FeatureMock }) {
    const mockClassName = mock.kind === 'chips'
        ? `${styles.featureMock} ${styles.compactFeatureMock}`
        : styles.featureMock;

    switch (mock.kind) {
        case 'chips':
            return (
                <div className={mockClassName} aria-label="상태 칩 예시">
                    <div className={styles.mockChips}>
                        {mock.items.map(item => <span key={item}>{item}</span>)}
                    </div>
                </div>
            );
        case 'checklist':
            return (
                <div className={mockClassName} aria-label="체크리스트 예시">
                    {mock.items.map(item => (
                        <div key={item} className={styles.mockChecklistRow}>
                            <span />
                            {item}
                        </div>
                    ))}
                </div>
            );
        case 'progress':
            return (
                <div className={mockClassName} aria-label="진행률 예시">
                    {mock.items.map(item => (
                        <div key={item.label} className={styles.mockProgressRow}>
                            <div>
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </div>
                            <i><b style={{ width: item.percent }} /></i>
                        </div>
                    ))}
                </div>
            );
        case 'table':
            return (
                <div className={mockClassName} aria-label="테이블 예시">
                    <div className={styles.mockTableHeader}>
                        {mock.headers.map(header => <span key={header}>{header}</span>)}
                    </div>
                    {mock.rows.map(row => (
                        <div key={row.join('-')} className={styles.mockTableRow}>
                            {row.map(cell => <span key={cell}>{cell}</span>)}
                        </div>
                    ))}
                </div>
            );
        default:
            return assertNever(mock);
    }
}

function assertNever(value: never): never {
    throw new TypeError(`Unhandled feature mock: ${JSON.stringify(value)}`);
}
