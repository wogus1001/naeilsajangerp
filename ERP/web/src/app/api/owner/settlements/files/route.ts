import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import {
    buildOwnerPhase3StoragePath,
    OWNER_PHASE3_STORAGE
} from '@/lib/franchise-owner-phase3';
import {
    isMissingOwnerSettlementSchemaError,
    isOwnerSettlementFileStoragePath,
    isOwnerSettlementMutableStatus,
    isOwnerSettlementStorageConflict,
    OWNER_SETTLEMENT_SCHEMA_MESSAGE,
    parseOwnerSettlementClientFileId,
    validateOwnerSettlementFile,
    type OwnerSettlementFileRow,
    type OwnerSettlementSubmissionRow
} from '@/lib/franchise-owner-settlements';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SUBMISSION_SELECT = 'id, request_id, company_id, location_id, owner_account_id, status, total_amount, note, review_note, submitted_at, reviewed_by, reviewed_at, created_at, updated_at';
const FILE_SELECT = 'id, submission_id, company_id, location_id, owner_account_id, client_file_id, file_name, mime_type, file_size, content_sha256, storage_bucket, storage_path, upload_state, deletion_state, deleted_at, created_at';
const FILE_VALIDATION_MESSAGES = {
    EMPTY: '빈 파일은 업로드할 수 없습니다.',
    TOO_LARGE: '파일은 10MB 이하로 업로드해주세요.',
    INVALID_TYPE: '이미지, PDF, 오피스 문서 파일만 업로드할 수 있습니다.',
    INVALID_CONTENT: '파일 형식과 내용을 확인할 수 없습니다.'
} as const;

