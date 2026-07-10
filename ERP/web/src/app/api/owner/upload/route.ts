import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function buildSafeFileName(name: string): string {
    const fallback = name.trim() || 'owner-upload';
    return fallback.replace(/[^0-9A-Za-z._-]+/g, '-').slice(0, 80);
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', '업로드할 파일을 선택해주세요.');
        if (!file.type.startsWith('image/')) return fail(400, 'VALIDATION_ERROR', '사진 파일만 업로드할 수 있습니다.');
        if (file.size > 10 * 1024 * 1024) return fail(400, 'VALIDATION_ERROR', '파일은 10MB 이하로 업로드해주세요.');
        const submissionId = typeof form.get('submissionId') === 'string' ? String(form.get('submissionId')) : '';
        const storagePath = `${context.location.id}/owner-portal/${submissionId || 'draft'}/${Date.now()}-${buildSafeFileName(file.name)}`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('property-images')
            .upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabaseAdmin.storage.from('property-images').getPublicUrl(storagePath);
        const { data, error } = await supabaseAdmin
            .from('franchise_owner_files')
            .insert({
                company_id: context.account.company_id,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                submission_id: submissionId || null,
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
                storage_bucket: 'property-images',
                storage_path: storagePath,
                public_url: publicData.publicUrl
            })
            .select('id, public_url')
            .single<{ readonly id: string; readonly public_url: string | null }>();
        if (error) throw error;
        return ok({ fileId: data.id, publicUrl: data.public_url }, 201);
    } catch (error) {
        console.error('Owner upload error:', error);
        return fail(500, 'INTERNAL_ERROR', '사진을 업로드하지 못했습니다.');
    }
}
