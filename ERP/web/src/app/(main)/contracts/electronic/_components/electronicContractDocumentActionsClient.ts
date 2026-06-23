import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import type { ElectronicContract } from './electronicContractDocumentsModel';

type DeleteResponse = {
    readonly data?: {
        readonly deleted?: boolean;
    };
    readonly message?: string;
};

type CancelResponse = {
    readonly data?: {
        readonly contract?: ElectronicContract;
    };
    readonly message?: string;
};

type ViewLinkResponse = {
    readonly data?: {
        readonly url?: string;
    };
    readonly message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeDownloadBaseName(value: string): string {
    const normalized = value
        .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized || '전자계약';
}

function fileExtensionFromContentType(contentType: string): string {
    return contentType.includes('zip') ? '.zip' : '.pdf';
}

function downloadNameFromResponse(response: Response, fallbackName: string): string {
    const baseName = safeDownloadBaseName(fallbackName);
    const contentType = response.headers.get('content-type') || '';
    const lowerName = baseName.toLowerCase();
    if (lowerName.endsWith('.pdf') || lowerName.endsWith('.zip')) return baseName;
    return `${baseName}${fileExtensionFromContentType(contentType)}`;
}

async function errorMessageFromDownloadResponse(response: Response): Promise<string> {
    try {
        const payload: unknown = await response.json();
        return isRecord(payload) && typeof payload.message === 'string' ? payload.message : '';
    } catch (caught) {
        if (caught instanceof Error) return '';
        throw caught;
    }
}

export async function deleteElectronicContract(contractId: string): Promise<void> {
    const response = await fetch(`/api/electronic-contracts/${encodeURIComponent(contractId)}`, {
        method: 'DELETE',
        headers: await getApiAuthHeaders()
    });
    const payload: DeleteResponse = await response.json();
    if (!response.ok) throw new Error(payload.message || '문서를 삭제하지 못했습니다.');
}

export async function cancelElectronicContract(contractId: string): Promise<ElectronicContract> {
    const response = await fetch(`/api/electronic-contracts/${encodeURIComponent(contractId)}/cancel`, {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({})
    });
    const payload: CancelResponse = await response.json();
    if (!response.ok || !payload.data?.contract) {
        throw new Error(payload.message || '서명 요청을 취소하지 못했습니다.');
    }
    return payload.data.contract;
}

export async function downloadElectronicContract(contract: ElectronicContract): Promise<void> {
    const response = await fetch(`/api/electronic-contracts/${encodeURIComponent(contract.id)}/download`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    if (!response.ok) {
        const message = await errorMessageFromDownloadResponse(response);
        throw new Error(message || '문서를 다운로드하지 못했습니다.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadNameFromResponse(response, contract.name);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export async function openElectronicContractView(contract: ElectronicContract): Promise<void> {
    const response = await fetch(`/api/electronic-contracts/${encodeURIComponent(contract.id)}/view-link`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload: ViewLinkResponse = await response.json();
    if (!response.ok || !payload.data?.url) {
        throw new Error(payload.message || '문서 접근 링크를 만들지 못했습니다.');
    }
    const openedWindow = window.open(payload.data.url, '_blank', 'noopener,noreferrer');
    if (!openedWindow) window.location.assign(payload.data.url);
}
