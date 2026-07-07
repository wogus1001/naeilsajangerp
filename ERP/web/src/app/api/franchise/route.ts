import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type FranchiseDataItem = {
    readonly brandNm?: string;
};

export async function GET(request: Request) {
    const requester = await getAuthenticatedRequesterProfile(getSupabaseAdmin(), request);
    if (!requester) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        // Read from local cache instead of external API
        const filePath = path.join(process.cwd(), 'src/data/franchises.json');

        if (!fs.existsSync(filePath)) {
            console.error('Franchise data file not found');
            return NextResponse.json({ error: 'Franchise data file not configured' }, { status: 503 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed: unknown = JSON.parse(fileContent);
        const items: readonly FranchiseDataItem[] = Array.isArray(parsed) ? parsed : [];

        // Filter by query (case-insensitive, robust)
        const normalizedQuery = query.toLowerCase().trim();
        const filteredItems = items.filter(item => String(item.brandNm || '').toLowerCase().includes(normalizedQuery));

        return NextResponse.json(filteredItems);

    } catch (error) {
        console.error('Error fetching franchise data:', error);
        return NextResponse.json({ error: 'Failed to fetch franchise data' }, { status: 500 });
    }
}
