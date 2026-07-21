"use client";

import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import {
    buildNaverMapSearchUrl,
    loadNaverMapsSdk,
    parseNaverGeocodeApiResponse
} from '@/lib/naver-maps-client';
import type { NaverGeocodePosition } from '@/lib/naver-maps-geocoding';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import styles from './WorkIntakeEditModal.module.css';

type PropertyAddressMapProps = {
    readonly address: string;
    readonly detailAddress: string;
};

type MapState =
    | { readonly kind: 'loading' }
    | { readonly kind: 'ready'; readonly position: NaverGeocodePosition }
    | { readonly kind: 'error'; readonly message: string };

async function requestGeocode(address: string, signal: AbortSignal): Promise<NaverGeocodePosition> {
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/integrations/naver/maps/geocode?query=${encodeURIComponent(address)}`, {
        headers,
        signal
    });
    const payload: unknown = await response.json();
    const position = parseNaverGeocodeApiResponse(payload);
    if (!response.ok || !position) {
        throw new Error(response.status === 404
            ? '주소의 지도 위치를 찾지 못했습니다.'
            : '네이버 지도를 불러오지 못했습니다.');
    }
    return position;
}

export function PropertyAddressMap({ address, detailAddress }: PropertyAddressMapProps) {
    const mapHostRef = React.useRef<HTMLDivElement | null>(null);
    const [state, setState] = React.useState<MapState>({ kind: 'loading' });
    const fullAddress = [address, detailAddress].filter(Boolean).join(' ');
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() || '';

    React.useEffect(() => {
        if (!address) return undefined;
        if (!clientId) {
            setState({ kind: 'error', message: '네이버 지도 연동 설정이 필요합니다.' });
            return undefined;
        }

        const controller = new AbortController();
        setState({ kind: 'loading' });
        void Promise.all([
            loadNaverMapsSdk(clientId),
            requestGeocode(address, controller.signal)
        ]).then(([, position]) => {
            if (!controller.signal.aborted) setState({ kind: 'ready', position });
        }).catch(error => {
            if (controller.signal.aborted) return;
            setState({
                kind: 'error',
                message: error instanceof Error ? error.message : '네이버 지도를 불러오지 못했습니다.'
            });
        });

        return () => controller.abort();
    }, [address, clientId]);

    React.useEffect(() => {
        const host = mapHostRef.current;
        if (!host || state.kind !== 'ready') return undefined;

        const center = new naver.maps.LatLng(state.position.lat, state.position.lng);
        const map = new naver.maps.Map(host, { center, zoom: 16, zoomControl: true });
        const marker = new naver.maps.Marker({ map, position: center });
        const resize = () => {
            map.setSize(new naver.maps.Size(host.clientWidth, host.clientHeight));
            map.setCenter(center);
        };
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
        observer?.observe(host);
        const resizeFrame = window.requestAnimationFrame(resize);

        return () => {
            observer?.disconnect();
            window.cancelAnimationFrame(resizeFrame);
            marker.setMap(null);
            host.replaceChildren();
        };
    }, [state]);

    if (!address) return null;

    const mapLink = buildNaverMapSearchUrl(fullAddress);
    const status = state.kind === 'loading' ? '주소 위치를 확인하고 있습니다.' : state.kind === 'error' ? state.message : '';

    return (
        <section className={styles.addressMap} aria-label="입점 요청 주소 지도">
            <div className={styles.addressMapHeader}>
                <div>
                    <strong><MapPin size={16} aria-hidden="true" /> 주소 위치</strong>
                    <span>{fullAddress}</span>
                </div>
                <a href={mapLink} target="_blank" rel="noreferrer">
                    네이버 지도에서 보기 <ExternalLink size={14} aria-hidden="true" />
                </a>
            </div>
            <div className={styles.addressMapCanvas}>
                <div ref={mapHostRef} className={styles.addressMapMount} aria-hidden="true" />
                {state.kind !== 'ready' && (
                    <div className={styles.addressMapFallback} role="status" aria-live="polite">{status}</div>
                )}
            </div>
        </section>
    );
}
