export const META_IMPORT_STATUS_LABELS: Readonly<Record<string, string>> = {
    created: '신규 등록',
    updated: '정보 갱신',
    duplicate: '이미 등록됨',
    skipped: '등록 제외',
    error: '수집 오류'
};

export const META_CONNECTION_STATUS_LABELS: Readonly<Record<string, string>> = {
    connected: '연결됨',
    needs_setup: '확인 필요',
    disconnected: '연결 해제됨'
};

const META_ISSUE_GUIDANCE: Readonly<Record<string, string>> = {
    META_CONNECTION_REAUTH_REQUIRED: 'Meta 계정 권한을 확인하고 다시 연결해주세요.',
    META_PAGE_SUBSCRIPTION_FAILED: '광고 페이지 자동 수집 연결에 실패했습니다. Meta 계정을 다시 연결해주세요.',
    META_FORM_SYNC_FAILED: '신청 양식의 조회 권한을 확인한 뒤 다시 가져와주세요.',
    META_DEFAULT_MANAGER_REQUIRED: '기본 담당자를 선택한 뒤 다시 가져와주세요.',
    META_LEAD_FIELDS_REQUIRED: '이름과 연락처의 연동 항목을 확인해주세요.',
    META_LEAD_IMPORT_FAILED: '신청 정보를 등록하지 못했습니다. 연동 항목을 확인한 뒤 다시 가져와주세요.'
};

export function getMetaIssueGuidance(issue: string | null | undefined, fallback: string) {
    return issue ? META_ISSUE_GUIDANCE[issue] || fallback : null;
}
