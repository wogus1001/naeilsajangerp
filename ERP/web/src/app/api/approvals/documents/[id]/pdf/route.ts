import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fail } from '@/lib/api-response';
import { resolveApprovalContext } from '../../../_shared/access';
import { parseRequiredUuid } from '../../../_shared/boundary';
import { DOCUMENT_SELECT, isApprovalRetentionExpired, type ApprovalDocumentRow } from '../../../_shared/documents';
import { approvalErrorResponse, throwDatabaseError } from '../../../_shared/errors';
import { requireVisibleApprovalDocument } from '../../../_shared/visibility';
import { canDownloadApprovalDocument } from '../../../_shared/download-access';
import {
    createApprovalPdfDownloadResponse,
    createApprovalPdfInput,
    createApprovalPdfTemplate,
    paginateApprovalBody
} from '@/lib/approvals/pdf-template';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

function valueText(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(valueText).join(', ');
    if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${valueText(item)}`).join(' / ');
    return '-';
}

function fieldLabels(value: unknown): ReadonlyMap<string, string> {
    if (!Array.isArray(value)) return new Map();
    return new Map(value.flatMap(field => {
        if (typeof field !== 'object' || field === null || Array.isArray(field)) return [];
        const key = Reflect.get(field, 'key') ?? Reflect.get(field, 'id');
        const label = Reflect.get(field, 'label');
        return typeof key === 'string' && typeof label === 'string' ? [[key, label] as const] : [];
    }));
}

function documentBody(valuesInput: unknown, fields: unknown, events: readonly { readonly event_type: string; readonly memo: string; readonly created_at: string }[]): string {
    const values = typeof valuesInput === 'object' && valuesInput !== null && !Array.isArray(valuesInput)
        ? Object.entries(valuesInput)
        : [];
    const labels = fieldLabels(fields);
    const body = values.length === 0
        ? '입력된 본문 항목이 없습니다.'
        : values.map(([key, value], index) => `${index + 1}. ${labels.get(key) || key}\n${valueText(value)}`).join('\n\n');
    const history = events.length === 0
        ? ''
        : `\n\n처리 이력\n${events.map(event => `- ${event.event_type} · ${event.created_at}${event.memo ? ` · ${event.memo}` : ''}`).join('\n')}`;
    return `${body}${history}`;
}

export async function GET(request: Request, routeContext: RouteContext) {
    try {
        const context = await resolveApprovalContext(request);
        const documentId = parseRequiredUuid((await routeContext.params).id, 'id');
        const { data, error } = await context.supabase.from('approval_documents').select(DOCUMENT_SELECT)
            .eq('id', documentId).eq('company_id', context.companyId).maybeSingle<ApprovalDocumentRow>();
        throwDatabaseError(error);
        const document = await requireVisibleApprovalDocument(context, data);
        if (!document) return fail(404, 'NOT_FOUND', 'Approval document not found');
        if (isApprovalRetentionExpired(document.retention_until)) {
            return fail(403, 'FORBIDDEN', '보존 기간이 만료된 문서는 PDF로 출력할 수 없습니다.');
        }
        if (!await canDownloadApprovalDocument(context, document)) {
            return fail(403, 'FORBIDDEN', 'PDF 다운로드 권한이 없습니다.');
        }
        const [versionResult, eventResult] = await Promise.all([
            document.current_version_id
                ? context.supabase.from('approval_document_versions').select('template_version_id, title, values')
                    .eq('id', document.current_version_id).eq('company_id', context.companyId)
                    .maybeSingle<{ readonly template_version_id: string | null; readonly title: string; readonly values: unknown }>()
                : Promise.resolve({ data: null, error: null }),
            context.supabase.from('approval_document_events').select('event_type, memo, created_at')
                .eq('document_id', document.id).eq('company_id', context.companyId)
                .order('created_at', { ascending: true })
                .returns<Array<{ readonly event_type: string; readonly memo: string; readonly created_at: string }>>()
        ]);
        throwDatabaseError(versionResult.error);
        throwDatabaseError(eventResult.error);
        const templateResult = versionResult.data?.template_version_id
            ? await context.supabase.from('approval_template_versions').select('fields')
                .eq('id', versionResult.data.template_version_id).eq('company_id', context.companyId)
                .maybeSingle<{ readonly fields: unknown }>()
            : { data: null, error: null };
        throwDatabaseError(templateResult.error);

        const [{ generate }, { text }] = await Promise.all([
            import('@pdfme/generator'),
            import('@pdfme/schemas')
        ]);
        const font = await readFile(path.join(process.cwd(), 'public', 'fonts', 'noto-sans-kr-400.ttf'));
        const documentTitle = versionResult.data?.title || document.title;
        const body = documentBody(versionResult.data?.values ?? document.values, templateResult.data?.fields, eventResult.data || []);
        const chunks = paginateApprovalBody(body);
        const template = createApprovalPdfTemplate(chunks.length);
        const pdfInput = createApprovalPdfInput(
            chunks,
            documentTitle,
            `문서번호: APR-${document.id.slice(0, 8).toUpperCase()}\n상태: ${document.status}    기안일: ${document.submitted_at || document.created_at}`
        );
        const pdf = await generate({
            template,
            inputs: [pdfInput],
            plugins: { text },
            options: { font: { NotoSansKR: { data: font, fallback: true } } }
        });
        return createApprovalPdfDownloadResponse(pdf, document.id, documentTitle);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to generate approval PDF');
    }
}
