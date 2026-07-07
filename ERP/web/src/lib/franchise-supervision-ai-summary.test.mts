import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeInspectionItems } from './franchise-supervision.js';
import {
    applySupervisionReportAiSummary,
    buildFallbackSupervisionReportAiSummary,
    buildSupervisionReportAiPrompt,
    buildSupervisionReportAiQualityWarnings,
    extractSupervisionReportAiSummaryFromText,
    maskSupervisionAiTranscriptSensitiveData,
    normalizeAiProviderEnvValue,
    validateSupervisionAiTranscript
} from './franchise-supervision-ai-summary.js';
import {
    buildNvidiaChatCompletionBody,
    DEFAULT_NVIDIA_FALLBACK_MODEL,
    DEFAULT_NVIDIA_MODEL,
    normalizeNvidiaBooleanEnv,
    normalizeNvidiaModelId
} from './nvidia-chat-config.js';

void test('Given AI report JSON When extracting Then supervision summary fields are normalized', () => {
    const summary = extractSupervisionReportAiSummaryFromText(`\`\`\`json
{
  "overallNote": "청결 개선 확인 필요",
  "specialNote": "냉장고 하부 청소 후 사진 공유",
  "inspectionItems": [
    { "id": "cleanliness", "label": "청결", "result": "개선필요", "memo": "냉장고 하부 오염 확인", "evidence": "냉장고 하부 오염" },
    { "id": "service", "label": "서비스", "result": "양호", "memo": "응대 양호", "evidence": "응대 양호" }
  ]
}
\`\`\``);

    assert.equal(summary?.overallNote, '청결 개선 확인 필요');
    assert.equal(summary?.inspectionItems[0]?.result, '개선필요');
    assert.equal(summary?.inspectionItems[0]?.evidence, '냉장고 하부 오염');
    assert.equal(summary?.inspectionItems[1]?.memo, '응대 양호');
});

void test('Given AI report JSON with leading model text When extracting Then the JSON object is still parsed', () => {
    const summary = extractSupervisionReportAiSummaryFromText(`</think>
정리 결과입니다.
{
  "overallNote": "주방 청결 재확인 필요",
  "specialNote": "3일 뒤 청소 사진 확인",
  "inspectionItems": [
    { "id": "cleanliness", "label": "청결", "result": "주의", "memo": "튀김기 옆 기름때 확인", "evidence": "튀김기 옆 기름때" }
  ]
}
필요 시 저장 전 검토하세요.`);

    assert.equal(summary?.overallNote, '주방 청결 재확인 필요');
    assert.equal(summary?.inspectionItems[0]?.id, 'cleanliness');
    assert.equal(summary?.inspectionItems[0]?.result, '주의');
});

void test('Given AI report JSON with alternate keys When extracting Then summary is normalized', () => {
    const summary = extractSupervisionReportAiSummaryFromText(JSON.stringify({
        summary: 'POS 교육과 주방 청결 재확인이 필요합니다.',
        followUp: '금요일 직원 교육 완료 여부와 청소 사진 확인',
        items: [
            { item_id: 'cleanliness', item: '청결', status: '주의', note: '냉장고 하부 기름때 확인', source: '냉장고 하부' },
            { item_id: 'hq-support', item: '본사 지원', status: '개선필요', note: 'POS 교육 자료와 배달 리뷰 이벤트 문구 필요', source: '교육 자료 요청' }
        ]
    }));

    assert.equal(summary?.overallNote, 'POS 교육과 주방 청결 재확인이 필요함.');
    assert.equal(summary?.specialNote, '금요일 직원 교육 완료 여부와 청소 사진 확인');
    assert.deepEqual(summary?.inspectionItems.map(item => [item.id, item.label, item.result, item.memo, item.evidence]), [
        ['cleanliness', '청결', '주의', '냉장고 하부 기름때 확인', '냉장고 하부'],
        ['hq-support', '본사 지원', '개선필요', 'POS 교육 자료와 배달 리뷰 이벤트 문구 필요', '교육 자료 요청']
    ]);
});

