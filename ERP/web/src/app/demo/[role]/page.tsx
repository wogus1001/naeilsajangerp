import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemoAccessGate } from '../_components/DemoAccessGate';
import { DemoShell } from '../_components/DemoShell';
import { getDemoAccessState } from '../demoAccessState';
import { DEMO_SCENARIOS } from '../demoContent';
import type { DemoRole } from '../demoTypes';

type DemoRolePageProps = {
    readonly params: Promise<{
        readonly role: string;
    }>;
};

export const metadata: Metadata = {
    title: 'Franchise OS 데모 | 기능 설명 투어',
    description: '샘플 데이터와 딤드 오버레이로 Franchise OS 주요 기능을 역할별로 체험합니다.'
};

export const dynamic = 'force-dynamic';

export default async function DemoRolePage({ params }: DemoRolePageProps) {
    const { role } = await params;
    if (!isDemoRole(role)) {
        notFound();
    }

    const access = await getDemoAccessState();
    if (!access.granted) {
        return <DemoAccessGate configured={access.configured} returnTo={`/demo/${role}`} />;
    }

    return <DemoShell role={role} />;
}

function isDemoRole(value: string): value is DemoRole {
    return value === 'admin' || value === 'manager' || value === 'partner';
}
