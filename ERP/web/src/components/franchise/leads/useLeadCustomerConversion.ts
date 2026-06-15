"use client";

import React from 'react';
import { normalizeLeadPhone } from '@/lib/franchise-leads';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    createActivityId,
    formatBudget,
    formatFullDateTime,
    mapLeadGradeToCustomerClass,
    mapLeadGradeToCustomerGrade,
    mapLeadStatusToCustomerStatus,
    toCustomerBudgetValue
} from './utils';
import type { FranchiseLead, LeadActivity, RelatedCustomer } from './types';

type LeadAlertType = 'success' | 'error' | 'info';

type UseLeadCustomerConversionParams = {
    readonly userId: string;
    readonly userName?: string;
    readonly companyName: string;
    readonly onLeadPatchAction: (lead: FranchiseLead, patch: Record<string, unknown>) => Promise<FranchiseLead | null>;
    readonly onCustomerOpenAction: (customerId: string) => void;
    readonly showAlertAction: (message: string, type?: LeadAlertType, title?: string) => void;
};

export function useLeadCustomerConversion({
    userId,
    userName,
    companyName,
    onLeadPatchAction,
    onCustomerOpenAction,
    showAlertAction
}: UseLeadCustomerConversionParams) {
    const [convertingLeadId, setConvertingLeadId] = React.useState('');

    const findExistingCustomerForLead = async (lead: FranchiseLead) => {
        const normalizedPhone = normalizeLeadPhone(lead.mobile);
        if (!normalizedPhone || normalizedPhone.length < 4) return null;

        const params = new URLSearchParams({
            requesterId: userId,
            search: normalizedPhone,
            limit: 'all'
        });
        const targetCompanyName = lead.companyName || companyName;
        if (targetCompanyName) params.set('company', targetCompanyName);

        const response = await fetch(`/api/customers?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(readApiError(payload));

        const customers = unwrapApiData<RelatedCustomer[]>(payload) || [];
        return customers.find(customer => {
            return normalizeLeadPhone(customer.mobile) === normalizedPhone ||
                normalizeLeadPhone(customer.companyPhone) === normalizedPhone;
        }) || null;
    };

    const markLeadConverted = async (lead: FranchiseLead, customer: { id: string; name?: string }, message: string) => {
        const now = new Date().toISOString();
        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '고객전환',
            content: message,
            createdAt: now,
            createdBy: userName || userId
        };

        await onLeadPatchAction(lead, {
            convertedCustomerId: customer.id,
            convertedCustomerName: customer.name || lead.name,
            convertedAt: now,
            lastContactedAt: now,
            nextContactAt: null,
            linkedCustomerId: lead.linkedCustomerId || customer.id,
            linkedCustomerName: lead.linkedCustomerName || customer.name || lead.name,
            activityLog: [nextActivity, ...(lead.activityLog || [])]
        });
    };

    const convertLeadToCustomer = async (lead: FranchiseLead) => {
        if (!userId) return;
        if (lead.convertedCustomerId) {
            showAlertAction('이미 고객 DB로 전환된 리드입니다.', 'info', '전환 완료');
            onCustomerOpenAction(lead.convertedCustomerId);
            return;
        }

        setConvertingLeadId(lead.id);
        try {
            if (lead.linkedCustomerId) {
                await markLeadConverted(
                    lead,
                    { id: lead.linkedCustomerId, name: lead.linkedCustomerName || lead.name },
                    `기존 연결 고객(${lead.linkedCustomerName || lead.name})을 전환 완료로 표시`
                );
                showAlertAction('기존 연결 고객을 전환 완료로 표시했습니다.', 'success', '고객 전환 완료');
                onCustomerOpenAction(lead.linkedCustomerId);
                return;
            }

            const existingCustomer = await findExistingCustomerForLead(lead);
            if (existingCustomer) {
                await markLeadConverted(
                    lead,
                    { id: existingCustomer.id, name: existingCustomer.name },
                    `동일 연락처 기존 고객(${existingCustomer.name})과 연결 후 전환 완료`
                );
                showAlertAction('같은 연락처의 기존 고객과 연결하고 전환 완료 처리했습니다.', 'success', '고객 전환 완료');
                onCustomerOpenAction(existingCustomer.id);
                return;
            }

            const memoLines = [
                '[모객DB 전환]',
                `전환일시: ${formatFullDateTime(new Date().toISOString())}`,
                `모객상태: ${lead.status}`,
                `유입경로: ${lead.source || '-'}`,
                `관심브랜드: ${lead.interestedBrand || '-'}`,
                `희망지역: ${lead.desiredRegion || '-'}`,
                `예산: ${formatBudget(lead.budgetMin, lead.budgetMax)}`,
                lead.memo ? `메모: ${lead.memo}` : ''
            ].filter(Boolean);

            const customerResponse = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    managerId: lead.managerId || userId,
                    companyName: lead.companyName || companyName,
                    companyId: lead.companyId,
                    name: lead.name,
                    gender: 'M',
                    grade: mapLeadGradeToCustomerGrade(lead.grade),
                    class: mapLeadGradeToCustomerClass(lead.grade),
                    status: mapLeadStatusToCustomerStatus(lead.status),
                    feature: lead.interestedBrand ? `프랜차이즈 관심: ${lead.interestedBrand}` : '모객DB 전환 고객',
                    address: lead.desiredRegion || '',
                    mobile: lead.mobile || '',
                    companyPhone: '',
                    memoInterest: memoLines.join('\n'),
                    memoHistory: memoLines.join('\n'),
                    progressSteps: lead.status === '계약예정' || lead.status === '계약완료' ? ['계약상황'] : ['상담중'],
                    wantedArea: lead.desiredRegion || '',
                    wantedFeature: lead.memo || '',
                    wantedItem: lead.interestedBrand || '',
                    wantedIndustry: '프랜차이즈',
                    wantedDepositMin: toCustomerBudgetValue(lead.budgetMin),
                    wantedDepositMax: toCustomerBudgetValue(lead.budgetMax),
                    sourceType: 'franchise-lead',
                    sourceId: lead.id,
                    franchiseLeadId: lead.id
                })
            });
            const customerPayload = await customerResponse.json();
            if (!customerResponse.ok) throw new Error(readApiError(customerPayload));

            const customer = unwrapApiData<RelatedCustomer>(customerPayload);
            if (!customer?.id) throw new Error('고객 생성 결과를 확인하지 못했습니다.');

            await markLeadConverted(
                lead,
                { id: customer.id, name: customer.name || lead.name },
                `신규 고객(${customer.name || lead.name})으로 전환`
            );
            showAlertAction('고객 DB로 전환했습니다.', 'success', '고객 전환 완료');
            onCustomerOpenAction(customer.id);
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '고객 전환에 실패했습니다.', 'error', '고객 전환 실패');
        } finally {
            setConvertingLeadId('');
        }
    };

    return {
        convertingLeadId,
        convertLeadToCustomer
    };
}
