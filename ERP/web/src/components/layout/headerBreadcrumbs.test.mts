import assert from 'node:assert/strict';
import test from 'node:test';

const subject = await import('./headerBreadcrumbs.js').catch(() => null);

test('getHeaderBreadcrumb returns the operational label when the path is known', () => {
    // Given
    const path = '/dashboard/franchise-leads';

    // When
    assert.ok(subject, 'header breadcrumb helper must be exported from its own module');
    const breadcrumb = subject.getHeaderBreadcrumb(path);

    // Then
    assert.deepEqual(breadcrumb, { category: '프랜차이즈', title: '모객 DB' });
});

test('getHeaderBreadcrumb preserves dynamic route precedence', () => {
    // Given
    const path = '/board/notices/notice-1/edit';

    // When
    assert.ok(subject, 'header breadcrumb helper must be exported from its own module');
    const breadcrumb = subject.getHeaderBreadcrumb(path);

    // Then
    assert.deepEqual(breadcrumb, { category: '게시판', title: '공지사항 수정' });
});

test('resolveHeaderBreadcrumb gives an explicit override precedence over the path', () => {
    // Given
    const override = { category: '데모', title: '가맹 운영 샘플' } as const;

    // When
    assert.ok(subject, 'header breadcrumb helper must be exported from its own module');
    const breadcrumb = subject.resolveHeaderBreadcrumb('/dashboard', override);

    // Then
    assert.equal(breadcrumb, override);
});

test('getHeaderBreadcrumb keeps the current dashboard fallback for unknown paths', () => {
    // Given
    const path = '/unknown';

    // When
    assert.ok(subject, 'header breadcrumb helper must be exported from its own module');
    const breadcrumb = subject.getHeaderBreadcrumb(path);

    // Then
    assert.deepEqual(breadcrumb, { category: '메인', title: '대시보드' });
});
