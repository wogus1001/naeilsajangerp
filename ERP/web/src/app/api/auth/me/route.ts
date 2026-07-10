import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type ProfileRow = {
    id: string;
    name: string | null;
    role: string | null;
    company_id: string | null;
    status: string | null;
    email: string | null;
    phone: string | null;
    login_id: string | null;
    company: { name: string | null; logo_url?: string | null } | null;
};

function toLegacyLoginId(email: string | null, fallback: string): string {
    if (!email) return fallback;
    if (email.endsWith('@example.com')) {
        return email.replace('@example.com', '');
    }
    return email;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : '';
        const fallbackToken = request.headers.get('x-access-token')?.trim() || '';
        const token = bearerToken || fallbackToken;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Supabase environment is not configured' }, { status: 500 });
        }

        // createClient: anon key로 초기화 후, getUser(token)에 직접 JWT 전달
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 토큰을 직접 getUser()에 전달하여 서버사이드에서 정확한 유효성 검증
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const profileResult = await supabaseAdmin
            .from('profiles')
            .select('id, name, role, company_id, status, email, phone, login_id, company:companies!company_id(name, logo_url)')
            .eq('id', userData.user.id)
            .single<ProfileRow>();

        let profile: ProfileRow | null = profileResult.data;
        let profileError = profileResult.error;

        if (profileError) {
            const fallbackProfileResult = await supabaseAdmin
                .from('profiles')
                .select('id, name, role, company_id, status, email, company:companies!company_id(name)')
                .eq('id', userData.user.id)
                .single<Omit<ProfileRow, 'login_id' | 'phone'>>();

            profile = fallbackProfileResult.data
                ? { ...fallbackProfileResult.data, login_id: null, phone: null }
                : null;
            profileError = fallbackProfileResult.error;
        }

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (profile.status && profile.status !== 'active') {
            return NextResponse.json(
                { error: 'Account is not active', code: 'ACCOUNT_INACTIVE', status: profile.status },
                { status: 403 }
            );
        }

        const normalizedUser = {
            id: profile.login_id || toLegacyLoginId(profile.email || userData.user.email || null, userData.user.id),
            uid: userData.user.id,
            email: userData.user.email || profile.email || null,
            phone: profile.phone || '',
            name: profile.name || '',
            role: profile.role || 'staff',
            companyName: profile.company?.name || '',
            companyLogoUrl: profile.company?.logo_url || '',
            companyId: profile.company_id || null,
            status: profile.status || 'active'
        };

        return NextResponse.json({ user: normalizedUser });
    } catch (error) {
        console.error('Auth me error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
