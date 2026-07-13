export const APPROVAL_ATTACHMENT_MAX_FILES = 5;
export const APPROVAL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp', 'hwpx',
    'jpg', 'jpeg', 'png', 'webp'
]);

export type ApprovalAttachmentMergeResult = {
    readonly files: readonly File[];
    readonly message: string;
};

function fileExtension(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.slice(dot + 1).toLocaleLowerCase() : '';
}

function fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

export function formatApprovalAttachmentSize(size: number): string {
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

export function mergeApprovalAttachmentFiles(input: {
    readonly current: readonly File[];
    readonly selected: readonly File[];
    readonly existingCount?: number;
}): ApprovalAttachmentMergeResult {
    const existingCount = Math.max(0, input.existingCount ?? 0);
    const available = Math.max(0, APPROVAL_ATTACHMENT_MAX_FILES - existingCount - input.current.length);
    if (available === 0) {
        return { files: input.current, message: `첨부파일은 기존 파일을 포함해 최대 ${APPROVAL_ATTACHMENT_MAX_FILES}개까지 등록할 수 있습니다.` };
    }

    const currentKeys = new Set(input.current.map(fileKey));
    const accepted: File[] = [];
    let rejectedType = false;
    let rejectedSize = false;
    let duplicate = false;

    for (const file of input.selected) {
        if (!ACCEPTED_EXTENSIONS.has(fileExtension(file.name))) {
            rejectedType = true;
            continue;
        }
        if (file.size <= 0 || file.size > APPROVAL_ATTACHMENT_MAX_BYTES) {
            rejectedSize = true;
            continue;
        }
        const key = fileKey(file);
        if (currentKeys.has(key)) {
            duplicate = true;
            continue;
        }
        currentKeys.add(key);
        accepted.push(file);
    }

    const limited = accepted.slice(0, available);
    const messages = [
        rejectedType ? '지원하지 않는 파일 형식은 제외했습니다.' : '',
        rejectedSize ? '비어 있거나 10MB를 초과한 파일은 제외했습니다.' : '',
        duplicate ? '이미 선택한 파일은 제외했습니다.' : '',
        accepted.length > available ? `첨부파일은 기존 파일을 포함해 최대 ${APPROVAL_ATTACHMENT_MAX_FILES}개까지 등록할 수 있습니다.` : ''
    ].filter(Boolean);

    return {
        files: [...input.current, ...limited],
        message: messages.join(' ')
    };
}
