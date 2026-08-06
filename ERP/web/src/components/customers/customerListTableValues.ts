import {
    CustomerListColumnKey,
    CustomerListRecord,
    getLatestCustomerWork
} from './customerListTableConfig';

export function getCustomerListSortValue(
    customer: CustomerListRecord,
    key: CustomerListColumnKey,
    managers: Readonly<Record<string, string>>
): string {
    const latestWork = getLatestCustomerWork(customer.history ?? []);

    switch (key) {
        case 'no':
        case 'createdAt':
            return customer.createdAt ?? '';
        case 'name':
        case 'grade':
        case 'gender':
        case 'class':
        case 'status':
        case 'feature':
        case 'address':
        case 'mobile':
        case 'companyPhone':
        case 'wantedItem':
        case 'wantedIndustry':
        case 'wantedArea':
            return customer[key] ?? '';
        case 'deposit':
            return customer.wantedDepositMin ?? '';
        case 'rent':
            return customer.wantedRentMin ?? '';
        case 'manager': {
            const managerId = customer.managerId || customer.manager_id || '';
            return managers[managerId] || managerId;
        }
        case 'latestWorkDate':
            return latestWork.date;
        case 'latestWorkContent':
            return latestWork.content;
    }
}
