import { randomUUID } from 'node:crypto';
import { canAccessCompanyScope, getRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildCompanyLogoStoragePath,
    COMPANY_LOGO_ALLOWED_MIME_TYPES,
    COMPANY_LOGO_MAX_BYTES,
    isCompanyLogoSchemaMissingError,
    normalizeCompanyLogoCompanyId,
    validateCompanyLogoFile
} from '@/lib/company-logo';
import {
    ensureCompanyLogoBucket,
    fetchLatestStoredCompanyLogo,
    getCompanyLogoPublicUrl,
    removeStoredCompanyLogos,
    removeStoredLogoPath,
    type StoredCompanyLogo
} from '@/lib/company-logo-storage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const LOGO_BUCKET = 'property-images';

type CompanyBasicRow = {
    readonly id: string;
    readonly name: string | null;
};

type CompanyLogoRow = {
    readonly id: string;
    readonly name: string | null;
    readonly logo_url: string | null;
    readonly logo_path: string | null;
    readonly logo_file_name: string | null;
    readonly logo_file_size: number | null;
    readonly logo_mime_type: string | null;
    readonly logo_updated_at: string | null;
};

type CompanyLogoFields = StoredCompanyLogo | null;

type CompanyLogoView = {
    readonly companyId: string;
    readonly companyName: string;
    readonly logoUrl: string | null;
    readonly logoPath: string | null;
    readonly logoFileName: string | null;
    readonly logoFileSize: number | null;
    readonly logoMimeType: string | null;
    readonly logoUpdatedAt: string | null;
    readonly maxFileSizeBytes: number;
    readonly allowedMimeTypes: readonly string[];
};

function canManageCompanyLogo(requester: RequesterProfile): boolean {
    return requester.role === 'manager';
}

function toLogoView(row: CompanyBasicRow, logo: CompanyLogoFields): CompanyLogoView {
    return {
        companyId: row.id,
        companyName: row.name || '회사명 없음',
        logoUrl: logo?.logoUrl || null,
        logoPath: logo?.logoPath || null,
        logoFileName: logo?.logoFileName || null,
        logoFileSize: logo?.logoFileSize || null,
        logoMimeType: logo?.logoMimeType || null,
        logoUpdatedAt: logo?.logoUpdatedAt || null,
        maxFileSizeBytes: COMPANY_LOGO_MAX_BYTES,
        allowedMimeTypes: COMPANY_LOGO_ALLOWED_MIME_TYPES
    };
}

function logoFieldsFromMetadata(row: CompanyLogoRow): CompanyLogoFields {
    if (!row.logo_url && !row.logo_path) return null;
    return {
        logoUrl: row.logo_url || '',
        logoPath: row.logo_path || '',
        logoFileName: row.logo_file_name,
        logoFileSize: row.logo_file_size,
        logoMimeType: row.logo_mime_type,
        logoUpdatedAt: row.logo_updated_at
    };
}

async function fetchCompanyBasic(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, companyId: string) {
    return supabaseAdmin
        .from('companies')
        .select('id, name')
        .eq('id', companyId)
        .maybeSingle<CompanyBasicRow>();
}

async function fetchCompanyLogoMetadata(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, companyId: string) {
    return supabaseAdmin
        .from('companies')
        .select('id, name, logo_url, logo_path, logo_file_name, logo_file_size, logo_mime_type, logo_updated_at')
        .eq('id', companyId)
        .maybeSingle<CompanyLogoRow>();
}

