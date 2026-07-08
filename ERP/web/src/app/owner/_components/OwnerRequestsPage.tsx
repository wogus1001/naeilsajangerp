"use client";

import React from 'react';
import { ImagePlus, X } from 'lucide-react';
import styles from '../owner.module.css';
import {
    formatOwnerDate,
    OwnerPortalFrame,
    ownerStatusLabel,
    readOwnerApiData,
    type OwnerSubmission
} from './ownerPortalShared';

const MAX_REQUEST_IMAGE_COUNT = 5;
const MAX_REQUEST_IMAGE_SIZE = 10 * 1024 * 1024;
const RECENT_REQUEST_LIMIT = 5;

type SelectedOwnerImage = {
    readonly file: File;
    readonly key: string;
    readonly previewUrl: string;
};

type OwnerRequestCreateResponse = {
    readonly submissionId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRequestPayloadTitle(submission: OwnerSubmission): string {
    if (!isRecord(submission.payload)) return '';
    const value = submission.payload.title;
    return typeof value === 'string' ? value.trim() : '';
}

export function OwnerRequestsPage() {
    return (
        <OwnerPortalFrame activeKey="requests">
            {(data, reload) => <OwnerRequestsContent submissions={data.submissions} reload={reload} />}
        </OwnerPortalFrame>
    );
}

function OwnerRequestsContent({ submissions, reload }: { readonly submissions: readonly OwnerSubmission[]; readonly reload: () => Promise<void> }) {
    const [requestTitle, setRequestTitle] = React.useState('');
    const [requestMessage, setRequestMessage] = React.useState('');
    const [editingSubmissionId, setEditingSubmissionId] = React.useState('');
    const [selectedImages, setSelectedImages] = React.useState<readonly SelectedOwnerImage[]>([]);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const selectedImagesRef = React.useRef<readonly SelectedOwnerImage[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const recentRequests = submissions.filter(submission => submission.submission_type === 'facility_request').slice(0, RECENT_REQUEST_LIMIT);

    React.useEffect(() => {
        selectedImagesRef.current = selectedImages;
    }, [selectedImages]);

    React.useEffect(() => () => {
        for (const image of selectedImagesRef.current) URL.revokeObjectURL(image.previewUrl);
    }, []);

    const clearSelectedImages = React.useCallback(() => {
        for (const image of selectedImagesRef.current) URL.revokeObjectURL(image.previewUrl);
        selectedImagesRef.current = [];
        setSelectedImages([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const addImages = (files: FileList | null) => {
        const incomingFiles = Array.from(files || []);
        if (incomingFiles.length === 0) return;
        const remainingCount = MAX_REQUEST_IMAGE_COUNT - selectedImages.length;
        if (remainingCount <= 0) {
            setError(`사진은 최대 ${MAX_REQUEST_IMAGE_COUNT}장까지 첨부할 수 있습니다.`);
            return;
        }
        const validFiles = incomingFiles
            .filter(file => file.type.startsWith('image/') && file.size <= MAX_REQUEST_IMAGE_SIZE)
            .slice(0, remainingCount);
        if (validFiles.length !== incomingFiles.length) {
            setError(`사진은 이미지 파일만, 파일당 10MB 이하로 최대 ${MAX_REQUEST_IMAGE_COUNT}장까지 첨부할 수 있습니다.`);
        } else {
            setError('');
        }
        const nextImages = validFiles.map(file => ({
            file,
            key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            previewUrl: URL.createObjectURL(file)
        }));
        setSelectedImages(current => [...current, ...nextImages]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (key: string) => {
        setSelectedImages(current => {
            const target = current.find(image => image.key === key);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return current.filter(image => image.key !== key);
        });
    };

    const uploadImages = async (submissionId: string) => {
        for (const image of selectedImages) {
            const formData = new FormData();
            formData.set('submissionId', submissionId);
            formData.set('file', image.file);
            await readOwnerApiData(await fetch('/api/owner/upload', {
                method: 'POST',
                body: formData
            }));
        }
    };

    const editRejectedRequest = (submission: OwnerSubmission) => {
        setEditingSubmissionId(submission.id);
        setRequestTitle(getRequestPayloadTitle(submission));
        setRequestMessage(submission.body || '');
        clearSelectedImages();
        setMessage('반려된 문의 내용을 수정한 뒤 다시 제출할 수 있습니다. 기존 첨부 사진은 유지되고, 필요한 사진만 추가로 첨부해주세요.');
        setError('');
    };

    const resetRequestForm = () => {
        setEditingSubmissionId('');
        setRequestTitle('');
        setRequestMessage('');
        clearSelectedImages();
    };

    const submitRequest = async () => {
        setIsSaving(true);
        setMessage('');
        setError('');
        try {
            const data = await readOwnerApiData<OwnerRequestCreateResponse>(await fetch('/api/owner/requests', {
                method: editingSubmissionId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingSubmissionId, type: 'facility_request', title: requestTitle, message: requestMessage })
            }));
            let uploadFailed = false;
            if (selectedImages.length > 0) {
                try {
                    await uploadImages(data.submissionId);
                } catch {
                    uploadFailed = true;
                }
            }
            resetRequestForm();
            setMessage(uploadFailed
                ? '문의는 저장됐지만 일부 사진을 업로드하지 못했습니다. 필요하면 다시 첨부해주세요.'
                : editingSubmissionId
                    ? '반려된 시설/고장 문의를 수정해 다시 제출했습니다.'
                    : '시설/고장 문의가 등록됐습니다.');
            await reload();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '문의를 등록하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.pageGrid}>
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h1>시설/고장 문의</h1>
                        <p>시설, 장비, 고장 이슈를 본사에 전달합니다.</p>
                    </div>
                </div>
                <div className={styles.panelBody}>
                    {message ? <div className={styles.success}>{message}</div> : null}
                    {error ? <div className={styles.error}>{error}</div> : null}
                    {editingSubmissionId ? (
                        <div className={styles.noticeBanner}>
                            <span>반려된 문의를 수정 중입니다.</span>
                            <button type="button" onClick={resetRequestForm}>새 문의로 전환</button>
                        </div>
                    ) : null}
                    <label className={styles.field}>
                        제목
                        <input className={styles.input} value={requestTitle} onChange={event => setRequestTitle(event.currentTarget.value)} />
                    </label>
                    <label className={styles.field}>
                        내용
                        <textarea className={styles.textarea} value={requestMessage} onChange={event => setRequestMessage(event.currentTarget.value)} />
                    </label>
                    <div className={styles.fileUploadBox}>
                        <div className={styles.fileUploadHeader}>
                            <div>
                                <strong>사진 첨부</strong>
                                <span>고장 부위나 현장 사진을 첨부하면 본사가 더 빠르게 확인할 수 있습니다.</span>
                            </div>
                            <button className={styles.secondaryButton} type="button" onClick={() => fileInputRef.current?.click()}>
                                <ImagePlus size={15} /> 사진 선택
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            className={styles.fileInput}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={event => addImages(event.currentTarget.files)}
                        />
                        <p>JPG/PNG/WebP 등 이미지 파일 · 파일당 10MB · 최대 {MAX_REQUEST_IMAGE_COUNT}장</p>
                        {selectedImages.length > 0 ? (
                            <div className={styles.filePreviewGrid}>
                                {selectedImages.map(image => (
                                    <div className={styles.filePreviewItem} key={image.key}>
                                        <img className={styles.filePreviewImage} src={image.previewUrl} alt={`${image.file.name} 미리보기`} />
                                        <div className={styles.filePreviewMeta}>
                                            <strong>{image.file.name}</strong>
                                            <span>{(image.file.size / 1024 / 1024).toFixed(1)}MB</span>
                                        </div>
                                        <button className={styles.fileRemoveButton} type="button" aria-label={`${image.file.name} 제거`} onClick={() => removeImage(image.key)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <button className={styles.button} type="button" disabled={isSaving} onClick={() => void submitRequest()}>
                        {editingSubmissionId ? '수정 내용 다시 제출' : '문의 등록'}
                    </button>
                </div>
            </section>
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2>최근 문의</h2>
                        <p>시설 문의 처리 상태를 확인합니다.</p>
                    </div>
                </div>
                <div className={styles.panelBody}>
                    {recentRequests.length === 0 ? <div className={styles.emptyState}>최근 시설 문의가 없습니다.</div> : null}
                    <div className={styles.list}>
                        {recentRequests.map(submission => (
                            <article className={styles.listItem} key={submission.id}>
                                <div className={styles.listItemHeader}>
                                    <strong>{getRequestPayloadTitle(submission) || submission.title}</strong>
                                    {submission.status === 'rejected' ? (
                                        <button className={styles.secondaryButton} type="button" onClick={() => editRejectedRequest(submission)}>
                                            수정
                                        </button>
                                    ) : null}
                                </div>
                                <span className={styles.itemMeta}>{formatOwnerDate(submission.created_at)} · {ownerStatusLabel(submission.status)}</span>
                                {submission.body ? <p>{submission.body}</p> : null}
                                {submission.review_note ? <p>{submission.review_note}</p> : null}
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