void test('Given conversational AI report JSON When extracting Then memos are converted to report tone', () => {
    const summary = extractSupervisionReportAiSummaryFromText(JSON.stringify({
        overallNote: '오늘 312점 다녀왔고 점주랑 40분 정도 얘기함.',
        specialNote: '금요일까지 청소 사진을 받아보면 될 것 같습니다.',
        inspectionItems: [
            {
                id: 'service',
                label: '서비스',
                result: '주의',
                memo: '손님한테 인사는 잘 하고 있었다고 합니다. 점주님이 자료 다시 보내드리기로 했습니다.',
                evidence: '점주님이 자료 다시 보내드리기로 했습니다.'
            }
        ]
    }));

    const combinedText = [
        summary?.overallNote,
        summary?.specialNote,
        summary?.inspectionItems[0]?.memo
    ].join('\n');

    assert.doesNotMatch(combinedText, /점주님|손님|합니다|했습니다|해요|하셨습니다|하셨어서|같습니다|얘기함|보내드리기로/);
    assert.match(summary?.overallNote || '', /점주/);
    assert.match(summary?.inspectionItems[0]?.memo || '', /고객/);
});

void test('Given quoted AI provider env value When normalizing Then accidental shell quotes are removed', () => {
    assert.equal(normalizeAiProviderEnvValue('"nvapi-test"'), 'nvapi-test');
    assert.equal(normalizeAiProviderEnvValue('nvapi-test"'), 'nvapi-test');
    assert.equal(normalizeAiProviderEnvValue("'nvidia/model'"), 'nvidia/model');
});

void test('Given NVIDIA model env aliases When normalizing Then callable model ids are used', () => {
    assert.equal(normalizeNvidiaModelId('', DEFAULT_NVIDIA_MODEL), DEFAULT_NVIDIA_MODEL);
    assert.equal(
        normalizeNvidiaModelId('mistral-medium-3.5-128b', DEFAULT_NVIDIA_MODEL),
        'mistralai/mistral-medium-3.5-128b'
    );
    assert.equal(
        normalizeNvidiaModelId('llama-3.1-8b-instruct', DEFAULT_NVIDIA_MODEL),
        'meta/llama-3.1-8b-instruct'
    );
    assert.equal(
        normalizeNvidiaModelId('nemotron-3-nano-30b-a3b', DEFAULT_NVIDIA_MODEL),
        DEFAULT_NVIDIA_MODEL
    );
});

void test('Given NVIDIA default chat config When building request body Then fast Nemotron settings are used', () => {
    const body = buildNvidiaChatCompletionBody({
        model: DEFAULT_NVIDIA_MODEL,
        forceJson: false,
        messages: [{ role: 'user', content: '점검 메모' }]
    });

    assert.equal(body.model, DEFAULT_NVIDIA_MODEL);
    assert.equal(body.response_format, undefined);
    assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
    assert.equal(body.reasoning_effort, undefined);
    assert.equal(body.stream, false);
});

void test('Given NVIDIA fallback model When building request body Then JSON forcing is opt-in', () => {
    const body = buildNvidiaChatCompletionBody({
        model: DEFAULT_NVIDIA_FALLBACK_MODEL,
        forceJson: true,
        messages: [{ role: 'user', content: '점검 메모' }]
    });

    assert.equal(body.model, DEFAULT_NVIDIA_FALLBACK_MODEL);
    assert.deepEqual(body.response_format, { type: 'json_object' });
});

void test('Given NVIDIA Mistral model When building request body Then optional reasoning is kept light', () => {
    const body = buildNvidiaChatCompletionBody({
        model: 'mistralai/mistral-medium-3.5-128b',
        forceJson: false,
        messages: [{ role: 'user', content: '점검 메모' }]
    });

    assert.equal(body.reasoning_effort, 'low');
    assert.equal(body.max_tokens, 1100);
    assert.equal(body.stream, false);
});

void test('Given NVIDIA boolean env values When normalizing Then only explicit truthy values enable options', () => {
    assert.equal(normalizeNvidiaBooleanEnv('true'), true);
    assert.equal(normalizeNvidiaBooleanEnv('1'), true);
    assert.equal(normalizeNvidiaBooleanEnv('on'), true);
    assert.equal(normalizeNvidiaBooleanEnv('false'), false);
    assert.equal(normalizeNvidiaBooleanEnv(''), false);
});

void test('Given supervision AI transcript with sensitive values When masking Then outbound text hides direct identifiers', () => {
    const masked = maskSupervisionAiTranscriptSensitiveData(
        '점주 연락처 010-1234-5678, 예비창업자 주민번호 900101-1234567 확인 요청'
    );

    assert.equal(masked.includes('010-1234-5678'), false);
    assert.equal(masked.includes('900101-1234567'), false);
    assert.match(masked, /전화번호 마스킹/);
    assert.match(masked, /주민등록번호 마스킹/);
});

