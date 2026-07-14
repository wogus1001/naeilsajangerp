import type { ApprovalField, ApprovalFieldType } from './approvalTypes';

export type ApprovalFieldCatalogItem = {
    readonly type: ApprovalFieldType;
    readonly label: string;
    readonly description: string;
};

export const APPROVAL_FIELD_CATALOG: readonly ApprovalFieldCatalogItem[] = [
    { type: 'shortText', label: '짧은 텍스트', description: '한 줄 입력' },
    { type: 'longText', label: '긴 텍스트', description: '여러 줄 입력' },
    { type: 'number', label: '숫자', description: '수량·인원' },
    { type: 'money', label: '금액', description: '통화 금액' },
    { type: 'date', label: '날짜', description: '기준일' },
    { type: 'period', label: '기간', description: '시작일·종료일' },
    { type: 'select', label: '선택', description: '단일 선택' },
    { type: 'checklist', label: '체크리스트', description: '복수 확인' },
    { type: 'table', label: '표', description: '행·열 입력' },
    { type: 'score', label: '점수', description: '0~10 평가' },
    { type: 'attachment', label: '첨부파일', description: '파일 제출' },
    { type: 'description', label: '설명', description: '작성 안내' }
] as const;

export function createApprovalField(type: ApprovalFieldType): ApprovalField {
    const catalog = APPROVAL_FIELD_CATALOG.find(item => item.type === type);
    return {
        id: crypto.randomUUID(),
        type,
        label: catalog?.label ?? '새 필드',
        description: type === 'description' ? '작성자가 확인할 안내 문구를 입력하세요.' : '',
        required: false,
        columns: 1,
        editableBy: 'author',
        options: type === 'select' || type === 'checklist'
            ? ['항목 1', '항목 2']
            : type === 'table' ? ['항목', '내용'] : []
    };
}
