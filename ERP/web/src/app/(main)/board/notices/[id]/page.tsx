"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Eye, Trash2, Edit3 } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { canManageNotice } from '@/lib/notices';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getStoredUser, type StoredUser } from '@/utils/userUtils';

type NoticeDetail = {
    readonly id: string;
    readonly title: string;
    readonly content?: string | null;
    readonly type?: string | null;
    readonly authorId?: string | null;
    readonly author_id?: string | null;
    readonly authorName: string;
    readonly authorRole: string;
    readonly companyId?: string | null;
    readonly company_id?: string | null;
    readonly createdAt: string;
    readonly views?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(source: Record<string, unknown>, key: string): string | null {
    const value = source[key];
    return typeof value === 'string' ? value : null;
}

function readOptionalNumber(source: Record<string, unknown>, key: string): number | null {
    const value = source[key];
    return typeof value === 'number' ? value : null;
}

function parseNoticeDetail(value: unknown): NoticeDetail | null {
    if (!isRecord(value)) return null;
    const id = readOptionalString(value, 'id');
    const title = readOptionalString(value, 'title');
    const authorName = readOptionalString(value, 'authorName');
    const authorRole = readOptionalString(value, 'authorRole');
    const createdAt = readOptionalString(value, 'createdAt');
    if (!id || !title || !authorName || !authorRole || createdAt === null) return null;

    return {
        id,
        title,
        content: readOptionalString(value, 'content'),
        type: readOptionalString(value, 'type'),
        authorId: readOptionalString(value, 'authorId'),
        author_id: readOptionalString(value, 'author_id'),
        authorName,
        authorRole,
        companyId: readOptionalString(value, 'companyId'),
        company_id: readOptionalString(value, 'company_id'),
        createdAt,
        views: readOptionalNumber(value, 'views')
    };
}

export default function NoticeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [notice, setNotice] = useState<NoticeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<StoredUser>(null);

    const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', title: '' });
    const showAlert = (message: string) => setAlertConfig({ isOpen: true, message, title: '알림' });
    const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => { } });
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ isOpen: true, message, onConfirm });

    useEffect(() => {
        setCurrentUser(getStoredUser());

        const fetchNotice = async () => {
            if (!params?.id) return;
            try {
                const res = await fetch(`/api/notices/${params.id}`);
                if (res.ok) {
                    const data: unknown = await res.json();
                    const parsedNotice = parseNoticeDetail(data);
                    if (!parsedNotice) {
                        showAlert('공지사항 정보를 읽을 수 없습니다.');
                        return;
                    }
                    setNotice(parsedNotice);
                } else {
                    showAlert('공지사항을 찾을 수 없습니다.');
                    router.push('/board/notices');
                }
            } catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
            } finally {
                setLoading(false);
            }
        };

        fetchNotice();
    }, [params?.id, router]);

    const handleDelete = async () => {
        showConfirm('정말로 이 공지사항을 삭제하시겠습니까?', async () => {
            try {
                const res = await fetch(`/api/notices/${params.id}`, {
                    method: 'DELETE',
                    headers: await getApiAuthHeaders()
                });
                if (res.ok) {
                    showAlert('삭제되었습니다.');
                    router.push('/board/notices');
                } else {
                    showAlert('삭제 실패');
                }
            } catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
                showAlert('오류 발생');
            }
        });
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
    if (!notice) return null;

    const canManage = canManageNotice(currentUser, notice);

    const getRoleBadge = (role: string) => {
        if (role === 'admin') return <span style={{ background: '#212529', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '8px' }}>관리자</span>;
        if (role === 'manager') return <span style={{ background: '#e7f5ff', color: '#1971c2', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '8px' }}>팀장</span>;
        return <span style={{ background: '#f8f9fa', color: '#495057', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '8px' }}>직원</span>;
    };

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            <button
                onClick={() => router.push('/board/notices')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    background: 'none',
                    color: '#868e96',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '24px'
                }}
            >
                <ArrowLeft size={16} /> 목록으로 돌아가기
            </button>

            <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', padding: '48px', border: '1px solid #f1f3f5' }}>
                <div style={{ borderBottom: '1px solid #e9ecef', paddingBottom: '24px', marginBottom: '32px' }}>

                    {/* Top Meta Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {notice.type === 'system' ? (
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fa5252', background: '#fff5f5', padding: '4px 8px', borderRadius: '4px' }}>전체 공지</span>
                            ) : (
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1971c2', background: '#e7f5ff', padding: '4px 8px', borderRadius: '4px' }}>팀 공지</span>
                            )}
                            <span style={{ fontSize: '13px', color: '#adb5bd' }}>|</span>
                            <span style={{ fontSize: '13px', color: '#868e96' }}>{notice.createdAt}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#868e96', fontSize: '13px' }}>
                            <Eye size={16} />
                            조회 {notice.views}
                        </div>
                    </div>

                    {/* Title & Author Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#212529', lineHeight: '1.3', flex: 1, margin: 0 }}>
                            {notice.title}
                        </h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: '600', color: '#495057', fontSize: '15px' }}>{notice.authorName}</span>
                                {getRoleBadge(notice.authorRole)}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#343a40', whiteSpace: 'pre-wrap', minHeight: '200px' }}>
                    {notice.content}
                </div>

                {canManage && (
                    <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #f1f3f5', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => router.push(`/board/notices/${notice.id}/edit`)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: '#e7f5ff',
                                color: '#1864ab',
                                border: '1px solid #d0ebff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                marginRight: '12px'
                            }}
                        >
                            <Edit3 size={16} /> 수정하기
                        </button>
                        <button
                            onClick={handleDelete}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: '#fff5f5',
                                color: '#fa5252',
                                border: '1px solid #ffc9c9',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}
                        >
                            <Trash2 size={16} /> 삭제하기
                        </button>
                    </div>
                )}
            </div>
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                message={alertConfig.message}
                title={alertConfig.title}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                isDanger={true}
            />
        </div>
    );
}
