import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAlimtalkOperations } from './alimtalk-operations.js';

void test('Given AlimTalk logs When summarizing this month Then company usage and overview are calculated', () => {
    const summary = summarizeAlimtalkOperations({
        now: new Date('2026-07-02T00:00:00.000Z'),
        companies: [
            { id: 'company-a', name: '내일' },
            { id: 'company-b', name: '미래' }
        ],
        templates: [
            { template_key: 'signup_request', name: '가입요청', template_id: 'tpl1', channel_id: 'ch1', status: 'approved', enabled: true, content: '', variables: [], review_note: '', updated_at: '' },
            { template_key: 'vendor_contract_due', name: '업체만료', template_id: '', channel_id: '', status: 'submitted', enabled: false, content: '', variables: [], review_note: '', updated_at: '' }
        ],
        scenarios: [
            { scenario_key: 'signup_request', template_key: 'signup_request', name: '가입요청', trigger_label: '', recipient_label: '', enabled: true, fallback_channel: 'sms', memo: '', updated_at: '' },
            { scenario_key: 'vendor_contract_due', template_key: 'vendor_contract_due', name: '업체만료', trigger_label: '', recipient_label: '', enabled: false, fallback_channel: 'none', memo: '', updated_at: '' }
        ],
        companySettings: [
            { company_id: 'company-a', enabled: true, monthly_limit: 100, warning_threshold: 80 }
        ],
        sendLogs: [
            { id: 'log-1', company_id: 'company-a', scenario_key: 'signup_request', template_key: 'signup_request', recipient_name: '김', recipient_phone: '010', status: 'success', error_message: '', sent_at: '2026-07-01T00:00:00.000Z' },
            { id: 'log-2', company_id: 'company-a', scenario_key: 'signup_request', template_key: 'signup_request', recipient_name: '박', recipient_phone: '010', status: 'failed', error_message: 'fail', sent_at: '2026-07-01T01:00:00.000Z' },
            { id: 'log-old', company_id: 'company-a', scenario_key: 'signup_request', template_key: 'signup_request', recipient_name: '이', recipient_phone: '010', status: 'success', error_message: '', sent_at: '2026-06-30T00:00:00.000Z' }
        ]
    });

    assert.equal(summary.overview.monthlySendCount, 2);
    assert.equal(summary.overview.monthlyFailedCount, 1);
    assert.equal(summary.overview.approvedTemplateCount, 1);
    assert.equal(summary.overview.enabledScenarioCount, 1);
    assert.deepEqual(summary.companyUsage.map(item => [item.companyName, item.total, item.failed]), [
        ['내일', 2, 1],
        ['미래', 0, 0]
    ]);
});