async function fetchCompanyLogoView(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    companyId: string
): Promise<{ readonly data: CompanyLogoView | null; readonly error: unknown | null }> {
    const { data: company, error: companyError } = await fetchCompanyBasic(supabaseAdmin, companyId);
    if (companyError || !company) return { data: null, error: companyError || new Error('Company not found') };

    const metadataResult = await fetchCompanyLogoMetadata(supabaseAdmin, companyId);
    if (metadataResult.error && !isCompanyLogoSchemaMissingError(metadataResult.error)) {
        return { data: null, error: metadataResult.error };
    }

    if (metadataResult.data) {
        const metadataLogo = logoFieldsFromMetadata(metadataResult.data);
        if (metadataLogo?.logoUrl) return { data: toLogoView(metadataResult.data, metadataLogo), error: null };
    }

    const storedLogo = await fetchLatestStoredCompanyLogo(supabaseAdmin, LOGO_BUCKET, companyId);
    if (storedLogo.error) {
        console.error('Company logo storage lookup failed:', storedLogo.error.message);
    }

    return { data: toLogoView(company, storedLogo.data), error: null };
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

    const { searchParams } = new URL(request.url);
    const targetCompanyId = normalizeCompanyLogoCompanyId(searchParams.get('companyId')) || requester.company_id;
    if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
    if (!canAccessCompanyScope(requester, targetCompanyId)) return fail(403, 'FORBIDDEN', '회사 로고를 조회할 권한이 없습니다.');

    const { data, error } = await fetchCompanyLogoView(supabaseAdmin, targetCompanyId);
    if (error) {
        console.error('Company logo GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '회사 로고 정보를 불러오지 못했습니다.');
    }
    if (!data) return fail(404, 'NOT_FOUND', '회사를 찾을 수 없습니다.');

    return ok(data);
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const formData = await request.formData();
        const fileValue = formData.get('file');
        const targetCompanyId = normalizeCompanyLogoCompanyId(formData.get('companyId')) || requester.company_id;
        if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canManageCompanyLogo(requester)) return fail(403, 'FORBIDDEN', '회사 로고는 팀장만 수정할 수 있습니다.');
        if (!canAccessCompanyScope(requester, targetCompanyId)) return fail(403, 'FORBIDDEN', '회사 로고를 수정할 권한이 없습니다.');
        if (!(fileValue instanceof File)) return fail(400, 'VALIDATION_ERROR', '로고 파일이 필요합니다.');

        const validation = validateCompanyLogoFile({
            name: fileValue.name,
            size: fileValue.size,
            type: fileValue.type
        });
        if (!validation.ok) return fail(400, 'VALIDATION_ERROR', validation.message);

        const { data: currentCompany, error: currentError } = await fetchCompanyLogoView(supabaseAdmin, targetCompanyId);
        if (currentError) {
            console.error('Company logo current fetch error:', currentError);
            return fail(500, 'INTERNAL_ERROR', '회사 정보를 확인하지 못했습니다.');
        }
        if (!currentCompany) return fail(404, 'NOT_FOUND', '회사를 찾을 수 없습니다.');

        const bucketError = await ensureCompanyLogoBucket(supabaseAdmin, LOGO_BUCKET);
        if (bucketError) {
            console.error('Company logo bucket prepare error:', bucketError);
            return fail(500, 'INTERNAL_ERROR', '로고 저장소를 준비하지 못했습니다.');
        }

        const storagePath = buildCompanyLogoStoragePath(targetCompanyId, fileValue.name, fileValue.type, randomUUID());
        const uploadBuffer = Buffer.from(await fileValue.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
            .from(LOGO_BUCKET)
            .upload(storagePath, uploadBuffer, {
                contentType: fileValue.type,
                upsert: true
            });

        if (uploadError) {
            console.error('Company logo upload error:', uploadError);
            return fail(500, 'INTERNAL_ERROR', '로고 파일 업로드에 실패했습니다.');
        }

        const logoUrl = getCompanyLogoPublicUrl(supabaseAdmin, LOGO_BUCKET, storagePath);
        const uploadedLogo: StoredCompanyLogo = {
            logoUrl,
            logoPath: storagePath,
            logoFileName: fileValue.name,
            logoFileSize: fileValue.size,
            logoMimeType: fileValue.type,
            logoUpdatedAt: new Date().toISOString()
        };
        const { data: updatedCompany, error: updateError } = await supabaseAdmin
            .from('companies')
            .update({
                logo_url: logoUrl,
                logo_path: storagePath,
                logo_file_name: fileValue.name,
                logo_file_size: fileValue.size,
                logo_mime_type: fileValue.type,
                logo_updated_at: new Date().toISOString()
            })
            .eq('id', targetCompanyId)
            .select('id, name, logo_url, logo_path, logo_file_name, logo_file_size, logo_mime_type, logo_updated_at')
            .single<CompanyLogoRow>();

        if (updateError || !updatedCompany) {
            if (!isCompanyLogoSchemaMissingError(updateError)) {
                console.error('Company logo metadata update error:', updateError);
                await removeStoredLogoPath(supabaseAdmin, LOGO_BUCKET, storagePath);
                return fail(500, 'INTERNAL_ERROR', '로고 정보를 저장하지 못했습니다.');
            }
        }

        const oldPath = currentCompany.logoPath;
        if (oldPath && oldPath !== storagePath) await removeStoredLogoPath(supabaseAdmin, LOGO_BUCKET, oldPath);
        await removeStoredCompanyLogos(supabaseAdmin, LOGO_BUCKET, targetCompanyId, new Set([storagePath]));

        const nextLogo = updatedCompany ? logoFieldsFromMetadata(updatedCompany) || uploadedLogo : uploadedLogo;
        return ok(toLogoView({ id: currentCompany.companyId, name: currentCompany.companyName }, nextLogo));
    } catch (error) {
        if (error instanceof Error) {
            console.error('Company logo POST error:', error.message);
        } else {
            console.error('Company logo POST error:', error);
        }
        return fail(500, 'INTERNAL_ERROR', '로고 저장 중 오류가 발생했습니다.');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const { searchParams } = new URL(request.url);
        const targetCompanyId = normalizeCompanyLogoCompanyId(searchParams.get('companyId')) || requester.company_id;
        if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canManageCompanyLogo(requester)) return fail(403, 'FORBIDDEN', '회사 로고는 팀장만 삭제할 수 있습니다.');
        if (!canAccessCompanyScope(requester, targetCompanyId)) return fail(403, 'FORBIDDEN', '회사 로고를 삭제할 권한이 없습니다.');

        const { data: currentCompany, error: currentError } = await fetchCompanyLogoView(supabaseAdmin, targetCompanyId);
        if (currentError) {
            console.error('Company logo delete fetch error:', currentError);
            return fail(500, 'INTERNAL_ERROR', '회사 정보를 확인하지 못했습니다.');
        }
        if (!currentCompany) return fail(404, 'NOT_FOUND', '회사를 찾을 수 없습니다.');

        const { data: updatedCompany, error: updateError } = await supabaseAdmin
            .from('companies')
            .update({
                logo_url: null,
                logo_path: null,
                logo_file_name: null,
                logo_file_size: null,
                logo_mime_type: null,
                logo_updated_at: null
            })
            .eq('id', targetCompanyId)
            .select('id, name, logo_url, logo_path, logo_file_name, logo_file_size, logo_mime_type, logo_updated_at')
            .single<CompanyLogoRow>();

        if (updateError || !updatedCompany) {
            if (!isCompanyLogoSchemaMissingError(updateError)) {
                console.error('Company logo metadata delete error:', updateError);
                return fail(500, 'INTERNAL_ERROR', '로고 정보를 삭제하지 못했습니다.');
            }
        }

        await removeStoredLogoPath(supabaseAdmin, LOGO_BUCKET, currentCompany.logoPath);
        await removeStoredCompanyLogos(supabaseAdmin, LOGO_BUCKET, targetCompanyId);

        const base = updatedCompany || { id: currentCompany.companyId, name: currentCompany.companyName };
        return ok(toLogoView(base, null));
    } catch (error) {
        if (error instanceof Error) {
            console.error('Company logo DELETE error:', error.message);
        } else {
            console.error('Company logo DELETE error:', error);
        }
        return fail(500, 'INTERNAL_ERROR', '로고 삭제 중 오류가 발생했습니다.');
    }
}
