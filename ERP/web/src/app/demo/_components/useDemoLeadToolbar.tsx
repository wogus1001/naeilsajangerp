import React from 'react';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import {
    RANGE_OPTIONS,
    SOURCE_FILTER_OPTIONS
} from '@/components/franchise/leads/constants';
import { DEFAULT_LEAD_RANGE } from '@/components/franchise/leads/leadRangePreference';
import { buildDateFromRange } from '@/components/franchise/leads/utils';
import { FRANCHISE_LEAD_STATUSES } from '@/lib/franchise-leads';
import { DEMO_LEAD_MANAGERS } from './DemoLeadSampleData';

export function useDemoLeadToolbar() {
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>(DEFAULT_LEAD_RANGE);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [status, setStatus] = React.useState<React.ComponentProps<typeof LeadToolbar>['statusFilter']>('전체');
    const [source, setSource] = React.useState('전체');
    const [managerId, setManagerId] = React.useState('전체');
    const [createdFrom, setCreatedFrom] = React.useState(() => buildDateFromRange(DEFAULT_LEAD_RANGE));
    const [createdTo, setCreatedTo] = React.useState('');

    const toolbarProps: React.ComponentProps<typeof LeadToolbar> = {
        rangeOptions: RANGE_OPTIONS,
        range,
        searchTerm,
        statusFilter: status,
        statusOptions: FRANCHISE_LEAD_STATUSES,
        sourceFilter: source,
        sourceOptions: SOURCE_FILTER_OPTIONS,
        managerFilter: managerId,
        managerOptions: DEMO_LEAD_MANAGERS.map(manager => (
            <option key={manager.id} value={manager.id}>{manager.label}</option>
        )),
        createdFrom,
        createdTo,
        onRangeClickAction: value => {
            const nextRange = RANGE_OPTIONS.find(option => option === value) || '전체';
            setRange(nextRange);
            setCreatedFrom(buildDateFromRange(nextRange));
            setCreatedTo('');
        },
        onSearchTermChangeAction: setSearchTerm,
        onStatusFilterChangeAction: setStatus,
        onSourceFilterChangeAction: setSource,
        onManagerFilterChangeAction: setManagerId,
        onCreatedFromChangeAction: value => {
            setRange('전체');
            setCreatedFrom(value);
        },
        onCreatedToChangeAction: value => {
            setRange('전체');
            setCreatedTo(value);
        }
    };

    return {
        filter: {
            searchTerm,
            status,
            source,
            managerId,
            createdFrom,
            createdTo
        },
        toolbarProps
    };
}
