"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import styles from './page.module.css';
import { AlertModal } from '@/components/common/AlertModal';
import { CompanySearchModal, type Company } from '../signup/CompanySearchModal';

type LoginUser = {
    id?: string;
    uid?: string;
    name?: string;
    role?: string;
    companyName?: string;
    companyId?: string | null;
    companyLogoUrl?: string;
    email?: string | null;
    status?: string;
};

type LoginApiResponse = {
    user?: LoginUser;
    session?: {
        access_token?: string;
        refresh_token?: string;
    };
    error?: string;
};

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loggedInUser, setLoggedInUser] = useState<LoginUser | null>(null);

    const [savedId, setSavedId] = useState('');
    const [rememberId, setRememberId] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Company[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    React.useEffect(() => {
        const bootstrap = async () => {
            const saved = localStorage.getItem('saved_login_id');
            if (saved) {
                setSavedId(saved);
                setRememberId(true);
            }

            try {
                const supabase = getSupabase();
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData.session?.access_token;

                if (!accessToken) {
                    localStorage.removeItem('user');
                    setLoggedInUser(null);
                    return;
                }

                const meRes = await fetch('/api/auth/me', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'x-access-token': accessToken
                    },
                    cache: 'no-store'
                });

                if (!meRes.ok) {
                    await supabase.auth.signOut();
                    localStorage.removeItem('user');
                    setLoggedInUser(null);
                    return;
                }

                const payload = await meRes.json() as { user?: LoginUser };
                if (!payload.user) {
                    localStorage.removeItem('user');
                    setLoggedInUser(null);
                    return;
                }

                localStorage.setItem('user', JSON.stringify(payload.user));
                setLoggedInUser(payload.user);
            } catch (error) {
                console.error('Failed to bootstrap login state:', error);
                localStorage.removeItem('user');
                setLoggedInUser(null);
            } finally {
                setIsLoading(false); // Ensure loading state is cleared
            }
        };

        void bootstrap();
    }, []);

    const handleLogout = async () => {
        try {
            const supabase = getSupabase();
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Failed to sign out from login page:', error);
        }
        localStorage.removeItem('user');
        setLoggedInUser(null);
        window.location.reload();
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        const id = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const isEmailLogin = id.includes('@');

        if (!isEmailLogin && !selectedCompany) {
            setErrorMsg('회사를 선택해주세요.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    password,
                    companyId: selectedCompany?.id
                })
            });
            const data = await res.json() as LoginApiResponse;

            if (!res.ok || !data.user || !data.session?.access_token || !data.session.refresh_token) {
                setErrorMsg(data.error || '아이디 또는 비밀번호가 일치하지 않습니다.');
                setIsLoading(false);
                return;
            }

            const supabase = getSupabase();
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            });

            if (sessionError) {
                console.error('Failed to set Supabase session:', sessionError);
                setErrorMsg('로그인 세션을 저장하지 못했습니다.');
                setIsLoading(false);
                return;
            }

            if (rememberId) {
                localStorage.setItem('saved_login_id', id);
            } else {
                localStorage.removeItem('saved_login_id');
            }

            localStorage.setItem('user', JSON.stringify(data.user));
            router.push('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            setErrorMsg('로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) {
            setErrorMsg('검색어를 입력해주세요.');
            return;
        }

        setIsSearching(true);
        setHasSearched(false);
        try {
            const res = await fetch(`/api/companies/search?query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(res.ok ? data.data || [] : []);
        } catch (error) {
            console.error('Company search failed:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
            setHasSearched(true);
        }
    };

    const handleSelectCompany = (company: Company) => {
        setSelectedCompany(company);
        setShowSearchModal(false);
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>
                        <div className={styles.gridIcon} />
                    </div>
                    <h1 className={styles.title}>부동산 ERP</h1>
                    <p className={styles.subtitle}>부동산 전문가를 위한 통합 솔루션</p>
                </div>

                {loggedInUser ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ marginBottom: '24px', fontSize: '16px', color: '#333' }}>
                            <strong>{loggedInUser.name}</strong>님, 이미 로그인되어 있습니다.
                        </p>
                        <button
                            onClick={() => { void handleLogout(); }}
                            className={styles.loginButton}
                            style={{ backgroundColor: '#ff4444' }}
                        >
                            로그아웃
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className={styles.loginButton}
                            style={{ marginTop: '12px', backgroundColor: '#2196f3' }}
                        >
                            메인으로 이동
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="companyName" className={styles.label}>회사</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    id="companyName"
                                    placeholder="회사 찾기 버튼을 이용해주세요"
                                    className={styles.input}
                                    value={selectedCompany?.name || ''}
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
                                        backgroundColor: '#ffffff',
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
                            <label htmlFor="email" className={styles.label}>아이디</label>
                            <input
                                type="text"
                                id="email"
                                placeholder="아이디를 입력하세요"
                                className={styles.input}
                                defaultValue={savedId}
                                required
                            />
                            <p style={{ fontSize: '12px', color: '#868e96', marginTop: '4px' }}>
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

                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                            <input
                                type="checkbox"
                                id="rememberId"
                                checked={rememberId}
                                onChange={(e) => setRememberId(e.target.checked)}
                                style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }}
                            />
                            <label htmlFor="rememberId" style={{ fontSize: '14px', color: '#666', cursor: 'pointer' }}>아이디 저장</label>
                        </div>

                        <button type="submit" className={styles.loginButton} disabled={isLoading}>
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>
                )}

                <div className={styles.footer}>
                    <a href="/find-password" className={styles.link}>비밀번호 찾기</a>
                    <span className={styles.divider}>|</span>
                    <a href="/signup" className={styles.link}>회원가입</a>
                </div>
            </div>

            {/* Custom Error Modal */}
            <AlertModal
                isOpen={!!errorMsg}
                onClose={() => setErrorMsg(null)}
                title="로그인 실패"
                message={errorMsg || ''}
                type="error"
            />
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
                    onRegisterNewCompany={() => setErrorMsg('로그인은 등록된 회사만 선택할 수 있습니다.')}
                />
            )}
        </div>
    );
}
