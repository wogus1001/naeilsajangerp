type SignupAuthUserCreator = () => Promise<{
    readonly data: {
        readonly user: {
            readonly id: string;
        } | null;
    };
    readonly error: {
        readonly message: string;
    } | null;
}>;

type SignupAuthFailure = {
    readonly message: string;
    readonly internalMessage: string;
    readonly status: number;
};

export type SignupAuthUserResult =
    | { readonly userId: string; readonly error: null; readonly retried: boolean }
    | { readonly userId: null; readonly error: SignupAuthFailure; readonly retried: boolean };

function isRetryableJwtVerificationError(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('invalid jwt')
        && normalized.includes('unrecognized jwk kid')
        && normalized.includes('algorithm es256');
}

function toSignupAuthFailure(message: string): SignupAuthFailure {
    const normalized = message.toLowerCase();
    if (normalized.includes('unique constraint')
        || normalized.includes('already registered')
        || normalized.includes('a user with this email address has already been registered')) {
        return { message: '이미 존재하는 이메일입니다.', internalMessage: message, status: 409 };
    }
    if (normalized.includes('password should be at least')) {
        return { message: '비밀번호는 최소 6자 이상이어야 합니다.', internalMessage: message, status: 400 };
    }
    if (isRetryableJwtVerificationError(message)) {
        return {
            message: '인증 서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.',
            internalMessage: message,
            status: 503
        };
    }
    return {
        message: '가입 처리 중 인증 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        internalMessage: message,
        status: 500
    };
}

export async function createSignupAuthUserWithRetry(
    createUser: SignupAuthUserCreator
): Promise<SignupAuthUserResult> {
    let result = await createUser();
    let retried = false;
    if (result.error && isRetryableJwtVerificationError(result.error.message)) {
        retried = true;
        result = await createUser();
    }

    if (result.error) {
        return { userId: null, error: toSignupAuthFailure(result.error.message), retried };
    }
    if (!result.data.user) {
        return {
            userId: null,
            error: {
                message: '가입 처리 중 인증 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                internalMessage: 'Auth user creation returned no user',
                status: 500
            },
            retried
        };
    }
    return { userId: result.data.user.id, error: null, retried };
}
