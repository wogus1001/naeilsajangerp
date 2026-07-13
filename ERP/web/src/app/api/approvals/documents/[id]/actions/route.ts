import { handleApprovalActionPOST } from './action-handler';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
    return handleApprovalActionPOST(request, routeContext);
}
