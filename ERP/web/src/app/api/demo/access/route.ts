import { NextResponse } from 'next/server';
import { fail, ok } from '@/lib/api-response';
import {
    DEMO_ACCESS_COOKIE_NAME,
    DEMO_ACCESS_TTL_SECONDS,
    createDemoAccessToken,
    readDemoAccessConfig,
    verifyDemoCredentials,
    type DemoAccessConfig
} from '@/lib/demo-access';

export const dynamic = 'force-dynamic';

type DemoAccessRouteDependencies = {
    readonly config: DemoAccessConfig | null;
    readonly nowMs: () => number;
    readonly secureCookies: boolean;
};

type DemoAccessRequestBody = {
    readonly id: string;
    readonly password: string;
};

type JsonRecord = Record<string, unknown>;

function defaultDependencies(): DemoAccessRouteDependencies {
    return {
        config: readDemoAccessConfig(),
        nowMs: Date.now,
        secureCookies: process.env.NODE_ENV === 'production'
    };
}

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDemoAccessBody(body: unknown): DemoAccessRequestBody | null {
    if (!isRecord(body)) return null;
    const id = body.id;
    const password = body.password;
    if (typeof id !== 'string' || typeof password !== 'string') return null;
    return { id: id.trim(), password };
}

async function readJsonBody(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch (error) {
        if (error instanceof SyntaxError || error instanceof TypeError) return null;
        throw error;
    }
}

function setDemoAccessCookie(response: NextResponse, token: string, secureCookies: boolean): void {
    response.cookies.set({
        httpOnly: true,
        maxAge: DEMO_ACCESS_TTL_SECONDS,
        name: DEMO_ACCESS_COOKIE_NAME,
        path: '/demo',
        sameSite: 'lax',
        secure: secureCookies,
        value: token
    });
}

function clearDemoAccessCookie(response: NextResponse, secureCookies: boolean): void {
    response.cookies.set({
        httpOnly: true,
        maxAge: 0,
        name: DEMO_ACCESS_COOKIE_NAME,
        path: '/demo',
        sameSite: 'lax',
        secure: secureCookies,
        value: ''
    });
}

export async function handleDemoAccessPOST(
    request: Request,
    dependencies: DemoAccessRouteDependencies = defaultDependencies()
) {
    if (!dependencies.config) {
        return fail(503, 'INTERNAL_ERROR', '데모 접근 설정이 필요합니다.');
    }

    const body = await readJsonBody(request);
    const credentials = parseDemoAccessBody(body);
    if (!credentials) {
        return fail(400, 'VALIDATION_ERROR', '아이디와 비밀번호를 입력해주세요.');
    }

    if (!verifyDemoCredentials(credentials, dependencies.config)) {
        return fail(401, 'AUTH_REQUIRED', '아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    const response = ok({ authenticated: true });
    setDemoAccessCookie(
        response,
        createDemoAccessToken(dependencies.config, dependencies.nowMs()),
        dependencies.secureCookies
    );
    return response;
}

export function handleDemoAccessDELETE(secureCookies = process.env.NODE_ENV === 'production') {
    const response = ok({ authenticated: false });
    clearDemoAccessCookie(response, secureCookies);
    return response;
}

export async function POST(request: Request) {
    return handleDemoAccessPOST(request);
}

export function DELETE() {
    return handleDemoAccessDELETE();
}
