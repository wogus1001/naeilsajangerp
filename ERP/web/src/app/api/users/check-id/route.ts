import { NextResponse } from 'next/server';
import { isLoginIdSchemaMissing, isValidLoginId, LOGIN_ID_RULE_MESSAGE, normalizeLoginId } from '@/lib/login-id';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, loginId, companyId, currentProfileId } = body;
        const candidateLoginId = loginId ?? id;

        if (companyId && candidateLoginId) {
            const normalizedLoginId = normalizeLoginId(candidateLoginId);
            if (!isValidLoginId(normalizedLoginId)) {
                return NextResponse.json({ available: false, message: LOGIN_ID_RULE_MESSAGE }, { status: 400 });
            }

            const supabaseAdmin = getSupabaseAdmin();
            let query = supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('company_id', String(companyId))
                .eq('login_id_normalized', normalizedLoginId)
                .limit(1);

            if (currentProfileId) {
                query = query.neq('id', String(currentProfileId));
            }

            const { data, error } = await query;

            if (error) {
                console.error('Company login ID check error:', error);
                if (isLoginIdSchemaMissing(error)) {
                    return NextResponse.json({
                        available: false,
                        message: '아이디 로그인 DB 설정이 필요합니다. supabase_login_id_migration.sql 적용 후 다시 시도해주세요.'
                    }, { status: 500 });
                }
                return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
            }

            const exists = (data ?? []).length > 0;
            return NextResponse.json({
                available: !exists,
                message: exists ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.'
            });
        }

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const email = id.includes('@') ? id : `${id}@example.com`;

        // Check auth users
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        // This is inefficient for large user base but fine for now. Better to try-catch createUser? NO, that's invasive.
        // Actually, searching by email in profiles is better if triggers work reliably.

        // Let's use listUsers for Auth check (definitive).
        const exists = users.some(u => u.email === email);

        if (exists) {
            return NextResponse.json({ available: false, message: '이미 사용 중인 아이디입니다.' });
        } else {
            return NextResponse.json({ available: true, message: '사용 가능한 아이디입니다.' });
        }
    } catch (error) {
        console.error('Check ID error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
