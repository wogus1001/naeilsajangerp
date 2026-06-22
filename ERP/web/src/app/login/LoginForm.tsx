import type { FormEvent } from 'react';
import type { LoginCompany } from './loginStorage';
import styles from './page.module.css';

type LoginFormProps = {
    readonly isLoading: boolean;
    readonly savedId: string;
    readonly rememberId: boolean;
    readonly selectedCompany: LoginCompany | null;
    readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    readonly onOpenCompanySearch: () => void;
    readonly onRememberIdChange: (checked: boolean) => void;
};

export function LoginForm({
    isLoading,
    savedId,
    rememberId,
    selectedCompany,
    onSubmit,
    onOpenCompanySearch,
    onRememberIdChange
}: LoginFormProps) {
    return (
        <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
                <label htmlFor="companyName" className={styles.label}>회사</label>
                <div className={styles.companyPickerRow}>
                    <input
                        type="text"
                        id="companyName"
                        placeholder="처음 한 번만 회사를 찾아주세요"
                        className={`${styles.input} ${styles.companyInput}`}
                        value={selectedCompany?.name || ''}
                        readOnly
                        onClick={onOpenCompanySearch}
                    />
                    <button
                        type="button"
                        onClick={onOpenCompanySearch}
                        className={styles.secondaryButton}
                    >
                        {selectedCompany ? '변경' : '회사 찾기'}
                    </button>
                </div>
                <p className={styles.helperText}>
                    {selectedCompany
                        ? '다음 로그인부터 이 회사가 자동 선택됩니다.'
                        : '아이디 로그인은 회사 기준으로 확인합니다.'}
                </p>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>아이디</label>
                <input
                    type="text"
                    id="email"
                    placeholder="아이디를 입력하세요"
                    className={styles.input}
                    defaultValue={savedId}
                    required
                />
                <p className={styles.helperText}>
                    기존 이메일 로그인도 임시로 사용할 수 있습니다.
                </p>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>비밀번호</label>
                <input
                    type="password"
                    id="password"
                    placeholder="비밀번호를 입력하세요"
                    className={styles.input}
                    required
                />
            </div>

            <div className={styles.rememberRow}>
                <input
                    type="checkbox"
                    id="rememberId"
                    checked={rememberId}
                    onChange={(event) => onRememberIdChange(event.target.checked)}
                    className={styles.checkbox}
                />
                <label htmlFor="rememberId" className={styles.checkboxLabel}>아이디 저장</label>
            </div>

            <button type="submit" className={styles.loginButton} disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
            </button>
        </form>
    );
}
