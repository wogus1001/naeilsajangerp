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
    OWNER_SETTLEMENT_SCHEMA_MESSAGE,
    validateOwnerSettlementFile,
    type OwnerSettlementFileRow,
    type OwnerSettlementSubmissionRow
} from '@/lib/franchise-owner-settlements';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SUBMISSION_SELECT = 'id, request_id, company_id, location_id, owner_account_id, status, total_amount, note, review_note, submitted_at, reviewed_by, reviewed_at, created_at, updated_at';
const FILE_SELECT = 'id, submission_id, company_id, location_id, owner_account_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_at';
const FILE_VALIDATION_MESSAGES = {
    EMPTY: '빈 파일은 업로드할 수 없습니다.',
    TOO_LARGE: '파일은 10MB 이하로 업로드해주세요.',
    INVALID_TYPE: '이미지, PDF, 오피스 문서 파일만 업로드할 수 있습니다.',
    INVALID_CONTENT: '파일 형식과 내용을 확인할 수 없습니다.'
} as const;

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
            .eq('owner_account_id', context.account.id);
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
        if (!submissionId) return fail(400, 'VALIDATION_ERROR', '정산 제출 건을 선택해주세요.');

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

        const { count, error: countError } = await supabaseAdmin
            .from('franchise_owner_settlement_files')
            .select('id', { count: 'exact', head: true })
            .eq('submission_id', submission.id)
            .eq('company_id', context.account.company_id)
            .eq('location_id', context.location.id)
            .eq('owner_account_id', context.account.id);
        if (countError) throw countError;
        if ((count || 0) >= OWNER_PHASE3_STORAGE.maxFileCount) {
            return fail(400, 'VALIDATION_ERROR', `정산 파일은 최대 ${OWNER_PHASE3_STORAGE.maxFileCount}개까지 등록할 수 있습니다.`);
        }

        const file = form.get('file');
        if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', '업로드할 파일을 선택해주세요.');
        const validation = validateOwnerSettlementFile({
            bytes: new Uint8Array(await file.slice(0, 16).arrayBuffer()),
            fileName: file.name,
            mimeType: file.type,
            size: file.size
        });
        if (!validation.ok) return fail(400, 'VALIDATION_ERROR', FILE_VALIDATION_MESSAGES[validation.reason]);

        const storagePath = buildOwnerPhase3StoragePath({
            companyId: context.account.company_id,
            fileName: file.name,
            locationId: context.location.id,
            sourceId: submission.id,
            sourceType: 'settlement'
        });
        if (!storagePath) return fail(400, 'VALIDATION_ERROR', '정산 파일 경로를 만들 수 없습니다.');
        const storage = supabaseAdmin.storage.from(OWNER_PHASE3_STORAGE.bucket);
        const { error: uploadError } = await storage.upload(storagePath, file, {
            contentType: validation.contentType,
            upsert: false
        });
        if (uploadError) throw uploadError;

        const { data: storedFile, error: insertError } = await supabaseAdmin
            .from('franchise_owner_settlement_files')
            .insert({
                submission_id: submission.id,
                company_id: context.account.company_id,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                file_name: file.name,
                mime_type: validation.contentType,
                file_size: file.size,
                storage_bucket: OWNER_PHASE3_STORAGE.bucket,
                storage_path: storagePath
            })
            .select(FILE_SELECT)
            .single<OwnerSettlementFileRow>();
        if (insertError) {
            const { error: cleanupError } = await storage.remove([storagePath]);
            if (cleanupError) console.error('Owner settlement orphan cleanup failed', cleanupError);
            throw insertError;
        }
        return ok({ file: storedFile }, 201);
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Owner settlement file upload failed', error);
        else console.error('Owner settlement file upload failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 파일을 업로드하지 못했습니다.');
    }
}
