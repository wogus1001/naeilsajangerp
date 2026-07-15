import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { RealtyListingRecord } from './types';

type RealtyPromoteResult = {
    readonly action: 'created' | 'existing';
    readonly propertyId: string;
};

type Params = {
    readonly userId: string;
    readonly onPromotedAction: () => Promise<void>;
};

export function usePromoteRealtyListing({ userId, onPromotedAction }: Params) {
    const { showAlert } = useAppDialog();
    const [promotingListingId, setPromotingListingId] = React.useState('');

    const promoteListing = React.useCallback(async (listing: RealtyListingRecord) => {
        if (!userId) return;
        if (listing.propertyId) {
            void showAlert({ message: '이미 ERP 물건지로 등록된 외부 상가입니다.', type: 'info' });
            return;
        }

        setPromotingListingId(listing.id);
        try {
            const params = new URLSearchParams({ requesterId: userId });
            const response = await fetch(`/api/realty/listings/promote?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    listingId: listing.id
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<RealtyPromoteResult>(payload);
            await onPromotedAction();
            const message = data.action === 'existing'
                ? '이미 연결된 ERP 물건지로 표시했습니다.'
                : '외부 상가를 ERP 물건지로 등록했습니다.';
            void showAlert({ message: `${message} (${data.propertyId})`, title: '물건지 등록 완료', type: 'success' });
        } catch (error) {
            void showAlert({
                message: error instanceof Error ? error.message : '외부 상가 물건지 등록 중 오류가 발생했습니다.',
                title: '물건지 등록 실패',
                type: 'error'
            });
        } finally {
            setPromotingListingId('');
        }
    }, [onPromotedAction, showAlert, userId]);

    return {
        promotingListingId,
        promoteListing
    };
}
