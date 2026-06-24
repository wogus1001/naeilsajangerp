import { NextResponse } from 'next/server';
import { getAuthenticatedRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canUploadToTarget, type UploadAccessSupabase } from '@/lib/upload-storage-access';
import { parseUploadStorageTarget, type UploadStorageTarget } from '@/lib/upload-storage-policy';

type UploadStorageResponse = {
    readonly data: { readonly path: string } | null;
    readonly error: { readonly message: string } | null;
};

type UploadRouteDependencies = {
    readonly canUploadToResolvedTarget: (
        requester: RequesterProfile,
        target: UploadStorageTarget
    ) => Promise<boolean>;
    readonly getPublicUrl: (target: UploadStorageTarget) => string;
    readonly resolveRequester: (
        request: Request,
    ) => Promise<RequesterProfile | null>;
    readonly uploadFile: (
        target: UploadStorageTarget,
        buffer: Buffer,
        contentType: string
    ) => Promise<UploadStorageResponse>;
};

function createDefaultUploadRouteDependencies(): UploadRouteDependencies {
    const supabaseAdmin = getSupabaseAdmin();
    const uploadAccessSupabase: UploadAccessSupabase = {
        from: (table) => ({
            select: (columns) => ({
                eq: (column, value) => ({
                    maybeSingle: async <T,>() => {
                        const { data } = await supabaseAdmin
                            .from(table)
                            .select(columns)
                            .eq(column, value)
                            .maybeSingle<T>();
                        return { data };
                    }
                })
            })
        })
    };
    return {
        canUploadToResolvedTarget: (requester, target) => canUploadToTarget(uploadAccessSupabase, requester, target),
        getPublicUrl: (target) => supabaseAdmin.storage
            .from(target.bucket)
            .getPublicUrl(target.path)
            .data.publicUrl,
        resolveRequester: (request) => getAuthenticatedRequesterProfile(supabaseAdmin, request),
        uploadFile: (target, buffer, contentType) => supabaseAdmin.storage
            .from(target.bucket)
            .upload(target.path, buffer, {
                contentType,
                upsert: true
            })
    };
}

function getFormString(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
}

function uploadError(message: string, status: number): NextResponse {
    return NextResponse.json({ error: message }, { status });
}

export async function handleUploadRequest(
    request: Request,
    dependencies: UploadRouteDependencies = createDefaultUploadRouteDependencies()
) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const parsedTarget = parseUploadStorageTarget({
            bucket: getFormString(formData, 'bucket'),
            companyId: getFormString(formData, 'companyId'),
            path: getFormString(formData, 'path')
        });

        if (!(file instanceof File) || !getFormString(formData, 'path')) {
            return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
        }
        if (!parsedTarget.ok) return uploadError(parsedTarget.error, 400);

        const requester = await dependencies.resolveRequester(request);
        if (!requester) return uploadError('Authentication required', 401);
        if (!await dependencies.canUploadToResolvedTarget(requester, parsedTarget.target)) {
            return uploadError('Forbidden: upload target is outside your scope', 403);
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await dependencies.uploadFile(parsedTarget.target, buffer, file.type);

        if (error) {
            console.error('Supabase Upload Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            path: data?.path || parsedTarget.target.path,
            publicUrl: dependencies.getPublicUrl(parsedTarget.target)
        });

    } catch (error) {
        console.error('Upload API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return handleUploadRequest(request);
}
