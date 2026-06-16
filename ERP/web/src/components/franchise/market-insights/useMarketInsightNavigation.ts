"use client";

import React from 'react';
import type { MarketInsightView } from './MarketInsightViewTabs';
import type { MarketInsightTab } from './MarketInsightWorkspaceTabs';

type MarketInsightNavigation = {
    readonly activeMarketTab: MarketInsightTab;
    readonly activeMarketView: MarketInsightView;
    readonly selectMarketTab: (tab: MarketInsightTab) => void;
    readonly selectMarketView: (view: MarketInsightView) => void;
};

function pushMarketInsightQuery(params: URLSearchParams) {
    const queryString = params.toString();
    window.history.pushState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
}

export function useMarketInsightNavigation(): MarketInsightNavigation {
    const [activeMarketTab, setActiveMarketTab] = React.useState<MarketInsightTab>('market-insights');
    const [activeMarketView, setActiveMarketView] = React.useState<MarketInsightView>('location-list');

    React.useEffect(() => {
        const syncFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const queryTab = params.get('tab');
            const queryView = params.get('view');
            setActiveMarketTab(queryTab === 'realty-import' ? 'realty-import' : 'market-insights');
            setActiveMarketView(queryView === 'region-insight' ? 'region-insight' : 'location-list');
        };
        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, []);

    const selectMarketTab = React.useCallback((tab: MarketInsightTab) => {
        setActiveMarketTab(tab);
        const params = new URLSearchParams(window.location.search);
        if (tab === 'realty-import') params.set('tab', 'realty-import');
        else params.delete('tab');
        pushMarketInsightQuery(params);
    }, []);

    const selectMarketView = React.useCallback((view: MarketInsightView) => {
        setActiveMarketTab('market-insights');
        setActiveMarketView(view);
        const params = new URLSearchParams(window.location.search);
        params.delete('tab');
        if (view === 'region-insight') params.set('view', 'region-insight');
        else params.delete('view');
        pushMarketInsightQuery(params);
    }, []);

    return {
        activeMarketTab,
        activeMarketView,
        selectMarketTab,
        selectMarketView
    };
}
