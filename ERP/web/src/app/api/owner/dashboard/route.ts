import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import {
    buildOwnerNoticeAttachmentDownloadUrl,
    readOwnerPortalChecklistIssuesFromLocationData,
    readOwnerPortalChecklistTasksFromLocationData,
    readOwnerProvidedBasicsFromLocationData,
    resolveOwnerNoticeAttachmentsForCompany,
    type OwnerFileRow,
    type OwnerNoticeRow,
    type OwnerSubmissionRow
} from '@/lib/franchise-owner-portal';
import { isMissingOwnerNoticeAttachmentsColumnError } from '@/lib/franchise-owner-portal-api';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type OwnerNoticeLegacyRow = Omit<OwnerNoticeRow, 'attachments'>;

export async function GET() {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');

        const noticeResultWithAttachments = await supabaseAdmin
            .from('franchise_owner_notices')
            .select('id, company_id, location_id, title, body, status, created_at, attachments')
            .eq('company_id', context.account.company_id)
            .eq('status', 'published')
            .or(`location_id.is.null,location_id.eq.${context.account.location_id}`)
            .order('created_at', { ascending: false })
            .limit(20)
            .returns<OwnerNoticeRow[]>();
        let noticeRows: readonly OwnerNoticeRow[] = [];
        if (noticeResultWithAttachments.error) {
            if (!isMissingOwnerNoticeAttachmentsColumnError(noticeResultWithAttachments.error)) {
                throw noticeResultWithAttachments.error;
            }
            const fallbackNoticeResult = await supabaseAdmin
                .from('franchise_owner_notices')
                .select('id, company_id, location_id, title, body, status, created_at')
                .eq('company_id', context.account.company_id)
                .eq('status', 'published')
                .or(`location_id.is.null,location_id.eq.${context.account.location_id}`)
                .order('created_at', { ascending: false })
                .limit(20)
                .returns<OwnerNoticeLegacyRow[]>();
            if (fallbackNoticeResult.error) throw fallbackNoticeResult.error;
            noticeRows = (fallbackNoticeResult.data || []).map(notice => ({ ...notice, attachments: [] }));
        } else {
            noticeRows = noticeResultWithAttachments.data || [];
        }

        const noticeIds = noticeRows.map(notice => notice.id);
        const readResult = noticeIds.length > 0
            ? await supabaseAdmin
                .from('franchise_owner_notice_reads')
                .select('notice_id, read_at')
                .eq('owner_account_id', context.account.id)
                .in('notice_id', noticeIds)
                .returns<{ readonly notice_id: string; readonly read_at: string }[]>()
            : { data: [], error: null };
        if (readResult.error) throw readResult.error;
        const readMap = new Map((readResult.data || []).map(read => [read.notice_id, read.read_at]));

        const submissionResult = await supabaseAdmin
            .from('franchise_owner_submissions')
            .select('id, company_id, location_id, owner_account_id, submission_type, title, body, payload, status, review_note, reviewed_at, created_at')
            .eq('owner_account_id', context.account.id)
            .order('created_at', { ascending: false })
            .limit(20)
            .returns<OwnerSubmissionRow[]>();
        if (submissionResult.error) throw submissionResult.error;
        const submissionIds = (submissionResult.data || []).map(submission => submission.id);
        const fileResult = submissionIds.length > 0
            ? await supabaseAdmin
                .from('franchise_owner_files')
                .select('id, submission_id, file_name, mime_type, file_size, storage_bucket, storage_path, public_url, created_at')
                .eq('owner_account_id', context.account.id)
                .in('submission_id', submissionIds)
                .order('created_at', { ascending: true })
                .returns<OwnerFileRow[]>()
            : { data: [], error: null };
        if (fileResult.error) throw fileResult.error;
        const filesBySubmission = new Map<string, OwnerFileRow[]>();
        for (const file of fileResult.data || []) {
            if (!file.submission_id) continue;
            const current = filesBySubmission.get(file.submission_id) || [];
            current.push(file);
            filesBySubmission.set(file.submission_id, current);
        }

        return ok({
            account: {
                id: context.account.id,
                loginId: context.account.login_id,
                ownerName: context.account.owner_name,
                ownerPhone: context.account.owner_phone,
                temporaryPassword: context.account.temporary_password === true
            },
            location: {
                id: context.location.id,
                name: context.location.name || '내 매장',
                brand: context.location.brand || '',
                status: context.location.status || '',
                region: context.location.region || '',
                address: context.location.address || '',
                basics: readOwnerProvidedBasicsFromLocationData(context.location.data)
            },
            notices: noticeRows.map(notice => ({
                id: notice.id,
                title: notice.title,
                body: notice.body,
                createdAt: notice.created_at,
                readAt: readMap.get(notice.id) || null,
                attachments: resolveOwnerNoticeAttachmentsForCompany({
                    companyId: context.account.company_id,
                    attachments: notice.attachments,
                    getDownloadUrl: (_bucket, storagePath) => buildOwnerNoticeAttachmentDownloadUrl(storagePath)
                })
            })),
            openingProject: {
                id: context.location.id,
                status: 'owner_portal_checklist',
                tasks: readOwnerPortalChecklistTasksFromLocationData(context.location.data),
                issues: readOwnerPortalChecklistIssuesFromLocationData(context.location.data)
            },
            submissions: (submissionResult.data || []).map(submission => ({
                ...submission,
                files: filesBySubmission.get(submission.id) || []
            }))
        });
    } catch (error) {
        console.error('Owner dashboard error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 포털 데이터를 불러오지 못했습니다.');
    }
}
