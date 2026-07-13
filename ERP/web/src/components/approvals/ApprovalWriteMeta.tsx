import { Archive, LockKeyhole, ShieldCheck } from 'lucide-react';
import styles from './ApprovalDocument.module.css';

export type ApprovalWriteMetaValue = {
    readonly retentionPeriod: string;
    readonly securityLevel: string;
    readonly documentBox: string;
};

type ApprovalWriteMetaProps = {
    readonly value: ApprovalWriteMetaValue;
    readonly onChange: (value: ApprovalWriteMetaValue) => void;
};

export function ApprovalWriteMeta({ onChange, value }: ApprovalWriteMetaProps) {
    return (
        <div className={styles.metaFields}>
            <label>
                <span><Archive size={15} aria-hidden="true" />보존기간</span>
                <select onChange={event => onChange({ ...value, retentionPeriod: event.target.value })} value={value.retentionPeriod}>
                    <option value="1y">1년</option>
                    <option value="3y">3년</option>
                    <option value="5y">5년</option>
                    <option value="10y">10년</option>
                    <option value="permanent">영구</option>
                </select>
            </label>
            <label>
                <span><LockKeyhole size={15} aria-hidden="true" />보안등급</span>
                <select onChange={event => onChange({ ...value, securityLevel: event.target.value })} value={value.securityLevel}>
                    <option value="normal">일반</option>
                    <option value="restricted">부서 한정</option>
                    <option value="confidential">대외비</option>
                </select>
            </label>
            <label>
                <span><ShieldCheck size={15} aria-hidden="true" />문서함</span>
                <select onChange={event => onChange({ ...value, documentBox: event.target.value })} value={value.documentBox}>
                    <option value="general">일반 품의</option>
                    <option value="finance">재무·지출</option>
                    <option value="hr">인사</option>
                    <option value="operations">운영</option>
                </select>
            </label>
        </div>
    );
}
