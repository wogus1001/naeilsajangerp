import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { getDemoFeatureApiResponse, resetDemoFeatureApiFixtures } from './DemoFeatureApiFixtures';

const origin = 'http://localhost:3000';

beforeEach(() => {
    resetDemoFeatureApiFixtures();
});

test('demo production surfaces receive local fixture responses for every operational API', async () => {
    const paths = [
        '/api/franchise-labor/settings',
        '/api/franchise-labor/plans',
        '/api/franchise-schedules',
        '/api/franchise-schedules?view=assignees',
        '/api/franchise-supervision',
        '/api/franchise-owner-portal/accounts',
        '/api/franchise-owner-portal/notices',
        '/api/franchise-owner-portal/checklists',
        '/api/franchise-owner-portal/submissions',
        '/api/electronic-contracts',
        '/api/electronic-contract-templates',
        '/api/franchise-vendors',
        '/api/franchise-vendor-contracts',
        '/api/realty/listings'
    ] as const;

    for (const path of paths) {
        const response = getDemoFeatureApiResponse(new URL(path, origin), 'GET');
        assert.ok(response, `${path} must be handled inside the demo`);
        assert.equal(response.status, 200);
        const payload = await response.json() as { readonly data?: unknown };
        assert.notEqual(payload.data, undefined, `${path} must preserve the production API envelope`);
    }
});

test('demo external realty collection and promotion stay inside the fixture workspace', async () => {
    const runImport = getDemoFeatureApiResponse(
        new URL('/api/realty/import-jobs', origin),
        'POST',
        { body: JSON.stringify({ requesterId: 'demo-manager', region: '서울 강남구' }) }
    );
    const importPayload = await runImport?.json() as {
        readonly data: {
            readonly job: { readonly status: string; readonly totalCount: number };
            readonly listings: readonly { readonly listing?: { readonly id: string } }[];
        };
    };
    assert.equal(importPayload.data.job.status, 'completed');
    assert.ok(importPayload.data.job.totalCount > 0);

    const listingId = importPayload.data.listings[0]?.listing?.id;
    assert.ok(listingId);
    const promote = getDemoFeatureApiResponse(
        new URL('/api/realty/listings/promote?requesterId=demo-manager', origin),
        'POST',
        { body: JSON.stringify({ requesterId: 'demo-manager', listingId }) }
    );
    const promotePayload = await promote?.json() as {
        readonly data: { readonly action: string; readonly propertyId: string };
    };
    assert.equal(promotePayload.data.action, 'created');

    const reload = getDemoFeatureApiResponse(new URL('/api/realty/listings', origin), 'GET');
    const reloadPayload = await reload?.json() as {
        readonly data: {
            readonly listings: readonly { readonly id: string; readonly propertyId?: string | null }[];
        };
    };
    assert.equal(
        reloadPayload.data.listings.find(listing => listing.id === listingId)?.propertyId,
        promotePayload.data.propertyId
    );
});

test('demo fixture router does not claim unrelated APIs', () => {
    assert.equal(
        getDemoFeatureApiResponse(new URL('/api/franchise-leads', origin), 'GET'),
        null
    );
});

test('demo schedule writes remain visible after the production screen reloads', async () => {
    const create = getDemoFeatureApiResponse(
        new URL('/api/franchise-schedules', origin),
        'POST',
        {
            body: JSON.stringify({
                title: '데모 신규 일정',
                date: '2026-08-11',
                status: '예정',
                visibility: 'shared',
                assigneeProfileId: 'demo-manager',
                details: '상담 후속 일정'
            })
        }
    );
    assert.equal(create?.status, 200);

    const reload = getDemoFeatureApiResponse(new URL('/api/franchise-schedules', origin), 'GET');
    const payload = await reload?.json() as { readonly data: readonly { readonly title?: string }[] };
    assert.equal(payload.data.some(item => item.title === '데모 신규 일정'), true);
});

test('demo vendor and contract forms persist create, edit, and delete operations', async () => {
    const vendorCreate = getDemoFeatureApiResponse(
        new URL('/api/franchise-vendors', origin),
        'POST',
        {
            body: JSON.stringify({
                companyId: 'demo-company',
                category: 'equipment',
                vendorName: '데모설비',
                status: 'active'
            })
        }
    );
    const createdVendor = await vendorCreate?.json() as {
        readonly data: { readonly vendor: { readonly id: string; readonly vendorName: string } };
    };
    assert.equal(createdVendor.data.vendor.vendorName, '데모설비');

    const contractCreate = getDemoFeatureApiResponse(
        new URL('/api/franchise-vendor-contracts', origin),
        'POST',
        {
            body: JSON.stringify({
                id: 'demo-contract-new',
                companyId: 'demo-company',
                category: 'equipment',
                vendorId: createdVendor.data.vendor.id,
                vendorName: '데모설비',
                contractTitle: '설비 유지보수 계약',
                status: 'draft'
            })
        }
    );
    assert.equal(contractCreate?.status, 200);

    getDemoFeatureApiResponse(
        new URL('/api/franchise-vendor-contracts', origin),
        'PATCH',
        {
            body: JSON.stringify({
                id: 'demo-contract-new',
                companyId: 'demo-company',
                category: 'equipment',
                vendorName: '데모설비',
                contractTitle: '설비 유지보수 계약 수정',
                status: 'active'
            })
        }
    );
    const afterEdit = getDemoFeatureApiResponse(new URL('/api/franchise-vendor-contracts', origin), 'GET');
    const editedPayload = await afterEdit?.json() as {
        readonly data: { readonly contracts: readonly { readonly id: string; readonly contractTitle: string }[] };
    };
    assert.equal(
        editedPayload.data.contracts.find(item => item.id === 'demo-contract-new')?.contractTitle,
        '설비 유지보수 계약 수정'
    );

    getDemoFeatureApiResponse(
        new URL('/api/franchise-vendor-contracts?id=demo-contract-new', origin),
        'DELETE'
    );
    const afterDelete = getDemoFeatureApiResponse(new URL('/api/franchise-vendor-contracts', origin), 'GET');
    const deletedPayload = await afterDelete?.json() as {
        readonly data: { readonly contracts: readonly { readonly id: string }[] };
    };
    assert.equal(deletedPayload.data.contracts.some(item => item.id === 'demo-contract-new'), false);
});
