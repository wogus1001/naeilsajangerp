import type { CompanyMenuFeatureDefinition } from '@/lib/company-menu-features';
import styles from './MainLayout.module.css';

type CompanyMenuDisabledNoticeProps = {
    readonly feature: CompanyMenuFeatureDefinition;
};

export function CompanyMenuDisabledNotice({ feature }: CompanyMenuDisabledNoticeProps) {
    return (
        <div className={styles.accessNotice}>
            <span className={styles.accessNoticeBadge}>비활성 메뉴</span>
            <h1>{feature.title} 메뉴가 꺼져 있습니다.</h1>
            <p>현재 회사 설정에서 이 메뉴를 사용할 수 없습니다. 필요하면 관리자에게 메뉴 권한을 요청하세요.</p>
        </div>
    );
}
