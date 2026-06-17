"use client";

import React from 'react';
import { Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import {
    COMPANY_LOGO_ALLOWED_MIME_TYPES,
    validateCompanyLogoFile
} from '@/lib/company-logo';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { COMPANY_LOGO_CHANGE_EVENT } from '@/utils/userUtils';
import styles from './CompanyLogoManager.module.css';

type CompanyLogoData = {
    readonly companyId: string;
    readonly companyName: string;
    readonly logoUrl: string | null;
    readonly logoFileName: string | null;
    readonly logoFileSize: number | null;
    readonly logoUpdatedAt: string | null;
};

type CompanyLogoManagerProps = {
    readonly companyId: string;
    readonly companyName: string;
    readonly logoUrl?: string | null;
    readonly onChanged?: (logoUrl: string | null) => void;
};

type MessageState = {
    readonly text: string;
    readonly type: 'success' | 'error';
} | null;

function formatFileSize(value: number | null): string {
    if (!value) return '';
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
    return `${Math.max(1, Math.round(value / 1024)).toLocaleString('ko-KR')}KB`;
}

function readCompanyLogoData(payload: unknown): CompanyLogoData {
    return unwrapApiData<CompanyLogoData>(payload);
}

export function CompanyLogoManager({ companyId, companyName, logoUrl, onChanged }: CompanyLogoManagerProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [currentLogoUrl, setCurrentLogoUrl] = React.useState<string | null>(logoUrl || null);
    const [fileName, setFileName] = React.useState<string | null>(null);
    const [fileSize, setFileSize] = React.useState<number | null>(null);
    const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
    const [isBusy, setIsBusy] = React.useState(false);
    const [message, setMessage] = React.useState<MessageState>(null);

    React.useEffect(() => {
        setCurrentLogoUrl(logoUrl || null);
    }, [logoUrl]);

    React.useEffect(() => {
        if (!companyId) return;
        let cancelled = false;

        const loadLogo = async () => {
            try {
                const params = new URLSearchParams({ companyId });
                const response = await fetch(`/api/company-logo?${params.toString()}`, {
                    cache: 'no-store',
                    headers: await getApiAuthHeaders()
                });
                const payload: unknown = await response.json();
                if (!response.ok) return;
                const data = readCompanyLogoData(payload);
                if (cancelled) return;
                setCurrentLogoUrl(data.logoUrl);
                setFileName(data.logoFileName);
                setFileSize(data.logoFileSize);
                setUpdatedAt(data.logoUpdatedAt);
            } catch (error) {
                if (error instanceof Error) {
                    console.error('Company logo load failed:', error.message);
                } else {
                    console.error('Company logo load failed:', error);
                }
            }
        };

        void loadLogo();
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const notifyChanged = React.useCallback((nextLogoUrl: string | null) => {
        onChanged?.(nextLogoUrl);
        window.dispatchEvent(new CustomEvent(COMPANY_LOGO_CHANGE_EVENT, {
            detail: { companyId, logoUrl: nextLogoUrl }
        }));
    }, [companyId, onChanged]);

    const uploadFile = async (file: File) => {
        const validation = validateCompanyLogoFile(file);
        if (!validation.ok) {
            setMessage({ text: validation.message, type: 'error' });
            return;
        }

        setIsBusy(true);
        setMessage(null);
        try {
            const formData = new FormData();
            formData.set('companyId', companyId);
            formData.set('file', file);
            const response = await fetch('/api/company-logo', {
                method: 'POST',
                headers: await getApiAuthHeaders(),
                body: formData
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = readCompanyLogoData(payload);
            setCurrentLogoUrl(data.logoUrl);
            setFileName(data.logoFileName);
            setFileSize(data.logoFileSize);
            setUpdatedAt(data.logoUpdatedAt);
            setMessage({ text: '회사 로고가 저장됐습니다.', type: 'success' });
            notifyChanged(data.logoUrl);
        } catch (error) {
            setMessage({ text: error instanceof Error ? error.message : '로고 저장에 실패했습니다.', type: 'error' });
        } finally {
            setIsBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const deleteLogo = async () => {
        if (!companyId) return;
        setIsBusy(true);
        setMessage(null);
        try {
            const params = new URLSearchParams({ companyId });
            const response = await fetch(`/api/company-logo?${params.toString()}`, {
                method: 'DELETE',
                headers: await getApiAuthHeaders()
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = readCompanyLogoData(payload);
            setCurrentLogoUrl(null);
            setFileName(data.logoFileName);
            setFileSize(data.logoFileSize);
            setUpdatedAt(data.logoUpdatedAt);
            setMessage({ text: '회사 로고를 삭제했습니다.', type: 'success' });
            notifyChanged(null);
        } catch (error) {
            setMessage({ text: error instanceof Error ? error.message : '로고 삭제에 실패했습니다.', type: 'error' });
        } finally {
            setIsBusy(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) void uploadFile(file);
    };

    return (
        <section className={styles.logoManager}>
            <div className={styles.preview} aria-label={`${companyName} 회사 로고 미리보기`}>
                {currentLogoUrl ? (
                    <img className={styles.previewImage} src={currentLogoUrl} alt={`${companyName} 로고`} />
                ) : (
                    <ImageIcon size={24} />
                )}
            </div>
            <div className={styles.content}>
                <div className={styles.header}>
                    <div>
                        <h4 className={styles.title}>회사 로고</h4>
                        <p className={styles.description}>{fileName ? `${fileName} ${formatFileSize(fileSize)}` : '등록된 로고가 없습니다.'}</p>
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isBusy || !companyId}
                        >
                            <Upload size={14} />
                            로고 등록
                        </button>
                        {currentLogoUrl && (
                            <button type="button" className={styles.dangerButton} onClick={deleteLogo} disabled={isBusy}>
                                <Trash2 size={14} />
                                삭제
                            </button>
                        )}
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    className={styles.fileInput}
                    type="file"
                    accept={COMPANY_LOGO_ALLOWED_MIME_TYPES.join(',')}
                    onChange={handleFileChange}
                />
                <p className={styles.policy}>권장 512x512px 정사각형, PNG/JPG/WebP, 1MB 이하. 사이드바에는 40x40 영역 안에 맞춰 표시됩니다.</p>
                {updatedAt && <p className={styles.description}>마지막 변경 {new Date(updatedAt).toLocaleDateString('ko-KR')}</p>}
                {message && <p className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>{message.text}</p>}
            </div>
        </section>
    );
}
