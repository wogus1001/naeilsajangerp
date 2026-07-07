
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        // 1. Check if requester is Admin
        const supabase = await createClient();

        const authHeader = request.headers.get('Authorization');

        let user;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
            if (!error && authUser) {
                user = authUser;
            }
        }

        if (!user) {
            // Fallback to cookie session if header fails (though header is preferred for admin actions)
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user;
        }

        if (!user) {
            return NextResponse.json({
                error: 'Unauthorized: Invalid token or session'
            }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
        }

        // 2. Perform Password Reset using Admin Client
        const body = await request.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: '비밀번호 재설정 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
