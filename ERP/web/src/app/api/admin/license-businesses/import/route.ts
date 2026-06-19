import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { toLicenseBusinessImportRow } from '@/lib/electronic-contracts/license-business';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SAFETYDATA_ENDPOINT = 'https://www.safetydata.go.kr/V2/api/DSSP-IF-20103';
const ROWS_PER_PAGE = 1000;
const MAX_PAGES = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getItems(body: unknown): readonly Record<string, unknown>[] {
    if (!isRecord(body)) return [];
    const items = body.body;
    if (Array.isArray(items)) return items.filter(isRecord);
    return isRecord(items) ? [items] : [];
}

function getTotalCount(body: unknown): number {
    if (!isRecord(body)) return 0;
    const totalCount = body.totalCount;
    if (typeof totalCount === 'number') return totalCount;
    if (typeof totalCount === 'string') return Number(totalCount.replace(/[^\d]/g, '')) || 0;
    return 0;
}

async function fetchSafetyDataPage(pageNo: number, serviceKey: string): Promise<unknown> {
    const url = new URL(SAFETYDATA_ENDPOINT);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('returnType', 'json');
    url.searchParams.set('pageNo', String(pageNo));
    url.searchParams.set('numOfRows', String(ROWS_PER_PAGE));

    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`SafetyData request failed: ${response.status}`);
    return response.json();
}

async function insertRows(rows: readonly Record<string, unknown>[]): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    for (let index = 0; index < rows.length; index += 500) {
        const chunk = rows.slice(index, index + 500);
        const { error } = await supabaseAdmin.from('license_business_records').insert(chunk);
        if (error) throw error;
    }
}

export async function POST(request: Request) {
    let batchId = '';
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const serviceKey = process.env.SAFETYDATA_SERVICE_KEY;
        if (!serviceKey) return fail(500, 'INTERNAL_ERROR', 'SAFETYDATA_SERVICE_KEY is required');

        batchId = crypto.randomUUID();
        const { error: batchError } = await supabaseAdmin.from('license_import_batches').insert({
            id: batchId,
            source: 'safetydata',
            status: 'running',
            started_by: requester.id,
            started_at: new Date().toISOString()
        });
        if (batchError) throw batchError;

        const firstPage = await fetchSafetyDataPage(1, serviceKey);
        const totalCount = getTotalCount(firstPage);
        const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE);
        if (totalPages > MAX_PAGES) {
            await supabaseAdmin.from('license_import_batches').update({
                status: 'failed',
                error_message: 'SafetyData page count exceeds import limit',
                completed_at: new Date().toISOString()
            }).eq('id', batchId);
            return fail(400, 'VALIDATION_ERROR', 'SafetyData page count exceeds import limit');
        }

        const rows: Record<string, unknown>[] = [];
        for (const item of getItems(firstPage)) {
            const row = toLicenseBusinessImportRow(item, batchId);
            if (row) rows.push(row);
        }

        for (let pageNo = 2; pageNo <= Math.max(totalPages, 1); pageNo += 1) {
            const page = await fetchSafetyDataPage(pageNo, serviceKey);
            for (const item of getItems(page)) {
                const row = toLicenseBusinessImportRow(item, batchId);
                if (row) rows.push(row);
            }
        }

        if (rows.length === 0) {
            await supabaseAdmin.from('license_import_batches').update({
                status: 'failed',
                error_message: 'SafetyData returned no importable records',
                completed_at: new Date().toISOString()
            }).eq('id', batchId);
            return fail(500, 'INTERNAL_ERROR', 'SafetyData returned no importable records');
        }

        await insertRows(rows.map(row => ({ ...row, active: false })));

        const { error: activateError } = await supabaseAdmin
            .from('license_business_records')
            .update({ active: true })
            .eq('import_batch_id', batchId);
        if (activateError) throw activateError;

        const { error: deactivateNullBatchError } = await supabaseAdmin
            .from('license_business_records')
            .update({ active: false })
            .eq('active', true)
            .is('import_batch_id', null);
        if (deactivateNullBatchError) throw deactivateNullBatchError;

        const { error: deactivateOldBatchError } = await supabaseAdmin
            .from('license_business_records')
            .update({ active: false })
            .eq('active', true)
            .neq('import_batch_id', batchId);
        if (deactivateOldBatchError) throw deactivateOldBatchError;

        const { error: completeError } = await supabaseAdmin.from('license_import_batches').update({
            status: 'completed',
            total_count: totalCount,
            imported_count: rows.length,
            completed_at: new Date().toISOString()
        }).eq('id', batchId);
        if (completeError) throw completeError;

        return ok({ batchId, totalCount, importedCount: rows.length });
    } catch (error) {
        console.error('License business import error:', error);
        if (batchId) {
            try {
                await getSupabaseAdmin().from('license_import_batches').update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown import error',
                    completed_at: new Date().toISOString()
                }).eq('id', batchId);
            } catch (auditError) {
                console.warn(
                    'Failed to mark license import batch as failed:',
                    auditError instanceof Error ? auditError.message : auditError
                );
            }
        }
        return fail(500, 'INTERNAL_ERROR', 'Failed to import license business records');
    }
}
