"use client";

import { ExternalLink, FileSignature } from 'lucide-react';
import type { CompanyTemplateSummary } from './companyTemplatesClient';
import styles from './electronicContracts.module.css';

type Props = {
    readonly selected: CompanyTemplateSummary;
    readonly busy: boolean;
    readonly onLink: () => void;
};

function setupStepState(selected: CompanyTemplateSummary, step: 'created' | 'linked'): boolean {
    switch (step) {
        case 'created':
            return Boolean(selected.latestVersion);
        case 'linked':
            return Boolean(selected.latestVersion?.ucansignTemplateId);
        default:
            return false;
    }
}

export function CompanyTemplateUcansignSetup({ selected, busy, onLink }: Props) {
    const isLinked = setupStepState(selected, 'linked');
    const actionLabel = isLinked ? '유캔싸인에서 수정' : '유캔싸인에서 템플릿 설정';

    return (
        <div className={styles.ucansignSetup}>
            <div className={styles.setupSummary}>
                <div className={styles.setupIcon}><FileSignature size={18} /></div>
                <div>
                    <h3>다음 작업</h3>
                    <p>UCanSign 설정 화면에서 PDF를 올리고 서명칸을 배치하면, ERP에서는 회사별 템플릿과 발송 이력을 관리합니다.</p>
                </div>
            </div>
            <div className={styles.setupSteps}>
                <div className={styles.setupStep}>
                    <span className={setupStepState(selected, 'created') ? styles.stepDone : styles.stepNumber}>1</span>
                    <strong>템플릿 생성</strong>
                    <p>회사에서 사용할 계약서 이름을 저장합니다.</p>
                </div>
                <div className={styles.setupStep}>
                    <span className={isLinked ? styles.stepDone : styles.stepNumber}>2</span>
                    <strong>문서/서명칸 설정</strong>
                    <p>UCanSign 화면에서 PDF와 서명 참여자를 설정합니다.</p>
                </div>
                <div className={styles.setupStep}>
                    <span className={isLinked ? styles.stepDone : styles.stepNumber}>3</span>
                    <strong>ERP에 자동 연결</strong>
                    <p>설정 완료 후 돌아오면 회사 템플릿으로 바로 사용할 수 있습니다.</p>
                </div>
            </div>
            <div className={styles.setupActions}>
                <button className={styles.primaryButton} type="button" onClick={onLink} disabled={busy || !selected.latestVersion}>
                    <ExternalLink size={16} />
                    {actionLabel}
                </button>
            </div>
            <p className={styles.helperText}>
                {isLinked ? 'UCanSign 템플릿이 연결되어 있습니다.' : 'UCanSign 설정을 완료하고 돌아오면 템플릿 ID가 자동 저장됩니다.'}
            </p>
        </div>
    );
}
