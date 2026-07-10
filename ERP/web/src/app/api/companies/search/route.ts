import { NextResponse } from 'next/server';
import { doesCompanyNameMatchQuery } from '@/lib/company-search';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type CompanySearchRow = {
    readonly id: string;
    readonly name: string;
    readonly created_at: string | null;
};

type CompanySearchResult = {
    readonly data: readonly CompanySearchRow[] | null;
    readonly error: unknown;
};

async function searchCompanies(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    query: string
): Promise<CompanySearchResult> {
    const result = await supabaseAdmin
        .from('companies')
        .select('id, name, created_at')
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(30);
    return {
        data: result.data as CompanySearchRow[] | null,
        error: result.error
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawQuery = searchParams.get('query');

        if (!rawQuery || rawQuery.length < 1) {
            return NextResponse.json({ data: [] });
        }

        const supabaseAdmin = await getSupabaseAdmin();
        // Prepare search terms
        const nfcQuery = rawQuery.trim().normalize('NFC');
        const nfdQuery = rawQuery.trim().normalize('NFD');

        console.log(`[Search] Raw: "${rawQuery}", NFC: "${nfcQuery}", NFD: "${nfdQuery}"`);

        // We will perform parallel searches to be sure we catch everything
        // 1. NFC Search
        const searchNFC = searchCompanies(supabaseAdmin, nfcQuery);

        // 2. NFD Search (Only if different)
        let searchNFD = Promise.resolve<CompanySearchResult>({ data: [], error: null });
        if (nfcQuery !== nfdQuery) {
            searchNFD = searchCompanies(supabaseAdmin, nfdQuery);
        }

        // 3. Raw Search (Only if different from both)
        let searchRaw = Promise.resolve<CompanySearchResult>({ data: [], error: null });
        if (rawQuery !== nfcQuery && rawQuery !== nfdQuery) {
            searchRaw = searchCompanies(supabaseAdmin, rawQuery);
        }

        const [resNFC, resNFD, resRaw] = await Promise.all([searchNFC, searchNFD, searchRaw]);

        if (resNFC.error) {
            console.error('NFC Search Error:', resNFC.error);
        }
        if (resNFD.error) {
            console.error('NFD Search Error:', resNFD.error);
        }
        if (resRaw.error) {
            console.error('Raw Search Error:', resRaw.error);
        }

        // Combine and deduplicate
        const allResults = [
            ...(resNFC.data || []),
            ...(resNFD.data || []),
            ...(resRaw.data || [])
        ];

        // Also search for "name without spaces" if nothing found but we have suspicious candidates
        if (allResults.length === 0) {
            // Fallback: search for first 2-3 characters to catch weird variations
            const firstPart = rawQuery.substring(0, Math.min(2, rawQuery.length)); // Reduced to 2 chars for simpler matching
            const { data: fallbackData, error: fallbackError } = await searchCompanies(supabaseAdmin, firstPart);

            if (fallbackData) {
                allResults.push(...fallbackData);
            }
            if (fallbackError) {
                console.error('Fallback Search Error:', fallbackError);
            }
        }

        const seenIds = new Set();
        const uniqueCompanies = [];

        const cleanRawQuery = nfcQuery.replace(/\s+/g, '').toLowerCase();

        for (const company of allResults) {
            if (!seenIds.has(company.id)) {
                // Accept match if it includes query OR query includes it (fuzzy)
                if (doesCompanyNameMatchQuery(company.name, nfcQuery)) {
                    seenIds.add(company.id);
                    uniqueCompanies.push(company);
                }
            }
        }

        console.log(`[Search] Found ${uniqueCompanies.length} matches for query length ${cleanRawQuery.length}.`);

        return NextResponse.json({
            data: uniqueCompanies.map(company => ({ id: company.id, name: company.name }))
        });
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
