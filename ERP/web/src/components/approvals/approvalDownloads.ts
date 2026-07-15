import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError } from '@/utils/apiResponse';

type ApprovalDownload = {
    readonly name: string;
    readonly url?: string;
};

type ApprovalDownloadDependencies = {
    readonly fetcher?: (input: string, init: RequestInit) => Promise<Response>;
    readonly getHeaders?: () => Promise<Headers>;
};

export async function fetchApprovalFile(
    url: string,
    dependencies: ApprovalDownloadDependencies = {}
): Promise<Blob> {
    const headers = await (dependencies.getHeaders ?? getApiAuthHeaders)();
    const response = await (dependencies.fetcher ?? fetch)(url, { cache: 'no-store', headers });
    if (!response.ok) {
        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
        throw new Error(payload ? readApiError(payload) : '파일을 내려받지 못했습니다.');
    }
    return response.blob();
}

export async function downloadApprovalFile(file: ApprovalDownload): Promise<void> {
    if (!file.url) throw new Error('첨부파일 주소를 확인할 수 없습니다.');
    const objectUrl = URL.createObjectURL(await fetchApprovalFile(file.url));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}
