import type { Metadata } from 'next';
import { DemoAccessGate } from './_components/DemoAccessGate';
import { DemoShell } from './_components/DemoShell';
import { getDemoAccessState } from './demoAccessState';

export const metadata: Metadata = {
    title: '프랜차이즈 본부 ERP 데모 | 제품 체험',
    description: '운영 DB를 변경하지 않는 실제형 샘플 데이터와 화면별 가이드로 프랜차이즈 본부 ERP의 현재 UI 흐름을 체험합니다.'
};

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
    const access = await getDemoAccessState();
    if (!access.granted) {
        return <DemoAccessGate configured={access.configured} returnTo="/demo" />;
    }

    return <DemoShell role="manager" />;
}
