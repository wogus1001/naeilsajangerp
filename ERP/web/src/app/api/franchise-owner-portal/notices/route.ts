import { fail, ok } from '@/lib/api-response';
import {
    cleanOwnerText,
    isOwnerRecord,
    type OwnerNoticeRecipient,
    type OwnerNoticeRow,
    type OwnerNoticeWithReadStatus
} from '@/lib/franchise-owner-portal';
import {
    fetchOwnerPortalLocation,
    isMissingOwnerPortalSchemaError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

type OwnerAccountRecipientRow = {
    readonly id: string;
    readonly location_id: string;
    readonly login_id: string;
    readonly owner_name: string | null;
    readonly status: string;
};

type OwnerNoticeReadRow = {
    readonly notice_id: string;
    readonly owner_account_id: string;
    readonly read_at: string;
};

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;
        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_notices')
            .select('id, company_id, location_id, title, body, status, created_at')
            .eq('company_id', companyScope.scope.companyId)
            .order('created_at', { ascending: false })
            .limit(50)
            .returns<OwnerNoticeRow[]>();
        if (error) throw error;

        const notices = data || [];
        const noticeIds = notices.map(notice => notice.id);
        const [accountResult, readResult] = await Promise.all([
            authResult.auth.supabaseAdmin
                .from('franchise_owner_accounts')
                .select('id, location_id, login_id, owner_name, status')
                .eq('company_id', companyScope.scope.companyId)
                .order('created_at', { ascending: true })
                .returns<OwnerAccountRecipientRow[]>(),
            noticeIds.length > 0
                ? authResult.auth.supabaseAdmin
                    .from('franchise_owner_notice_reads')
                    .select('notice_id, owner_account_id, read_at')
                    .in('notice_id', noticeIds)
                    .returns<OwnerNoticeReadRow[]>()
                : Promise.resolve({ data: [], error: null })
        ]);
        if (accountResult.error) throw accountResult.error;
        if (readResult.error) throw readResult.error;

        const accounts = accountResult.data || [];
        const readMap = new Map<string, string>();
        for (const read of readResult.data || []) {
            readMap.set(`${read.notice_id}:${read.owner_account_id}`, read.read_at);
        }

        const noticesWithReadStatus: OwnerNoticeWithReadStatus[] = notices.map(notice => {
            const targetAccounts = accounts.filter(account => !notice.location_id || account.location_id === notice.location_id);
            const recipients: OwnerNoticeRecipient[] = targetAccounts.map(account => ({
                ownerAccountId: account.id,
                locationId: account.location_id,
                ownerName: account.owner_name || '점주명 미입력',
                loginId: account.login_id,
                status: account.status,
                readAt: readMap.get(`${notice.id}:${account.id}`) || null
            }));
            const readCount = recipients.filter(recipient => recipient.readAt).length;
            return {
                ...notice,
                targetCount: recipients.length,
                readCount,
                unreadCount: Math.max(recipients.length - readCount, 0),
                recipients
            };
        });

        return ok({ notices: noticesWithReadStatus });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return ok({ notices: [], schemaReady: false });
        console.error('Owner portal notices GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 공지 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '공지 등록 권한이 없습니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '공지 내용을 입력해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, cleanOwnerText(body.companyId), cleanOwnerText(body.companyName));
        if (!companyScope.ok) return companyScope.response;
        const title = cleanOwnerText(body.title);
        const noticeBody = cleanOwnerText(body.body);
        const locationId = cleanOwnerText(body.locationId);
        if (!title || !noticeBody) return fail(400, 'VALIDATION_ERROR', '공지 제목과 내용을 입력해주세요.');
        if (locationId) {
            const location = await fetchOwnerPortalLocation(authResult.auth.supabaseAdmin, companyScope.scope.companyId, locationId);
            if (!location.ok) return location.response;
        }
        const { error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_notices')
            .insert({
                company_id: companyScope.scope.companyId,
                location_id: locationId || null,
                title,
                body: noticeBody,
                status: 'published',
                created_by: authResult.auth.requester.id
            });
        if (error) throw error;
        return ok({ success: true }, 201);
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '점주 포털 SQL이 아직 적용되지 않았습니다.');
        }
        console.error('Owner portal notices POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 공지를 등록하지 못했습니다.');
    }
}
