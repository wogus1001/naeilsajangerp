import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getPlatformTemplateName } from '@/lib/ucansign/platform-client';
import { verifyUcansignTemplateLinkState } from '@/lib/ucansign/template-link-state';
import { fetchVersionDetails } from '../templateApi';

export const dynamic = 'force-dynamic';

function redirectTarget(request: Request, params: Record<string, string>): URL {
    const url = new URL('/contracts/electronic', process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin);
    for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
    }
    return url;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || '';
    const documentId = searchParams.get('documentId') || '';
    const action = searchParams.get('action') || '';
    const callbackTemplateName = searchParams.get('templateName')
        || searchParams.get('documentName')
        || searchParams.get('name')
        || '';
    try {
        const verified = verifyUcansignTemplateLinkState(state);
        if (!verified || !documentId) {
            return NextResponse.redirect(redirectTarget(request, {
                ucansignTemplate: 'failed',
                reason: 'invalid_callback'
            }));
        }

        const supabaseAdmin = getSupabaseAdmin();
        const details = await fetchVersionDetails(supabaseAdmin, verified.versionId);
        if (!details.version || details.version.template_id !== verified.templateId) {
            return NextResponse.redirect(redirectTarget(request, {
                ucansignTemplate: 'failed',
                reason: 'version_not_found'
            }));
        }

        const now = new Date().toISOString();
        let templateName = callbackTemplateName;
        if (!templateName) {
            try {
                templateName = await getPlatformTemplateName(documentId);
            } catch (error) {
                console.warn('Failed to fetch UCanSign template name:', error);
            }
        }
        const { error: versionError } = await supabaseAdmin
            .from('company_contract_template_versions')
            .update({
                ucansign_template_id: documentId,
                status: 'active',
                updated_at: now
            })
            .eq('id', verified.versionId);
        if (versionError) throw versionError;

        const { error: templateError } = await supabaseAdmin
            .from('company_contract_templates')
            .update({
                ...(templateName ? { name: templateName.slice(0, 120) } : {}),
                status: 'active',
                active_version_id: verified.versionId,
                updated_at: now
            })
            .eq('id', verified.templateId);
        if (templateError) throw templateError;

        return NextResponse.redirect(redirectTarget(request, {
            ucansignTemplate: 'connected',
            templateId: verified.templateId,
            versionId: verified.versionId,
            action
        }));
    } catch (error) {
        console.error('Electronic contract template UCanSign callback error:', error);
        return NextResponse.redirect(redirectTarget(request, {
            ucansignTemplate: 'failed',
            reason: 'server_error'
        }));
    }
}
