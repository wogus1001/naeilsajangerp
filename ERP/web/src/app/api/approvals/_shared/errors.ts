import type { ApiErrorCode } from '@/lib/api-response';
import { fail } from '@/lib/api-response';
import { ApprovalInputError, isRecord } from './boundary';

const MIGRATION_FILE = 'supabase_company_approvals_v2_migration.sql';
const SCHEMA_CODES = ['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'] as const;
const APPROVAL_SCHEMA_PATTERN = /approval_|organization_units|organization_memberships|perform_approval_document_action|sync_supervision_report_approval|save_supervision_report_with_approval|create_company_approval_template_version|replace_approval_document_readers/i;

export class ApprovalRouteError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;

    constructor(status: number, code: ApiErrorCode, message: string) {
        super(message);
        this.name = 'ApprovalRouteError';
        this.status = status;
        this.code = code;
    }
}

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function isApprovalSchemaError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = cleanText(error.code);
    const message = cleanText(error.message);
    return SCHEMA_CODES.some(candidate => candidate === code) && APPROVAL_SCHEMA_PATTERN.test(message);
}

export function throwDatabaseError(error: unknown): void {
    if (error) throw error;
}

export function approvalErrorResponse(error: unknown, fallbackMessage: string): Response {
    if (error instanceof ApprovalInputError) {
        return fail(400, 'VALIDATION_ERROR', error.message);
    }
    if (error instanceof ApprovalRouteError) {
        return fail(error.status, error.code, error.message);
    }
    if (isApprovalSchemaError(error)) {
        return fail(
            503,
            'INTERNAL_ERROR',
            `전자결재 SQL이 적용되지 않았습니다. ${MIGRATION_FILE} 파일을 등록하고 Supabase 스키마 캐시를 새로고침해 주세요.`
        );
    }
    if (isRecord(error)) {
        const code = cleanText(error.code);
        const message = cleanText(error.message) || fallbackMessage;
        if (code === 'P0002') return fail(404, 'NOT_FOUND', message);
        if (code === '42501' || code === '28000') return fail(403, 'FORBIDDEN', message);
        if (code === '22023' || code === '23514') return fail(400, 'VALIDATION_ERROR', message);
        if (code === '23503') return fail(409, 'CONFLICT', '연결된 데이터가 있어 삭제하거나 변경할 수 없습니다. 먼저 연결된 항목을 정리해 주세요.');
        if (code === '55000' || code === '23505') return fail(409, 'CONFLICT', message);
    }
    return fail(500, 'INTERNAL_ERROR', fallbackMessage);
}
