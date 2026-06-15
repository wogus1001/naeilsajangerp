import type { FormEvent } from 'react';

export type Company = {
    readonly id: string;
    readonly name: string;
    readonly manager_name: string;
    readonly created_at: string;
};

type CompanySearchModalProps = {
    readonly searchQuery: string;
    readonly searchResults: readonly Company[];
    readonly isSearching: boolean;
    readonly hasSearched: boolean;
    readonly onQueryChange: (value: string) => void;
    readonly onSearch: (event?: FormEvent) => void;
    readonly onClose: () => void;
    readonly onSelectCompany: (company: Company) => void;
    readonly onRegisterNewCompany: (companyName: string) => void;
};

export function CompanySearchModal({
    searchQuery,
    searchResults,
    isSearching,
    hasSearched,
    onQueryChange,
    onSearch,
    onClose,
    onSelectCompany,
    onRegisterNewCompany
}: CompanySearchModalProps) {
    const trimmedQuery = searchQuery.trim();
    const canRegisterNewCompany = hasSearched && trimmedQuery.length > 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxHeight: '80vh'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>회사 찾기</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={onSearch} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="회사명을 검색하세요"
                        value={searchQuery}
                        onChange={(event) => onQueryChange(event.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #ced4da',
                            fontSize: '14px'
                        }}
                        autoFocus
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            backgroundColor: '#339af0',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        검색
                    </button>
                </form>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: '200px',
                    border: '1px solid #f1f3f5',
                    borderRadius: '6px',
                    padding: '8px'
                }}>
                    {isSearching ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#868e96' }}>검색 중...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '184px' }}>
                            {searchResults.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                                    {searchResults.map((company) => (
                                        <li
                                            key={company.id}
                                            onClick={() => onSelectCompany(company)}
                                            style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #f1f3f5',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f8f9fa'}
                                            onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{company.name}</div>
                                            <div style={{ fontSize: '12px', color: '#868e96' }}>
                                                대표: {company.manager_name || '(미정)'}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={{ flex: 1, textAlign: 'center', padding: '20px', color: '#868e96', fontSize: '14px' }}>
                                    {hasSearched ? '검색 결과가 없습니다.' : '회사명을 검색해보세요.'}
                                </div>
                            )}
                            {canRegisterNewCompany && (
                                <div style={{ borderTop: '1px solid #f1f3f5', paddingTop: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => onRegisterNewCompany(trimmedQuery)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            backgroundColor: '#339af0',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        '{trimmedQuery}'(으)로 신규 등록하기
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
