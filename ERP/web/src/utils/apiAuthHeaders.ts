import { createClient } from '@/utils/supabase/client';

export async function getApiAuthHeaders(baseHeaders: HeadersInit = {}): Promise<Headers> {
    const headers = new Headers(baseHeaders);
    if (typeof window === 'undefined') return headers;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return headers;

    try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
            headers.set('x-access-token', accessToken);
        }
    } catch (error) {
        console.error('Failed to attach API auth headers:', error);
    }

    return headers;
}
