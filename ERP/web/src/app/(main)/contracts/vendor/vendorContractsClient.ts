import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { VendorContractForm } from './vendorContractsModel';

const UPLOAD_BUCKET = 'property-documents';

type UploadInput = {
    readonly companyId: string;
    readonly contractId: string;
    readonly file: File;
};

function sanitizePathPart(value: string): string {
    return value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'document';
}

export function buildContractPayload(form: VendorContractForm, companyId: string) {
    return {
        category: form.category,
        companyId,
        contractEndDate: form.contractEndDate,
        contractStartDate: form.contractStartDate,
        contractTitle: form.contractTitle,
        documentSource: form.documentSource,
        electronicContractId: form.electronicContractId,
        fileName: form.fileName,
        id: form.id,
        memo: form.memo,
        ownerProfileId: form.ownerProfileId,
        status: form.status,
        storageBucket: form.storageBucket,
        storagePath: form.storagePath,
        vendorName: form.vendorName
    };
}

export async function uploadVendorContractFile({
    companyId,
    contractId,
    file
}: UploadInput): Promise<Pick<VendorContractForm, 'fileName' | 'storageBucket' | 'storagePath'>> {
    const formData = new FormData();
    const suffix = Math.random().toString(36).slice(2, 10) || 'upload';
    formData.append('file', file);
    formData.append('bucket', UPLOAD_BUCKET);
    formData.append('companyId', companyId);
    formData.append('path', `franchise-vendor-contracts/${companyId}/${contractId}/${Date.now()}-${suffix}-${sanitizePathPart(file.name)}`);

    const response = await fetch('/api/upload', {
        body: formData,
        headers: await getApiAuthHeaders(),
        method: 'POST'
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<{ readonly path?: string }>(payload);
    if (!data.path) throw new Error('업로드 경로를 확인할 수 없습니다.');
    return { fileName: file.name, storageBucket: UPLOAD_BUCKET, storagePath: data.path };
}
