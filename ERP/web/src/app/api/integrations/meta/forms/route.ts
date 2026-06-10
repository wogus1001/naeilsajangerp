import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canManageMetaIntegration,
    normalizeFieldMapping,
    sanitizeMetaForm
} from '@/lib/meta-leads';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || null
        );

        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }
        if (!canManageMetaIntegration(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Only managers can manage Meta forms');
        }
        if (!body.id) {
            return fail(400, 'VALIDATION_ERROR', 'Form ID is required');
        }

        const { data: form, error: formError } = await supabaseAdmin
            .from('meta_lead_forms')
            .select('*')
            .eq('id', body.id)
            .single();

        if (formError || !form) {
            return fail(404, 'NOT_FOUND', 'Meta form not found');
        }
        if (!canAccessCompanyScope(requesterProfile, form.company_id)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company form update denied');
        }

        const updates: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (typeof body.enabled === 'boolean') {
            updates.enabled = body.enabled;
        }

        if (body.defaultManagerId !== undefined) {
            const managerUuid = await resolveUserUuid(supabaseAdmin, body.defaultManagerId);
            if (!managerUuid) {
                return fail(400, 'VALIDATION_ERROR', 'Invalid default manager');
            }

            const { data: managerProfile } = await supabaseAdmin
                .from('profiles')
                .select('company_id')
                .eq('id', managerUuid)
                .maybeSingle();

            if (!managerProfile || managerProfile.company_id !== form.company_id) {
                return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
            }

            updates.default_manager_id = managerUuid;
        }

        if (body.fieldMapping !== undefined) {
            updates.field_mapping = normalizeFieldMapping(body.fieldMapping);
        }

        const { data: updated, error } = await supabaseAdmin
            .from('meta_lead_forms')
            .update(updates)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        return ok({ form: sanitizeMetaForm(updated) });
    } catch (error) {
        console.error('Meta form PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update Meta form');
    }
}
