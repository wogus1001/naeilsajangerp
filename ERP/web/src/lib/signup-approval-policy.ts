export type SignupApprovalRole = 'manager' | 'sub_manager' | 'staff' | 'partner_vendor';
export type SignupApprovalStatus = 'pending_approval';
export type SignupApprovalOwner = 'admin' | 'manager';

export type SignupApprovalPolicy =
    | {
        readonly kind: 'allow';
        readonly role: SignupApprovalRole;
        readonly status: SignupApprovalStatus;
        readonly approvalOwner: SignupApprovalOwner;
        readonly message: string;
    }
    | {
        readonly kind: 'reject';
        readonly error: string;
    };

type SignupApprovalInput = {
    readonly companyExists: boolean;
    readonly companyHasManager?: boolean;
    readonly requestedRole: unknown;
};

export function normalizeSignupRole(value: unknown): SignupApprovalRole {
    if (value === 'partner_vendor') return 'partner_vendor';
    return value === 'manager' ? 'manager' : 'staff';
}

export function resolveSignupApprovalPolicy(input: SignupApprovalInput): SignupApprovalPolicy {
    const requestedRole = normalizeSignupRole(input.requestedRole);

    if (!input.companyExists) {
        return {
            kind: 'allow',
            role: 'manager',
            status: 'pending_approval',
            approvalOwner: 'admin',
            message: '회사 등록 요청이 접수되었습니다. 최초 가입자는 팀장 권한으로 등록되며, 관리자 승인 후 로그인이 가능합니다.'
        };
    }

    if (requestedRole === 'manager') {
        return {
            kind: 'reject',
            error: '이미 등록된 회사의 추가 팀장 권한은 관리자에게 요청해주세요. 브랜드 임직원 또는 협력업체로 가입하면 팀장 승인 후 이용할 수 있습니다.'
        };
    }

    if (requestedRole === 'partner_vendor') {
        return {
            kind: 'allow',
            role: 'partner_vendor',
            status: 'pending_approval',
            approvalOwner: 'manager',
            message: '협력업체 가입 요청이 완료되었습니다. 팀장 승인 후 로그인이 가능합니다.'
        };
    }

    if (!input.companyHasManager) {
        return {
            kind: 'allow',
            role: 'manager',
            status: 'pending_approval',
            approvalOwner: 'admin',
            message: '회사에 등록된 팀장이 없어 팀장 권한으로 접수되었습니다. 관리자 승인 후 로그인이 가능합니다.'
        };
    }

    return {
        kind: 'allow',
        role: 'sub_manager',
        status: 'pending_approval',
        approvalOwner: 'manager',
        message: '가입 요청이 완료되었습니다. 매니저 권한으로 접수되며, 팀장 승인 후 로그인이 가능합니다.'
    };
}

export function getPendingApprovalLoginMessage(role: unknown): string {
    if (role === 'manager') {
        return '관리자 승인 대기 중입니다. 승인 후 로그인이 가능합니다.';
    }

    return '팀장 승인 대기 중입니다. 승인 후 로그인이 가능합니다.';
}
