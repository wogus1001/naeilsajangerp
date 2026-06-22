import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidLoginId, LOGIN_ID_RULE_MESSAGE, normalizeLoginId } from '@/lib/login-id';
import { getPendingApprovalLoginMessage } from '@/lib/signup-approval-policy';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type LoginProfileRow = {
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
    status: string | null;
    company_id: string | null;
    company: { name: string | null; logo_url?: string | null } | null;
};

function getText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeProfileCompany(
    company: LoginProfileRow['company'] | LoginProfileRow['company'][]
): LoginProfileRow['company'] {
    return Array.isArray(company) ? company[0] ?? null : company;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const id = getText(body.id);
        const password = getText(body.password);
        const companyId = getText(body.companyId);

        if (!id || !password) {
            return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Supabase environment is not configured' }, { status: 500 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const isEmailLogin = id.includes('@');
        let email = id.toLowerCase();

        if (!isEmailLogin) {
            if (!companyId) {
                return NextResponse.json({ error: '회사를 선택해주세요.' }, { status: 400 });
            }

            const loginIdNormalized = normalizeLoginId(id);
            if (!isValidLoginId(loginIdNormalized)) {
                return NextResponse.json({ error: LOGIN_ID_RULE_MESSAGE }, { status: 400 });
            }

            const { data: matchedProfile, error: profileLookupError } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('company_id', companyId)
                .eq('login_id_normalized', loginIdNormalized)
                .maybeSingle<{ id: string; email: string | null }>();

            if (profileLookupError) {
                console.error('Login ID lookup error:', profileLookupError);
                return NextResponse.json({ error: '로그인 정보를 확인하지 못했습니다.' }, { status: 500 });
            }

            if (!matchedProfile?.email) {
                return NextResponse.json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
            }

            email = matchedProfile.email;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInError || !signInData.user || !signInData.session) {
            return NextResponse.json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
        }

        const profileResult = await supabaseAdmin
            .from('profiles')
            .select('id, email, name, role, status, company_id, company:companies!company_id(name, logo_url)')
            .eq('id', signInData.user.id)
            .single<LoginProfileRow>();

        const { data: profile, error: profileError } = profileResult;
        if (profileError || !profile) {
            return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
        }

        if (companyId && profile.company_id !== companyId) {
            return NextResponse.json({ error: '선택한 회사의 계정이 아닙니다.' }, { status: 401 });
        }

        if (profile.status === 'pending_approval') {
            return NextResponse.json({ error: getPendingApprovalLoginMessage(profile.role) }, { status: 403 });
        }
        if (profile.status !== 'active') {
            return NextResponse.json({ error: '로그인이 제한된 계정입니다.' }, { status: 403 });
        }

        const company = normalizeProfileCompany(profile.company);
        const userInfo = {
            id,
            name: profile.name || signInData.user.user_metadata.name || '사용자',
            role: profile.role || 'staff',
            companyName: company?.name || '',
            companyLogoUrl: company?.logo_url || '',
            status: profile.status,
            email: signInData.user.email || profile.email,
            uid: signInData.user.id,
            companyId: profile.company_id
        };

        return NextResponse.json({
            user: userInfo,
            session: {
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
                expires_in: signInData.session.expires_in,
                expires_at: signInData.session.expires_at,
                token_type: signInData.session.token_type,
                user: signInData.session.user
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
