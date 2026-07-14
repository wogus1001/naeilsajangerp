import { randomUUID } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
    getAuthenticatedRequesterProfile,
    resolveUserUuid,
    type RequesterProfile
} from '@/lib/api-auth';

const DEFAULT_UCANSIGN_RETURN_PATH = '/profile?ucansign=connected';

export type UcansignUserGuardResult = {
    readonly ok: true;
    readonly userId: string;
    readonly requester: RequesterProfile;
} | {
    readonly ok: false;
    readonly response: NextResponse;
};

export async function requireAuthenticatedUcansignUser(
    supabaseAdmin: SupabaseClient,
    request: Request,
    legacyUserId?: string | null
): Promise<UcansignUserGuardResult> {
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) {
        return {
            ok: false,
            response: NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 })
        };
    }

    if (legacyUserId) {
        const resolvedUserId = await resolveUserUuid(supabaseAdmin, legacyUserId);
        if (!resolvedUserId) {
            return {
                ok: false,
                response: NextResponse.json({ error: 'User not found or not connected' }, { status: 404 })
            };
        }
        if (resolvedUserId !== requester.id) {
            return {
                ok: false,
                response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            };
        }
    }

    return { ok: true, userId: requester.id, requester };
}

export function normalizeUcansignReturnPath(rawPath: string | null): string {
    if (!rawPath || !rawPath.startsWith('/') || rawPath.startsWith('//')) return DEFAULT_UCANSIGN_RETURN_PATH;

    try {
        const parsed = new URL(rawPath, 'https://fcerp.local');
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return DEFAULT_UCANSIGN_RETURN_PATH;
    }
}

export function createUcansignState(returnPath: string): string {
    return Buffer.from(JSON.stringify({
        nonce: randomUUID(),
        ret: normalizeUcansignReturnPath(returnPath)
    })).toString('base64url');
}

export function readUcansignReturnPath(state: string | null): string {
    if (!state) return DEFAULT_UCANSIGN_RETURN_PATH;

    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
        const rawPath = typeof decoded?.ret === 'string' ? decoded.ret : null;
        return normalizeUcansignReturnPath(rawPath);
    } catch {
        return DEFAULT_UCANSIGN_RETURN_PATH;
    }
}

export function isMatchingUcansignState(received: string | null, expected: string | null): boolean {
    if (!received || !expected) return false;
    const receivedBytes = Buffer.from(received);
    const expectedBytes = Buffer.from(expected);
    return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}
