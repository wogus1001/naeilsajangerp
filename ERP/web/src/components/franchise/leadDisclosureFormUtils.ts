import type { DisclosureChannel } from '@/lib/franchise-disclosure-deliveries';

export type DocumentDraft = {
    readonly title: string;
    readonly version: string;
    readonly brandName: string;
    readonly franchisorName: string;
    readonly fileUrl: string;
    readonly fileName: string;
    readonly issuedAt: string;
    readonly memo: string;
};

export type DisclosureStoragePathInput = {
    readonly companyId?: string;
    readonly companyName: string;
    readonly fileName: string;
    readonly timestamp: number;
    readonly uniqueSuffix: string;
};

export const CHANNEL_LABELS: Record<DisclosureChannel, string> = {
    manual: '수동 기록',
    email: '이메일',
    sms: '문자',
    kakao: '카카오 알림'
};

export const DISCLOSURE_UPLOAD_ACCEPT = '.pdf,.doc,.docx,.hwp,.hwpx,.png,.jpg,.jpeg' as const;
export const DISCLOSURE_UPLOAD_BUCKET = 'property-documents' as const;
const DISCLOSURE_UPLOAD_PREFIX = 'franchise-disclosures' as const;

function sanitizeStorageSegment(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 80);
}

function sanitizeStorageFileName(fileName: string): string {
    const trimmed = fileName.trim();
    const lastDotIndex = trimmed.lastIndexOf('.');
    const rawBase = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;
    const rawExtension = lastDotIndex > 0 ? trimmed.slice(lastDotIndex + 1) : '';
    const base = sanitizeStorageSegment(rawBase) || 'disclosure';
    const extension = sanitizeStorageSegment(rawExtension).slice(0, 12);
    return extension ? `${base}.${extension.toLowerCase()}` : base;
}

export function buildDisclosureStoragePath(input: DisclosureStoragePathInput): string {
    const companySegment = sanitizeStorageSegment(input.companyId || input.companyName) || 'shared';
    const fileSegment = sanitizeStorageFileName(input.fileName);
    return `${DISCLOSURE_UPLOAD_PREFIX}/${companySegment}/${input.timestamp}-${input.uniqueSuffix}-${fileSegment}`;
}

export function buildInitialDraft(leadName: string, interestedBrand: string): DocumentDraft {
    const brand = interestedBrand.trim();
    return {
        title: brand ? `${brand} 정보공개서` : `${leadName} 정보공개서`,
        version: new Date().getFullYear().toString(),
        brandName: brand,
        franchisorName: '',
        fileUrl: '',
        fileName: '',
        issuedAt: '',
        memo: ''
    };
}

export function buildDefaultDeliveryDocumentTitle(leadName: string, interestedBrand: string): string {
    const brand = interestedBrand.trim();
    return brand ? `${brand} 정보공개서` : `${leadName} 정보공개서`;
}

export function buildDefaultDeliveryDocumentVersion(): string {
    return new Date().getFullYear().toString();
}

export function isDisclosureChannel(value: string): value is DisclosureChannel {
    return value === 'manual'
        || value === 'email'
        || value === 'sms'
        || value === 'kakao';
}

export function getGmailOAuthResultMessage(searchParams: URLSearchParams): { readonly type: 'success' | 'error'; readonly message: string } | null {
    const result = searchParams.get('gmail');
    if (result === 'connected') {
        const email = searchParams.get('email')?.trim();
        return {
            type: 'success',
            message: email ? `${email} Gmail 계정을 연결했습니다.` : 'Gmail 계정을 연결했습니다.'
        };
    }
    if (result !== 'error') return null;

    const reason = searchParams.get('reason') || '';
    if (reason === 'access_denied') {
        return {
            type: 'error',
            message: 'Google OAuth 앱의 테스트 사용자에 이 Gmail 계정을 추가해야 연결할 수 있습니다.'
        };
    }
    if (reason === 'invalid_state') {
        return {
            type: 'error',
            message: 'Gmail 연결 세션이 만료되었습니다. 다시 연결해주세요.'
        };
    }
    if (reason === 'auth_required') {
        return {
            type: 'error',
            message: '로그인 정보가 만료되었습니다. 다시 로그인한 뒤 Gmail을 연결해주세요.'
        };
    }
    if (reason === 'company_scope') {
        return {
            type: 'error',
            message: '현재 회사 범위에서 Gmail을 연결할 권한이 없습니다.'
        };
    }
    return {
        type: 'error',
        message: reason ? `Gmail 연결에 실패했습니다. 사유: ${reason}` : 'Gmail 연결에 실패했습니다.'
    };
}

export function toDateTimeLocalValue(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function formatDateTime(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
