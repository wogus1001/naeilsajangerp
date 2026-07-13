import { ApprovalListPage } from '@/components/approvals/ApprovalListPage';

export default function Page() {
    return (
        <ApprovalListPage
            description="내가 작성한 임시저장, 진행, 완료 문서를 한곳에서 확인합니다."
            emptyMessage="작성한 결재 문서가 없습니다."
            filter="mine"
            title="내 문서함"
        />
    );
}
