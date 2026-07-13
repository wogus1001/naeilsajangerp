import {
    completeSchedule,
    deleteSchedule,
    updateSchedule
} from './mutations';
import {
    createDefaultRouteDependencies,
    createSchedule,
    handleFranchiseScheduleError,
    listSchedules,
    type FranchiseScheduleRouteDependencies
} from './support';
import { listScheduleAssignees } from './assignees';

export async function handleFranchiseSchedulesGET(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies = createDefaultRouteDependencies()
): Promise<Response> {
    try {
        if (new URL(request.url).searchParams.get('view') === 'assignees') {
            return await listScheduleAssignees(request, dependencies);
        }
        return await listSchedules(request, dependencies);
    } catch (error) {
        return handleFranchiseScheduleError(error, 'list');
    }
}

export async function handleFranchiseSchedulesPOST(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies = createDefaultRouteDependencies()
): Promise<Response> {
    try {
        return await createSchedule(request, dependencies);
    } catch (error) {
        return handleFranchiseScheduleError(error, 'create');
    }
}

export async function handleFranchiseSchedulesPATCH(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies = createDefaultRouteDependencies()
): Promise<Response> {
    try {
        const url = new URL(request.url);
        if (url.searchParams.get('action') === 'complete') {
            return await completeSchedule(request, dependencies);
        }
        return await updateSchedule(request, dependencies);
    } catch (error) {
        return handleFranchiseScheduleError(error, 'update');
    }
}

export async function handleFranchiseSchedulesDELETE(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies = createDefaultRouteDependencies()
): Promise<Response> {
    try {
        return await deleteSchedule(request, dependencies);
    } catch (error) {
        return handleFranchiseScheduleError(error, 'delete');
    }
}
