import { adminUsersStyles as styles } from './adminUsersStyles';

export function AdminUsersPageHeader() {
    return (
        <div style={styles.header}>
            <h1 style={styles.title}>회원 및 권한 관리</h1>
            <p style={styles.subtitle}>사용자의 가입 승인, 등급 변경, 탈퇴 처리 및 비밀번호 재설정을 관리합니다.</p>
        </div>
    );
}
