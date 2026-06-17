import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { LocationFormState } from './locationMasterTypes';

type LocationMemoSectionProps = {
    readonly form: LocationFormState;
    readonly onChange: (patch: Partial<LocationFormState>) => void;
};

export function LocationMemoSection({
    form,
    onChange
}: LocationMemoSectionProps) {
    return (
        <section className={styles.locationFormSection}>
            <h4>임대인 · 종합메모</h4>
            <div className={styles.locationFormGrid}>
                <label>
                    임대인명
                    <input value={form.landlord.name} onChange={(event) => onChange({ landlord: { ...form.landlord, name: event.target.value } })} placeholder="내부 확인용" />
                </label>
                <label>
                    임대인 연락처
                    <input value={form.landlord.phone} onChange={(event) => onChange({ landlord: { ...form.landlord, phone: event.target.value } })} placeholder="내부 확인용" />
                </label>
                <label className={styles.locationMemoField}>
                    임대인정보 및 성향
                    <textarea value={form.landlord.tendency} onChange={(event) => onChange({ landlord: { ...form.landlord, tendency: event.target.value } })} placeholder="협의 성향, 의사결정 속도, 주의사항" />
                </label>
                <label className={styles.locationMemoField}>
                    종합메모
                    <textarea value={form.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="현장 판단, 리스크, 다음 확인사항" />
                </label>
            </div>
        </section>
    );
}
