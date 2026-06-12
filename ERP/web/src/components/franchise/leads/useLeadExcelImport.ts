"use client";

import React from 'react';
import type { UploadErrorRow } from './types';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type LeadAlertType = 'success' | 'error' | 'info';

type UseLeadExcelImportParams = {
    readonly userId: string;
    readonly userName?: string;
    readonly companyName: string;
    readonly onLeadsRefreshAction: () => void | Promise<void>;
    readonly showAlertAction: (message: string, type?: LeadAlertType, title?: string) => void;
};

export function useLeadExcelImport({
    userId,
    userName,
    companyName,
    onLeadsRefreshAction,
    showAlertAction
}: UseLeadExcelImportParams) {
    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadErrors, setUploadErrors] = React.useState<UploadErrorRow[]>([]);

    const handleUploadFile = async (file: File) => {
        if (!userId) return;

        setIsUploading(true);
        setUploadErrors([]);
        try {
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

            if (rows.length === 0) {
                showAlertAction('업로드할 행이 없습니다.', 'error', '엑셀 업로드 실패');
                return;
            }

            const response = await fetch('/api/franchise-leads/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows,
                    meta: {
                        requesterId: userId,
                        managerId: userId,
                        companyName
                    }
                })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const result = unwrapApiData<{ created: number; updated: number; skipped: number; errors?: UploadErrorRow[] }>(payload);
            const nextUploadErrors = result.errors || [];
            setUploadErrors(nextUploadErrors);
            await onLeadsRefreshAction();
            showAlertAction(
                `신규 ${result.created}건, 업데이트 ${result.updated}건, 제외 ${result.skipped}건 처리했습니다.${nextUploadErrors.length > 0 ? `\n실패 행은 상단의 다운로드 버튼으로 확인할 수 있습니다.\n첫 오류: ${nextUploadErrors[0].row}행 - ${nextUploadErrors[0].reason}` : ''}`,
                result.skipped > 0 ? 'info' : 'success',
                '엑셀 업로드 완료'
            );
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '엑셀 업로드 중 오류가 발생했습니다.', 'error', '엑셀 업로드 실패');
        } finally {
            setIsUploading(false);
            if (uploadInputRef.current) uploadInputRef.current.value = '';
        }
    };

    const downloadUploadErrorRows = async () => {
        if (uploadErrors.length === 0) {
            showAlertAction('다운로드할 실패 행이 없습니다.', 'info');
            return;
        }

        const XLSX = await import('xlsx');
        const originalKeys = Array.from(new Set(
            uploadErrors.flatMap(error => Object.keys(error.data || {}))
        )).filter(key => key !== '행번호' && key !== '오류사유');
        const exportRows = uploadErrors.map(error => ({
            ...(error.data || {}),
            행번호: error.row,
            오류사유: error.reason
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: ['행번호', '오류사유', ...originalKeys] });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '실패행');
        XLSX.writeFile(workbook, 'franchise-leads-upload-errors.xlsx');
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet([
            {
                이름: '홍길동',
                연락처: '010-1234-5678',
                유입경로: '랜딩페이지',
                상태: '문의접수',
                등급: '중요',
                희망지역: '서울 강남구',
                '창업예산(만원)': '10000~20000',
                관심브랜드: '미카도',
                담당자: userName || '',
                다음연락일: '2026-06-10',
                메모: '첫 상담 요청'
            }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '모객DB');
        XLSX.writeFile(workbook, 'franchise-leads-template.xlsx');
    };

    return {
        downloadTemplate,
        downloadUploadErrorRows,
        handleUploadFile,
        isUploading,
        uploadErrors,
        uploadInputRef
    };
}
