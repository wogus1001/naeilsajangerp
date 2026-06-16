"use client";

import React from 'react';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type {
    FranchiseLocation,
    LocationFormState,
    LocationMasterFilters,
    LocationManagerOption
} from './locationMasterTypes';
import { LocationMasterFilters as LocationMasterFiltersView } from './LocationMasterFilters';
import { LocationMasterForm } from './LocationMasterForm';
import { LocationMasterList } from './LocationMasterList';

type LocationMasterSectionProps = {
    readonly userId: string;
    readonly companyName: string;
    readonly form: LocationFormState;
    readonly filters: LocationMasterFilters;
    readonly managerOptions: readonly LocationManagerOption[];
    readonly locations: readonly FranchiseLocation[];
    readonly filteredLocations: readonly FranchiseLocation[];
    readonly isManagerLoading: boolean;
    readonly isSaving: boolean;
    readonly deletingLocationId: string;
    readonly onFormChange: (patch: Partial<LocationFormState>) => void;
    readonly onFiltersChange: (patch: Partial<LocationMasterFilters>) => void;
    readonly onResetForm: () => void;
    readonly onResetFilters: () => void;
    readonly onSave: () => void;
    readonly onSelectAddress: (result: KakaoAddressResult) => void;
    readonly onSelectBrand: (brand: FranchiseBrand) => void;
    readonly onEdit: (location: FranchiseLocation) => void;
    readonly onDelete: (location: FranchiseLocation) => void;
};

type LocationMasterMode = 'list' | 'form';

export function LocationMasterSection({
    userId,
    companyName,
    form,
    filters,
    managerOptions,
    locations,
    filteredLocations,
    isManagerLoading,
    isSaving,
    deletingLocationId,
    onFormChange,
    onFiltersChange,
    onResetForm,
    onResetFilters,
    onSave,
    onSelectAddress,
    onSelectBrand,
    onEdit,
    onDelete
}: LocationMasterSectionProps) {
    const [activeMode, setActiveMode] = React.useState<LocationMasterMode>('list');
    const openListMode = () => setActiveMode('list');
    const openCreateMode = () => {
        onResetForm();
        setActiveMode('form');
    };
    const editLocation = (location: FranchiseLocation) => {
        onEdit(location);
        setActiveMode('form');
    };

    return (
        <div className={styles.locationMasterPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>{activeMode === 'list' ? '후보지 목록' : '후보지 등록'}</h3>
                </div>
                <div className={styles.locationMasterHeaderActions}>
                    <div className={styles.locationModeTabs} aria-label="후보지 목록 등록 전환">
                        <button
                            type="button"
                            className={activeMode === 'list' ? styles.locationModeTabActive : styles.locationModeTab}
                            onClick={openListMode}
                        >
                            목록
                        </button>
                        <button
                            type="button"
                            className={activeMode === 'form' ? styles.locationModeTabActive : styles.locationModeTab}
                            onClick={openCreateMode}
                        >
                            등록
                        </button>
                    </div>
                </div>
            </div>
            <div className={styles.locationMasterBody}>
                {activeMode === 'list' ? (
                    <div className={styles.locationMasterListPane}>
                        <LocationMasterFiltersView
                            filters={filters}
                            filteredCount={filteredLocations.length}
                            totalCount={locations.length}
                            onChange={onFiltersChange}
                            onReset={onResetFilters}
                        />
                        <LocationMasterList
                            userId={userId}
                            locations={filteredLocations}
                            managerOptions={managerOptions}
                            deletingLocationId={deletingLocationId}
                            onEdit={editLocation}
                            onDelete={onDelete}
                        />
                    </div>
                ) : (
                    <div className={styles.locationMasterFormPane}>
                        <LocationMasterForm
                            userId={userId}
                            companyName={companyName}
                            form={form}
                            managerOptions={managerOptions}
                            isManagerLoading={isManagerLoading}
                            isSaving={isSaving}
                            onChange={onFormChange}
                            onReset={onResetForm}
                            onSave={onSave}
                            onSelectAddress={onSelectAddress}
                            onSelectBrand={onSelectBrand}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
