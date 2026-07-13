import { ApprovalListPage } from '@/components/approvals/ApprovalListPage';

export default function Page() {
    return (
        <ApprovalListPage
            description="현재 내 차례인 결재·합의·수신 문서를 처리합니다."
            emptyMessage="처리할 결재 문서가 없습니다."
            filter="waiting"
            title="결재 대기"
        />
    );
}
