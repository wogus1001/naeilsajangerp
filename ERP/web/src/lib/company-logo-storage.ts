import { buildCompanyLogoStorageFolder } from '@/lib/company-logo';
import type { getSupabaseAdmin } from '@/lib/supabase-admin';

export type StoredCompanyLogo = {
    readonly logoUrl: string;
    readonly logoPath: string;
    readonly logoFileName: string | null;
    readonly logoFileSize: number | null;
    readonly logoMimeType: string | null;
    readonly logoUpdatedAt: string | null;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
type MetadataRecord = Readonly<Record<string, unknown>>;
type StorageErrorRecord = Readonly<Record<string, unknown>>;

function dateValue(value: string | null | undefined): number {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isMetadataRecord(metadata: unknown): metadata is MetadataRecord {
    return typeof metadata === 'object' && metadata !== null;
}

function readMetadataNumber(metadata: unknown, key: string): number | null {
    if (!isMetadataRecord(metadata)) return null;
    const value = metadata[key];
    return typeof value === 'number' ? value : null;
}

function readMetadataString(metadata: unknown, key: string): string | null {
    if (!isMetadataRecord(metadata)) return null;
    const value = metadata[key];
    return typeof value === 'string' ? value : null;
}

function isVisibleLogoFile(fileName: string | null | undefined): fileName is string {
    return Boolean(fileName && !fileName.startsWith('.') && fileName !== 'placeholder');
}

function isStorageErrorRecord(value: unknown): value is StorageErrorRecord {
    return typeof value === 'object' && value !== null;
}

function readStorageErrorText(error: unknown): string {
    if (!isStorageErrorRecord(error)) return '';
    return ['message', 'error', 'name', 'statusCode', 'status']
        .map(key => {
            const value = error[key];
            return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
        })
        .join(' ');
}

function isMissingBucketError(error: unknown): boolean {
    const text = readStorageErrorText(error);
    return /\b404\b|not found|does not exist|bucket not found|no such bucket/i.test(text);
}

function isBucketAlreadyExistsError(error: unknown): boolean {
    return /already exists/i.test(readStorageErrorText(error));
}

export async function ensureCompanyLogoBucket(
    supabaseAdmin: SupabaseAdminClient,
    bucket: string
): Promise<Error | null> {
    const bucketOptions = { public: true };
    const { data: existingBucket, error: getBucketError } = await supabaseAdmin.storage.getBucket(bucket);

    if (existingBucket) {
        if (existingBucket.public === true) return null;
        const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucket, bucketOptions);
        return updateError;
    }
    if (getBucketError && !isMissingBucketError(getBucketError)) return getBucketError;

    const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, bucketOptions);
    if (!createError) return null;
    if (!isBucketAlreadyExistsError(createError)) return createError;

    const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucket, bucketOptions);
    return updateError;
}

export function getCompanyLogoPublicUrl(
    supabaseAdmin: SupabaseAdminClient,
    bucket: string,
    path: string
): string {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

export async function fetchLatestStoredCompanyLogo(
    supabaseAdmin: SupabaseAdminClient,
    bucket: string,
    companyId: string
): Promise<{ readonly data: StoredCompanyLogo | null; readonly error: Error | null }> {
    const folder = buildCompanyLogoStorageFolder(companyId);
    const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(folder, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } });

    if (error) return { data: null, error };

    const files = data || [];
    let latest = files.find(file => isVisibleLogoFile(file.name)) || null;

    for (const file of files) {
        if (!isVisibleLogoFile(file.name)) continue;
        const currentTime = dateValue(file.updated_at || file.created_at);
        const latestTime = dateValue(latest?.updated_at || latest?.created_at);
        if (!latest || currentTime > latestTime) {
            latest = file;
        }
    }

    if (!latest) return { data: null, error: null };

    const path = `${folder}/${latest.name}`;
    return {
        data: {
            logoUrl: getCompanyLogoPublicUrl(supabaseAdmin, bucket, path),
            logoPath: path,
            logoFileName: latest.name,
            logoFileSize: readMetadataNumber(latest.metadata, 'size'),
            logoMimeType: readMetadataString(latest.metadata, 'mimetype') || readMetadataString(latest.metadata, 'mimeType'),
            logoUpdatedAt: latest.updated_at || latest.created_at || null
        },
        error: null
    };
}

export async function removeStoredCompanyLogos(
    supabaseAdmin: SupabaseAdminClient,
    bucket: string,
    companyId: string,
    pathsToKeep: ReadonlySet<string> = new Set()
): Promise<Error | null> {
    const folder = buildCompanyLogoStorageFolder(companyId);
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, { limit: 100 });
    if (error) return error;

    const paths = (data || [])
        .filter(file => isVisibleLogoFile(file.name))
        .map(file => `${folder}/${file.name}`)
        .filter(path => !pathsToKeep.has(path));

    if (paths.length === 0) return null;

    const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
    return removeError;
}

export async function removeStoredLogoPath(
    supabaseAdmin: SupabaseAdminClient,
    bucket: string,
    path: string | null
): Promise<void> {
    if (!path) return;
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
    if (error) console.error('Company logo storage cleanup failed:', error.message);
}
