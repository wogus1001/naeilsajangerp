"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../login/page.module.css'; // Reuse login styles
import { AlertModal } from '@/components/common/AlertModal';
import { CompanySearchModal, type Company } from './CompanySearchModal';
import { SignupApprovalNotice } from './SignupApprovalNotice';
import { isValidLoginId, LOGIN_ID_RULE_MESSAGE, normalizeLoginId } from '@/lib/login-id';

function normalizeCompanyName(value: string): string {
    return value.trim().normalize('NFC').replace(/\s+/g, '');
}

function findSameNameCompany(companies: readonly Company[], companyName: string): Company | undefined {
    const normalizedCompanyName = normalizeCompanyName(companyName);
    return companies.find((company) => normalizeCompanyName(company.name) === normalizedCompanyName);
}

function formatPhoneNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.startsWith('02')) {
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }

    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [emailValue, setEmailValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const [passwordConfirmValue, setPasswordConfirmValue] = useState('');
    const [phoneValue, setPhoneValue] = useState('');

    // Search Modal State
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Company[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isNewCompanyRequest, setIsNewCompanyRequest] = useState(false);
    const [signupRole, setSignupRole] = useState<'staff' | 'partner_vendor'>('staff');
    const [loginIdCheck, setLoginIdCheck] = useState<{
        companyId: string;
        loginId: string;
        available: boolean;
        message: string;
    } | null>(null);

    // Alert Modal State
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        message: string;
        type: 'success' | 'error' | 'info';
        onOk?: () => void;
    }>({
        isOpen: false,
        message: '',
        type: 'info'
    });

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', onOk?: () => void) => {
        setAlertConfig({ isOpen: true, message, type, onOk });
    };

    const closeAlert = () => {
        const onOk = alertConfig.onOk;
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
        if (onOk) onOk();
    };

    const getInputValue = (id: string) => {
        const input = document.getElementById(id);
        return input instanceof HTMLInputElement ? input.value : '';
    };

    const handleSignup = async (e: FormEvent) => {
        // ... (unchanged)
        e.preventDefault();
        setIsLoading(true);

        const loginId = getInputValue('loginId');
        const email = getInputValue('email');
        const password = getInputValue('password');
        const passwordConfirm = getInputValue('passwordConfirm');
        const name = getInputValue('name');
        const phone = getInputValue('phone');
        const companyName = getInputValue('companyName');
        const phoneNormalized = phone.replace(/\D/g, '');
        const normalizedLoginId = normalizeLoginId(loginId);

        if (!isValidLoginId(normalizedLoginId)) {
            showAlert(LOGIN_ID_RULE_MESSAGE, 'error');
            setIsLoading(false);
            return;
        }

        if (selectedCompany && !isNewCompanyRequest) {
            const loginIdWasChecked = loginIdCheck?.available === true
                && loginIdCheck.companyId === selectedCompany.id
                && loginIdCheck.loginId === normalizedLoginId;
            if (!loginIdWasChecked) {
                showAlert('아이디 중복 확인을 해주세요.', 'error');
                setIsLoading(false);
                return;
            }
        }

        if (password.length < 6) {
            showAlert('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
            setIsLoading(false);
            return;
        }

        if (password !== passwordConfirm) {
            showAlert('비밀번호가 다릅니다.', 'error');
            setIsLoading(false);
            return;
        }

        // Email Validation Policy
        if (!email.includes('@')) {
            showAlert('이메일 주소에 @를 포함해주세요.', 'error');
            setIsLoading(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('이메일 형식이 올바르지 않습니다.', 'error');
            setIsLoading(false);
            return;
        }

        if (phoneNormalized.length < 10 || phoneNormalized.length > 11) {
            showAlert('휴대폰 번호를 정확히 입력해주세요.', 'error');
            setIsLoading(false);
            return;
        }

        if (phoneNormalized.length < 10 || phoneNormalized.length > 11) {
            showAlert('휴대폰 번호를 정확히 입력해주세요.', 'error');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loginId: normalizedLoginId,
                    email,
                    password,
                    passwordConfirm,
                    name,
                    phone,
                    companyName,
                    companyId: selectedCompany?.id,
                    role: isNewCompanyRequest ? 'manager' : signupRole
                }),
            });

            const data = await res.json();

            if (res.ok) {
                if (data.message) {
                    showAlert(data.message, 'success', () => router.push('/login'));
                } else {
                    showAlert('회원가입이 완료되었습니다.\n로그인해주세요.', 'success', () => router.push('/login'));
                }
            } else {
                if (res.status === 409) {
                    showAlert(data.error || '이미 존재하는 아이디입니다.', 'error');
                } else {
                    showAlert(data.error || '회원가입에 실패했습니다.', 'error');
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            showAlert('회원가입 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckLoginId = async () => {
        const loginId = normalizeLoginId(getInputValue('loginId'));
        if (!selectedCompany || isNewCompanyRequest) {
            showAlert('기존 회사를 선택한 뒤 아이디 중복 확인을 해주세요.', 'info');
            return;
        }
        if (!isValidLoginId(loginId)) {
            setLoginIdCheck({
                companyId: selectedCompany.id,
                loginId,
                available: false,
                message: LOGIN_ID_RULE_MESSAGE
            });
            return;
        }

        try {
            const res = await fetch('/api/users/check-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: selectedCompany.id, loginId })
            });
            const data = await res.json();
            setLoginIdCheck({
                companyId: selectedCompany.id,
                loginId,
                available: Boolean(data.available),
                message: data.message || (data.available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.')
            });
        } catch (error) {
            console.error('Login ID check failed:', error);
            setLoginIdCheck({
                companyId: selectedCompany.id,
                loginId,
                available: false,
                message: '아이디 확인 중 오류가 발생했습니다.'
            });
        }
    };

    const handleSearch = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) {
            showAlert('검색어를 입력해주세요.', 'info');
            return;
        }

        setIsSearching(true);
        setHasSearched(false); // Reset before search
        try {
            const res = await fetch(`/api/companies/search?query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (res.ok) {
                setSearchResults(data.data || []);
            } else {
                console.error('Search failed:', data.error);
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
            setHasSearched(true); // Set true after search completes
        }
    };

    const handleSelectCompany = (company: Company) => {
        const companyNameInput = document.getElementById('companyName');
        if (companyNameInput instanceof HTMLInputElement) {
            companyNameInput.value = company.name;
        }
        setSelectedCompany(company);
        setIsNewCompanyRequest(false);
        setSignupRole('staff');
        setLoginIdCheck(null);
        setShowSearchModal(false);
    };

    const handleRegisterNewCompany = (companyName: string) => {
        const sameNameCompany = findSameNameCompany(searchResults, companyName);
        if (sameNameCompany) {
            handleSelectCompany(sameNameCompany);
            return;
        }

        const companyNameInput = document.getElementById('companyName');
        if (companyNameInput instanceof HTMLInputElement) {
            companyNameInput.value = companyName;
        }
        setSelectedCompany(null);
        setIsNewCompanyRequest(true);
        setSignupRole('staff');
        setLoginIdCheck(null);
        setShowSearchModal(false);
    };

    const approvalTitle = isNewCompanyRequest
        ? '신규 회사 팀장 가입 요청'
        : selectedCompany
            ? signupRole === 'partner_vendor' ? '기존 회사 협력업체 가입 요청' : '기존 회사 브랜드 임직원 가입 요청'
            : '회사 선택 후 승인 방식이 정해집니다.';

    const approvalDescription = isNewCompanyRequest
        ? '아직 등록되지 않은 회사는 최초 가입자가 팀장 권한으로 접수되며, 관리자 승인 후 로그인할 수 있습니다.'
        : selectedCompany
            ? signupRole === 'partner_vendor'
                ? '협력업체 계정은 소속 회사 팀장 승인 후 로그인할 수 있습니다.'
                : '브랜드 임직원은 회사 팀장 유무에 따라 팀장 또는 매니저 권한으로 자동 접수됩니다.'
            : '회사 찾기에서 기존 회사를 선택하거나 신규 회사명을 등록해주세요.';
    const passwordMismatch = passwordConfirmValue.length > 0 && passwordValue !== passwordConfirmValue;
    const emailMissingAt = emailValue.length > 0 && !emailValue.includes('@');

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>
                        <div className={styles.gridIcon} />
                    </div>
                    <h1 className={styles.title}>회원가입</h1>
                    <p className={styles.subtitle}>FC ERP 서비스 이용을 위한 가입</p>
                </div>

                <form onSubmit={handleSignup} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="companyName" className={styles.label}>회사명</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                id="companyName"
                                placeholder="회사 찾기 버튼을 이용해주세요"
                                className={styles.input}
                                required
                                readOnly
                                onClick={() => setShowSearchModal(true)}
                                style={{ flex: 1, backgroundColor: '#f8f9fa', cursor: 'pointer' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSearchModal(true)}
                                style={{
                                    padding: '0 12px',
                                    height: '42px',
                                    borderRadius: '8px',
                                    border: '1px solid #ced4da',
                                    backgroundColor: '#f8f9fa',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                회사 찾기
                            </button>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="loginId" className={styles.label}>아이디</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                id="loginId"
                                placeholder="영문 소문자, 숫자, ., _, -"
                                className={styles.input}
                                required
                                autoCapitalize="none"
                                onChange={() => setLoginIdCheck(null)}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={() => { void handleCheckLoginId(); }}
                                disabled={!selectedCompany || isNewCompanyRequest}
                                style={{
                                    padding: '0 12px',
                                    height: '42px',
                                    borderRadius: '8px',
                                    border: '1px solid #ced4da',
                                    backgroundColor: !selectedCompany || isNewCompanyRequest ? '#f1f3f5' : '#ffffff',
                                    color: !selectedCompany || isNewCompanyRequest ? '#adb5bd' : '#333d4b',
                                    cursor: !selectedCompany || isNewCompanyRequest ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                중복 확인
                            </button>
                        </div>
                        {loginIdCheck && (
                            <p style={{
                                fontSize: '12px',
                                color: loginIdCheck.available ? '#03b26c' : '#f04452',
                                marginTop: '4px'
                            }}>
                                {loginIdCheck.message}
                            </p>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>이메일</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="user@example.com"
                            className={styles.input}
                            required
                            autoComplete="email"
                            value={emailValue}
                            onChange={(event) => setEmailValue(event.target.value)}
                        />
                        {emailMissingAt && (
                            <p style={{ fontSize: '12px', color: '#f04452', marginTop: '4px' }}>
                                이메일 주소에 @를 포함해주세요.
                            </p>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>비밀번호</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="비밀번호 (6자 이상)"
                            className={styles.input}
                            required
                            value={passwordValue}
                            onChange={(event) => setPasswordValue(event.target.value)}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="passwordConfirm" className={styles.label}>비밀번호 확인</label>
                        <input
                            type="password"
                            id="passwordConfirm"
                            placeholder="비밀번호를 한 번 더 입력하세요"
                            className={styles.input}
                            required
                            value={passwordConfirmValue}
                            onChange={(event) => setPasswordConfirmValue(event.target.value)}
                        />
                        {passwordMismatch && (
                            <p style={{ fontSize: '12px', color: '#f04452', marginTop: '4px' }}>
                                비밀번호가 다릅니다.
                            </p>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="name" className={styles.label}>이름</label>
                        <input
                            type="text"
                            id="name"
                            placeholder="이름을 입력하세요"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="phone" className={styles.label}>휴대폰 번호</label>
                        <input
                            type="tel"
                            id="phone"
                            placeholder="010-0000-0000"
                            className={styles.input}
                            required
                            inputMode="numeric"
                            autoComplete="tel"
                            value={phoneValue}
                            onChange={(event) => setPhoneValue(formatPhoneNumber(event.target.value))}
                        />
                    </div>

                    {selectedCompany && !isNewCompanyRequest && (
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>가입 유형</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSignupRole('staff')}
                                    aria-pressed={signupRole === 'staff'}
                                    style={{
                                        height: '44px',
                                        borderRadius: '8px',
                                        border: signupRole === 'staff' ? '1px solid #3182f6' : '1px solid #dee2e6',
                                        backgroundColor: signupRole === 'staff' ? '#eff6ff' : '#ffffff',
                                        color: signupRole === 'staff' ? '#1d4ed8' : '#343a40',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    브랜드 임직원
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSignupRole('partner_vendor')}
                                    aria-pressed={signupRole === 'partner_vendor'}
                                    style={{
                                        height: '44px',
                                        borderRadius: '8px',
                                        border: signupRole === 'partner_vendor' ? '1px solid #3182f6' : '1px solid #dee2e6',
                                        backgroundColor: signupRole === 'partner_vendor' ? '#eff6ff' : '#ffffff',
                                        color: signupRole === 'partner_vendor' ? '#1d4ed8' : '#343a40',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    협력업체
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={styles.inputGroup} style={{ marginBottom: '20px' }}>
                        <label className={styles.label}>가입 승인 방식</label>
                        <SignupApprovalNotice title={approvalTitle} description={approvalDescription} />
                    </div>

                    <button type="submit" className={styles.loginButton} disabled={isLoading}>
                        {isLoading ? '가입 중...' : '가입하기'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <span style={{ color: '#868e96' }}>이미 계정이 있으신가요?</span>
                    <a href="/login" className={styles.link}>로그인</a>
                </div>
            </div>

            {showSearchModal && (
                <CompanySearchModal
                    searchQuery={searchQuery}
                    searchResults={searchResults}
                    isSearching={isSearching}
                    hasSearched={hasSearched}
                    onQueryChange={(value) => {
                        setSearchQuery(value);
                        setHasSearched(false);
                    }}
                    onSearch={handleSearch}
                    onClose={() => setShowSearchModal(false)}
                    onSelectCompany={handleSelectCompany}
                    onRegisterNewCompany={handleRegisterNewCompany}
                />
            )}
            {/* Alert Modal */}
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
}
