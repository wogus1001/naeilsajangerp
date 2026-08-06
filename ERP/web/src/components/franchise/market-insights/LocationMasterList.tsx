"use client";

import React from 'react';
import { ExternalLink, FileText, MessageSquare } from 'lucide-react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { ExportActions } from '@/components/franchise/ExportActions';
import {
    buildNaverMapSearchUrl,
    formatLocationMoney,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData
} from '@/lib/franchise-location-master';
import {
    buildLocationExportColumns,
    buildLocationExportRows
} from '@/components/franchise/franchiseDbExport';
import { formatManagerDisplayName } from '@/lib/franchise-manager-display';
import { normalizeRegion } from '@/lib/franchise-market-insights';
import {
    buildDatedExportFilename,
    downloadTableAsXlsx,
    openPrintableTable,
    type TableExportPayload
} from '@/utils/tableExport';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { FranchiseLocation, LocationManagerOption } from './locationMasterTypes';
import type { FranchiseLocationMessageSummary } from './locationMessageTypes';
import { LocationMessagePanel } from './LocationMessagePanel';
import { LocationMeetingToolDialog } from './LocationMeetingToolDialog';
import type { LocationMapRuntime } from '@/components/franchise/location-map/types';
import { formatDate } from './locationMasterUtils';
import type { MeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
import {
    resolveLocationInteractionRuntime,
    type LocationInteractionRuntime
} from './locationInteractionRuntime';

const LOCATION_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const LOCATION_SORT_OPTIONS = [
    { value: 'updated-desc', label: '최신 수정순' },
    { value: 'created-desc', label: '최신 등록순' },
    { value: 'created-asc', label: '오래된 등록순' },
    { value: 'importance-desc', label: '중요도 높은순' },
    { value: 'cost-asc', label: '입점비용 낮은순' },
    { value: 'cost-desc', label: '입점비용 높은순' },
    { value: 'rent-asc', label: '월세 낮은순' },
    { value: 'rent-desc', label: '월세 높은순' }
] as const;

const LOCATION_COLUMNS = [
    { key: 'importance', label: '중요도' },
    { key: 'developmentStage', label: '개발상태' },
    { key: 'name', label: '후보지명' },
    { key: 'address', label: '주소' },
    { key: 'area', label: '전용면적' },
    { key: 'acquisitionCost', label: '입점비용' },
    { key: 'deposit', label: '보증금' },
    { key: 'premium', label: '권리금' },
    { key: 'monthlyRent', label: '월세' },
    { key: 'maintenanceFee', label: '관리비' },
    { key: 'facility', label: '시설조건' },
    { key: 'landlord', label: '임대인 성향' },
    { key: 'memo', label: '종합메모' },
    { key: 'manager', label: '담당자' },
    { key: 'createdAt', label: '등록일' },
    { key: 'actions', label: '액션' }
] as const;

type LocationPageSize = typeof LOCATION_PAGE_SIZE_OPTIONS[number];
type LocationSortKey = typeof LOCATION_SORT_OPTIONS[number]['value'];
type LocationColumnKey = typeof LOCATION_COLUMNS[number]['key'];

const DEFAULT_VISIBLE_LOCATION_COLUMNS: readonly LocationColumnKey[] = LOCATION_COLUMNS
    .filter(column => column.key !== 'actions')
    .map(column => column.key);

type LocationMasterListProps = {
    readonly userId: string;
    readonly locations: readonly FranchiseLocation[];
    readonly managerOptions: readonly LocationManagerOption[];
    readonly deletingLocationId: string;
    readonly guidedRecordLocationId?: string | undefined;
    readonly guidedRecordRequestKey?: number | undefined;
    readonly guidedRecordPresentation?: boolean | undefined;
    readonly interactionRuntime?: LocationInteractionRuntime | undefined;
    readonly mapRuntime?: LocationMapRuntime | undefined;
    readonly onEdit: (location: FranchiseLocation) => void;
    readonly onDelete: (location: FranchiseLocation) => void;
};

function getFacilitySummary(location: FranchiseLocation): string {
    const data = normalizeFranchiseLocationMasterData(location);
    return [
        `화장실 ${data.siteCondition.restroom.value}`,
        `엘리베이터 ${data.siteCondition.elevator.value}`,
        `철거 ${data.siteCondition.demolition.value}`,
        `주차 ${data.siteCondition.parking.value}`
    ].join(' · ');
}

function getLocationRegion(location: FranchiseLocation): string {
    return location.region || normalizeRegion(location.address);
}

function getTime(value?: string): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getImportanceRank(value: string): number {
    if (value === '높음') return 3;
    if (value === '보통') return 2;
    if (value === '낮음') return 1;
    return 0;
}

function getManagerDisplayName(
    location: FranchiseLocation,
    managerOptions: readonly LocationManagerOption[]
): string {
    if (!location.managerId) return '미지정';
    const matchedManager = managerOptions.find(
        manager => manager.id === location.managerId || manager.displayId === location.managerId
    );
    return matchedManager ? formatManagerDisplayName(matchedManager) : location.managerName || '담당자 미확인';
}

function sortLocationItems(
    locations: readonly FranchiseLocation[],
    sortKey: LocationSortKey
): readonly FranchiseLocation[] {
    return [...locations].sort((a, b) => {
        const aData = normalizeFranchiseLocationMasterData(a);
        const bData = normalizeFranchiseLocationMasterData(b);
        const aCost = getAcquisitionCostTotal(aData.cost) ?? Number.MAX_SAFE_INTEGER;
        const bCost = getAcquisitionCostTotal(bData.cost) ?? Number.MAX_SAFE_INTEGER;
        const aRent = aData.lease.monthlyRent ?? Number.MAX_SAFE_INTEGER;
        const bRent = bData.lease.monthlyRent ?? Number.MAX_SAFE_INTEGER;

        if (sortKey === 'created-asc') return getTime(a.createdAt) - getTime(b.createdAt);
        if (sortKey === 'created-desc') return getTime(b.createdAt) - getTime(a.createdAt);
        if (sortKey === 'importance-desc') return getImportanceRank(bData.importance) - getImportanceRank(aData.importance);
        if (sortKey === 'cost-asc') return aCost - bCost;
        if (sortKey === 'cost-desc') return bCost - aCost;
        if (sortKey === 'rent-asc') return aRent - bRent;
        if (sortKey === 'rent-desc') return bRent - aRent;
        return getTime(b.updatedAt) - getTime(a.updatedAt);
    });
}

export function LocationMasterList({
    userId,
    locations,
    managerOptions,
    deletingLocationId,
    guidedRecordLocationId,
    guidedRecordRequestKey = 0,
    guidedRecordPresentation = false,
    interactionRuntime,
    mapRuntime,
    onEdit,
    onDelete
}: LocationMasterListProps) {
    const { showAlert } = useAppDialog();
    const runtime = resolveLocationInteractionRuntime(interactionRuntime);
    const [recordLocationId, setRecordLocationId] = React.useState('');
    const [guidedPanelLocationId, setGuidedPanelLocationId] = React.useState('');
    const [messageSummaries, setMessageSummaries] = React.useState<ReadonlyMap<string, FranchiseLocationMessageSummary>>(
        () => new Map<string, FranchiseLocationMessageSummary>()
    );
    const [reportLocationId, setReportLocationId] = React.useState('');
    const [meetingToolOverrides, setMeetingToolOverrides] = React.useState<ReadonlyMap<string, MeetingToolDraft>>(
        () => new Map<string, MeetingToolDraft>()
    );
    const [pageSize, setPageSize] = React.useState<LocationPageSize>(20);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortKey, setSortKey] = React.useState<LocationSortKey>('updated-desc');
    const [visibleColumns, setVisibleColumns] = React.useState<readonly LocationColumnKey[]>(DEFAULT_VISIBLE_LOCATION_COLUMNS);
    const selectedRecordLocation = locations.find(location => location.id === recordLocationId) || null;
    const reportLocationBase = locations.find(location => location.id === reportLocationId) || null;
    const selectedReportLocation = reportLocationBase
        ? { ...reportLocationBase, meetingTool: meetingToolOverrides.get(reportLocationBase.id) || reportLocationBase.meetingTool }
        : null;
    const visibleColumnSet = React.useMemo(() => new Set(visibleColumns), [visibleColumns]);
    const displayColumns = React.useMemo(
        () => LOCATION_COLUMNS.filter(column => column.key === 'actions' || visibleColumnSet.has(column.key)),
        [visibleColumnSet]
    );
    const sortedLocations = React.useMemo(() => sortLocationItems(locations, sortKey), [locations, sortKey]);
    const totalPages = Math.max(1, Math.ceil(sortedLocations.length / pageSize));
    const pageStart = (currentPage - 1) * pageSize;
    const pageLocations = sortedLocations.slice(pageStart, pageStart + pageSize);
    const pageLocationIdsKey = pageLocations.map(location => location.id).join('|');
    const fromCount = sortedLocations.length === 0 ? 0 : pageStart + 1;
    const toCount = Math.min(sortedLocations.length, pageStart + pageSize);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [locations, pageSize, sortKey]);

    React.useEffect(() => {
        setCurrentPage(prev => Math.min(prev, totalPages));
    }, [totalPages]);

    React.useEffect(() => {
        if (!guidedRecordLocationId || guidedRecordRequestKey <= 0) return;
        if (!locations.some(location => location.id === guidedRecordLocationId)) return;
        setRecordLocationId(guidedRecordLocationId);
        if (guidedRecordPresentation) setGuidedPanelLocationId(guidedRecordLocationId);
    }, [
        guidedRecordLocationId,
        guidedRecordPresentation,
        guidedRecordRequestKey,
        locations
    ]);

    React.useEffect(() => {
        if (guidedRecordPresentation || !guidedPanelLocationId) return;
        setRecordLocationId(current => current === guidedPanelLocationId ? '' : current);
        setGuidedPanelLocationId('');
    }, [guidedPanelLocationId, guidedRecordPresentation]);

    React.useEffect(() => {
        if (!userId || !pageLocationIdsKey) return undefined;
        let isActive = true;
        const locationIds = pageLocationIdsKey.split('|').filter(Boolean);
        void runtime.fetchMessageSummaries({ userId, locationIds })
            .then(summaries => {
                if (!isActive) return;
                setMessageSummaries(prev => {
                    const next = new Map(prev);
                    locationIds.forEach(locationId => next.delete(locationId));
                    summaries.forEach(summary => next.set(summary.locationId, summary));
                    return next;
                });
            })
            .catch(error => {
                console.warn('Failed to load franchise location message summaries:', error);
            });
        return () => {
            isActive = false;
        };
    }, [pageLocationIdsKey, runtime, userId]);

    const updateMessageSummary = React.useCallback((summary: FranchiseLocationMessageSummary) => {
        setMessageSummaries(prev => {
            const next = new Map(prev);
            next.set(summary.locationId, summary);
            return next;
        });
    }, []);

    const updateMeetingTool = React.useCallback((locationId: string, draft: MeetingToolDraft) => {
        setMeetingToolOverrides(prev => {
            const next = new Map(prev);
            next.set(locationId, draft);
            return next;
        });
    }, []);

    const changePageSize = (value: string) => {
        const parsed = Number(value);
        const nextPageSize = LOCATION_PAGE_SIZE_OPTIONS.find(option => option === parsed);
        if (nextPageSize) setPageSize(nextPageSize);
    };

    const changeSortKey = (value: string) => {
        const nextSort = LOCATION_SORT_OPTIONS.find(option => option.value === value);
        if (nextSort) setSortKey(nextSort.value);
    };

    const toggleColumn = (key: LocationColumnKey) => {
        if (key === 'actions') return;
        setVisibleColumns(prev => {
            if (prev.includes(key)) {
                return prev.length <= 1 ? prev : prev.filter(columnKey => columnKey !== key);
            }
            return [...prev, key];
        });
    };
    const buildExportPayload = (): TableExportPayload => {
        const columns = buildLocationExportColumns(visibleColumns);
        const rows = buildLocationExportRows(
            sortedLocations,
            columns,
            location => getManagerDisplayName(location, managerOptions)
        );
        return {
            title: '출점 후보지',
            filename: buildDatedExportFilename('출점후보지'),
            sheetName: '출점 후보지',
            columns,
            rows,
            filterSummary: `현재 필터/정렬 기준 ${sortedLocations.length.toLocaleString()}건`
        };
    };

    const runExportAction = async (action: (payload: TableExportPayload) => void | Promise<void>) => {
        try {
            await action(buildExportPayload());
        } catch (error) {
            console.error('Failed to export franchise locations:', error);
            void showAlert({
                message: error instanceof Error ? error.message : '출점 후보지 추출에 실패했습니다.',
                title: '내보내기 실패',
                type: 'error'
            });
        }
    };

    return (
        <div className={styles.locationListShell}>
            <div className={styles.locationListControlBar}>
                <span className={styles.locationListMeta}>총 {sortedLocations.length}건 중 {fromCount}-{toCount}</span>
                <label className={styles.pageSizeControl}>
                    표시
                    <select value={pageSize} onChange={(event) => changePageSize(event.target.value)}>
                        {LOCATION_PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>{option}건</option>)}
                    </select>
                </label>
                <label className={styles.locationSortControl}>
                    정렬
                    <select value={sortKey} onChange={(event) => changeSortKey(event.target.value)}>
                        {LOCATION_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </label>
                <details className={styles.columnPicker}>
                    <summary>표시 컬럼 {visibleColumns.length}개</summary>
                    <div className={styles.columnPickerPanel}>
                        {LOCATION_COLUMNS.filter(column => column.key !== 'actions').map(column => (
                            <label key={column.key}>
                                <input
                                    type="checkbox"
                                    checked={visibleColumnSet.has(column.key)}
                                    onChange={() => toggleColumn(column.key)}
                                />
                                {column.label}
                            </label>
                        ))}
                    </div>
                </details>
                <ExportActions
                    rowCount={sortedLocations.length}
                    onExcelAction={() => runExportAction(downloadTableAsXlsx)}
                    onPdfAction={() => runExportAction(payload => openPrintableTable(
                        payload,
                        'pdf',
                        message => void showAlert({ message, title: '팝업 차단', type: 'error' })
                    ))}
                    onPrintAction={() => runExportAction(payload => openPrintableTable(
                        payload,
                        'print',
                        message => void showAlert({ message, title: '팝업 차단', type: 'error' })
                    ))}
                />
            </div>

            <div className={styles.locationTableWrap}>
                <table className={styles.locationMasterTable}>
                    <thead>
                        <tr>
                            {displayColumns.map(column => <th key={column.key}>{column.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {pageLocations.length === 0 ? (
                            <tr>
                                <td colSpan={displayColumns.length}>
                                    <div className={styles.locationEmpty}>조건에 맞는 출점 후보지가 없습니다.</div>
                                </td>
                            </tr>
                        ) : pageLocations.map(location => {
                            const data = normalizeFranchiseLocationMasterData(location);
                            const acquisitionCost = getAcquisitionCostTotal(data.cost);
                            const naverMapUrl = buildNaverMapSearchUrl(location.address, location.name);
                            const messageSummary = messageSummaries.get(location.id);
                            const recordBadge = messageSummary && messageSummary.openRequestCount > 0
                                ? `요청 ${messageSummary.openRequestCount}`
                                : messageSummary && messageSummary.totalCount > 0
                                    ? `기록 ${messageSummary.totalCount}`
                                    : '';
                            const cells: Record<LocationColumnKey, React.ReactNode> = {
                                importance: <span className={styles.locationImportanceBadge}>{data.importance}</span>,
                                developmentStage: <span className={data.developmentStage === '물건화 완료' ? styles.locationReadyBadge : styles.locationStageBadge}>{data.developmentStage}</span>,
                                name: (
                                    <>
                                        <strong>{location.name}</strong>
                                        <small>{location.locationType} · {location.status} · {location.brand || '브랜드 미지정'}</small>
                                    </>
                                ),
                                address: (
                                    <>
                                        <a href={naverMapUrl} target="_blank" rel="noreferrer" className={styles.locationMapLink}>
                                            {location.address || getLocationRegion(location)}
                                            <ExternalLink size={12} />
                                        </a>
                                        {location.addressDetail ? <small>{location.addressDetail}</small> : null}
                                    </>
                                ),
                                area: data.siteCondition.exclusiveAreaPyeong === null ? '-' : `${data.siteCondition.exclusiveAreaPyeong}평`,
                                acquisitionCost: formatLocationMoney(acquisitionCost),
                                deposit: formatLocationMoney(data.cost.deposit),
                                premium: formatLocationMoney(data.cost.premium),
                                monthlyRent: formatLocationMoney(data.lease.monthlyRent),
                                maintenanceFee: formatLocationMoney(data.lease.maintenanceFee),
                                facility: <small>{getFacilitySummary(location)}</small>,
                                landlord: <small>{data.landlord.tendency || '-'}</small>,
                                memo: (
                                    <small className={styles.locationMemoText} title={location.memo || '-'}>
                                        {location.memo || '-'}
                                    </small>
                                ),
                                manager: getManagerDisplayName(location, managerOptions),
                                createdAt: formatDate(location.createdAt),
                                actions: (
                                    <div className={styles.locationTableActions}>
                                        <button
                                            type="button"
                                            className={styles.locationRecordButton}
                                            onClick={() => setRecordLocationId(location.id)}
                                        >
                                            <MessageSquare size={13} /> 기록
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.locationRecordButton}
                                            onClick={() => setReportLocationId(location.id)}
                                        >
                                            <FileText size={13} /> 리포트
                                        </button>
                                        {recordBadge ? (
                                            <span className={messageSummary?.openRequestCount ? styles.locationOpenRequestBadge : styles.locationRecordBadge}>
                                                {recordBadge}
                                            </span>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => onEdit(location)}
                                            aria-label={`${location.name} 후보지 수정`}
                                        >
                                            수정
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.locationDeleteButton}
                                            onClick={() => onDelete(location)}
                                            disabled={deletingLocationId === location.id}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                )
                            };
                            return (
                                <tr key={location.id}>
                                    {displayColumns.map(column => <td key={column.key}>{cells[column.key]}</td>)}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.paginationBar}>
                <div className={styles.paginationControls}>
                    <button
                        type="button"
                        className={styles.paginationButton}
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage <= 1}
                    >
                        이전
                    </button>
                    <strong>
                        <span>{fromCount}-{toCount} / {sortedLocations.length}건</span>
                        {currentPage} / {totalPages}
                    </strong>
                    <button
                        type="button"
                        className={styles.paginationButton}
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage >= totalPages}
                    >
                        다음
                    </button>
                </div>
            </div>
            {selectedRecordLocation ? (
                <LocationMessagePanel
                    open={Boolean(selectedRecordLocation)}
                    userId={userId}
                    location={selectedRecordLocation}
                    managerName={getManagerDisplayName(selectedRecordLocation, managerOptions)}
                    guidedPresentation={selectedRecordLocation.id === guidedPanelLocationId}
                    runtime={runtime}
                    onOpenChange={(open) => {
                        if (!open) {
                            setRecordLocationId('');
                            setGuidedPanelLocationId('');
                        }
                    }}
                    onSummaryChange={updateMessageSummary}
                />
            ) : null}
            {selectedReportLocation ? (
                <LocationMeetingToolDialog
                    open={Boolean(selectedReportLocation)}
                    location={selectedReportLocation}
                    managerName={getManagerDisplayName(selectedReportLocation, managerOptions)}
                    runtime={runtime}
                    mapRuntime={mapRuntime}
                    onOpenChange={(open) => {
                        if (!open) setReportLocationId('');
                    }}
                    onSaved={updateMeetingTool}
                />
            ) : null}
        </div>
    );
}