void test('Given supervision AI prompt When building Then report style and evidence rules are included', () => {
    const messages = buildSupervisionReportAiPrompt({
        transcript: '점주님이 배달 주문이 줄었다고 합니다.',
        locationName: '테스트점',
        supervisorName: '김SV',
        visitDate: '2026-07-03',
        purpose: '정기점검',
        inspectionItems: mergeInspectionItems([])
    });
    const promptText = messages.map(message => message.content).join('\n');

    assert.match(promptText, /보고서 문체/);
    assert.match(promptText, /구어체 종결어미를 금지/);
    assert.match(promptText, /현상\/근거 \+ 운영 영향 \+ 필요한 조치/);
    assert.match(promptText, /보고서 검토자가 바로 후속 조치를 판단/);
    assert.match(promptText, /2~4문장/);
    assert.match(promptText, /evidence/);
    assert.match(promptText, /원문 근거/);
    assert.match(promptText, /점주 의견 기준 배달 주문 감소 확인/);
});

void test('Given AI report summary When applying Then matching checklist items and special note are updated', () => {
    const applied = applySupervisionReportAiSummary({
        specialNote: '',
        inspectionItems: [
            { id: 'cleanliness', label: '청결', result: '양호', memo: '' },
            { id: 'quality', label: '품질', result: '양호', memo: '기존 메모' }
        ],
        summary: {
            overallNote: '전체 요약',
            specialNote: '본사 지원 요청',
            inspectionItems: [
                { id: 'cleanliness', label: '청결', result: '주의', memo: '마감 청소 확인 필요', evidence: '마감 청소' }
            ]
        }
    });

    assert.equal(applied.specialNote, '본사 지원 요청');
    assert.deepEqual(applied.inspectionItems, [
        { id: 'cleanliness', label: '청결', result: '주의', memo: '마감 청소 확인 필요' },
        { id: 'quality', label: '품질', result: '양호', memo: '기존 메모' }
    ]);
});

void test('Given AI response cannot be parsed When building fallback summary Then field memo is mapped to checklist items', () => {
    const summary = buildFallbackSupervisionReportAiSummary({
        transcript: [
            '주방 쪽 튀김기 옆이랑 냉장고 일부에 기름때가 보여서 마감 청소 체크리스트를 다시 주기로 했습니다.',
            '신규 직원이 POS를 아직 잘 못 다뤄서 점심 피크 때 주문 입력이 조금 밀렸습니다.',
            '본사에 POS 교육 자료와 배달 리뷰 이벤트 문구 예시를 요청했습니다.',
            '금요일까지 교육 완료 여부와 청소 사진을 확인하기로 했습니다.'
        ].join('\n'),
        inspectionItems: mergeInspectionItems([])
    });

    const cleanliness = summary.inspectionItems.find(item => item.id === 'cleanliness');
    const training = summary.inspectionItems.find(item => item.id === 'training-notice');
    const support = summary.inspectionItems.find(item => item.id === 'hq-support');

    assert.equal(cleanliness?.result, '개선필요');
    assert.match(cleanliness?.memo || '', /기름때/);
    assert.match(cleanliness?.evidence || '', /기름때/);
    assert.equal(training?.result, '개선필요');
    assert.match(training?.memo || '', /POS|교육/);
    assert.equal(support?.result, '주의');
    assert.match(summary.specialNote, /금요일|교육 완료|청소 사진/);
});

void test('Given fallback memo without matching checklist keywords When building fallback summary Then other item is used', () => {
    const summary = buildFallbackSupervisionReportAiSummary({
        transcript: '다음 방문 때 사진과 후속 확인 일정을 다시 잡기로 했다.',
        inspectionItems: mergeInspectionItems([])
    });

    const other = summary.inspectionItems.find(item => item.id === 'other');
    assert.equal(other?.label, '기타');
    assert.match(other?.memo || '', /후속 확인/);
});

void test('Given low confidence AI summary When checking quality Then actionable warnings are returned', () => {
    const warnings = buildSupervisionReportAiQualityWarnings({
        overallNote: '',
        specialNote: '',
        inspectionItems: [
            {
                id: 'cleanliness',
                label: '청결',
                result: '개선필요',
                memo: '청소가 안 됐다고 합니다.',
                evidence: ''
            }
        ]
    });

    assert.ok(warnings.some(warning => warning.key === 'overall-note-empty'));
    assert.ok(warnings.some(warning => warning.key === 'tone-cleanliness'));
    assert.ok(warnings.some(warning => warning.key === 'short-cleanliness'));
    assert.ok(warnings.some(warning => warning.key === 'evidence-cleanliness'));
});

void test('Given oversized AI transcript When validating Then a readable validation error is raised', () => {
    assert.throws(
        () => validateSupervisionAiTranscript('가'.repeat(12_001)),
        /12,000자 이하/
    );
});
