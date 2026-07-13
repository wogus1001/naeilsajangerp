import {
    handleFranchiseSchedulesDELETE,
    handleFranchiseSchedulesGET,
    handleFranchiseSchedulesPATCH,
    handleFranchiseSchedulesPOST
} from './handlers';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
    return handleFranchiseSchedulesGET(request);
}

export function POST(request: Request) {
    return handleFranchiseSchedulesPOST(request);
}

export function PATCH(request: Request) {
    return handleFranchiseSchedulesPATCH(request);
}

export function DELETE(request: Request) {
    return handleFranchiseSchedulesDELETE(request);
}
