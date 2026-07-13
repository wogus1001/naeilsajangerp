"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import type { PropertyRegistrationFileAttachment } from '@/lib/franchise-property-registration';
import {
    isOpenablePropertyAttachment,
    isPreviewablePropertyAttachment
} from '@/lib/franchise-property-registration-uploads';
import { formatByteSize } from '@/lib/franchise-property-registration-format';
import styles from './WorkIntakeEditModal.module.css';

type PropertyAttachmentGalleryProps = {
    readonly attachments: readonly PropertyRegistrationFileAttachment[];
};

function attachmentKey(attachment: PropertyRegistrationFileAttachment): string {
    return `${attachment.name}:${attachment.size}:${attachment.storagePath || ''}`;
}

function AttachmentFile({ attachment }: { readonly attachment: PropertyRegistrationFileAttachment }) {
    const icon = attachment.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />;
    return (
        <li className={styles.previewFile}>
            <span className={styles.previewFileIcon}>{icon}</span>
            <div>
                {isOpenablePropertyAttachment(attachment) ? (
                    <a href={attachment.publicUrl} target="_blank" rel="noreferrer">{attachment.name}</a>
                ) : (
                    <strong>{attachment.name}</strong>
                )}
                <small>{formatByteSize(attachment.size)}</small>
            </div>
        </li>
    );
}

export function PropertyAttachmentGallery({ attachments }: PropertyAttachmentGalleryProps) {
    const images = React.useMemo(
        () => attachments.filter(isPreviewablePropertyAttachment),
        [attachments]
    );
    const otherFiles = React.useMemo(
        () => attachments.filter(attachment => !isPreviewablePropertyAttachment(attachment)),
        [attachments]
    );
    const [activeKey, setActiveKey] = React.useState('');
    const selectedIndex = images.findIndex(image => attachmentKey(image) === activeKey);
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const activeImage = images[activeIndex] || null;

    React.useEffect(() => {
        if (images.length === 0) {
            setActiveKey('');
            return;
        }
        if (!images.some(image => attachmentKey(image) === activeKey)) {
            setActiveKey(attachmentKey(images[0]));
        }
    }, [activeKey, images]);

    function moveImage(direction: -1 | 1) {
        const nextIndex = (activeIndex + direction + images.length) % images.length;
        setActiveKey(attachmentKey(images[nextIndex]));
    }

    if (attachments.length === 0) return null;

    return (
        <div className={styles.attachmentGallery}>
            {activeImage && (
                <div
                    className={styles.galleryStage}
                    aria-label="첨부 사진 보기. 좌우 화살표 키로 사진을 이동할 수 있습니다."
                    onKeyDown={event => {
                        if (event.key === 'ArrowLeft' && images.length > 1) moveImage(-1);
                        if (event.key === 'ArrowRight' && images.length > 1) moveImage(1);
                    }}
                    role="group"
                    tabIndex={0}
                >
                    <a href={activeImage.publicUrl} target="_blank" rel="noreferrer" className={styles.galleryImageLink}>
                        <img src={activeImage.publicUrl || ''} alt={`${activeImage.name} 크게 보기`} />
                    </a>
                    {images.length > 1 && (
                        <>
                            <button className={styles.galleryPrevious} onClick={() => moveImage(-1)} type="button" aria-label="이전 사진">
                                <ChevronLeft size={22} aria-hidden="true" />
                            </button>
                            <button className={styles.galleryNext} onClick={() => moveImage(1)} type="button" aria-label="다음 사진">
                                <ChevronRight size={22} aria-hidden="true" />
                            </button>
                        </>
                    )}
                    <div className={styles.galleryCaption} aria-live="polite">
                        <span><strong>{activeImage.name}</strong><small>{formatByteSize(activeImage.size)}</small></span>
                        <span>{activeIndex + 1} / {images.length}</span>
                    </div>
                </div>
            )}
            {images.length > 1 && (
                <div className={styles.galleryThumbnails} aria-label="첨부 사진 선택">
                    {images.map((image, index) => (
                        <button
                            aria-label={`${index + 1}번째 사진 ${image.name}`}
                            aria-pressed={index === activeIndex}
                            className={index === activeIndex ? styles.activeThumbnail : ''}
                            key={attachmentKey(image)}
                            onClick={() => setActiveKey(attachmentKey(image))}
                            type="button"
                        >
                            <img src={image.publicUrl || ''} alt="" />
                        </button>
                    ))}
                </div>
            )}
            {activeImage && (
                <a className={styles.galleryOriginalLink} href={activeImage.publicUrl} target="_blank" rel="noreferrer">
                    원본 사진 열기 <ExternalLink size={13} aria-hidden="true" />
                </a>
            )}
            {otherFiles.length > 0 && (
                <ul className={styles.previewFiles}>
                    {otherFiles.map(attachment => <AttachmentFile key={attachmentKey(attachment)} attachment={attachment} />)}
                </ul>
            )}
        </div>
    );
}
