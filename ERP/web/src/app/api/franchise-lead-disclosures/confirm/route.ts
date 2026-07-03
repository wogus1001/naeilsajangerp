import { NextResponse } from 'next/server';
import { notifyAlimtalkDisclosureConfirmed } from '@/lib/alimtalk-event-notifications';
import { hashDisclosureConfirmationToken } from '@/lib/gmail-integration';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function html(body: string, status = 200) {
    return new NextResponse(body, {
        status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

function renderPage(title: string, message: string) {
    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
    main { width: min(520px, calc(100vw - 32px)); border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; padding: 28px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); }
    h1 { margin: 0 0 10px; font-size: 22px; }
    p { margin: 0; color: #475569; line-height: 1.6; }
  </style>
</head>
<body><main><h1>${title}</h1><p>${message}</p></main></body>
</html>`;
}

type DisclosureConfirmationDeliveryRow = {
    readonly id: string;
    readonly company_id: string;
    readonly lead_id: string;
    readonly recipient_name: string | null;
    readonly document_title: string | null;
    readonly confirmed_at: string | null;
    readonly data: unknown;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token') || '';
        if (!token) {
            return html(renderPage('수령 확인 실패', '확인 토큰이 없습니다.'), 400);
        }

        const supabaseAdmin = getSupabaseAdmin();
        const tokenHash = hashDisclosureConfirmationToken(token);
        const { data: delivery, error } = await supabaseAdmin
            .from('franchise_lead_disclosure_deliveries')
            .select('id, company_id, lead_id, recipient_name, document_title, confirmed_at, data')
            .eq('confirmation_token_hash', tokenHash)
            .maybeSingle<DisclosureConfirmationDeliveryRow>();
        if (error) throw error;
        if (!delivery) {
            return html(renderPage('수령 확인 실패', '유효하지 않거나 만료된 확인 링크입니다.'), 404);
        }

        const confirmedAt = delivery.confirmed_at;
        if (!confirmedAt) {
            const nextConfirmedAt = new Date().toISOString();
            await supabaseAdmin
                .from('franchise_lead_disclosure_deliveries')
                .update({
                    confirmed_at: nextConfirmedAt,
                    updated_at: nextConfirmedAt
                })
                .eq('id', delivery.id)
                .is('confirmed_at', null);

            try {
                await notifyAlimtalkDisclosureConfirmed(supabaseAdmin, {
                    ...delivery,
                    confirmed_at: nextConfirmedAt
                });
            } catch (error) {
                console.error(
                    'Disclosure confirmation AlimTalk notification failed:',
                    error instanceof Error ? error.message : String(error)
                );
            }
        }

        return html(renderPage('수령 확인 완료', '정보공개서 수령 확인이 기록되었습니다. 감사합니다.'));
    } catch (error) {
        console.error('Disclosure confirmation error:', error);
        return html(renderPage('수령 확인 실패', '수령 확인 처리 중 오류가 발생했습니다.'), 500);
    }
}
