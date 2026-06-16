import type { SupabaseClient } from '@supabase/supabase-js';
import {
    decryptGmailToken,
    encryptGmailToken
} from './gmail-integration';
import { refreshGmailAccessToken } from './gmail-provider';

export type ProfileGmailConnectionRow = {
    readonly id: string;
    readonly profile_id: string;
    readonly company_id: string;
    readonly gmail_email: string;
    readonly encrypted_access_token: string;
    readonly encrypted_refresh_token: string | null;
    readonly token_expires_at: string | null;
    readonly scope: string | null;
    readonly status: string | null;
    readonly created_at: string;
    readonly updated_at: string;
    readonly data?: unknown;
};

export type GmailConnectionSummary = {
    readonly id: string;
    readonly profileId: string;
    readonly companyId: string;
    readonly gmailEmail: string;
    readonly tokenExpiresAt: string | null;
    readonly scope: string;
    readonly status: string;
    readonly updatedAt: string;
};

export type UsableGmailConnection = {
    readonly connection: ProfileGmailConnectionRow;
    readonly accessToken: string;
};

function isExpiringSoon(value: string | null): boolean {
    if (!value) return false;
    const expiresAt = new Date(value).getTime();
    if (Number.isNaN(expiresAt)) return false;
    return expiresAt <= Date.now() + 60_000;
}

export function sanitizeGmailConnection(row: ProfileGmailConnectionRow): GmailConnectionSummary {
    return {
        id: row.id,
        profileId: row.profile_id,
        companyId: row.company_id,
        gmailEmail: row.gmail_email,
        tokenExpiresAt: row.token_expires_at,
        scope: row.scope || '',
        status: row.status || 'active',
        updatedAt: row.updated_at
    };
}

export async function fetchActiveGmailConnection(
    supabaseAdmin: SupabaseClient,
    profileId: string,
    companyId: string
): Promise<ProfileGmailConnectionRow | null> {
    const { data, error } = await supabaseAdmin
        .from('profile_gmail_connections')
        .select('*')
        .eq('profile_id', profileId)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data as ProfileGmailConnectionRow | null;
}

export async function resolveUsableGmailConnection(
    supabaseAdmin: SupabaseClient,
    connection: ProfileGmailConnectionRow
): Promise<UsableGmailConnection> {
    if (!isExpiringSoon(connection.token_expires_at)) {
        return {
            connection,
            accessToken: decryptGmailToken(connection.encrypted_access_token)
        };
    }

    if (!connection.encrypted_refresh_token) {
        return {
            connection,
            accessToken: decryptGmailToken(connection.encrypted_access_token)
        };
    }

    const refreshed = await refreshGmailAccessToken(decryptGmailToken(connection.encrypted_refresh_token));
    const updates = {
        encrypted_access_token: encryptGmailToken(refreshed.accessToken),
        token_expires_at: refreshed.expiresAt,
        scope: refreshed.scope,
        updated_at: new Date().toISOString()
    };
    const { data, error } = await supabaseAdmin
        .from('profile_gmail_connections')
        .update(updates)
        .eq('id', connection.id)
        .select('*')
        .single();
    if (error) throw error;
    return {
        connection: data as ProfileGmailConnectionRow,
        accessToken: refreshed.accessToken
    };
}
