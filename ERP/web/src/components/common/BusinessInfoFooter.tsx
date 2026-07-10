import styles from './BusinessInfoFooter.module.css';

type BusinessInfoFooterProps = {
    readonly className?: string;
};

export function BusinessInfoFooter({ className }: BusinessInfoFooterProps) {
    const footerClassName = className ? `${styles.footer} ${className}` : styles.footer;

    return (
        <div className={footerClassName} aria-label="사업자 정보">
            <p>상호: 주식회사 내일사장 | 대표: 박규태 | 사업자등록번호: 448-81-03095</p>
            <p>주소: 경기도 하남시 조정대로45 미사센텀비즈 F922 | 이메일: cs@sajang.app | 연락처: 070-8095-2881</p>
        </div>
    );
}
