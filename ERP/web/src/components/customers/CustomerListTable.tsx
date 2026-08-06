'use client';

import { MouseEvent } from 'react';
import { Star } from 'lucide-react';
import pageStyles from '@/app/(main)/customers/page.module.css';
import {
    CUSTOMER_LIST_COLUMNS,
    CustomerColumnPreferences,
    CustomerListColumnKey,
    CustomerListRecord,
    CustomerListRenderedColumnKey,
    CustomerListSortConfig,
    getCustomerListRenderedColumns,
    getLatestCustomerWork
} from './customerListTableConfig';

type CustomerListTableProps = {
    readonly customers: readonly CustomerListRecord[];
    readonly selectedIds: readonly string[];
    readonly preferences: CustomerColumnPreferences;
    readonly columnWidths: Readonly<Record<string, number>>;
    readonly managers: Readonly<Record<string, string>>;
    readonly sortConfig: CustomerListSortConfig | null;
    readonly onSortAction: (key: CustomerListColumnKey) => void;
    readonly onResizeStartAction: (event: MouseEvent, key: string) => void;
    readonly onSelectAllAction: (checked: boolean) => void;
    readonly onSelectOneAction: (id: string, checked: boolean) => void;
    readonly onRowClickAction: (id: string) => void;
    readonly onToggleFavoriteAction: (event: MouseEvent, customer: CustomerListRecord) => void;
};

const columnByKey = new Map(CUSTOMER_LIST_COLUMNS.map(column => [column.key, column]));
const invalidClasses = new Set(['progress', 'manage', 'hold', 'common', 'complete', 'completed']);

function getGradeLabel(grade: string): string {
    return {
        progress: '추진',
        manage: '관리',
        hold: '보류',
        common: '공동',
        complete: '완료'
    }[grade] ?? grade;
}

function getGradeClass(grade: string): string {
    return {
        progress: pageStyles.badgeProgress,
        manage: pageStyles.badgeManage,
        hold: pageStyles.badgeHold,
        common: pageStyles.badgeCommon,
        complete: pageStyles.badgeComplete
    }[grade] ?? pageStyles.badgeManage;
}

function formatRange(minimum: string, maximum: string): string {
    return minimum || maximum ? `${minimum || '0'}~${maximum || ''}` : '-';
}

export default function CustomerListTable({
    customers,
    selectedIds,
    preferences,
    columnWidths,
    managers,
    sortConfig,
    onSortAction,
    onResizeStartAction,
    onSelectAllAction,
    onSelectOneAction,
    onRowClickAction,
    onToggleFavoriteAction
}: CustomerListTableProps) {
    const renderedColumns: readonly CustomerListRenderedColumnKey[] = getCustomerListRenderedColumns(preferences);

    const renderCell = (customer: CustomerListRecord, key: CustomerListColumnKey, index: number) => {
        const latestWork = getLatestCustomerWork(customer.history ?? []);

        switch (key) {
            case 'no':
                return sortConfig?.direction === 'asc'
                    && (sortConfig.key === 'createdAt' || sortConfig.key === 'no')
                    ? index + 1
                    : customers.length - index;
            case 'name':
                return <strong>{customer.name}</strong>;
            case 'grade':
                return (
                    <span className={`${pageStyles.badge} ${getGradeClass(customer.grade)}`}>
                        {getGradeLabel(customer.grade)}
                    </span>
                );
            case 'gender':
                return customer.gender === 'F' ? '여' : '남';
            case 'class':
                return invalidClasses.has(customer.class) ? '' : customer.class;
            case 'status':
            case 'feature':
            case 'address':
            case 'mobile':
            case 'companyPhone':
            case 'wantedItem':
            case 'wantedIndustry':
            case 'wantedArea':
                return customer[key];
            case 'deposit':
                return formatRange(customer.wantedDepositMin, customer.wantedDepositMax);
            case 'rent':
                return formatRange(customer.wantedRentMin, customer.wantedRentMax);
            case 'createdAt':
                return customer.createdAt.substring(0, 10);
            case 'manager': {
                const managerId = customer.managerId || customer.manager_id || '';
                return managers[managerId] || managerId || '-';
            }
            case 'latestWorkDate':
                return latestWork.date;
            case 'latestWorkContent':
                return latestWork.content;
        }
    };

    return (
        <table className={pageStyles.table} style={{ tableLayout: 'fixed' }}>
            <colgroup>
                <col style={{ width: columnWidths.checkbox }} />
                {renderedColumns.map(key => (
                    <col key={key} style={{ width: columnWidths[key] }} />
                ))}
            </colgroup>
            <thead>
                <tr>
                    <th>
                        <input
                            type="checkbox"
                            aria-label="현재 고객 전체 선택"
                            onChange={event => onSelectAllAction(event.target.checked)}
                            checked={customers.length > 0 && selectedIds.length === customers.length}
                        />
                        <div
                            className={pageStyles.resizer}
                            onMouseDown={event => onResizeStartAction(event, 'checkbox')}
                        />
                    </th>
                    {renderedColumns.map(key => key === 'star' ? (
                        <th key={key} className={pageStyles.favoriteHeader}>
                            중요
                            <div
                                className={pageStyles.resizer}
                                onMouseDown={event => onResizeStartAction(event, key)}
                            />
                        </th>
                    ) : (
                        <th key={key} onClick={() => onSortAction(key)} style={{ cursor: 'pointer' }}>
                            {columnByKey.get(key)?.label}
                            <div
                                className={pageStyles.resizer}
                                onMouseDown={event => onResizeStartAction(event, key)}
                            />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {customers.map((customer, index) => (
                    <tr
                        key={customer.id}
                        className={pageStyles.tr}
                        onClick={() => onRowClickAction(customer.id)}
                    >
                        <td onClick={event => event.stopPropagation()}>
                            <input
                                type="checkbox"
                                aria-label={`${customer.name} 선택`}
                                checked={selectedIds.includes(customer.id)}
                                onChange={event => onSelectOneAction(customer.id, event.target.checked)}
                            />
                        </td>
                        {renderedColumns.map(key => key === 'star' ? (
                            <td
                                key={key}
                                className={pageStyles.favoriteCell}
                                onClick={event => event.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className={pageStyles.favoriteButton}
                                    aria-label={customer.isFavorite ? '관심고객 해제' : '관심고객 등록'}
                                    onClick={event => onToggleFavoriteAction(event, customer)}
                                >
                                    <Star
                                        size={16}
                                        fill={customer.isFavorite ? '#FAB005' : 'none'}
                                        color={customer.isFavorite ? '#FAB005' : '#ced4da'}
                                        aria-hidden="true"
                                    />
                                </button>
                            </td>
                        ) : (
                            <td
                                key={key}
                                className={key === 'class' ? pageStyles.classBadge : undefined}
                                title={key === 'latestWorkContent'
                                    ? getLatestCustomerWork(customer.history ?? []).content
                                    : undefined}
                                style={{
                                    textAlign: key === 'feature' || key === 'address' || key === 'latestWorkContent'
                                        ? 'left'
                                        : undefined,
                                    color: key === 'deposit' || key === 'rent' || key === 'latestWorkDate'
                                        ? '#228be6'
                                        : undefined
                                }}
                            >
                                {renderCell(customer, key, index)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
