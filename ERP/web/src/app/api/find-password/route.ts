import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, companyName } = body;

        if (!id || !name || !companyName) {
            return NextResponse.json({ error: 'ID, name, and company name are required' }, { status: 400 });
        }

        const supabaseAdmin = await getSupabaseAdmin();
        const email = id.includes('@') ? id : `${id}@example.com`;

        // Check if user exists with matching details
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select(`
                *,
                company:companies(name)
            `)
            .eq('email', email)
            .single();

        if (profile && profile.name === name && profile.company?.name === companyName) {
            console.info('Find password request matched a profile; reset must be handled by an administrator.');
        }
        return NextResponse.json({
            message: '입력하신 정보가 확인되면 관리자에게 비밀번호 재설정을 요청해주세요.'
        });
    } catch (error) {
        console.error('Find password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
