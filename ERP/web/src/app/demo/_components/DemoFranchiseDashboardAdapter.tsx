'use client';

import React from 'react';
import { DashboardNoticeDialog, EMPTY_DASHBOARD_NOTICE_DRAFT, type DashboardNoticeDraft } from '@/components/dashboard/DashboardNoticeDialog';
import { DashboardWelcomeHeader } from '@/components/dashboard/DashboardWelcomeHeader';
import { MainDashboardTypeA } from '@/components/dashboard/MainDashboardTypeA';
import type { KpiMetrics } from '@/components/dashboard/MainDashboardTypeAStats';
import type { DemoActionHandler, DemoRole, DemoScreenId } from '../demoTypes';
import { DEMO_PATH_TO_SCREEN } from './DemoErpShellConfig';
import { DEMO_LOCATION_MASTER_ITEMS } from './DemoFranchiseSampleData';
import { DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';
import styles from '../demo.module.css';

type DemoFranchiseDashboardAdapterProps = {
    readonly role?: DemoRole;
    readonly userName?: string;
    readonly metrics?: KpiMetrics;
    readonly canCreateSystemNotice?: boolean;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

type DemoDashboardNotice = {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly createdAt: string;
    readonly type: 'team' | 'system';
    readonly isPinned: boolean;
};

const DEMO_DASHBOARD_SCHEDULES = [
    { id: 'schedule-gangnam', time: '10:30', title: '강남역 후보지 현장 확인', location: '서울 강남구' },
    { id: 'schedule-pangyo', time: '14:00', title: '최하늘 점주 오픈 준비 점검', location: '판교테크노점' },
    { id: 'schedule-disclosure', time: '16:30', title: '정보공개서 수령 확인 콜', location: '담당자 김담당' }
] as const;

const DEMO_DASHBOARD_NOTICES: readonly DemoDashboardNotice[] = [
    {
        id: 'demo-notice-opening',
        title: '계약 완료 상세 오픈 준비 탭 안내',
        content: '계약 완료 점주의 오픈 준비 항목을 확인하세요.',
        createdAt: '2026-06-25',
        type: 'team',
        isPinned: true
    },
    {
        id: 'demo-notice-map',
        title: '물건지 지도 반경분석 사용 가이드',
        content: '지도에서 후보지를 선택하고 반경분석을 확인하세요.',
        createdAt: '2026-06-25',
        type: 'team',
        isPinned: false
    },
    {
        id: 'demo-notice-sample',
        title: '데모 계정은 샘플 데이터만 표시됩니다.',
        content: '데모에서 입력한 내용은 실제 운영 데이터에 저장되지 않습니다.',
        createdAt: '2026-06-24',
        type: 'system',
        isPinned: false
    }
];

const DEMO_PARTNER_DASHBOARD_SCHEDULES = [
    { id: 'schedule-partner-mapo', time: '11:00', title: '마포 후보지 현장 사진 공유', location: '서울 마포구' },
    { id: 'schedule-partner-ilsan', time: '15:30', title: '일산점 운영 현황 확인', location: '협력업체 공유 일정' }
] as const;

const DEMO_PARTNER_DASHBOARD_NOTICES: readonly DemoDashboardNotice[] = [
    {
        id: 'demo-partner-notice-location',
        title: '본사 공유 후보지 확인 안내',
        content: '협력업체 계정에는 본사가 공유한 후보지와 운영 현황만 표시됩니다.',
        createdAt: '2026-06-25',
        type: 'team',
        isPinned: true
    },
    {
        id: 'demo-partner-notice-sample',
        title: '데모 계정은 샘플 데이터만 표시됩니다.',
        content: '데모에서 입력한 내용은 실제 운영 데이터에 저장되지 않습니다.',
        createdAt: '2026-06-24',
        type: 'system',
        isPinned: false
    }
];

const DEMO_DASHBOARD_METRICS: KpiMetrics = {
    leadTotal: DEMO_SAMPLE_LEADS.length,
    eligible: DEMO_SAMPLE_LEADS.filter(lead => lead.disclosureSummary?.remainingDays === 0).length,
    candidateLocations: DEMO_LOCATION_MASTER_ITEMS.filter(location => location.status === '검토중' || location.status === '오픈준비').length,
    matchingNeeded: DEMO_SAMPLE_LEADS.filter(lead => !lead.locationLinks?.length).length
};

function getDemoPathname(href: string): string {
    const queryStart = href.search(/[?#]/);
    return queryStart < 0 ? href : href.slice(0, queryStart);
}

export function DemoFranchiseDashboardAdapter({
    role = 'manager',
    userName = '관리자',
    metrics = DEMO_DASHBOARD_METRICS,
    canCreateSystemNotice = false,
    onScreenChange,
    onSimulate
}: DemoFranchiseDashboardAdapterProps) {
    const [memo, setMemo] = React.useState('');
    const [notices, setNotices] = React.useState<readonly DemoDashboardNotice[]>(
        () => role === 'partner' ? DEMO_PARTNER_DASHBOARD_NOTICES : DEMO_DASHBOARD_NOTICES
    );
    const [isNoticeModalOpen, setIsNoticeModalOpen] = React.useState(false);
    const [noticeDraft, setNoticeDraft] = React.useState<DashboardNoticeDraft>(() => ({ ...EMPTY_DASHBOARD_NOTICE_DRAFT }));

    const navigateDemoPath = React.useCallback((href: string) => {
        const screen = DEMO_PATH_TO_SCREEN[getDemoPathname(href)];
        if (screen) {
            onScreenChange(screen);
            return;
        }
        onSimulate(`데모 화면에서 ${href} 경로를 확인했습니다.`);
    }, [onScreenChange, onSimulate]);

    const openNoticeModal = React.useCallback(() => {
        setNoticeDraft({ ...EMPTY_DASHBOARD_NOTICE_DRAFT });
        setIsNoticeModalOpen(true);
    }, []);

    const submitNotice = React.useCallback(() => {
        const title = noticeDraft.title.trim();
        const content = noticeDraft.content.trim();
        if (!title || !content) {
            onSimulate('공지 제목과 내용을 입력해주세요.');
            return;
        }

        const nextNotice: DemoDashboardNotice = {
            id: `demo-notice-${notices.length + 1}`,
            title,
            content,
            createdAt: '2026-06-25',
            type: noticeDraft.type,
            isPinned: noticeDraft.isPinned
        };
        setNotices(current => [nextNotice, ...current]);
        setNoticeDraft({ ...EMPTY_DASHBOARD_NOTICE_DRAFT });
        setIsNoticeModalOpen(false);
        onSimulate('샘플 공지사항이 추가되었습니다.');
    }, [noticeDraft, notices.length, onSimulate]);

    return (
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto" style={{ fontFamily: 'var(--font-pretendard)' }} data-demo-id="franchise-dashboard">
            <DemoGuidedLayout screen="dashboard" onScreenChange={onScreenChange}>
                <DashboardWelcomeHeader userName={userName} />

                <div className={styles.demoProductionDashboardFrame}>
                    <MainDashboardTypeA
                        requesterId="demo-requester"
                        companyName="데모"
                        metrics={metrics}
                        schedules={role === 'partner' ? DEMO_PARTNER_DASHBOARD_SCHEDULES : DEMO_DASHBOARD_SCHEDULES}
                        notices={notices}
                        memo={memo}
                        onMemoChange={setMemo}
                        onOpenNoticeModal={openNoticeModal}
                        onNavigate={navigateDemoPath}
                    />
                    <div className={styles.demoProductionGuideAnchors} aria-hidden="true">
                        <DemoGuideTarget marker={1} targetId="dashboard-home-kpis" label="KPI 확인" className={`${styles.demoProductionRegionTarget} ${styles.demoDashboardTargetKpis}`}>
                            <span />
                        </DemoGuideTarget>
                        <DemoGuideTarget marker={2} targetId="dashboard-home-schedule" label="일정 확인" className={`${styles.demoProductionRegionTarget} ${styles.demoDashboardTargetSchedule}`}>
                            <span />
                        </DemoGuideTarget>
                        <DemoGuideTarget marker={3} targetId="dashboard-home-notices" label="공지사항 확인" className={`${styles.demoProductionRegionTarget} ${styles.demoDashboardTargetNotices}`}>
                            <span />
                        </DemoGuideTarget>
                        <DemoGuideTarget marker={4} targetId="dashboard-home-memo" label="간편 메모" className={`${styles.demoProductionRegionTarget} ${styles.demoDashboardTargetMemo}`}>
                            <span />
                        </DemoGuideTarget>
                    </div>
                </div>
            </DemoGuidedLayout>

            <DashboardNoticeDialog
                isOpen={isNoticeModalOpen}
                draft={noticeDraft}
                canCreateSystemNotice={canCreateSystemNotice}
                isSaving={false}
                onClose={() => setIsNoticeModalOpen(false)}
                onDraftChange={setNoticeDraft}
                onSubmit={submitNotice}
            />
        </div>
    );
}
