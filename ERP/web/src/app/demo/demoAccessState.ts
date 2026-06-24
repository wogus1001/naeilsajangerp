import { cookies } from 'next/headers';
import {
    DEMO_ACCESS_COOKIE_NAME,
    readDemoAccessConfig,
    verifyDemoAccessToken
} from '@/lib/demo-access';

export type DemoAccessState = {
    readonly configured: boolean;
    readonly granted: boolean;
};

export async function getDemoAccessState(): Promise<DemoAccessState> {
    const config = readDemoAccessConfig();
    if (!config) {
        return { configured: false, granted: false };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(DEMO_ACCESS_COOKIE_NAME)?.value;
    return {
        configured: true,
        granted: verifyDemoAccessToken(token, config)
    };
}
