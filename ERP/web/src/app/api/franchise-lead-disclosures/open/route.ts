import { NextResponse } from 'next/server';
import { hashDisclosureOpenToken } from '@/lib/gmail-integration';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const PIXEL_GIF = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

function pixelResponse() {
    return new NextResponse(PIXEL_GIF, {
        status: 200,
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0'
        }
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token') || '';
        if (!token) return pixelResponse();

        const openedAt = new Date().toISOString();
        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
            .from('franchise_lead_disclosure_deliveries')
            .update({
                opened_at: openedAt,
                updated_at: openedAt
            })
            .eq('open_token_hash', hashDisclosureOpenToken(token))
            .is('opened_at', null);
        if (error) throw error;
    } catch (error) {
        console.error('Disclosure open tracking error:', error);
    }
    return pixelResponse();
}
