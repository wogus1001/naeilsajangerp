import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { CompanySearchModal, type Company } from './CompanySearchModal';

function renderSearchResult(company: Company): string {
    return renderToStaticMarkup(createElement(CompanySearchModal, {
        searchQuery: company.name,
        searchResults: [company],
        isSearching: false,
        hasSearched: true,
        onQueryChange: () => undefined,
        onSearch: () => undefined,
        onClose: () => undefined,
        onSelectCompany: () => undefined,
        onRegisterNewCompany: () => undefined
    }));
}

test('Given no company representative When rendering search results Then the representative row is hidden', () => {
    const html = renderSearchResult({
        id: 'company-without-representative',
        name: '테스트'
    });

    assert.doesNotMatch(html, /대표:/);
    assert.doesNotMatch(html, /\(미정\)/);
});

test('Given an unexpected representative field When rendering search results Then only the company name is shown', () => {
    const companyWithUnexpectedRepresentative = {
        id: 'company-with-representative',
        name: '내일사장',
        created_at: '2026-07-23',
        manager_name: '박규태'
    };
    const html = renderSearchResult(companyWithUnexpectedRepresentative);

    assert.match(html, /내일사장/);
    assert.doesNotMatch(html, /대표:/);
    assert.doesNotMatch(html, /박규태/);
});
