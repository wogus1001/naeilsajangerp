import { ok } from '@/lib/api-response';
import {
    fetchActiveRequester,
    isRecord,
    type FranchiseScheduleRouteDependencies
} from './support';

export async function listScheduleAssignees(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<Response> {
    const supabaseAdmin = dependencies.getSupabaseAdmin();
    const access = await fetchActiveRequester(supabaseAdmin, request, dependencies);
    if (access.response) return access.response;
    if (!access.requester?.company_id) return ok([]);

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .eq('company_id', access.requester.company_id)
        .eq('status', 'active')
        .order('name', { ascending: true });
    if (error) throw error;

    const assignees = (Array.isArray(data) ? data : []).flatMap(row => {
        if (!isRecord(row) || typeof row.id !== 'string' || typeof row.name !== 'string') return [];
        const id = row.id.trim();
        const name = row.name.trim();
        return id && name ? [{ id, name }] : [];
    });
    return ok(assignees);
}
