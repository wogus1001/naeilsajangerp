import type { SupabaseClient } from '@supabase/supabase-js';
import { fail, ok } from '@/lib/api-response';
import {
    buildOwnerContentStoragePath,
    isMissingOwnerContentSchemaError,
    isOwnerContentStoragePath,
    OWNER_CONTENT_SCHEMA_MESSAGE,
    OWNER_CONTENT_STORAGE,
    validateOwnerContentAttachment,
    type OwnerContentAttachmentRow,
    type OwnerContentItemRow
} from '@/lib/franchise-owner-content';
import {
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

const ATTACHMENT_SELECT = 'id, content_id, company_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_by, created_at';
const CONTENT_SCOPE_SELECT = 'id, company_id, location_id, status';
const FILE_VALIDATION_MESSAGES = {
    EMPTY: '빈 파일은 업로드할 수 없습니다.',
    TOO_LARGE: '파일은 10MB 이하로 업로드해주세요.',
    INVALID_TYPE: '이미지, PDF, 오피스 문서 파일만 업로드할 수 있습니다.',
    INVALID_CONTENT: '파일 형식과 내용을 확인할 수 없습니다.'
} as const;

function cleanFormValue(value: FormDataEntryValue | null): string {
    return typeof value === 'string' ? value.trim() : '';
}

async function fetchContentScope(supabaseAdmin: SupabaseClient, companyId: string, contentId: string) {
    const { data, error } = await supabaseAdmin
        .from('franchise_owner_content_items')
        .select(CONTENT_SCOPE_SELECT)
        .eq('id', contentId)
        .eq('company_id', companyId)
        .maybeSingle<Pick<OwnerContentItemRow, 'id' | 'company_id' | 'location_id' | 'status'>>();
    if (error) throw error;
    return data;
}

async function hasCompanyLocationScope(
    supabaseAdmin: SupabaseClient,
    companyId: string,
    locationId: string | null
): Promise<boolean> {
    if (!locationId) return true;
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id')
        .eq('id', locationId)
        .eq('company_id', companyId)
        .maybeSingle<{ readonly id: string }>();
    if (error) throw error;
    return Boolean(data);
}

function hasValidPath(content: Pick<OwnerContentItemRow, 'id' | 'company_id' | 'location_id'>, attachment: OwnerContentAttachmentRow): boolean {
    return attachment.company_id === content.company_id
        && attachment.content_id === content.id
        && isOwnerContentStoragePath({
            companyId: content.company_id,
            contentId: content.id,
            locationId: content.location_id,
            storageBucket: attachment.storage_bucket,
            storagePath: attachment.storage_path
        });
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '콘텐츠 첨부 열람 권한이 없습니다.');
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;
        const attachmentId = searchParams.get('attachmentId')?.trim() || searchParams.get('fileId')?.trim() || '';
        const storagePath = searchParams.get('storagePath')?.trim() || '';
        if (!attachmentId && !storagePath) return fail(400, 'VALIDATION_ERROR', '다운로드할 파일을 선택해주세요.');

        let query = authResult.auth.supabaseAdmin
            .from('franchise_owner_content_attachments')
            .select(ATTACHMENT_SELECT)
            .eq('company_id', companyScope.scope.companyId);
        query = attachmentId ? query.eq('id', attachmentId) : query.eq('storage_path', storagePath);
        const attachmentResult = await query.maybeSingle<OwnerContentAttachmentRow>();
        if (attachmentResult.error) throw attachmentResult.error;
        if (!attachmentResult.data) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        const content = await fetchContentScope(
            authResult.auth.supabaseAdmin,
            companyScope.scope.companyId,
            attachmentResult.data.content_id
        );
        if (!content
            || !await hasCompanyLocationScope(authResult.auth.supabaseAdmin, companyScope.scope.companyId, content.location_id)
            || !hasValidPath(content, attachmentResult.data)) {
            return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        }

        const signedResult = await authResult.auth.supabaseAdmin.storage
            .from(OWNER_CONTENT_STORAGE.bucket)
            .createSignedUrl(attachmentResult.data.storage_path, OWNER_CONTENT_STORAGE.signedUrlTtlSeconds);
        if (signedResult.error || !signedResult.data?.signedUrl) {
            throw signedResult.error || new Error('Staff content attachment signed URL was not returned');
        }
        return ok({ url: signedResult.data.signedUrl });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        if (error instanceof Error) console.error('Staff content attachment GET failed', error);
        else console.error('Staff content attachment GET failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '첨부 파일을 열지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '콘텐츠 첨부 업로드 권한이 없습니다.');
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', '업로드할 파일을 선택해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            cleanFormValue(form.get('companyId')),
            cleanFormValue(form.get('companyName'))
        );
        if (!companyScope.ok) return companyScope.response;
        const contentId = cleanFormValue(form.get('contentId'));
        if (!contentId) return fail(400, 'VALIDATION_ERROR', '콘텐츠를 선택해주세요.');
        const content = await fetchContentScope(authResult.auth.supabaseAdmin, companyScope.scope.companyId, contentId);
        if (!content) return fail(404, 'NOT_FOUND', '콘텐츠를 찾을 수 없습니다.');
        if (!await hasCompanyLocationScope(authResult.auth.supabaseAdmin, companyScope.scope.companyId, content.location_id)) {
            return fail(404, 'NOT_FOUND', '콘텐츠 운영점을 찾을 수 없습니다.');
        }

        const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
        const validation = validateOwnerContentAttachment({
            bytes,
            fileName: file.name,
            mimeType: file.type,
            size: file.size
        });
        if (!validation.ok) return fail(400, 'VALIDATION_ERROR', FILE_VALIDATION_MESSAGES[validation.reason]);
        const countResult = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_attachments')
            .select('id', { count: 'exact', head: true })
            .eq('content_id', content.id)
            .eq('company_id', companyScope.scope.companyId);
        if (countResult.error) throw countResult.error;
        if ((countResult.count || 0) >= OWNER_CONTENT_STORAGE.maxFileCount) {
            return fail(409, 'CONFLICT', '콘텐츠에는 파일을 최대 10개까지 첨부할 수 있습니다.');
        }
        const storagePath = buildOwnerContentStoragePath({
            companyId: companyScope.scope.companyId,
            contentId: content.id,
            fileName: file.name,
            locationId: content.location_id
        });
        if (!storagePath) return fail(400, 'VALIDATION_ERROR', '첨부 파일 저장 경로를 만들 수 없습니다.');

        const uploadResult = await authResult.auth.supabaseAdmin.storage
            .from(OWNER_CONTENT_STORAGE.bucket)
            .upload(storagePath, file, { contentType: validation.contentType, upsert: false });
        if (uploadResult.error) throw uploadResult.error;
        const insertResult = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_attachments')
            .insert({
                company_id: companyScope.scope.companyId,
                content_id: content.id,
                created_by: authResult.auth.requester.id,
                file_name: file.name,
                file_size: file.size,
                mime_type: validation.contentType,
                storage_bucket: OWNER_CONTENT_STORAGE.bucket,
                storage_path: storagePath
            })
            .select(ATTACHMENT_SELECT)
            .single<OwnerContentAttachmentRow>();
        if (insertResult.error) {
            const cleanupResult = await authResult.auth.supabaseAdmin.storage
                .from(OWNER_CONTENT_STORAGE.bucket)
                .remove([storagePath]);
            if (cleanupResult.error) console.error('Content attachment rollback cleanup failed', cleanupResult.error);
            throw insertResult.error;
        }
        const finalCountResult = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_attachments')
            .select('id', { count: 'exact', head: true })
            .eq('content_id', content.id)
            .eq('company_id', companyScope.scope.companyId);
        if (finalCountResult.error) throw finalCountResult.error;
        if ((finalCountResult.count || 0) > OWNER_CONTENT_STORAGE.maxFileCount) {
            const rollbackRowResult = await authResult.auth.supabaseAdmin
                .from('franchise_owner_content_attachments')
                .delete()
                .eq('id', insertResult.data.id)
                .eq('company_id', companyScope.scope.companyId);
            const rollbackStorageResult = await authResult.auth.supabaseAdmin.storage
                .from(OWNER_CONTENT_STORAGE.bucket)
                .remove([storagePath]);
            if (rollbackRowResult.error || rollbackStorageResult.error) {
                throw rollbackRowResult.error || rollbackStorageResult.error;
            }
            return fail(409, 'CONFLICT', '콘텐츠에는 파일을 최대 10개까지 첨부할 수 있습니다.');
        }
        return ok({ attachment: insertResult.data }, 201);
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        if (error instanceof Error) console.error('Staff content attachment POST failed', error);
        else console.error('Staff content attachment POST failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '첨부 파일을 업로드하지 못했습니다.');
    }
}

