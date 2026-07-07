import { NextResponse } from 'next/server';
import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Service Role Client (Bypasses RLS for migration/support)
// because the API Request doesn't carry the Supabase Session yet (hybrid mode)
// Service Role Client (Bypasses RLS for migration/support)
// because the API Request doesn't carry the Supabase Session yet (hybrid mode)
// Removed top level

// GET: Fetch user's memo
export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const { data: memo } = await supabaseAdmin
            .from('memos')
            .select('content')
            .eq('user_id', requester.id)
            .maybeSingle();

        return NextResponse.json({ content: memo ? memo.content : '' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch memo' }, { status: 500 });
    }
}

// POST: Save user's memo
export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }
        const { content } = await request.json();
        const nextContent = typeof content === 'string' ? content : '';

        // Upsert Memo
        // Check existence
        const { data: existing } = await supabaseAdmin.from('memos').select('id').eq('user_id', requester.id).maybeSingle();

        if (existing) {
            const { error } = await supabaseAdmin
                .from('memos')
                .update({ content: nextContent, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin.from('memos').insert({ user_id: requester.id, content: nextContent });
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Memo save error:', error);
        return NextResponse.json({ error: 'Failed to save memo' }, { status: 500 });
    }
}
