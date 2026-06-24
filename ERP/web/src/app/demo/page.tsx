import type { Metadata } from 'next';
import { DemoAccessGate } from './_components/DemoAccessGate';
import { DemoShell } from './_components/DemoShell';
import { getDemoAccessState } from './demoAccessState';

export const metadata: Metadata = {
    title: 'Franchise OS 데모 | 제품 체험',
    description: '운영 DB를 변경하지 않는 샘플 데이터로 Franchise OS의 프랜차이즈 화면을 체험합니다.'
};

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
    const access = await getDemoAccessState();
    if (!access.granted) {
        return <DemoAccessGate configured={access.configured} returnTo="/demo" />;
    }

    return <DemoShell role="manager" />;
}
