import { ApprovalListPage } from '@/components/approvals/ApprovalListPage';

export default function Page() {
    return (
        <ApprovalListPage
            description="소속 부서에 공개되거나 수신된 결재 문서를 조회합니다."
            emptyMessage="부서에서 조회할 수 있는 문서가 없습니다."
            filter="department"
            title="부서 문서함"
        />
    );
}
