"use client";

import { useRouter } from 'next/navigation';
import { FranchiseOperationsWorkspace } from '@/components/franchise/operations/FranchiseOperationsWorkspace';
import { useFranchiseOperationsController } from '@/components/franchise/operations/useFranchiseOperationsController';

export default function FranchiseOperationsPage() {
    const router = useRouter();
    const controller = useFranchiseOperationsController();

    return (
        <FranchiseOperationsWorkspace
            model={{
                userId: controller.userId,
                companyName: controller.companyName,
                locationForm: controller.locationForm,
                isSaving: controller.isSaving,
                deletingLocationId: controller.deletingLocationId,
                updatingStatusId: controller.updatingStatusId,
                locations: controller.operationalLocations,
                counts: controller.counts
            }}
            actions={{
                updateLocationForm: controller.updateLocationForm,
                resetLocationForm: controller.resetLocationForm,
                saveLocation: controller.saveLocation,
                editLocation: controller.editLocation,
                selectAddress: controller.selectKakaoAddress,
                selectBrand: controller.selectBrand,
                confirmDeleteLocation: controller.confirmDeleteLocation,
                deleteLocation: controller.deleteLocation,
                updateLocationStatus: controller.updateLocationStatus,
                openOwnerPortal: (location) => {
                    router.push(`/dashboard/franchise-operations/owner-portal?locationId=${encodeURIComponent(location.id)}`);
                }
            }}
        />
    );
}
