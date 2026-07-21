import { NextResponse } from 'next/server';
import { getAuthenticatedRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canUploadToTarget, type UploadAccessSupabase } from '@/lib/upload-storage-access';
import {
    validateUploadFileForTarget,
    validateUploadFileMetadataForTarget
} from '@/lib/upload-file-validation';
import { parseUploadStorageTarget, type UploadStorageTarget } from '@/lib/upload-storage-policy';

type StorageError = { readonly message: string };

type SignedUploadDependencies = {
    readonly canUploadToResolvedTarget: (requester: RequesterProfile, target: UploadStorageTarget) => Promise<boolean>;
    readonly createSignedUploadUrl: (target: UploadStorageTarget) => Promise<{
        readonly data: { readonly path: string; readonly token: string } | null;
        readonly error: StorageError | null;
    }>;
    readonly downloadFile: (target: UploadStorageTarget) => Promise<{
        readonly data: Blob | null;
        readonly error: StorageError | null;
    }>;
    readonly getPublicUrl: (target: UploadStorageTarget) => string;
    readonly removeFile: (target: UploadStorageTarget) => Promise<void>;
    readonly resolveRequester: (request: Request) => Promise<RequesterProfile | null>;
};

type SignedUploadBody = {
    readonly bucket?: unknown;
    readonly fileName?: unknown;
    readonly fileSize?: unknown;
    readonly mimeType?: unknown;
    readonly path?: unknown;
};

function createDefaultDependencies(): SignedUploadDependencies {
    const supabaseAdmin = getSupabaseAdmin();
    const uploadAccessSupabase: UploadAccessSupabase = {
        from: (table) => ({
            select: (columns) => ({
                eq: (column, value) => ({
                    maybeSingle: async <T,>() => {
                        const { data } = await supabaseAdmin.from(table).select(columns).eq(column, value).maybeSingle<T>();
                        return { data };
                    }
                })
            })
        })
    };

    return {
        canUploadToResolvedTarget: (requester, target) => canUploadToTarget(uploadAccessSupabase, requester, target),
        createSignedUploadUrl: (target) => supabaseAdmin.storage.from(target.bucket).createSignedUploadUrl(target.path, { upsert: true }),
        downloadFile: (target) => supabaseAdmin.storage.from(target.bucket).download(target.path),
        getPublicUrl: (target) => supabaseAdmin.storage.from(target.bucket).getPublicUrl(target.path).data.publicUrl,
        removeFile: async (target) => {
            await supabaseAdmin.storage.from(target.bucket).remove([target.path]);
        },
        resolveRequester: (request) => getAuthenticatedRequesterProfile(supabaseAdmin, request)
    };
}

function fail(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function readFileSize(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : -1;
}

function isPropertyTarget(target: UploadStorageTarget): boolean {
    return target.kind === 'propertyImage' || target.kind === 'propertyDocument';
}

export async function handleSignedUploadRequest(
    request: Request,
    dependencies: SignedUploadDependencies = createDefaultDependencies()
) {
    let body: SignedUploadBody;
    try {
        body = await request.json() as SignedUploadBody;
    } catch {
        return fail('Invalid upload request', 400);
    }

    const parsedTarget = parseUploadStorageTarget({ bucket: body.bucket, path: body.path });
    if (!parsedTarget.ok || !isPropertyTarget(parsedTarget.target)) {
        return fail(parsedTarget.ok ? 'Unsupported upload target' : parsedTarget.error, 400);
    }

    const requester = await dependencies.resolveRequester(request);
    if (!requester) return fail('Authentication required', 401);
    if (!await dependencies.canUploadToResolvedTarget(requester, parsedTarget.target)) {
        return fail('Forbidden: upload target is outside your scope', 403);
    }

    const fileName = cleanString(body.fileName);
    const mimeType = cleanString(body.mimeType);
    const fileSize = readFileSize(body.fileSize);
    const metadataValidation = validateUploadFileMetadataForTarget(parsedTarget.target, {
        fileName,
        mimeType,
        size: fileSize
    });
    if (!metadataValidation.ok) return fail(metadataValidation.error, metadataValidation.status);

    if (request.method === 'POST') {
        const { data, error } = await dependencies.createSignedUploadUrl(parsedTarget.target);
        if (error || !data?.token) return fail(error?.message || 'Failed to prepare upload', 500);
        return NextResponse.json({ path: data.path || parsedTarget.target.path, token: data.token });
    }

    if (request.method !== 'PUT') return fail('Method not allowed', 405);

    const { data: uploadedFile, error: downloadError } = await dependencies.downloadFile(parsedTarget.target);
    if (downloadError || !uploadedFile) return fail(downloadError?.message || 'Uploaded file not found', 400);

    const bytes = new Uint8Array(await uploadedFile.arrayBuffer());
    const validation = validateUploadFileForTarget(parsedTarget.target, {
        bytes,
        fileName,
        mimeType,
        size: uploadedFile.size
    });
    if (!validation.ok || uploadedFile.size !== fileSize) {
        await dependencies.removeFile(parsedTarget.target);
        return fail(validation.ok ? 'Uploaded file size does not match' : validation.error, validation.ok ? 400 : validation.status);
    }

    return NextResponse.json({
        path: parsedTarget.target.path,
        publicUrl: dependencies.getPublicUrl(parsedTarget.target)
    });
}

export async function POST(request: Request) {
    return handleSignedUploadRequest(request);
}

export async function PUT(request: Request) {
    return handleSignedUploadRequest(request);
}
