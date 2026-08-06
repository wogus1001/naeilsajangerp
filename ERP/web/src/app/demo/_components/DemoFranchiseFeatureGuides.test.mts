import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const featureConfigSource = readFileSync(new URL('./DemoFranchiseFeatureConfig.ts', import.meta.url), 'utf8');
const featureGuideSource = readFileSync(new URL('./DemoFranchiseFeatureGuides.ts', import.meta.url), 'utf8');

test('every production franchise feature shown in the demo has a focused guide', () => {
    const featurePaths = featureConfigSource.match(/'\/(?:dashboard|contracts)\/[^']+': \{/g) ?? [];
    const guidedPaths = featureGuideSource.match(/'\/(?:dashboard|contracts)\/[^']+': \{/g) ?? [];
    assert.deepEqual(guidedPaths.sort(), featurePaths.sort());
    for (const path of featurePaths) {
        assert.match(featureGuideSource, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
});

test('feature guide targets are exposed by the production surfaces', () => {
    const source = [
        '../../../components/franchise/operations/LaborPlanningInputSection.tsx',
        '../../../components/franchise/schedules/FranchiseSchedulePage.tsx',
        '../../../components/franchise/operations/SupervisionPanelSections.tsx',
        '../../../components/franchise/operations/SupervisionOperationQueue.tsx',
        '../../../components/franchise/operations/OwnerPortalPanelSections.tsx',
        '../../(main)/contracts/electronic/_components/ElectronicContractsPage.tsx',
        '../../(main)/dashboard/franchise-vendors/page.tsx',
        '../../(main)/contracts/vendor/VendorContractFilters.tsx',
        '../../(main)/contracts/vendor/VendorContractsPage.tsx'
    ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

    for (const label of [
        '인력 계산 조건',
        '일정 핵심 현황',
        '슈퍼바이징 업무',
        '슈퍼바이징 운영 리포트',
        '슈퍼바이징 운영 우선순위',
        '점주 계정 관리',
        '전자계약 화면 제목',
        '전자계약 업무 전환',
        '전자계약 문서 범위',
        '전자계약 문서 목록',
        '업체 관리 핵심 현황',
        '업체 관리 검색 조건',
        '업체 목록',
        '업체 계약 검색 조건',
        '업체 계약 목록'
    ]) {
        assert.match(source, new RegExp(`aria-label=["{\\\`].*${label}`));
    }
});
