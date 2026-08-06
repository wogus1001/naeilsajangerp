'use client';

import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    Check,
    ClipboardCheck,
    MapPinned,
    Play,
    Store,
    type LucideIcon
} from 'lucide-react';
import type { DemoRole, DemoStory, DemoStoryId } from '../demoTypes';
import dialogStyles from './DemoExperienceDialog.module.css';
import storyStyles from './DemoStorySelector.module.css';

const STORY_ICONS = {
    sales: BriefcaseBusiness,
    siteDevelopment: MapPinned,
    openingOperations: Store,
    headOffice: Building2
} as const satisfies Record<DemoStoryId, LucideIcon>;

type WelcomeProps = {
    readonly stories: readonly DemoStory[];
    readonly titleId: string;
    readonly descriptionId: string;
    readonly primaryButtonRef: React.RefObject<HTMLButtonElement | null>;
    readonly onStartCoreAction: () => void;
    readonly onStartStoryAction: (storyId: DemoStoryId) => void;
};

export function DemoExperienceWelcome({
    stories,
    titleId,
    descriptionId,
    primaryButtonRef,
    onStartCoreAction,
    onStartStoryAction
}: WelcomeProps) {
    return (
        <>
            <span className={dialogStyles.badge}>샘플 데이터 데모</span>
            <h2 id={titleId}>원하는 방식으로 FC ERP를 체험해보세요</h2>
            <p id={descriptionId}>
                실제 프랜차이즈 화면과 같은 구조에서 전체 업무 흐름을 빠르게 보거나, 담당 업무에 맞는 시나리오를 선택할 수 있습니다.
            </p>

            <section className={storyStyles.coreJourney} aria-label="전체 핵심 체험">
                <div className={storyStyles.coreIcon}><Play size={22} aria-hidden="true" /></div>
                <div>
                    <span className={storyStyles.optionLabel}>처음 보신다면 추천</span>
                    <strong>3분 핵심 체험</strong>
                    <p>광고 유입, 상담, 가맹 희망자 승격, 후보지, 계약·오픈 준비, 가맹 운영까지 전체 연결 구조를 빠르게 봅니다.</p>
                    <span className={storyStyles.meta}>전체 업무 흐름 · 8단계</span>
                </div>
                <button ref={primaryButtonRef} type="button" className={dialogStyles.primaryButton} onClick={onStartCoreAction}>
                    전체 흐름 시작
                    <ArrowRight size={16} aria-hidden="true" />
                </button>
            </section>

            {stories.length > 0 ? (
                <section className={storyStyles.storySection} aria-label="업무별 시나리오 선택">
                    <div className={storyStyles.sectionHeading}>
                        <div>
                            <span className={storyStyles.optionLabel}>업무별로 자세히 보기</span>
                            <h3>담당 업무에 맞는 시나리오</h3>
                        </div>
                        <span>주요 버튼과 상세 화면까지 직접 확인합니다.</span>
                    </div>
                    <div className={storyStyles.storyGrid}>
                        {stories.map(story => (
                            <DemoStoryCard
                                key={story.id}
                                story={story}
                                onStartAction={() => onStartStoryAction(story.id)}
                            />
                        ))}
                    </div>
                </section>
            ) : (
                <div className={dialogStyles.partnerNote}>
                    협력업체 계정에서는 본사가 공유한 후보지, 지도, 운영 정보만 안전하게 확인합니다.
                </div>
            )}
        </>
    );
}

function DemoStoryCard({
    story,
    onStartAction
}: {
    readonly story: DemoStory;
    readonly onStartAction: () => void;
}) {
    const Icon = STORY_ICONS[story.id];
    return (
        <article className={storyStyles.storyCard} data-demo-story-id={story.id}>
            <div className={storyStyles.storyHeader}>
                <span className={storyStyles.storyIcon}><Icon size={18} aria-hidden="true" /></span>
                <div>
                    <span>{story.roleLabel}</span>
                    <strong>{story.title}</strong>
                </div>
            </div>
            <p>{story.description}</p>
            <ul>
                {story.features.map(feature => (
                    <li key={feature}><Check size={14} aria-hidden="true" /> {feature}</li>
                ))}
            </ul>
            <div className={storyStyles.storyFooter}>
                <span>{story.duration} · {story.steps.length}단계</span>
                <button type="button" onClick={onStartAction}>
                    이 시나리오 체험
                    <ArrowRight size={15} aria-hidden="true" />
                </button>
            </div>
        </article>
    );
}

export function DemoExperienceCompletion({
    role,
    story,
    titleId,
    descriptionId
}: {
    readonly role: DemoRole;
    readonly story: DemoStory | undefined;
    readonly titleId: string;
    readonly descriptionId: string;
}) {
    const coreItems = role === 'partner'
        ? ['공유 범위 주요 현황', '현장 일정 확인', '공유 후보지와 물건지 확인']
        : ['광고 유입과 상담', '가맹 희망자 전환', '출점 후보지 검토', '계약·오픈 준비', '가맹 운영'];
    const title = story?.title ?? (role === 'partner'
        ? '공유된 후보지와 일정 범위를 확인했습니다'
        : '광고 유입부터 가맹 운영까지 전체 흐름을 확인했습니다');
    const description = story?.outcome ?? (role === 'partner'
        ? '이제 화면별 안내를 보거나, 본사가 공유한 샘플 데이터를 자유롭게 살펴볼 수 있습니다.'
        : '모객, 후보지, 계약 이후 오픈 준비와 운영점 관리가 하나의 업무 흐름으로 이어집니다.');
    const items = story?.features ?? coreItems;

    return (
        <>
            <span className={dialogStyles.badge}><ClipboardCheck size={14} aria-hidden="true" /> 체험 완료</span>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
            <div className={dialogStyles.summary} aria-label="확인한 주요 기능">
                <strong>이번 체험에서 확인한 기능</strong>
                <div>
                    {items.map(item => (
                        <span key={item}><Check size={16} aria-hidden="true" /> {item}</span>
                    ))}
                </div>
            </div>
        </>
    );
}
