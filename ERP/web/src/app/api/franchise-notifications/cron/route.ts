import { POST as generateScheduledNotifications } from '../route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const commandRequest = new Request(new URL('/api/franchise-notifications', request.url), {
        headers: {
            authorization: request.headers.get('authorization') || ''
        },
        method: 'POST'
    });
    return generateScheduledNotifications(commandRequest);
}
