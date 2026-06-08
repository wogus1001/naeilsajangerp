"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Check, RefreshCw } from 'lucide-react';
import styles from './PropertySelectorModal.module.css';
import PropertyCard from './PropertyCard';
import { AlertModal } from '@/components/common/AlertModal';
import { matchesSearchTerms, parseSearchTerms } from '@/utils/search';
import { getRequesterId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';

import { readApiJson } from '@/utils/apiResponse';
interface PropertySelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (property: any) => void;
}

export default function PropertySelectorModal({ isOpen, onClose, onSelect }: PropertySelectorModalProps) {
    const [properties, setProperties] = useState<any[]>([]);
    const [searchProperties, setSearchProperties] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const searchTerms = React.useMemo(() => parseSearchTerms(searchTerm), [searchTerm]);
    const isSearchActive = searchTerms.length > 0;
    const sourceProperties = isSearchActive ? (searchProperties ?? properties) : properties;
    const searchFetchControllerRef = React.useRef<AbortController | null>(null);
    const [viewPropertyId, setViewPropertyId] = useState<string | null>(null); // For double-click popup

    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info'; onClose?: () => void }>({
        isOpen: false,
        message: '',
        type: 'info'
    });

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', onClose?: () => void) => {
        setAlertConfig({ isOpen: true, message, type, onClose });
    };

    const closeAlert = () => {
        if (alertConfig.onClose) alertConfig.onClose();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        if (isOpen) {
            fetchProperties();
        }
    }, [isOpen]);

    const buildPropertyQueryString = (requestedLimit: number | 'all', search?: string) => {
        const params = new URLSearchParams();
        const user = getStoredUser();
        const companyName = getStoredCompanyName(user);
        const requesterId = getRequesterId(user);

        if (companyName) params.set('company', companyName);
        if (requesterId) params.set('requesterId', requesterId);
        params.set('limit', requestedLimit === 'all' ? 'all' : String(requestedLimit));
        if (search?.trim()) params.set('search', search.trim());

        return params.toString() ? `?${params.toString()}` : '';
    };

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const query = buildPropertyQueryString(500);
            const res = await fetch(`/api/properties${query}`);
            if (res.ok) {
                const data = await readApiJson(res);
                setProperties(data);
                setSearchProperties(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !isSearchActive) {
            if (searchFetchControllerRef.current) {
                searchFetchControllerRef.current.abort();
                searchFetchControllerRef.current = null;
            }
            setSearchProperties(null);
            return;
        }

        setSearchProperties(null);
        const controller = new AbortController();
        searchFetchControllerRef.current = controller;

        void (async () => {
            try {
                const query = buildPropertyQueryString('all', searchTerm);
                const res = await fetch(`/api/properties${query}`, { signal: controller.signal });
                if (res.ok) {
                    const data = await readApiJson(res);
                    if (searchFetchControllerRef.current === controller) {
                        setSearchProperties(data);
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch searchable properties:', error);
                }
            } finally {
                if (searchFetchControllerRef.current === controller) {
                    searchFetchControllerRef.current = null;
                }
            }
        })();

        return () => {
            controller.abort();
            if (searchFetchControllerRef.current === controller) {
                searchFetchControllerRef.current = null;
            }
        };
    }, [isOpen, isSearchActive, searchTerm]);

    const filteredProperties = sourceProperties.filter(p =>
        matchesSearchTerms([JSON.stringify(p)], searchTerms)
    );

    const handleSelect = () => {
        if (selectedId) {
            const selected = sourceProperties.find(p => p.id === selectedId);
            if (selected) {
                onSelect(selected);
                onClose();
            }
        } else {
            showAlert('물건을 선택해주세요.', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <span className={styles.title}>점포물건 선택</span>
                    <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
                </div>

                {/* Toolbar */}
                <div className={styles.toolbar}>
                    <div className={styles.searchGroup}>
                        <span className={styles.label}>검색</span>
                        <input
                            className={styles.searchInput}
                            placeholder="쉼표 또는 띄어쓰기로 여러 키워드 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className={styles.btnSearch}><Search size={14} /> 검색</button>
                        <button className={styles.btnReset} onClick={() => { setSearchTerm(''); fetchProperties(); }}>
                            <RefreshCw size={14} /> 검색초기화
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>No</th>
                                <th style={{ width: 60 }}>물건등급</th>
                                <th>물건명</th>
                                <th style={{ width: 80 }}>업종</th>
                                <th>주소</th>
                                <th style={{ width: 80 }}>권리금</th>
                                <th style={{ width: 80 }}>임대료</th>
                                <th style={{ width: 80 }}>보증금</th>
                                <th style={{ width: 80 }}>합계</th>
                                <th style={{ width: 80 }}>월순익</th>
                                <th style={{ width: 60 }}>실면적</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 20 }}>로딩중...</td></tr>
                            ) : filteredProperties.length === 0 ? (
                                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 20 }}>검색된 물건이 없습니다.</td></tr>
                            ) : (
                                filteredProperties.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        className={selectedId === p.id ? styles.selectedRow : ''}
                                        onClick={() => setSelectedId(p.id)}
                                        onDoubleClick={() => setViewPropertyId(p.id)}
                                    >
                                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={styles.statusBadge} data-status={p.status}>
                                                {p.status === 'progress' ? '추진' :
                                                    p.status === 'manage' ? '관리' :
                                                        p.status === 'hold' ? '보류' :
                                                            p.status === 'joint' ? '공동' : '완료'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                                        <td style={{ textAlign: 'center', color: '#4c6ef5' }}>{p.industrySector || p.type || '-'}</td>
                                        <td className={styles.addressCell} title={p.address}>{p.address}</td>
                                        <td style={{ textAlign: 'right' }}>{p.premium ? Number(p.premium).toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'right' }}>{p.monthlyRent ? Number(p.monthlyRent).toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'right' }}>{p.deposit ? Number(p.deposit).toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'right' }}>{(Number(p.premium || 0) + Number(p.deposit || 0)).toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>-</td>
                                        <td style={{ textAlign: 'center' }}>{p.area}평</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <span style={{ fontSize: 12, color: '#228BE6' }}>(총 : {filteredProperties.length} 건)</span>
                        <span style={{ fontSize: 12, color: '#e03131', marginLeft: 12 }}>* 기본 500건 표시, 검색 시 전체 범위에서 찾습니다.</span>
                    </div>
                    <div className={styles.footerRight}>
                        <button className={styles.btnSelect} onClick={handleSelect}>
                            <Check size={14} /> 선택
                        </button>
                        <button className={styles.btnClose} onClick={onClose}>
                            <X size={14} /> 창 닫기
                        </button>
                    </div>
                </div>
            </div>

            {/* Property Card Popup */}
            {viewPropertyId && (
                <div className={styles.cardOverlay}>
                    <div className={styles.cardModal}>
                        <PropertyCard
                            property={sourceProperties.find(p => p.id === viewPropertyId) || properties.find(p => p.id === viewPropertyId)}
                            onClose={() => setViewPropertyId(null)}
                            onRefresh={fetchProperties}
                        />
                    </div>
                </div>
            )}
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
};
