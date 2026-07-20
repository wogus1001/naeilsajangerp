import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const OWNER_SESSION_COOKIE = 'fc_owner_session';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type OwnerAccountRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly login_id: string;
    readonly owner_name: string | null;
    readonly owner_phone: string | null;
    readonly password_hash: string;
    readonly status: string | null;
    readonly temporary_password: boolean | null;
};

export type OwnerLocationRow = {
    readonly id: string;
    readonly company_id: string;
    readonly name: string | null;
    readonly brand: string | null;
    readonly status: string | null;
    readonly region: string | null;
    readonly address: string | null;
    readonly memo: string | null;
    readonly manager_id: string | null;
    readonly data: unknown;
};

export type OwnerSessionContext = {
    readonly account: OwnerAccountRow;
    readonly location: OwnerLocationRow;
};

function toBuffer(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof ArrayBuffer) return Buffer.from(value);
    if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    return Buffer.from(String(value));
}

export function normalizeOwnerLoginId(value: string): string {
    return value.trim().toLocaleLowerCase('ko-KR');
}

export function generateTemporaryOwnerPassword(): string {
    return randomBytes(6).toString('base64url');
}

export function createOwnerSessionToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashOwnerSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function getOwnerSessionExpiresAt(): Date {
    return new Date(Date.now() + SESSION_TTL_MS);
}

export async function hashOwnerPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const key = toBuffer(await scrypt(password, salt, PASSWORD_KEY_LENGTH));
    return `scrypt:${salt}:${key.toString('base64url')}`;
}

export async function verifyOwnerPassword(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split(':');
    const [scheme, salt, key] = parts;
    if (scheme !== 'scrypt' || !salt || !key) return false;
    const expected = Buffer.from(key, 'base64url');
    const actual = toBuffer(await scrypt(password, salt, expected.length));
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
}

export async function readOwnerSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(OWNER_SESSION_COOKIE)?.value || null;
}

export async function getOwnerSessionContext(supabaseAdmin: SupabaseClient): Promise<OwnerSessionContext | null> {
    const token = await readOwnerSessionToken();
    if (!token) return null;
    const tokenHash = hashOwnerSessionToken(token);
    const { data: session } = await supabaseAdmin
        .from('franchise_owner_sessions')
        .select('owner_account_id, expires_at, revoked_at')
        .eq('session_token_hash', tokenHash)
        .maybeSingle<{ readonly owner_account_id: string; readonly expires_at: string; readonly revoked_at: string | null }>();
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;

    const { data: account } = await supabaseAdmin
        .from('franchise_owner_accounts')
        .select('id, company_id, location_id, login_id, owner_name, owner_phone, password_hash, status, temporary_password')
        .eq('id', session.owner_account_id)
        .maybeSingle<OwnerAccountRow>();
    if (!account || account.status !== 'active') return null;

    const { data: location } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, name, brand, status, region, address, memo, manager_id, data')
        .eq('id', account.location_id)
        .eq('company_id', account.company_id)
        .maybeSingle<OwnerLocationRow>();
    if (!location) return null;

    return { account, location };
}
