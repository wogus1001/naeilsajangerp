import type { SupabaseClient } from '@supabase/supabase-js';
import { fail } from '@/lib/api-response';
import type { OwnerNoticeAttachment } from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerNoticeAttachmentsColumnError
} from '@/lib/franchise-owner-portal-api';

type OwnerNoticeInsertPayload = {
    readonly attachments: readonly OwnerNoticeAttachment[];
    readonly body: string;
    readonly company_id: string;
    readonly created_by: string;
    readonly location_id: string | null;
    readonly status: string;
    readonly title: string;
};

export type OwnerNoticeInsertRow = {
    readonly id: string;
    readonly created_at: string | null;
};

type OwnerNoticeInsertResult =
    | { readonly ok: true; readonly notice: OwnerNoticeInsertRow }
    | { readonly ok: false; readonly response: Response };

async function insertNoticeRow(
    supabaseAdmin: SupabaseClient,
    payload: Omit<OwnerNoticeInsertPayload, 'attachments'> & { readonly attachments?: readonly OwnerNoticeAttachment[] }
): Promise<OwnerNoticeInsertRow> {
    const { data, error } = await supabaseAdmin
        .from('franchise_owner_notices')
        .insert(payload)
        .select('id, created_at')
        .single<OwnerNoticeInsertRow>();
    if (error) throw error;
    if (!data) throw new Error('Owner notice insert returned no row');
    return data;
}

export async function insertOwnerNoticeWithAttachmentFallback(input: {
    readonly attachments: readonly OwnerNoticeAttachment[];
    readonly payload: OwnerNoticeInsertPayload;
    readonly supabaseAdmin: SupabaseClient;
}): Promise<OwnerNoticeInsertResult> {
    try {
        return {
            ok: true,
            notice: await insertNoticeRow(input.supabaseAdmin, input.payload)
        };
    } catch (error) {
        if (!isMissingOwnerNoticeAttachmentsColumnError(error)) throw error;
        if (input.attachments.length > 0) {
            return {
                ok: false,
                response: fail(424, 'VALIDATION_ERROR', '공지 첨부 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_notice_attachments_migration.sql을 등록해주세요.')
            };
        }
        const fallbackPayload = {
            body: input.payload.body,
            company_id: input.payload.company_id,
            created_by: input.payload.created_by,
            location_id: input.payload.location_id,
            status: input.payload.status,
            title: input.payload.title
        };
        return {
            ok: true,
            notice: await insertNoticeRow(input.supabaseAdmin, fallbackPayload)
        };
    }
}

export async function removeOwnerNoticeStoragePaths(input: {
    readonly pathsByBucket: ReadonlyMap<string, readonly string[]>;
    readonly supabaseAdmin: SupabaseClient;
}): Promise<void> {
    for (const [bucket, paths] of input.pathsByBucket) {
        const { error } = await input.supabaseAdmin.storage.from(bucket).remove([...paths]);
        if (error) {
            console.error('Owner portal notice attachment cleanup error:', error);
        }
    }
}
