import type { Metadata } from 'next';
import { DemoShell } from './_components/DemoShell';

export const metadata: Metadata = {
    title: 'Franchise OS 데모 | 제품 체험',
    description: '운영 DB를 변경하지 않는 샘플 데이터로 Franchise OS의 프랜차이즈 화면을 체험합니다.'
};

export default function DemoPage() {
    return <DemoShell role="manager" />;
}
