import { NextResponse } from 'next/server';
import { createContractFromTemplate } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId: rawUserId, templateId, ...data } = body;
        const supabaseAdmin = getSupabaseAdmin();

        if (!templateId) {
            return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, rawUserId);
        if (!authResult.ok) return authResult.response;

        const result = await createContractFromTemplate(authResult.userId, templateId, data);

        // Response format check
        if (result && result.code === 0) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result?.msg || 'Failed to create contract' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Contract Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create contract' }, { status: 500 });
    }
}