function readSettlementFileError(error: unknown): string {
    if (!error || typeof error !== 'object') return '';
    const text = ['message', 'details', 'hint']
        .map(key => Reflect.get(error, key))
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    return text.match(/OWNER_SETTLEMENT_[A-Z_]+/)?.[0] || '';
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('fileId')?.trim() || '';
        const storagePath = searchParams.get('storagePath')?.trim() || '';
        if (!fileId && !storagePath) return fail(400, 'VALIDATION_ERROR', '다운로드할 파일을 선택해주세요.');

        let query = supabaseAdmin
            .from('franchise_owner_settlement_files')
            .select(FILE_SELECT)
            .eq('company_id', context.account.company_id)
            .eq('location_id', context.location.id)
            .eq('owner_account_id', context.account.id)
            .eq('upload_state', 'active')
            .eq('deletion_state', 'active');
        query = fileId ? query.eq('id', fileId) : query.eq('storage_path', storagePath);
        const { data: file, error } = await query.maybeSingle<OwnerSettlementFileRow>();
        if (error) throw error;
        if (!file || !isOwnerSettlementFileStoragePath({
            companyId: file.company_id,
            locationId: file.location_id,
            storageBucket: file.storage_bucket,
            storagePath: file.storage_path,
            submissionId: file.submission_id
        })) return fail(404, 'NOT_FOUND', '정산 파일을 찾을 수 없습니다.');

        const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from(OWNER_PHASE3_STORAGE.bucket)
            .createSignedUrl(file.storage_path, OWNER_PHASE3_STORAGE.signedUrlTtlSeconds, { download: file.file_name });
        if (signedError) throw signedError;
        if (!signed?.signedUrl) return fail(500, 'INTERNAL_ERROR', '정산 파일 URL을 만들지 못했습니다.');
        return Response.redirect(signed.signedUrl, 302);
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Owner settlement file download failed', error);
        else console.error('Owner settlement file download failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 파일을 열지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const form = await request.formData();
        const submissionId = typeof form.get('submissionId') === 'string' ? String(form.get('submissionId')).trim() : '';
        const clientFileId = parseOwnerSettlementClientFileId(form.get('clientFileId'));
        if (!submissionId || !clientFileId) return fail(400, 'VALIDATION_ERROR', '정산 제출 건과 파일 재시도 키를 확인해주세요.');

        const { data: submission, error: submissionError } = await supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select(SUBMISSION_SELECT)
            .eq('id', submissionId)
            .eq('company_id', context.account.company_id)
            .eq('location_id', context.location.id)
            .eq('owner_account_id', context.account.id)
            .maybeSingle<OwnerSettlementSubmissionRow>();
        if (submissionError) throw submissionError;
        if (!submission) return fail(404, 'NOT_FOUND', '정산 제출 건을 찾을 수 없습니다.');
        if (!isOwnerSettlementMutableStatus(submission.status)) {
            return fail(409, 'CONFLICT', '임시저장 또는 반려 상태에서만 파일을 추가할 수 있습니다.');
        }

        const file = form.get('file');
        if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', '업로드할 파일을 선택해주세요.');
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const validation = validateOwnerSettlementFile({
            bytes: fileBytes.slice(0, 16),
            fileName: file.name,
            mimeType: file.type,
            size: file.size
        });
        if (!validation.ok) return fail(400, 'VALIDATION_ERROR', FILE_VALIDATION_MESSAGES[validation.reason]);
        const contentSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', fileBytes)))
            .map(byte => byte.toString(16).padStart(2, '0')).join('');

        const storagePath = buildOwnerPhase3StoragePath({
            companyId: context.account.company_id,
            fileName: file.name,
            locationId: context.location.id,
            sourceId: submission.id,
            sourceType: 'settlement',
            uniqueId: clientFileId
        });
        if (!storagePath) return fail(400, 'VALIDATION_ERROR', '정산 파일 경로를 만들 수 없습니다.');
        const reservationResult = await supabaseAdmin.rpc('reserve_franchise_owner_settlement_file', {
            p_client_file_id: clientFileId,
            p_company_id: context.account.company_id,
            p_content_sha256: contentSha256,
            p_file_name: file.name,
            p_file_size: file.size,
            p_location_id: context.location.id,
            p_mime_type: validation.contentType,
            p_owner_account_id: context.account.id,
            p_storage_bucket: OWNER_PHASE3_STORAGE.bucket,
            p_storage_path: storagePath,
            p_submission_id: submission.id
        });
        if (reservationResult.error) throw reservationResult.error;
        const reservation = reservationResult.data as OwnerSettlementFileRow | null;
        if (!reservation) throw new Error('Settlement file reservation RPC returned no file');
        if (reservation.upload_state === 'active') return ok({ file: reservation });

        try {
            const storage = supabaseAdmin.storage.from(OWNER_PHASE3_STORAGE.bucket);
            const { error: uploadError } = await storage.upload(storagePath, fileBytes, {
                contentType: validation.contentType,
                upsert: false
            });
            if (uploadError && !isOwnerSettlementStorageConflict(uploadError)) throw uploadError;
            const activationResult = await supabaseAdmin.rpc('activate_franchise_owner_settlement_file', {
                p_company_id: context.account.company_id,
                p_file_id: reservation.id,
                p_owner_account_id: context.account.id
            });
            if (activationResult.error) throw activationResult.error;
            const storedFile = activationResult.data as OwnerSettlementFileRow | null;
            if (!storedFile) throw new Error('Settlement file activation RPC returned no file');
            return ok({ file: storedFile }, 201);
        } catch (error) {
            const retryResult = await supabaseAdmin.from('franchise_owner_settlement_files')
                .select(FILE_SELECT).eq('id', reservation.id).maybeSingle<OwnerSettlementFileRow>();
            if (!retryResult.error && retryResult.data?.upload_state === 'active') return ok({ file: retryResult.data }, 201);
            throw error;
        }
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        const fileError = readSettlementFileError(error);
        if (fileError === 'OWNER_SETTLEMENT_FILE_LIMIT') return fail(409, 'CONFLICT', `정산 파일은 최대 ${OWNER_PHASE3_STORAGE.maxFileCount}개까지 등록할 수 있습니다.`);
        if (fileError === 'OWNER_SETTLEMENT_SUBMISSION_NOT_FOUND') return fail(404, 'NOT_FOUND', '정산 제출 건을 찾을 수 없습니다.');
        if (fileError) return fail(409, 'CONFLICT', '현재 상태에서는 정산 파일을 추가할 수 없습니다. 새로고침 후 다시 시도해주세요.');
        if (error instanceof Error) console.error('Owner settlement file upload failed', error);
        else console.error('Owner settlement file upload failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 파일을 업로드하지 못했습니다.');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('fileId')?.trim() || '';
        if (!fileId) return fail(400, 'VALIDATION_ERROR', '삭제할 파일을 선택해주세요.');

        const deletionResult = await supabaseAdmin.rpc('request_franchise_owner_settlement_file_deletion', {
            p_company_id: context.account.company_id,
            p_file_id: fileId,
            p_location_id: context.location.id,
            p_owner_account_id: context.account.id
        });
        if (deletionResult.error) throw deletionResult.error;
        const deletion = deletionResult.data as {
            readonly completed: boolean;
            readonly fileId: string;
            readonly outboxId: string;
            readonly storageBucket: string;
            readonly storagePath: string;
        } | null;
        if (!deletion) throw new Error('Settlement file deletion RPC returned no job');
        if (!deletion.completed) {
            const { error: storageError } = await supabaseAdmin.storage
                .from(deletion.storageBucket)
                .remove([deletion.storagePath]);
            if (storageError) {
                await supabaseAdmin.rpc('record_franchise_owner_file_deletion_failure', {
                    p_error: storageError.message,
                    p_outbox_id: deletion.outboxId
                });
                return fail(503, 'INTERNAL_ERROR', '파일 삭제를 완료하지 못했습니다. 잠시 후 다시 시도해주세요.');
            }
            const completionResult = await supabaseAdmin.rpc('complete_franchise_owner_file_deletion', {
                p_outbox_id: deletion.outboxId
            });
            if (completionResult.error) throw completionResult.error;
        }
        return ok({ deleted: true, fileId: deletion.fileId });
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        const fileError = readSettlementFileError(error);
        if (fileError === 'OWNER_SETTLEMENT_FILE_NOT_FOUND') return fail(404, 'NOT_FOUND', '정산 파일을 찾을 수 없습니다.');
        if (fileError) return fail(409, 'CONFLICT', '현재 상태에서는 정산 파일을 삭제할 수 없습니다. 새로고침 후 다시 시도해주세요.');
        if (error instanceof Error) console.error('Owner settlement file delete failed', error);
        else console.error('Owner settlement file delete failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 파일을 삭제하지 못했습니다.');
    }
}