export async function DELETE(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '콘텐츠 첨부 삭제 권한이 없습니다.');
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;
        const attachmentId = searchParams.get('attachmentId')?.trim() || searchParams.get('fileId')?.trim() || '';
        if (!attachmentId) return fail(400, 'VALIDATION_ERROR', '삭제할 파일을 선택해주세요.');

        const attachmentResult = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_attachments')
            .select(ATTACHMENT_SELECT)
            .eq('id', attachmentId)
            .eq('company_id', companyScope.scope.companyId)
            .maybeSingle<OwnerContentAttachmentRow>();
        if (attachmentResult.error) throw attachmentResult.error;
        if (!attachmentResult.data) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        const content = await fetchContentScope(
            authResult.auth.supabaseAdmin,
            companyScope.scope.companyId,
            attachmentResult.data.content_id
        );
        if (!content
            || !await hasCompanyLocationScope(authResult.auth.supabaseAdmin, companyScope.scope.companyId, content.location_id)
            || !hasValidPath(content, attachmentResult.data)) {
            return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        }

        const storageResult = await authResult.auth.supabaseAdmin.storage
            .from(OWNER_CONTENT_STORAGE.bucket)
            .remove([attachmentResult.data.storage_path]);
        if (storageResult.error) throw storageResult.error;
        const deleteResult = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_attachments')
            .delete()
            .eq('id', attachmentResult.data.id)
            .eq('company_id', companyScope.scope.companyId);
        if (deleteResult.error) throw deleteResult.error;
        return ok({ success: true });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        if (error instanceof Error) console.error('Staff content attachment DELETE failed', error);
        else console.error('Staff content attachment DELETE failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '첨부 파일을 삭제하지 못했습니다.');
    }
}
